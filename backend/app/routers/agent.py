from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import DailyContext, DailyMenu, MenuItem, Setting, Stock
from ..schemas import (
    DailyBriefingResponse, BriefingItem,
    AgentChatRequest, AgentChatResponse
)
from ..ml.recommender import recommender
from ..agent.agent import agent_instance
from ..agent.tools import get_leftover_stock

router = APIRouter(tags=["agent"])

@router.get("/api/briefing", response_model=DailyBriefingResponse)
def get_daily_briefing(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    slot: str = Query("lunch", description="Meal slot"),
    db: Session = Depends(get_db)
):
    """Generates the morning briefing: top 3 risks, quantities, and actions."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    context = db.query(DailyContext).filter(DailyContext.date == date, DailyContext.meal_slot == slot).first()
    att = context.expected_attendance if context else 1200
    weather = context.weather if context else "cool"
    exam = context.is_exam_day if context else False
    holiday = context.is_holiday if context else False

    # Get menu items
    daily_items = db.query(DailyMenu).filter(DailyMenu.date == date, DailyMenu.meal_slot == slot).all()
    if daily_items:
        items = db.query(MenuItem).filter(MenuItem.id.in_([d.item_id for d in daily_items])).all()
    else:
        items = db.query(MenuItem).limit(6).all()

    recs = recommender.generate_recommendations(
        db=db, items=items, date=date, slot=slot,
        expected_attendance=att, weather=weather,
        is_exam_day=exam, is_holiday=holiday,
        service_level="Balanced"
    )

    # Sort items by risk priority
    def risk_score(r):
        if r["risk_label"] == "Stock-out risk":
            return 3
        elif r["risk_label"] == "Waste risk":
            return 2
        return 1

    sorted_recs = sorted(recs, key=risk_score, reverse=True)
    top_risks: List[BriefingItem] = []

    for r in sorted_recs[:3]:
        action_sugg = "Prepare in two staggered batches to preserve freshness."
        if r["risk_label"] == "Stock-out risk":
            action_sugg = f"Keep ingredients staged for a quick second batch of {r['batch_size']} if rush occurs."
        elif r["risk_label"] == "Waste risk":
            action_sugg = "Deduct all available carryover stock; prepare strictly to order."

        top_risks.append(BriefingItem(
            item_name=r["item_name"],
            category=r["category"],
            recommended_qty=r["recommended_qty"],
            risk_label=r["risk_label"],
            action_suggestion=action_sugg
        ))

    # Weather impact text
    weather_impact = "Normal seasonal footfall expected."
    if weather == "rainy":
        weather_impact = "Rainy weather expected: Hot snacks and tea demand surges by +30-40%; cold items drop."
    elif weather == "hot":
        weather_impact = "Hot weather expected: Chilled drinks demand surges; lighter meal portions preferred."

    # Repurpose opportunities from stock
    stock_info = get_leftover_stock(db, date=date)
    repurpose_ops = []
    for s in stock_info.get("usable_stocks", []):
        repurpose_ops.append(f"{s['quantity']} portions of {s['item_name']} ready to repurpose: {s['suggested_reuse']}")

    if not repurpose_ops:
        repurpose_ops.append("No active leftover batches in storage. Starting service with 100% fresh inventory.")

    summary = (
        f"Daily Briefing for {slot.capitalize()} ({date}): Expected {att:,} diners. "
        f"{weather.capitalize()} conditions. Top attention required on {', '.join([r.item_name for r in top_risks[:2]])}."
    )

    return DailyBriefingResponse(
        date=date,
        meal_slot=slot,
        summary_text=summary,
        top_risks=top_risks,
        weather_impact=weather_impact,
        repurpose_opportunities=repurpose_ops
    )

@router.post("/api/agent/chat", response_model=AgentChatResponse)
def agent_chat(req: AgentChatRequest, db: Session = Depends(get_db)):
    """Conversational endpoint for the AI assistant with tool-grounded responses."""
    result = agent_instance.chat(db=db, user_message=req.message, session_id=req.session_id or "default")
    return AgentChatResponse(
        reply=result["reply"],
        tool_calls=result.get("tool_calls", [])
    )
