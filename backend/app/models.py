from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from .database import Base

class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    category = Column(String(50), nullable=False)  # snack, meal, beverage, dessert
    cost_per_portion_inr = Column(Float, nullable=False, default=10.0)
    price_inr = Column(Float, nullable=False, default=25.0)
    portion_weight_g = Column(Float, nullable=False, default=150.0)
    shelf_life_hours = Column(Float, nullable=False, default=4.0)
    batch_size = Column(Integer, nullable=False, default=10)
    is_reusable = Column(Boolean, nullable=False, default=False)
    reuse_suggestion = Column(Text, nullable=True)

    sales_logs = relationship("SalesLog", back_populates="item", cascade="all, delete-orphan")
    stocks = relationship("Stock", back_populates="item", cascade="all, delete-orphan")
    recommendations = relationship("Recommendation", back_populates="item", cascade="all, delete-orphan")
    daily_menu_items = relationship("DailyMenu", back_populates="item", cascade="all, delete-orphan")


class DailyContext(Base):
    __tablename__ = "daily_context"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    meal_slot = Column(String(20), nullable=False, index=True)  # breakfast, lunch, snacks, dinner
    expected_attendance = Column(Integer, nullable=False, default=1000)
    actual_attendance = Column(Integer, nullable=True)
    weekday = Column(String(15), nullable=False)  # Monday, Tuesday, ...
    weather = Column(String(20), nullable=False, default="cool")  # hot, cool, rainy
    is_exam_day = Column(Boolean, nullable=False, default=False)
    is_holiday = Column(Boolean, nullable=False, default=False)
    event_note = Column(Text, nullable=True)

    __table_args__ = (
        Index("idx_context_date_slot", "date", "meal_slot", unique=True),
    )


class DailyMenu(Base):
    __tablename__ = "daily_menu"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    meal_slot = Column(String(20), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)

    item = relationship("MenuItem", back_populates="daily_menu_items")

    __table_args__ = (
        Index("idx_daily_menu_date_slot_item", "date", "meal_slot", "item_id", unique=True),
    )


class SalesLog(Base):
    __tablename__ = "sales_log"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    meal_slot = Column(String(20), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    prepared_qty = Column(Integer, nullable=False, default=0)
    sold_qty = Column(Integer, nullable=False, default=0)
    leftover_qty = Column(Integer, nullable=False, default=0)
    stockout_time = Column(String(10), nullable=True)  # e.g. "13:30"
    recommended_qty = Column(Integer, nullable=True)
    manager_override_qty = Column(Integer, nullable=True)

    item = relationship("MenuItem", back_populates="sales_logs")

    __table_args__ = (
        Index("idx_sales_date_slot_item", "date", "meal_slot", "item_id"),
    )


class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    qty = Column(Integer, nullable=False, default=0)
    cooked_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    source_date = Column(String(10), nullable=False)
    is_used = Column(Boolean, nullable=False, default=False)

    item = relationship("MenuItem", back_populates="stocks")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(10), nullable=False, index=True)
    meal_slot = Column(String(20), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("menu_items.id"), nullable=False)
    p10 = Column(Float, nullable=False, default=0.0)
    p50 = Column(Float, nullable=False, default=0.0)
    p90 = Column(Float, nullable=False, default=0.0)
    recommended_qty = Column(Integer, nullable=False, default=0)
    risk_label = Column(String(30), nullable=False, default="Balanced")  # Stock-out risk, Waste risk, Balanced
    explanation = Column(Text, nullable=False)
    service_level = Column(String(20), nullable=False, default="Balanced")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    item = relationship("MenuItem", back_populates="recommendations")

    __table_args__ = (
        Index("idx_rec_date_slot_item", "date", "meal_slot", "item_id"),
    )


class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    service_level = Column(String(20), nullable=False, default="Balanced")  # Conservative, Balanced, Lean
    ngo_contact = Column(String(150), nullable=False, default="Robin Hood Army Mess Contact (+91 98765 43210)")
    ngo_pickup_window = Column(String(50), nullable=False, default="15:30 - 16:30")
    co2_per_kg_food = Column(Float, nullable=False, default=2.5)
    currency = Column(String(10), nullable=False, default="₹")
