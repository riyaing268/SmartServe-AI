from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import SalesLog, MenuItem, DailyContext, Setting
from ..schemas import (
    DashboardResponse, WasteTrendPoint, PrepVsSoldItem,
    TopWastedItem, TopStockoutItem
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardResponse)
def get_dashboard_metrics(
    days: int = Query(30, description="Date window: 7, 30, 90 days"),
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")

    setting = db.query(Setting).first()
    co2_factor = setting.co2_per_kg_food if setting else 2.5

    # Fetch logs within date range
    logs = (
        db.query(SalesLog, MenuItem)
        .join(MenuItem, SalesLog.item_id == MenuItem.id)
        .filter(SalesLog.date >= start_date)
        .all()
    )

    if not logs:
        return DashboardResponse(
            total_waste_kg=0.0,
            total_waste_inr=0.0,
            waste_percentage=0.0,
            stockout_events=0,
            co2_avoided_kg=0.0,
            baseline_waste_kg=0.0,
            smartserve_waste_kg=0.0,
            waste_reduction_pct=0.0,
            total_meals_served=0,
            waste_trends=[],
            prep_vs_sold=[],
            top_wasted=[],
            top_stockouts=[]
        )

    total_prep_qty = 0
    total_sold_qty = 0
    total_left_qty = 0
    total_waste_kg = 0.0
    total_waste_inr = 0.0
    stockout_count = 0

    baseline_waste_kg = 0.0
    smartserve_waste_kg = 0.0

    # Group by date for trends
    date_map = {}
    item_stats = {}

    for log, item in logs:
        prep = log.prepared_qty
        sold = log.sold_qty
        left = max(0, log.leftover_qty)
        rec = log.recommended_qty if log.recommended_qty else sold

        total_prep_qty += prep
        total_sold_qty += sold
        total_left_qty += left

        item_waste_kg = (left * item.portion_weight_g) / 1000.0
        item_waste_inr = left * item.cost_per_portion_inr
        total_waste_kg += item_waste_kg
        total_waste_inr += item_waste_inr

        # Baseline vs SmartServe calculation
        # Baseline manager prepared 'prep'
        baseline_left = left
        baseline_waste_kg += (baseline_left * item.portion_weight_g) / 1000.0

        # SmartServe hypothetical leftover if 'rec' was prepared
        ss_prep = rec
        ss_sold = min(ss_prep, sold)
        ss_left = max(0, ss_prep - ss_sold)
        smartserve_waste_kg += (ss_left * item.portion_weight_g) / 1000.0

        if log.stockout_time:
            stockout_count += 1

        # Date trend accumulation
        d = log.date
        if d not in date_map:
            date_map[d] = {
                "waste_kg": 0.0,
                "waste_inr": 0.0,
                "prep_kg": 0.0,
                "sold_kg": 0.0,
                "baseline_waste_kg": 0.0,
                "smartserve_waste_kg": 0.0
            }

        w_kg = (left * item.portion_weight_g) / 1000.0
        p_kg = (prep * item.portion_weight_g) / 1000.0
        s_kg = (sold * item.portion_weight_g) / 1000.0
        date_map[d]["waste_kg"] += w_kg
        date_map[d]["waste_inr"] += item_waste_inr
        date_map[d]["prep_kg"] += p_kg
        date_map[d]["sold_kg"] += s_kg
        date_map[d]["baseline_waste_kg"] += (baseline_left * item.portion_weight_g) / 1000.0
        date_map[d]["smartserve_waste_kg"] += (ss_left * item.portion_weight_g) / 1000.0

        # Item accumulation
        if item.name not in item_stats:
            item_stats[item.name] = {
                "category": item.category,
                "prep": 0,
                "sold": 0,
                "left": 0,
                "waste_kg": 0.0,
                "waste_inr": 0.0,
                "stockouts": 0
            }
        item_stats[item.name]["prep"] += prep
        item_stats[item.name]["sold"] += sold
        item_stats[item.name]["left"] += left
        item_stats[item.name]["waste_kg"] += w_kg
        item_stats[item.name]["waste_inr"] += item_waste_inr
        if log.stockout_time:
            item_stats[item.name]["stockouts"] += 1

    # Trends sorted
    waste_trends = []
    for d in sorted(date_map.keys()):
        dm = date_map[d]
        waste_trends.append(WasteTrendPoint(
            date=d,
            waste_kg=round(dm["waste_kg"], 1),
            waste_inr=round(dm["waste_inr"], 1),
            prepared_kg=round(dm["prep_kg"], 1),
            sold_kg=round(dm["sold_kg"], 1),
            baseline_waste_kg=round(dm["baseline_waste_kg"], 1),
            smartserve_waste_kg=round(dm["smartserve_waste_kg"], 1)
        ))

    # Prep vs Sold
    prep_vs_sold = []
    for name, s in sorted(item_stats.items(), key=lambda x: x[1]["prep"], reverse=True)[:8]:
        prep_vs_sold.append(PrepVsSoldItem(
            item_name=name,
            prepared_qty=s["prep"],
            sold_qty=s["sold"],
            leftover_qty=s["left"]
        ))

    # Top wasted
    top_wasted = []
    for name, s in sorted(item_stats.items(), key=lambda x: x[1]["waste_kg"], reverse=True)[:5]:
        top_wasted.append(TopWastedItem(
            name=name,
            category=s["category"],
            waste_kg=round(s["waste_kg"], 1),
            waste_inr=round(s["waste_inr"], 1),
            waste_portions=s["left"]
        ))

    # Top stockouts
    top_stockouts = []
    for name, s in sorted(item_stats.items(), key=lambda x: x[1]["stockouts"], reverse=True)[:5]:
        if s["stockouts"] > 0:
            top_stockouts.append(TopStockoutItem(
                name=name,
                category=s["category"],
                stockout_count=s["stockouts"]
            ))

    # Waste reduction % achieved by SmartServe vs Baseline
    reduction_pct = 0.0
    if baseline_waste_kg > 0:
        reduction_pct = ((baseline_waste_kg - smartserve_waste_kg) / baseline_waste_kg) * 100.0
        reduction_pct = max(0.0, round(reduction_pct, 1))

    # Avoided CO2 = (baseline_waste_kg - smartserve_waste_kg) * co2_factor
    avoided_co2 = max(0.0, (baseline_waste_kg - smartserve_waste_kg) * co2_factor)

    return DashboardResponse(
        total_waste_kg=round(total_waste_kg, 1),
        total_waste_inr=round(total_waste_inr, 1),
        waste_percentage=round((total_left_qty / max(1, total_prep_qty)) * 100.0, 1),
        stockout_events=stockout_count,
        co2_avoided_kg=round(avoided_co2, 1),
        baseline_waste_kg=round(baseline_waste_kg, 1),
        smartserve_waste_kg=round(smartserve_waste_kg, 1),
        waste_reduction_pct=reduction_pct,
        total_meals_served=total_sold_qty,
        waste_trends=waste_trends,
        prep_vs_sold=prep_vs_sold,
        top_wasted=top_wasted,
        top_stockouts=top_stockouts
    )
