import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from ..models import MenuItem, DailyContext, DailyMenu, SalesLog, Stock, Recommendation, Setting

DEFAULT_MENU_ITEMS = [
    {
        "name": "Samosa",
        "category": "snack",
        "cost_per_portion_inr": 8.0,
        "price_inr": 20.0,
        "portion_weight_g": 100.0,
        "shelf_life_hours": 6.0,
        "batch_size": 10,
        "is_reusable": False,
        "reuse_suggestion": "Dispose safely; do not reuse fried samosas past 6 hours."
    },
    {
        "name": "Veg Thali",
        "category": "meal",
        "cost_per_portion_inr": 40.0,
        "price_inr": 90.0,
        "portion_weight_g": 450.0,
        "shelf_life_hours": 4.0,
        "batch_size": 15,
        "is_reusable": False,
        "reuse_suggestion": "Surplus complete thalis cannot be combined; donate within 90 min or compost."
    },
    {
        "name": "Masala Dosa",
        "category": "snack",
        "cost_per_portion_inr": 25.0,
        "price_inr": 60.0,
        "portion_weight_g": 200.0,
        "shelf_life_hours": 3.0,
        "batch_size": 5,
        "is_reusable": False,
        "reuse_suggestion": "Freshly made on griddle; prepare batter in controlled lots."
    },
    {
        "name": "Pav Bhaji",
        "category": "meal",
        "cost_per_portion_inr": 30.0,
        "price_inr": 70.0,
        "portion_weight_g": 250.0,
        "shelf_life_hours": 5.0,
        "batch_size": 10,
        "is_reusable": True,
        "reuse_suggestion": "Use surplus bhaji as filling for grilled veg cheese rolls or potato-bhaji cutlets."
    },
    {
        "name": "Veg Biryani",
        "category": "meal",
        "cost_per_portion_inr": 35.0,
        "price_inr": 85.0,
        "portion_weight_g": 350.0,
        "shelf_life_hours": 5.0,
        "batch_size": 20,
        "is_reusable": True,
        "reuse_suggestion": "Refrigerate safe surplus rice immediately to make Schezwan Fried Rice special tomorrow."
    },
    {
        "name": "Poha",
        "category": "snack",
        "cost_per_portion_inr": 12.0,
        "price_inr": 30.0,
        "portion_weight_g": 160.0,
        "shelf_life_hours": 4.0,
        "batch_size": 15,
        "is_reusable": False,
        "reuse_suggestion": "Donate unserved portions within 2 hours or compost."
    },
    {
        "name": "Masala Chai",
        "category": "beverage",
        "cost_per_portion_inr": 4.0,
        "price_inr": 12.0,
        "portion_weight_g": 120.0,
        "shelf_life_hours": 2.0,
        "batch_size": 25,
        "is_reusable": False,
        "reuse_suggestion": "Brew fresh in smaller staggered batches of 25 cups."
    },
    {
        "name": "Chapati Meal",
        "category": "meal",
        "cost_per_portion_inr": 22.0,
        "price_inr": 55.0,
        "portion_weight_g": 300.0,
        "shelf_life_hours": 5.0,
        "batch_size": 20,
        "is_reusable": True,
        "reuse_suggestion": "Repurpose warm leftover chapatis into paneer/veg kathi rolls for evening snack counter."
    },
    {
        "name": "Cold Coffee",
        "category": "beverage",
        "cost_per_portion_inr": 15.0,
        "price_inr": 45.0,
        "portion_weight_g": 220.0,
        "shelf_life_hours": 12.0,
        "batch_size": 10,
        "is_reusable": False,
        "reuse_suggestion": "Keep chilled in commercial cooler; run 20% discount happy-hour before close."
    },
    {
        "name": "Gulab Jamun",
        "category": "dessert",
        "cost_per_portion_inr": 10.0,
        "price_inr": 25.0,
        "portion_weight_g": 80.0,
        "shelf_life_hours": 36.0,
        "batch_size": 20,
        "is_reusable": True,
        "reuse_suggestion": "Store in sugar syrup in food-grade refrigerated container; safe to serve next 24-36 hrs."
    },
    {
        "name": "Idli Sambar",
        "category": "snack",
        "cost_per_portion_inr": 16.0,
        "price_inr": 40.0,
        "portion_weight_g": 200.0,
        "shelf_life_hours": 4.0,
        "batch_size": 20,
        "is_reusable": False,
        "reuse_suggestion": "Best served piping hot; stage steaming in half-batches."
    },
    {
        "name": "Rajma Chawal",
        "category": "meal",
        "cost_per_portion_inr": 30.0,
        "price_inr": 70.0,
        "portion_weight_g": 350.0,
        "shelf_life_hours": 5.0,
        "batch_size": 15,
        "is_reusable": True,
        "reuse_suggestion": "Surplus rajma can be mashed into savory cutlets or soup base."
    }
]

# Typical slot mappings
SLOT_ITEMS = {
    "breakfast": ["Poha", "Idli Sambar", "Masala Dosa", "Masala Chai"],
    "lunch": ["Veg Thali", "Veg Biryani", "Chapati Meal", "Rajma Chawal", "Gulab Jamun", "Cold Coffee"],
    "snacks": ["Samosa", "Pav Bhaji", "Masala Dosa", "Masala Chai", "Cold Coffee"],
    "dinner": ["Veg Thali", "Pav Bhaji", "Chapati Meal", "Gulab Jamun"]
}

ITEM_BASE_ATTACH_RATES = {
    "Samosa": 0.22,
    "Veg Thali": 0.32,
    "Masala Dosa": 0.16,
    "Pav Bhaji": 0.18,
    "Veg Biryani": 0.26,
    "Poha": 0.20,
    "Masala Chai": 0.38,
    "Chapati Meal": 0.24,
    "Cold Coffee": 0.14,
    "Gulab Jamun": 0.15,
    "Idli Sambar": 0.19,
    "Rajma Chawal": 0.21
}

def seed_database(db: Session, days: int = 90):
    # Ensure default settings exist
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting(
            service_level="Balanced",
            ngo_contact="Robin Hood Army Mess Contact (+91 98765 43210)",
            ngo_pickup_window="15:30 - 16:30",
            co2_per_kg_food=2.5,
            currency="₹"
        )
        db.add(setting)
        db.commit()

    # Clear existing data
    db.query(SalesLog).delete()
    db.query(DailyMenu).delete()
    db.query(DailyContext).delete()
    db.query(Recommendation).delete()
    db.query(Stock).delete()
    db.commit()

    # Insert or update menu items
    name_to_item = {}
    for item_data in DEFAULT_MENU_ITEMS:
        item = db.query(MenuItem).filter(MenuItem.name == item_data["name"]).first()
        if not item:
            item = MenuItem(**item_data)
            db.add(item)
            db.commit()
            db.refresh(item)
        else:
            for k, v in item_data.items():
                setattr(item, k, v)
            db.commit()
            db.refresh(item)
        name_to_item[item.name] = item

    # Generate synthetic 90 days
    today = datetime.now().date()
    start_date = today - timedelta(days=days)

    # Pick specific exam periods (days 35-45 and days 75-80)
    # Pick holidays (around 5 days scattered)
    holidays_set = set([
        start_date + timedelta(days=12),
        start_date + timedelta(days=26),
        start_date + timedelta(days=48),
        start_date + timedelta(days=64),
        start_date + timedelta(days=82)
    ])

    random.seed(42)  # Reproducible realistic history

    for d in range(days):
        current_date = start_date + timedelta(days=d)
        date_str = current_date.strftime("%Y-%m-%d")
        weekday_name = current_date.strftime("%A")
        is_weekend = weekday_name in ["Saturday", "Sunday"]

        # Check exam window
        is_exam = (35 <= d <= 44) or (75 <= d <= 81)
        is_holiday = current_date in holidays_set

        # Weather generation
        weather_rand = random.random()
        if weather_rand < 0.20:
            weather = "rainy"
        elif weather_rand < 0.45:
            weather = "hot"
        else:
            weather = "cool"

        # Base attendance by day of week
        if is_holiday:
            base_att = random.randint(250, 400)
        elif weekday_name == "Sunday":
            base_att = random.randint(350, 500)
        elif weekday_name == "Saturday":
            base_att = random.randint(650, 850)
        else:
            base_att = random.randint(1150, 1450)

        # Apply exam drop
        if is_exam and not is_holiday:
            base_att = int(base_att * random.uniform(0.68, 0.78))

        # Iterate over all 4 meal slots
        for slot in ["breakfast", "lunch", "snacks", "dinner"]:
            # Slot-specific attendance factor
            slot_factors = {
                "breakfast": random.uniform(0.40, 0.55),
                "lunch": random.uniform(0.85, 1.05),
                "snacks": random.uniform(0.50, 0.70),
                "dinner": random.uniform(0.65, 0.85)
            }
            slot_expected = int(base_att * slot_factors[slot])
            actual_att = int(slot_expected * random.uniform(0.92, 1.06))

            event_note = None
            if is_exam:
                event_note = "Semester Midterm Exam Week"
            elif is_holiday:
                event_note = "Campus Holiday / Restricted Access"

            # Create DailyContext
            context = DailyContext(
                date=date_str,
                meal_slot=slot,
                expected_attendance=slot_expected,
                actual_attendance=actual_att,
                weekday=weekday_name,
                weather=weather,
                is_exam_day=is_exam,
                is_holiday=is_holiday,
                event_note=event_note
            )
            db.add(context)

            # Slot items
            slot_item_names = SLOT_ITEMS[slot]
            for item_name in slot_item_names:
                item = name_to_item[item_name]

                # Link daily menu
                daily_menu_entry = DailyMenu(
                    date=date_str,
                    meal_slot=slot,
                    item_id=item.id
                )
                db.add(daily_menu_entry)

                # Base attach rate
                base_attach = ITEM_BASE_ATTACH_RATES.get(item.name, 0.20)

                # Weather modifier
                weather_mod = 1.0
                if weather == "rainy":
                    if item.category == "snack" or item.name in ["Samosa", "Masala Chai", "Pav Bhaji"]:
                        weather_mod = 1.35
                    elif item.name == "Cold Coffee":
                        weather_mod = 0.65
                elif weather == "hot":
                    if item.name == "Cold Coffee":
                        weather_mod = 1.60
                    elif item.name in ["Masala Chai", "Veg Thali"]:
                        weather_mod = 0.85

                # True demand
                noise = random.uniform(0.88, 1.12)
                true_demand = max(5, int(actual_att * base_attach * weather_mod * noise))

                # Optimal SmartServe forecast & recommendation (what AI would predict)
                p50 = float(int(slot_expected * base_attach * weather_mod))
                p10 = float(max(5, int(p50 * 0.82)))
                p90 = float(int(p50 * 1.20))
                batch_size = item.batch_size
                # Round to batch size
                smartserve_rec = int(((p50 + batch_size - 1) // batch_size) * batch_size)

                # Historical manager preparation behavior (Gut-feel baseline)
                # Baseline manager often overprepares by 18% to 35% on average to avoid running out,
                # BUT on rainy days with sudden snack spikes, manager often underprepares (stockout!).
                if weather == "rainy" and item.name in ["Samosa", "Masala Chai"]:
                    # Under-prepared by gut feel
                    manager_prep = int(true_demand * random.uniform(0.70, 0.88))
                    manager_prep = max(batch_size, (manager_prep // batch_size) * batch_size)
                    sold_qty = manager_prep
                    leftover_qty = 0
                    stockout_time = "17:15" if slot == "snacks" else "13:30"
                else:
                    # Over-prepared baseline
                    overprep_factor = random.uniform(1.15, 1.35)
                    manager_prep = int(true_demand * overprep_factor)
                    manager_prep = max(batch_size, ((manager_prep + batch_size - 1) // batch_size) * batch_size)
                    sold_qty = min(manager_prep, true_demand)
                    leftover_qty = max(0, manager_prep - sold_qty)
                    stockout_time = None

                # Sales Log entry
                sales_log = SalesLog(
                    date=date_str,
                    meal_slot=slot,
                    item_id=item.id,
                    prepared_qty=manager_prep,
                    sold_qty=sold_qty,
                    leftover_qty=leftover_qty,
                    stockout_time=stockout_time,
                    recommended_qty=smartserve_rec,
                    manager_override_qty=manager_prep
                )
                db.add(sales_log)

                # Recommendation entry for records
                risk_label = "Balanced"
                if leftover_qty > (manager_prep * 0.20):
                    risk_label = "Waste risk"
                elif stockout_time is not None:
                    risk_label = "Stock-out risk"

                rec_entry = Recommendation(
                    date=date_str,
                    meal_slot=slot,
                    item_id=item.id,
                    p10=p10,
                    p50=p50,
                    p90=p90,
                    recommended_qty=smartserve_rec,
                    risk_label=risk_label,
                    explanation=f"Forecast based on expected attendance ({slot_expected}) and {weather} weather attach rate.",
                    service_level="Balanced"
                )
                db.add(rec_entry)

    db.commit()

    # Create carryover stock for today's usable items
    for item in db.query(MenuItem).filter(MenuItem.is_reusable == True).all():
        stock_qty = random.randint(5, 20)
        now = datetime.utcnow()
        stock = Stock(
            item_id=item.id,
            qty=stock_qty,
            cooked_at=now - timedelta(hours=2),
            expires_at=now + timedelta(hours=int(item.shelf_life_hours - 2)),
            source_date=today.strftime("%Y-%m-%d"),
            is_used=False
        )
        db.add(stock)

    db.commit()
    return {"status": "success", "days_seeded": days, "message": f"Successfully generated {days} days of realistic canteen sales data."}
