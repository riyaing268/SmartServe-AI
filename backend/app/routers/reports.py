import io
import csv
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import SalesLog, MenuItem, DailyContext, Setting

router = APIRouter(prefix="/api/report", tags=["report"])

@router.get("/export")
def export_report(
    days: int = Query(30, description="Export window: 7, 30, 90 days"),
    format: str = Query("csv", description="Format: csv or pdf"),
    db: Session = Depends(get_db)
):
    today = datetime.now().date()
    start_date = (today - timedelta(days=days)).strftime("%Y-%m-%d")

    setting = db.query(Setting).first()
    co2_factor = setting.co2_per_kg_food if setting else 2.5

    logs = (
        db.query(SalesLog, MenuItem)
        .join(MenuItem, SalesLog.item_id == MenuItem.id)
        .filter(SalesLog.date >= start_date)
        .order_by(SalesLog.date.desc(), SalesLog.meal_slot.asc())
        .all()
    )

    if format.lower() == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Date", "Meal Slot", "Item Name", "Category",
            "Prepared Qty", "Sold Qty", "Leftover Qty",
            "Portion Weight (g)", "Waste (kg)", "Cost (INR)", "Waste Loss (INR)",
            "Stockout Time"
        ])

        for log, item in logs:
            waste_kg = (log.leftover_qty * item.portion_weight_g) / 1000.0
            waste_inr = log.leftover_qty * item.cost_per_portion_inr
            writer.writerow([
                log.date,
                log.meal_slot,
                item.name,
                item.category,
                log.prepared_qty,
                log.sold_qty,
                log.leftover_qty,
                item.portion_weight_g,
                round(waste_kg, 2),
                item.cost_per_portion_inr,
                round(waste_inr, 2),
                log.stockout_time or ""
            ])

        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=smartserve_report_{days}d.csv"}
        )

    elif format.lower() == "pdf":
        try:
            from fpdf import FPDF
        except ImportError:
            raise HTTPException(status_code=500, detail="FPDF2 library is required for PDF generation.")

        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # Header
        pdf.set_font("Helvetica", "B", 18)
        pdf.set_text_color(16, 120, 60)  # Forest Green
        pdf.cell(0, 10, "SmartServe AI - Food Waste Reduction Report", ln=True, align="C")

        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')} | Window: Last {days} Days", ln=True, align="C")
        pdf.ln(6)

        # Compute summary
        total_prep = sum(l.prepared_qty for l, _ in logs)
        total_sold = sum(l.sold_qty for l, _ in logs)
        total_left = sum(l.leftover_qty for l, _ in logs)
        total_waste_kg = sum((l.leftover_qty * item.portion_weight_g) / 1000.0 for l, item in logs)
        total_waste_inr = sum(l.leftover_qty * item.cost_per_portion_inr for l, item in logs)
        co2e = total_waste_kg * co2_factor

        # Summary Box
        pdf.set_fill_color(240, 248, 240)
        pdf.rect(14, pdf.get_y(), 182, 32, "F")
        pdf.set_xy(18, pdf.get_y() + 4)
        pdf.set_font("Helvetica", "B", 11)
        pdf.set_text_color(20, 50, 20)
        pdf.cell(0, 6, "Executive Summary & Impact Metrics", ln=True)

        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(40, 40, 40)
        pdf.set_x(18)
        pdf.cell(60, 5, f"Total Prepared: {total_prep:,} portions")
        pdf.cell(60, 5, f"Total Sold: {total_sold:,} portions")
        pdf.cell(60, 5, f"Surplus Leftover: {total_left:,} portions", ln=True)

        pdf.set_x(18)
        waste_pct = (total_left / max(1, total_prep)) * 100.0
        pdf.cell(60, 5, f"Waste Rate: {waste_pct:.1f}%")
        pdf.cell(60, 5, f"Waste Weight: {total_waste_kg:.1f} kg")
        pdf.cell(60, 5, f"Financial Loss: Rs. {total_waste_inr:,.0f}", ln=True)

        pdf.set_x(18)
        pdf.cell(0, 5, f"Estimated CO2e Impact: {co2e:.1f} kg CO2e avoided with SmartServe recommendations.", ln=True)
        pdf.ln(10)

        # Table Header
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_fill_color(220, 235, 220)
        pdf.set_text_color(0, 0, 0)
        pdf.cell(26, 7, "Date", border=1, fill=True)
        pdf.cell(22, 7, "Slot", border=1, fill=True)
        pdf.cell(42, 7, "Item Name", border=1, fill=True)
        pdf.cell(22, 7, "Prepared", border=1, fill=True)
        pdf.cell(20, 7, "Sold", border=1, fill=True)
        pdf.cell(22, 7, "Leftover", border=1, fill=True)
        pdf.cell(28, 7, "Waste (kg)", border=1, fill=True, ln=True)

        # Table Rows (Top 40 rows to fit nicely)
        pdf.set_font("Helvetica", "", 8)
        for log, item in logs[:40]:
            waste_kg = (log.leftover_qty * item.portion_weight_g) / 1000.0
            pdf.cell(26, 6, str(log.date), border=1)
            pdf.cell(22, 6, str(log.meal_slot).capitalize(), border=1)
            pdf.cell(42, 6, str(item.name)[:22], border=1)
            pdf.cell(22, 6, str(log.prepared_qty), border=1)
            pdf.cell(20, 6, str(log.sold_qty), border=1)
            pdf.cell(22, 6, str(log.leftover_qty), border=1)
            pdf.cell(28, 6, f"{waste_kg:.1f}", border=1, ln=True)

        pdf_bytes = bytes(pdf.output())
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=smartserve_report_{days}d.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid format. Supported: csv, pdf")
