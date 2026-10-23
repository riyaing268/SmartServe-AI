from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# --- Menu Item Schemas ---
class MenuItemBase(BaseModel):
    name: str
    category: str  # snack, meal, beverage, dessert
    cost_per_portion_inr: float = Field(gt=0)
    price_inr: float = Field(gt=0)
    portion_weight_g: float = Field(gt=0)
    shelf_life_hours: float = Field(gt=0)
    batch_size: int = Field(default=10, gt=0)
    is_reusable: bool = False
    reuse_suggestion: Optional[str] = None

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    cost_per_portion_inr: Optional[float] = None
    price_inr: Optional[float] = None
    portion_weight_g: Optional[float] = None
    shelf_life_hours: Optional[float] = None
    batch_size: Optional[int] = None
    is_reusable: Optional[bool] = None
    reuse_suggestion: Optional[str] = None

class MenuItemResponse(MenuItemBase):
    id: int

    model_config = {"from_attributes": True}


# --- Context Schemas ---
class DailyContextBase(BaseModel):
    date: str
    meal_slot: str
    expected_attendance: int
    actual_attendance: Optional[int] = None
    weekday: str
    weather: str = "cool"
    is_exam_day: bool = False
    is_holiday: bool = False
    event_note: Optional[str] = None

class DailyContextCreate(DailyContextBase):
    pass

class DailyContextResponse(DailyContextBase):
    id: int

    model_config = {"from_attributes": True}


# --- Menu Selection Schemas ---
class DailyMenuCreate(BaseModel):
    date: str
    meal_slot: str
    item_ids: List[int]

class DailyMenuResponse(BaseModel):
    date: str
    meal_slot: str
    items: List[MenuItemResponse]


# --- Recommendations ---
class RecommendationResponse(BaseModel):
    id: int
    date: str
    meal_slot: str
    item_id: int
    item_name: str
    category: str
    p10: float
    p50: float
    p90: float
    recommended_qty: int
    usable_leftover: int = 0
    batch_size: int
    cost_per_portion_inr: float
    price_inr: float
    risk_label: str
    explanation: str
    service_level: str
    manager_override_qty: Optional[int] = None

    model_config = {"from_attributes": True}

class RecommendationOverrideRequest(BaseModel):
    override_qty: int = Field(ge=0)


# --- Daily Logs & Mid-Service ---
class CloseDayItem(BaseModel):
    item_id: int
    prepared_qty: int = Field(ge=0)
    sold_qty: int = Field(ge=0)
    leftover_qty: int = Field(ge=0)
    stockout_time: Optional[str] = None

class CloseDayRequest(BaseModel):
    date: str
    meal_slot: str
    actual_attendance: Optional[int] = None
    items: List[CloseDayItem]

class MidServiceItem(BaseModel):
    item_id: int
    sold_so_far: int = Field(ge=0)
    prepared_qty: int = Field(ge=0)

class MidServiceRequest(BaseModel):
    date: str
    meal_slot: str
    items: List[MidServiceItem]
    minutes_remaining: int = 60

class MidServiceItemAction(BaseModel):
    item_id: int
    item_name: str
    sold_so_far: int
    prepared_qty: int
    projected_remaining_demand: int
    projected_total_demand: int
    action: str  # "Cook extra batch of X", "Stop cooking (sufficient stock)", "Balanced"
    suggested_additional_batches: int
    suggested_additional_qty: int
    urgency: str  # High, Normal, Low

class MidServiceResponse(BaseModel):
    date: str
    meal_slot: str
    minutes_remaining: int
    recommendations: List[MidServiceItemAction]


# --- Daily Briefing ---
class BriefingItem(BaseModel):
    item_name: str
    category: str
    recommended_qty: int
    risk_label: str
    action_suggestion: str

class DailyBriefingResponse(BaseModel):
    date: str
    meal_slot: str
    summary_text: str
    top_risks: List[BriefingItem]
    weather_impact: str
    repurpose_opportunities: List[str]


# --- AI Agent ---
class AgentChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = "default"

class ToolCallLog(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    result: Any

class AgentChatResponse(BaseModel):
    reply: str
    tool_calls: List[ToolCallLog] = []


# --- Settings ---
class SettingBase(BaseModel):
    service_level: str = "Balanced"
    ngo_contact: str = "Robin Hood Army Mess Contact (+91 98765 43210)"
    ngo_pickup_window: str = "15:30 - 16:30"
    co2_per_kg_food: float = 2.5
    currency: str = "₹"

class SettingUpdate(BaseModel):
    service_level: Optional[str] = None
    ngo_contact: Optional[str] = None
    ngo_pickup_window: Optional[str] = None
    co2_per_kg_food: Optional[float] = None
    currency: Optional[str] = None

class SettingResponse(SettingBase):
    id: int

    model_config = {"from_attributes": True}


# --- Model Health & Dashboard ---
class ModelHealthResponse(BaseModel):
    model_name: str
    wape_percentage: float
    mape_percentage: float
    total_training_days: int
    status: str
    evaluation_range: str

class TopWastedItem(BaseModel):
    name: str
    category: str
    waste_kg: float
    waste_inr: float
    waste_portions: int

class TopStockoutItem(BaseModel):
    name: str
    category: str
    stockout_count: int

class WasteTrendPoint(BaseModel):
    date: str
    waste_kg: float
    waste_inr: float
    prepared_kg: float
    sold_kg: float
    baseline_waste_kg: float
    smartserve_waste_kg: float

class PrepVsSoldItem(BaseModel):
    item_name: str
    prepared_qty: int
    sold_qty: int
    leftover_qty: int

class DashboardResponse(BaseModel):
    total_waste_kg: float
    total_waste_inr: float
    waste_percentage: float
    stockout_events: int
    co2_avoided_kg: float
    baseline_waste_kg: float
    smartserve_waste_kg: float
    waste_reduction_pct: float
    total_meals_served: int
    waste_trends: List[WasteTrendPoint]
    prep_vs_sold: List[PrepVsSoldItem]
    top_wasted: List[TopWastedItem]
    top_stockouts: List[TopStockoutItem]
