from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MenuItem, DailyContext, SalesLog, Stock, Setting
from ..schemas import (
    CloseDayRequest, MidServiceRequest, MidServiceResponse,
    MidServiceItemAction
)

router = APIRouter(prefix="/api/logs", tags=["logs"])

@router.post("/close-day")
def close_the_day(req: CloseDayRequest, db: Session = Depends(get_db)):
    """Logs end-of-service prepared, sold, and leftover quantities; creates carry-over stock for reusable items."""
    context = db.query(DailyContext).filter(
        DailyContext.date == req.date,
        DailyContext.meal_slot == req.meal_slot
    ).first()

    if context and req.actual_attendance is not None:
        context.actual_attendance = req.actual_attendance

    setting = db.query(Setting).first()
    co2_factor = setting.co2_per_kg_food if setting else 2.5

    total_prep = 0
    total_sold = 0
    total_left = 0
    waste_kg = 0.0
    waste_inr = 0.0

    now = datetime.utcnow()

    for item_input in req.items:
        item = db.query(MenuItem).filter(MenuItem.id == item_input.item_id).first()
        if not item:
            continue

        prep = max(0, item_input.prepared_qty)
        sold = max(0, min(prep, item_input.sold_qty))
        left = max(0, item_input.leftover_qty)

        total_prep += prep
        total_sold += sold
        total_left += left

        item_waste_kg = (left * item.portion_weight_g) / 1000.0
        item_waste_inr = left * item.cost_per_portion_inr
        waste_kg += item_waste_kg
        waste_inr += item_waste_inr

        # Upsert SalesLog
        log = db.query(SalesLog).filter(
            SalesLog.date == req.date,
            SalesLog.meal_slot == req.meal_slot,
            SalesLog.item_id == item.id
        ).first()

        if not log:
            log = SalesLog(
                date=req.date,
                meal_slot=req.meal_slot,
                item_id=item.id,
                prepared_qty=prep,
                sold_qty=sold,
                leftover_qty=left,
                stockout_time=item_input.stockout_time
            )
            db.add(log)
        else:
            log.prepared_qty = prep
            log.sold_qty = sold
            log.leftover_qty = left
            log.stockout_time = item_input.stockout_time

        # If reusable and leftover > 0, store in Stock
        if item.is_reusable and left > 0:
            shelf_life = item.shelf_life_hours
            expires_at = now + timedelta(hours=int(shelf_life))
            stock_entry = Stock(
                item_id=item.id,
                qty=left,
                cooked_at=now,
                expires_at=expires_at,
                source_date=req.date,
                is_used=False
            )
            db.add(stock_entry)

    db.commit()

    co2_emitted = waste_kg * co2_factor

    return {
        "status": "success",
        "date": req.date,
        "meal_slot": req.meal_slot,
        "total_prepared": total_prep,
        "total_sold": total_sold,
        "total_leftover": total_left,
        "waste_percentage": round((total_left / max(1, total_prep)) * 100.0, 1),
        "waste_kg": round(waste_kg, 2),
        "waste_inr": round(waste_inr, 2),
        "co2e_kg": round(co2_emitted, 2),
        "message": f"Successfully closed {req.meal_slot} on {req.date}."
    }

@router.post("/mid-service", response_model=MidServiceResponse)
def mid_service_forecast(req: MidServiceRequest, db: Session = Depends(get_db)):
    """Re-forecasts mid-service demand based on current sales pace and minutes remaining."""
    actions: List[MidServiceItemAction] = []

    # Assume standard service window is 120 minutes
    total_service_window = 120.0
    elapsed_minutes = max(10.0, total_service_window - max(5, req.minutes_remaining))
    time_ratio_left = req.minutes_remaining / max(1.0, elapsed_minutes)

    for item_in in req.items:
        item = db.query(MenuItem).filter(MenuItem.id == item_in.item_id).first()
        if not item:
            continue

        sold = item_in.sold_so_far
        prep = item_in.prepared_qty
        remaining_stock = max(0, prep - sold)

        # Sales velocity pace (units per minute)
        pace = sold / elapsed_minutes
        projected_additional_demand = int(pace * req.minutes_remaining)
        projected_total = sold + projected_additional_demand

        batch_size = max(1, item.batch_size)

        if projected_additional_demand > remaining_stock:
            # Shortage imminent! Recommend extra batch
            deficit = projected_additional_demand - remaining_stock
            batches_to_cook = int((deficit + batch_size - 1) // batch_size)
            qty_to_cook = batches_to_cook * batch_size

            actions.append(MidServiceItemAction(
                item_id=item.id,
                item_name=item.name,
                sold_so_far=sold,
                prepared_qty=prep,
                projected_remaining_demand=projected_additional_demand,
                projected_total_demand=projected_total,
                action=f"Cook extra {batches_to_cook} batch ({qty_to_cook} portions)",
                suggested_additional_batches=batches_to_cook,
                suggested_additional_qty=qty_to_cook,
                urgency="High" if (remaining_stock <= 5) else "Normal"
            ))
        elif remaining_stock > (projected_additional_demand * 1.35):
            # Surplus imminent! Stop cooking and prepare to discount/repurpose
            surplus = remaining_stock - projected_additional_demand
            actions.append(MidServiceItemAction(
                item_id=item.id,
                item_name=item.name,
                sold_so_far=sold,
                prepared_qty=prep,
                projected_remaining_demand=projected_additional_demand,
                projected_total_demand=projected_total,
                action=f"Stop cooking! Surplus projected ~{surplus} portions",
                suggested_additional_batches=0,
                suggested_additional_qty=0,
                urgency="Normal"
            ))
        else:
            actions.append(MidServiceItemAction(
                item_id=item.id,
                item_name=item.name,
                sold_so_far=sold,
                prepared_qty=prep,
                projected_remaining_demand=projected_additional_demand,
                projected_total_demand=projected_total,
                action="Balanced — current preparation matches pace",
                suggested_additional_batches=0,
                suggested_additional_qty=0,
                urgency="Low"
            ))

    return MidServiceResponse(
        date=req.date,
        meal_slot=req.meal_slot,
        minutes_remaining=req.minutes_remaining,
        recommendations=actions
    )
