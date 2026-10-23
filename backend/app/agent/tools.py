import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from ..models import MenuItem, DailyContext, DailyMenu, SalesLog, Stock, Recommendation, Setting
from ..ml.forecast import forecaster
from ..ml.recommender import recommender

def get_forecast(db: Session, item_name: str, date: Optional[str] = None, slot: str = "lunch") -> Dict[str, Any]:
    """Tool: Returns demand forecast P10, P50, P90 for a specific menu item."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    item = db.query(MenuItem).filter(MenuItem.name.ilike(f"%{item_name}%")).first()
    if not item:
        return {"error": f"Item '{item_name}' not found in menu database."}

    context = db.query(DailyContext).filter(DailyContext.date == date, DailyContext.meal_slot == slot).first()
    att = context.expected_attendance if context else 1200
    weather = context.weather if context else "cool"
    exam = context.is_exam_day if context else False
    holiday = context.is_holiday if context else False

    fc = forecaster.predict(
        db=db, item=item, target_date=date, slot=slot,
        expected_attendance=att, weather=weather,
        is_exam_day=exam, is_holiday=holiday
    )
    return {
        "item": item.name,
        "date": date,
        "slot": slot,
        "expected_attendance": att,
        "weather": weather,
        "p10_low_demand": fc["p10"],
        "p50_likely_demand": fc["p50"],
        "p90_high_demand": fc["p90"],
        "model_used": fc["model_type"]
    }

def get_recommendation(db: Session, date: Optional[str] = None, slot: str = "lunch", service_level: str = "Balanced") -> Dict[str, Any]:
    """Tool: Returns preparation recommendations for all items on the menu for date and slot."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    context = db.query(DailyContext).filter(DailyContext.date == date, DailyContext.meal_slot == slot).first()
    att = context.expected_attendance if context else 1200
    weather = context.weather if context else "cool"
    exam = context.is_exam_day if context else False
    holiday = context.is_holiday if context else False

    daily_items = db.query(DailyMenu).filter(DailyMenu.date == date, DailyMenu.meal_slot == slot).all()
    if daily_items:
        items = db.query(MenuItem).filter(MenuItem.id.in_([d.item_id for d in daily_items])).all()
    else:
        items = db.query(MenuItem).limit(6).all()

    recs = recommender.generate_recommendations(
        db=db, items=items, date=date, slot=slot,
        expected_attendance=att, weather=weather,
        is_exam_day=exam, is_holiday=holiday,
        service_level=service_level
    )
    return {
        "date": date,
        "slot": slot,
        "service_level": service_level,
        "recommendations": [
            {
                "item": r["item_name"],
                "recommended_qty": r["recommended_qty"],
                "p50": r["p50"],
                "usable_leftover_deducted": r["usable_leftover"],
                "batch_size": r["batch_size"],
                "risk_label": r["risk_label"],
                "reasoning": r["explanation"]
            }
            for r in recs
        ]
    }

def get_leftover_stock(db: Session, date: Optional[str] = None) -> Dict[str, Any]:
    """Tool: Returns current safe leftover stock eligible for reuse, checking expiry times."""
    now = datetime.utcnow()
    stocks = db.query(Stock, MenuItem).join(MenuItem, Stock.item_id == MenuItem.id).filter(
        Stock.is_used == False,
        Stock.expires_at > now
    ).all()

    items_list = []
    for s, item in stocks:
        remaining_hours = max(0.0, (s.expires_at - now).total_seconds() / 3600.0)
        items_list.append({
            "item_name": item.name,
            "quantity": s.qty,
            "cooked_at": s.cooked_at.strftime("%Y-%m-%d %H:%M"),
            "expires_in_hours": round(remaining_hours, 1),
            "is_reusable": item.is_reusable,
            "suggested_reuse": item.reuse_suggestion
        })

    return {
        "current_time": now.strftime("%Y-%m-%d %H:%M UTC"),
        "total_active_batches": len(items_list),
        "usable_stocks": items_list
    }

def get_waste_history(db: Session, item_name: Optional[str] = None, days: int = 14) -> Dict[str, Any]:
    """Tool: Returns waste history and stock-out incidents over the last N days."""
    today = datetime.now().date()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")

    query = db.query(SalesLog, MenuItem).join(MenuItem, SalesLog.item_id == MenuItem.id).filter(
        SalesLog.date >= start_date
    )
    if item_name:
        query = query.filter(MenuItem.name.ilike(f"%{item_name}%"))

    logs = query.all()
    total_waste_portions = sum(l.leftover_qty for l, _ in logs)
    total_waste_kg = sum((l.leftover_qty * item.portion_weight_g) / 1000.0 for l, item in logs)
    total_cost_loss = sum(l.leftover_qty * item.cost_per_portion_inr for l, item in logs)
    stockouts = sum(1 for l, _ in logs if l.stockout_time)

    return {
        "item_filter": item_name or "All items",
        "days_analyzed": days,
        "total_waste_portions": total_waste_portions,
        "total_waste_kg": round(total_waste_kg, 1),
        "financial_loss_inr": round(total_cost_loss, 1),
        "stockout_incidents": stockouts
    }

def suggest_waste_actions(db: Session, item_name: str, surplus_qty: int, hours_to_close: float = 1.5) -> Dict[str, Any]:
    """Tool: Generates compliant waste reduction actions (repurpose, discount, NGO donation, compost) with food-safety checks."""
    item = db.query(MenuItem).filter(MenuItem.name.ilike(f"%{item_name}%")).first()
    if not item:
        return {"error": f"Item '{item_name}' not found."}

    setting = db.query(Setting).first()
    ngo_contact = setting.ngo_contact if setting else "Robin Hood Army Mess Contact (+91 98765 43210)"
    ngo_window = setting.ngo_pickup_window if setting else "15:30 - 16:30"

    actions = []

    # 1. Repurposing Action (only if reusable and shelf-life permits)
    if item.is_reusable:
        actions.append({
            "action_type": "Repurpose into Tomorrow's Menu",
            "priority": "Primary",
            "details": f"{item.reuse_suggestion} Chill immediately in food-safe pans labeled with today's date."
        })
    else:
        actions.append({
            "action_type": "Food-Safety Restriction",
            "priority": "Safety Alert",
            "details": f"{item.name} is classified as non-reusable (shelf life {item.shelf_life_hours}h). Do not carry over cooked portions to another day."
        })

    # 2. Time-Based Discount Action
    if hours_to_close <= 2.0 and surplus_qty >= 5:
        actions.append({
            "action_type": "Flash Counter Discount (25% off)",
            "priority": "High",
            "details": f"Offer a 25% discount (Rs. {int(item.price_inr * 0.75)} instead of Rs. {int(item.price_inr)}) for the final {int(hours_to_close * 60)} minutes to clear the counter."
        })

    # 3. NGO Donation Suggestion
    if surplus_qty >= 10:
        actions.append({
            "action_type": "NGO Food Rescue Donation",
            "priority": "Medium",
            "details": f"Notify {ngo_contact} for surplus collection during window {ngo_window}. Pack in standard meal containers."
        })

    # 4. Composting
    actions.append({
        "action_type": "Compost / Biogas Conversion",
        "priority": "Fallback",
        "details": f"Any unavoidable leftover food should be directed to the campus organic composting pit or biogas digester (diverts ~{round((surplus_qty * item.portion_weight_g / 1000.0) * 2.5, 1)} kg CO2e)."
    })

    return {
        "item": item.name,
        "surplus_portions": surplus_qty,
        "hours_to_close": hours_to_close,
        "is_reusable": item.is_reusable,
        "actions": actions
    }

def simulate_scenario(db: Session, attendance_change_pct: float, slot: str = "lunch", date: Optional[str] = None) -> Dict[str, Any]:
    """Tool: Simulates what happens to demand and prep if attendance changes by +/- X%."""
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    context = db.query(DailyContext).filter(DailyContext.date == date, DailyContext.meal_slot == slot).first()
    base_att = context.expected_attendance if context else 1200
    new_att = int(base_att * (1.0 + (attendance_change_pct / 100.0)))

    recs_base = get_recommendation(db, date=date, slot=slot, service_level="Balanced")
    
    # Calculate simulated numbers
    simulated_items = []
    total_base_qty = 0
    total_sim_qty = 0

    for r in recs_base["recommendations"]:
        base_qty = r["recommended_qty"]
        sim_qty = int(base_qty * (1.0 + (attendance_change_pct / 100.0)))
        batch = r["batch_size"]
        sim_qty = int(((sim_qty + batch - 1) // batch) * batch)
        total_base_qty += base_qty
        total_sim_qty += sim_qty
        simulated_items.append({
            "item": r["item"],
            "base_prep_qty": base_qty,
            "simulated_prep_qty": sim_qty,
            "delta_qty": sim_qty - base_qty
        })

    return {
        "base_attendance": base_att,
        "simulated_attendance": new_att,
        "attendance_change_percentage": attendance_change_pct,
        "meal_slot": slot,
        "total_base_prep": total_base_qty,
        "total_simulated_prep": total_sim_qty,
        "net_portion_difference": total_sim_qty - total_base_qty,
        "items": simulated_items
    }
