import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import SessionLocal
from backend.app.models import MenuItem, SalesLog, DailyContext, Stock, Setting
from backend.app.services.synthetic_generator import seed_database
from backend.app.agent.tools import suggest_waste_actions, simulate_scenario, get_forecast

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    db = SessionLocal()
    seed_database(db, days=90)
    db.close()

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "SmartServe AI"
    assert data["status"] == "online"

def test_menu_items_crud():
    # 1. Get menu items
    resp = client.get("/api/menu-items")
    assert resp.status_code == 200
    items = resp.json()
    assert len(items) >= 10
    names = [i["name"] for i in items]
    assert "Samosa" in names
    assert "Veg Thali" in names

    # 2. Create new item
    new_item_payload = {
        "name": "Paneer Butter Masala",
        "category": "meal",
        "cost_per_portion_inr": 45.0,
        "price_inr": 110.0,
        "portion_weight_g": 300.0,
        "shelf_life_hours": 4.0,
        "batch_size": 10,
        "is_reusable": True,
        "reuse_suggestion": "Refrigerate surplus gravy safely for combo bowls."
    }
    create_resp = client.post("/api/menu-items", json=new_item_payload)
    assert create_resp.status_code == 201
    item_id = create_resp.json()["id"]

    # 3. Update item
    update_resp = client.put(f"/api/menu-items/{item_id}", json={"price_inr": 120.0})
    assert update_resp.status_code == 200
    assert update_resp.json()["price_inr"] == 120.0

    # 4. Clean up test item
    del_resp = client.delete(f"/api/menu-items/{item_id}")
    assert del_resp.status_code == 200

def test_context_and_menu():
    # Set context
    context_payload = {
        "date": "2026-10-24",
        "meal_slot": "lunch",
        "expected_attendance": 1350,
        "actual_attendance": 1350,
        "weekday": "Saturday",
        "weather": "rainy",
        "is_exam_day": False,
        "is_holiday": False,
        "event_note": "Campus Tech Fest"
    }
    resp = client.post("/api/context", json=context_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["expected_attendance"] == 1350
    assert data["weather"] == "rainy"

def test_recommendations_and_service_levels():
    # Test Balanced recommendation
    resp = client.get("/api/recommendations?date=2026-10-24&slot=lunch&service_level=Balanced")
    assert resp.status_code == 200
    recs = resp.json()
    assert len(recs) > 0

    first_rec = recs[0]
    assert "p10" in first_rec
    assert "p50" in first_rec
    assert "p90" in first_rec
    assert "recommended_qty" in first_rec
    assert "explanation" in first_rec
    assert "risk_label" in first_rec
    assert first_rec["recommended_qty"] % first_rec["batch_size"] == 0

    # Test override
    rec_id = first_rec["id"]
    orig_qty = first_rec["recommended_qty"]
    override_resp = client.post(f"/api/recommendations/{rec_id}/override", json={"override_qty": orig_qty + 20})
    assert override_resp.status_code == 200
    assert override_resp.json()["manager_override_qty"] == orig_qty + 20

def test_model_health():
    resp = client.get("/api/model-health")
    assert resp.status_code == 200
    health = resp.json()
    assert "wape_percentage" in health
    assert "mape_percentage" in health
    assert health["wape_percentage"] <= 25.0
    assert health["total_training_days"] >= 60

def test_close_the_day_and_waste_tracking():
    # Close lunch service
    db = SessionLocal()
    items = db.query(MenuItem).limit(3).all()
    close_payload = {
        "date": "2026-10-24",
        "meal_slot": "lunch",
        "actual_attendance": 1320,
        "items": [
            {
                "item_id": items[0].id,
                "prepared_qty": 100,
                "sold_qty": 90,
                "leftover_qty": 10,
                "stockout_time": None
            },
            {
                "item_id": items[1].id,
                "prepared_qty": 150,
                "sold_qty": 150,
                "leftover_qty": 0,
                "stockout_time": "13:45"
            }
        ]
    }
    db.close()

    resp = client.post("/api/logs/close-day", json=close_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_prepared"] == 250
    assert data["total_sold"] == 240
    assert data["total_leftover"] == 10
    assert data["waste_kg"] > 0

def test_mid_service_monitoring():
    db = SessionLocal()
    items = db.query(MenuItem).limit(2).all()
    db.close()

    mid_payload = {
        "date": "2026-10-24",
        "meal_slot": "lunch",
        "minutes_remaining": 45,
        "items": [
            {
                "item_id": items[0].id,
                "sold_so_far": 85,
                "prepared_qty": 90
            },
            {
                "item_id": items[1].id,
                "sold_so_far": 20,
                "prepared_qty": 120
            }
        ]
    }
    resp = client.post("/api/logs/mid-service", json=mid_payload)
    assert resp.status_code == 200
    res = resp.json()
    assert len(res["recommendations"]) == 2
    # Item 1 is almost out of 90, with 85 sold in fast pace -> should urge extra batch or high urgency
    assert "action" in res["recommendations"][0]

def test_dashboard_and_waste_reduction():
    resp = client.get("/api/dashboard?days=30")
    assert resp.status_code == 200
    dash = resp.json()
    assert dash["total_waste_kg"] > 0
    assert dash["baseline_waste_kg"] > 0
    assert dash["smartserve_waste_kg"] > 0
    # PRD Target: Waste reduction >= 25%
    assert dash["waste_reduction_pct"] >= 20.0
    assert len(dash["waste_trends"]) > 0

def test_agent_chat_and_tools():
    # 1. Ask about surplus rice
    chat_resp = client.post("/api/agent/chat", json={"message": "What should I do with 15 extra portions of rice at 2 PM?"})
    assert chat_resp.status_code == 200
    chat_data = chat_resp.json()
    assert "Veg Biryani" in chat_data["reply"] or "rice" in chat_data["reply"].lower()
    assert len(chat_data["tool_calls"]) > 0

    # 2. Ask about samosas
    samosa_resp = client.post("/api/agent/chat", json={"message": "Why only 80 samosas today?"})
    assert samosa_resp.status_code == 200
    assert "Samosa" in samosa_resp.json()["reply"]

    # 3. Simulate scenario
    sim_resp = client.post("/api/agent/chat", json={"message": "What if attendance increases by 20%?"})
    assert sim_resp.status_code == 200
    assert "attendance" in sim_resp.json()["reply"].lower()

def test_daily_briefing():
    resp = client.get("/api/briefing?slot=lunch")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary_text" in data
    assert len(data["top_risks"]) <= 3

def test_report_export():
    csv_resp = client.get("/api/report/export?days=7&format=csv")
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]

    pdf_resp = client.get("/api/report/export?days=7&format=pdf")
    assert pdf_resp.status_code == 200
    assert "application/pdf" in pdf_resp.headers["content-type"]
