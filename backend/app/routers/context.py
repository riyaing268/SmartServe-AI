from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import DailyContext, DailyMenu, MenuItem
from ..schemas import (
    DailyContextCreate, DailyContextResponse,
    DailyMenuCreate, DailyMenuResponse, MenuItemResponse
)

router = APIRouter(prefix="/api/context", tags=["context"])

@router.get("", response_model=DailyContextResponse)
def get_daily_context(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    slot: str = Query("lunch", description="Meal slot: breakfast, lunch, snacks, dinner"),
    db: Session = Depends(get_db)
):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    context = db.query(DailyContext).filter(
        DailyContext.date == date,
        DailyContext.meal_slot == slot
    ).first()

    if not context:
        # Create default context for today if missing
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
            is_holiday=False,
            event_note=""
        )
        db.add(context)
        db.commit()
        db.refresh(context)

    return context

@router.post("", response_model=DailyContextResponse)
def set_daily_context(context_in: DailyContextCreate, db: Session = Depends(get_db)):
    context = db.query(DailyContext).filter(
        DailyContext.date == context_in.date,
        DailyContext.meal_slot == context_in.meal_slot
    ).first()

    if not context:
        context = DailyContext(**context_in.model_dump())
        db.add(context)
    else:
        for k, v in context_in.model_dump().items():
            setattr(context, k, v)

    db.commit()
    db.refresh(context)
    return context

@router.get("/menu", response_model=DailyMenuResponse)
def get_daily_menu(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD"),
    slot: str = Query("lunch", description="Meal slot"),
    db: Session = Depends(get_db)
):
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    menu_entries = db.query(DailyMenu).filter(
        DailyMenu.date == date,
        DailyMenu.meal_slot == slot
    ).all()

    items = []
    if menu_entries:
        item_ids = [m.item_id for m in menu_entries]
        items = db.query(MenuItem).filter(MenuItem.id.in_(item_ids)).all()
    else:
        # Default fallback items for this slot
        slot_categories = {
            "breakfast": ["snack", "beverage"],
            "lunch": ["meal", "dessert", "beverage"],
            "snacks": ["snack", "beverage"],
            "dinner": ["meal", "dessert"]
        }
        cats = slot_categories.get(slot, ["meal"])
        items = db.query(MenuItem).filter(MenuItem.category.in_(cats)).all()
        for item in items:
            db.add(DailyMenu(date=date, meal_slot=slot, item_id=item.id))
        db.commit()

    return {
        "date": date,
        "meal_slot": slot,
        "items": items
    }

@router.post("/menu", response_model=DailyMenuResponse)
def set_daily_menu(menu_in: DailyMenuCreate, db: Session = Depends(get_db)):
    # Clear existing slot items
    db.query(DailyMenu).filter(
        DailyMenu.date == menu_in.date,
        DailyMenu.meal_slot == menu_in.meal_slot
    ).delete()

    for item_id in menu_in.item_ids:
        db.add(DailyMenu(
            date=menu_in.date,
            meal_slot=menu_in.meal_slot,
            item_id=item_id
        ))

    db.commit()

    items = db.query(MenuItem).filter(MenuItem.id.in_(menu_in.item_ids)).all()
    return {
        "date": menu_in.date,
        "meal_slot": menu_in.meal_slot,
        "items": items
    }
