from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MenuItem, DailyContext, DailyMenu, Recommendation, SalesLog, Setting
from ..schemas import (
    RecommendationResponse, RecommendationOverrideRequest,
    ModelHealthResponse
)
from ..ml.recommender import recommender
from ..ml.forecast import forecaster

router = APIRouter(tags=["recommendations"])

@router.get("/api/recommendations", response_model=List[RecommendationResponse])
def get_recommendations(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    slot: str = Query("lunch", description="Meal slot: breakfast, lunch, snacks, dinner"),
    service_level: Optional[str] = Query(None, description="Conservative, Balanced, Lean"),
    db: Session = Depends(get_db)
):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    # Get settings for default service level if not specified
    if not service_level:
        setting = db.query(Setting).first()
        service_level = setting.service_level if setting else "Balanced"

    # Fetch daily context
    context = db.query(DailyContext).filter(
        DailyContext.date == date,
        DailyContext.meal_slot == slot
    ).first()

    if not context:
        weekday = datetime.strptime(date, "%Y-%m-%d").strftime("%A")
        default_att = 1200 if weekday not in ["Saturday", "Sunday"] else 600
        context = DailyContext(
            date=date,
            meal_slot=slot,
            expected_attendance=default_att,
            actual_attendance=default_att,
            weekday=weekday,
            weather="cool",
            is_exam_day=False,
            is_holiday=False
        )
        db.add(context)
        db.commit()
        db.refresh(context)

    # Fetch items on menu for this date and slot
    daily_items = db.query(DailyMenu).filter(
        DailyMenu.date == date,
        DailyMenu.meal_slot == slot
    ).all()

    items = []
    if daily_items:
        item_ids = [d.item_id for d in daily_items]
        items = db.query(MenuItem).filter(MenuItem.id.in_(item_ids)).all()
    else:
        # Default menu items if none assigned
        slot_categories = {
            "breakfast": ["snack", "beverage"],
            "lunch": ["meal", "dessert", "beverage"],
            "snacks": ["snack", "beverage"],
            "dinner": ["meal", "dessert"]
        }
        cats = slot_categories.get(slot, ["meal"])
        items = db.query(MenuItem).filter(MenuItem.category.in_(cats)).all()
        for it in items:
            db.add(DailyMenu(date=date, meal_slot=slot, item_id=it.id))
        db.commit()

    if not items:
        # Fallback to all menu items
        items = db.query(MenuItem).limit(8).all()

    # Generate recommendations
    results = recommender.generate_recommendations(
        db=db,
        items=items,
        date=date,
        slot=slot,
        expected_attendance=context.expected_attendance,
        weather=context.weather,
        is_exam_day=context.is_exam_day,
        is_holiday=context.is_holiday,
        service_level=service_level
    )

    return results

@router.post("/api/recommendations/{rec_id}/override", response_model=RecommendationResponse)
def override_recommendation(
    rec_id: int,
    req: RecommendationOverrideRequest,
    db: Session = Depends(get_db)
):
    rec = db.query(Recommendation).filter(Recommendation.id == rec_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation record not found.")

    item = db.query(MenuItem).filter(MenuItem.id == rec.item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Associated menu item not found.")

    # Record override in SalesLog for this date/slot/item
    sales_log = db.query(SalesLog).filter(
        SalesLog.date == rec.date,
        SalesLog.meal_slot == rec.meal_slot,
        SalesLog.item_id == rec.item_id
    ).first()

    if not sales_log:
        sales_log = SalesLog(
            date=rec.date,
            meal_slot=rec.meal_slot,
            item_id=rec.item_id,
            prepared_qty=req.override_qty,
            sold_qty=0,
            leftover_qty=0,
            recommended_qty=rec.recommended_qty,
            manager_override_qty=req.override_qty
        )
        db.add(sales_log)
    else:
        sales_log.manager_override_qty = req.override_qty
        sales_log.prepared_qty = req.override_qty

    db.commit()

    return {
        "id": rec.id,
        "date": rec.date,
        "meal_slot": rec.meal_slot,
        "item_id": rec.item_id,
        "item_name": item.name,
        "category": item.category,
        "p10": rec.p10,
        "p50": rec.p50,
        "p90": rec.p90,
        "recommended_qty": rec.recommended_qty,
        "usable_leftover": 0,
        "batch_size": item.batch_size,
        "cost_per_portion_inr": item.cost_per_portion_inr,
        "price_inr": item.price_inr,
        "risk_label": rec.risk_label,
        "explanation": f"{rec.explanation} (Manager manual override to {req.override_qty} portions)",
        "service_level": rec.service_level,
        "manager_override_qty": req.override_qty
    }

@router.get("/api/model-health", response_model=ModelHealthResponse)
def get_model_health(db: Session = Depends(get_db)):
    """Returns WAPE, MAPE, and health status for the Model Health Card."""
    return forecaster.evaluate_model_health(db)
