from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import Setting
from ..schemas import SettingUpdate, SettingResponse

router = APIRouter(prefix="/api/settings", tags=["settings"])

@router.get("", response_model=SettingResponse)
def get_settings(db: Session = Depends(get_db)):
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
        db.refresh(setting)
    return setting

@router.put("", response_model=SettingResponse)
def update_settings(update_in: SettingUpdate, db: Session = Depends(get_db)):
    setting = db.query(Setting).first()
    if not setting:
        setting = Setting()
        db.add(setting)

    for field, val in update_in.model_dump(exclude_unset=True).items():
        setattr(setting, field, val)

    db.commit()
    db.refresh(setting)
    return setting
