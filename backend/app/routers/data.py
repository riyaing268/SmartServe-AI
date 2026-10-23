import csv
import io
from datetime import datetime
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MenuItem, DailyContext, DailyMenu, SalesLog
from ..services.synthetic_generator import seed_database

router = APIRouter(prefix="/api/data", tags=["data"])

REQUIRED_COLUMNS = [
    "date", "meal_slot", "item_name", "prepared_qty",
    "sold_qty", "leftover_qty", "expected_attendance",
    "weather", "is_exam_day", "is_holiday"
]

@router.post("/seed-demo")
def seed_demo_data(days: int = 90, db: Session = Depends(get_db)):
    """Seeds 90 days of realistic synthetic sales data."""
    try:
        result = seed_database(db, days=days)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to seed demo data: {str(e)}")

@router.post("/upload-sales")
async def upload_sales_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Uploads and validates historical sales CSV according to the PRD schema."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except Exception:
            raise HTTPException(status_code=400, detail="Unable to decode CSV file. Please use UTF-8.")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise HTTPException(status_code=400, detail="CSV file appears to be empty.")

    # Validate headers
    normalized_fields = [f.strip().lower() for f in reader.fieldnames]
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in normalized_fields]
    if missing_cols:
        raise HTTPException(
            status_code=400,
            detail=f"Missing required columns in CSV: {', '.join(missing_cols)}. Expected headers: {', '.join(REQUIRED_COLUMNS)}"
        )

    # Process and validate rows
    row_errors: List[str] = []
    rows_to_insert = []
    seen_items: Dict[str, MenuItem] = {m.name.lower(): m for m in db.query(MenuItem).all()}

    valid_slots = {"breakfast", "lunch", "snacks", "dinner"}
    valid_weathers = {"hot", "cool", "rainy"}

    for idx, row in enumerate(reader, start=2):  # Line 2 is first data row
        clean_row = {k.strip().lower(): (v.strip() if v else "") for k, v in row.items()}

        date_val = clean_row.get("date", "")
        slot_val = clean_row.get("meal_slot", "").lower()
        item_val = clean_row.get("item_name", "")
        prep_str = clean_row.get("prepared_qty", "0")
        sold_str = clean_row.get("sold_qty", "0")
        left_str = clean_row.get("leftover_qty", "0")
        att_str = clean_row.get("expected_attendance", "0")
        weather_val = clean_row.get("weather", "cool").lower()
        exam_str = clean_row.get("is_exam_day", "false").lower()
        holiday_str = clean_row.get("is_holiday", "false").lower()

        # Date validation
        try:
            parsed_date = datetime.strptime(date_val, "%Y-%m-%d").date()
        except ValueError:
            row_errors.append(f"Row {idx}: Invalid date format '{date_val}'. Expected YYYY-MM-DD.")
            continue

        # Slot validation
        if slot_val not in valid_slots:
            row_errors.append(f"Row {idx}: Invalid meal_slot '{slot_val}'. Must be one of {valid_slots}.")
            continue

        # Item name validation
        if not item_val:
            row_errors.append(f"Row {idx}: Missing item_name.")
            continue

        # Number validations
        try:
            prep_qty = int(prep_str)
            sold_qty = int(sold_str)
            left_qty = int(left_str)
            att_qty = int(att_str)
            if prep_qty < 0 or sold_qty < 0 or left_qty < 0 or att_qty < 0:
                raise ValueError("Quantities cannot be negative")
        except ValueError:
            row_errors.append(f"Row {idx}: prepared_qty, sold_qty, leftover_qty, expected_attendance must be non-negative integers.")
            continue

        if weather_val not in valid_weathers:
            weather_val = "cool"

        is_exam = exam_str in ["true", "1", "yes", "t"]
        is_holiday = holiday_str in ["true", "1", "yes", "t"]

        rows_to_insert.append({
            "date": date_val,
            "parsed_date": parsed_date,
            "meal_slot": slot_val,
            "item_name": item_val,
            "prepared_qty": prep_qty,
            "sold_qty": sold_qty,
            "leftover_qty": left_qty,
            "expected_attendance": att_qty,
            "weather": weather_val,
            "is_exam_day": is_exam,
            "is_holiday": is_holiday
        })

    if row_errors:
        return {
            "status": "validation_failed",
            "errors": row_errors[:20],  # Return up to 20 errors
            "total_errors": len(row_errors),
            "message": f"Found {len(row_errors)} validation errors. No rows were imported."
        }

    # Import verified rows
    imported_count = 0
    for r in rows_to_insert:
        item_lower = r["item_name"].lower()
        if item_lower not in seen_items:
            # Auto-create menu item with sensible defaults if missing
            new_item = MenuItem(
                name=r["item_name"],
                category="meal" if r["meal_slot"] in ["lunch", "dinner"] else "snack",
                cost_per_portion_inr=25.0,
                price_inr=60.0,
                portion_weight_g=250.0,
                shelf_life_hours=4.0,
                batch_size=10,
                is_reusable=False
            )
            db.add(new_item)
            db.commit()
            db.refresh(new_item)
            seen_items[item_lower] = new_item

        menu_item = seen_items[item_lower]

        # Ensure DailyContext exists
        context = db.query(DailyContext).filter(
            DailyContext.date == r["date"],
            DailyContext.meal_slot == r["meal_slot"]
        ).first()

        weekday_name = r["parsed_date"].strftime("%A")
        if not context:
            context = DailyContext(
                date=r["date"],
                meal_slot=r["meal_slot"],
                expected_attendance=r["expected_attendance"],
                actual_attendance=r["expected_attendance"],
                weekday=weekday_name,
                weather=r["weather"],
                is_exam_day=r["is_exam_day"],
                is_holiday=r["is_holiday"]
            )
            db.add(context)
        else:
            context.expected_attendance = r["expected_attendance"]
            context.weather = r["weather"]
            context.is_exam_day = r["is_exam_day"]
            context.is_holiday = r["is_holiday"]

        # Ensure DailyMenu entry
        daily_menu_entry = db.query(DailyMenu).filter(
            DailyMenu.date == r["date"],
            DailyMenu.meal_slot == r["meal_slot"],
            DailyMenu.item_id == menu_item.id
        ).first()
        if not daily_menu_entry:
            daily_menu_entry = DailyMenu(
                date=r["date"],
                meal_slot=r["meal_slot"],
                item_id=menu_item.id
            )
            db.add(daily_menu_entry)

        # Upsert SalesLog
        log = db.query(SalesLog).filter(
            SalesLog.date == r["date"],
            SalesLog.meal_slot == r["meal_slot"],
            SalesLog.item_id == menu_item.id
        ).first()

        if not log:
            log = SalesLog(
                date=r["date"],
                meal_slot=r["meal_slot"],
                item_id=menu_item.id,
                prepared_qty=r["prepared_qty"],
                sold_qty=r["sold_qty"],
                leftover_qty=r["leftover_qty"],
                recommended_qty=r["sold_qty"],
                manager_override_qty=r["prepared_qty"]
            )
            db.add(log)
        else:
            log.prepared_qty = r["prepared_qty"]
            log.sold_qty = r["sold_qty"]
            log.leftover_qty = r["leftover_qty"]

        imported_count += 1

    db.commit()
    return {
        "status": "success",
        "imported_rows": imported_count,
        "message": f"Successfully imported and validated {imported_count} sales records."
    }
