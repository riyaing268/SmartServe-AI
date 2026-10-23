from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from ..models import MenuItem, Stock, Recommendation, SalesLog, Setting
from .forecast import forecaster

class RecommendationEngine:
    def generate_recommendations(
        self,
        db: Session,
        items: List[MenuItem],
        date: str,
        slot: str,
        expected_attendance: int,
        weather: str,
        is_exam_day: bool,
        is_holiday: bool,
        service_level: str = "Balanced"
    ) -> List[Dict[str, Any]]:
        results = []
        now = datetime.utcnow()

        for item in items:
            # 1. Demand Forecast
            fc = forecaster.predict(
                db=db,
                item=item,
                target_date=date,
                slot=slot,
                expected_attendance=expected_attendance,
                weather=weather,
                is_exam_day=is_exam_day,
                is_holiday=is_holiday
            )
            p10 = fc["p10"]
            p50 = fc["p50"]
            p90 = fc["p90"]

            # 2. Service level buffer selection
            if service_level == "Conservative":
                base_target = p90
            elif service_level == "Lean":
                base_target = p50
            else:  # Balanced = P70
                base_target = p50 + 0.50 * (p90 - p50)

            # 3. Margin & Cost adjustment
            margin = (item.price_inr - item.cost_per_portion_inr) / max(1.0, item.price_inr)
            if margin >= 0.60:
                # High-margin items: add small buffer (+5%) to prevent stock-out
                base_target *= 1.05
            elif item.shelf_life_hours <= 4.0 and not item.is_reusable:
                # Perishable and non-reusable: tighten buffer by 5%
                base_target *= 0.95

            # 4. Check usable leftover stock
            usable_stock_qty = 0
            if item.is_reusable:
                valid_stocks = db.query(Stock).filter(
                    Stock.item_id == item.id,
                    Stock.is_used == False,
                    Stock.expires_at > now
                ).all()
                usable_stock_qty = sum(s.qty for s in valid_stocks)

            # Deduct leftover stock
            net_needed = max(0.0, base_target - usable_stock_qty)

            # 5. Round to practical batch sizes
            batch = max(1, item.batch_size)
            if net_needed == 0:
                recommended_qty = 0
            else:
                batches_needed = int((net_needed + batch - 1) // batch)
                recommended_qty = batches_needed * batch

            # 6. Determine Risk Label
            risk_label = "Balanced"
            if weather == "rainy" and (item.category == "snack" or item.name in ["Samosa", "Masala Chai"]):
                risk_label = "Stock-out risk"
            elif weather == "hot" and item.name == "Cold Coffee":
                risk_label = "Stock-out risk"
            elif usable_stock_qty > (p50 * 0.35) or (is_exam_day and not item.is_reusable):
                risk_label = "Waste risk"
            elif recommended_qty > (p90 * 1.15):
                risk_label = "Waste risk"

            # 7. Plain-language explanation grounded in exact numbers
            explanation = self._build_explanation(
                item=item,
                expected_attendance=expected_attendance,
                weather=weather,
                is_exam_day=is_exam_day,
                is_holiday=is_holiday,
                usable_stock=usable_stock_qty,
                p50=int(p50),
                recommended_qty=recommended_qty,
                batch_size=batch,
                service_level=service_level
            )

            # Check if an existing override exists for this item today
            existing_rec = db.query(Recommendation).filter(
                Recommendation.date == date,
                Recommendation.meal_slot == slot,
                Recommendation.item_id == item.id
            ).first()

            existing_log = db.query(SalesLog).filter(
                SalesLog.date == date,
                SalesLog.meal_slot == slot,
                SalesLog.item_id == item.id
            ).first()

            override_qty = existing_log.manager_override_qty if existing_log else None

            # Persist / update recommendation in DB
            if not existing_rec:
                existing_rec = Recommendation(
                    date=date,
                    meal_slot=slot,
                    item_id=item.id,
                    p10=p10,
                    p50=p50,
                    p90=p90,
                    recommended_qty=recommended_qty,
                    risk_label=risk_label,
                    explanation=explanation,
                    service_level=service_level
                )
                db.add(existing_rec)
            else:
                existing_rec.p10 = p10
                existing_rec.p50 = p50
                existing_rec.p90 = p90
                existing_rec.recommended_qty = recommended_qty
                existing_rec.risk_label = risk_label
                existing_rec.explanation = explanation
                existing_rec.service_level = service_level

            db.commit()
            db.refresh(existing_rec)

            results.append({
                "id": existing_rec.id,
                "date": date,
                "meal_slot": slot,
                "item_id": item.id,
                "item_name": item.name,
                "category": item.category,
                "p10": p10,
                "p50": p50,
                "p90": p90,
                "recommended_qty": recommended_qty,
                "usable_leftover": usable_stock_qty,
                "batch_size": batch,
                "cost_per_portion_inr": item.cost_per_portion_inr,
                "price_inr": item.price_inr,
                "risk_label": risk_label,
                "explanation": explanation,
                "service_level": service_level,
                "manager_override_qty": override_qty
            })

        return results

    def _build_explanation(
        self,
        item: MenuItem,
        expected_attendance: int,
        weather: str,
        is_exam_day: bool,
        is_holiday: bool,
        usable_stock: int,
        p50: int,
        recommended_qty: int,
        batch_size: int,
        service_level: str
    ) -> str:
        parts = [f"Expected attendance is {expected_attendance:,}."]

        if weather == "rainy":
            if item.category == "snack" or item.name in ["Samosa", "Masala Chai"]:
                parts.append("Cool rainy weather historically increases snack & hot beverage attach rate by ~35%.")
        elif weather == "hot" and item.name == "Cold Coffee":
            parts.append("Warm weather drives a sharp increase in chilled beverage demand.")

        if is_exam_day:
            parts.append("Exam period causes an average ~25% dip in dining hall traffic.")
        elif is_holiday:
            parts.append("Campus holiday reduces overall footfall significantly.")

        if usable_stock > 0:
            parts.append(f"{usable_stock} unexpired portions are safely available from leftover stock and were deducted.")

        batches = recommended_qty // batch_size if batch_size > 0 else recommended_qty
        parts.append(
            f"Under {service_level} service level, recommendation is {recommended_qty} portions ({batches} batches of {batch_size})."
        )
        return " ".join(parts)

recommender = RecommendationEngine()
