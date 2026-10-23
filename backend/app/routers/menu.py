from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import MenuItem
from ..schemas import MenuItemCreate, MenuItemUpdate, MenuItemResponse

router = APIRouter(prefix="/api/menu-items", tags=["menu"])

@router.get("", response_model=List[MenuItemResponse])
def get_menu_items(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    query = db.query(MenuItem)
    if category:
        query = query.filter(MenuItem.category == category)
    return query.order_by(MenuItem.name).all()

@router.post("", response_model=MenuItemResponse, status_code=201)
def create_menu_item(item_in: MenuItemCreate, db: Session = Depends(get_db)):
    existing = db.query(MenuItem).filter(MenuItem.name == item_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Menu item '{item_in.name}' already exists.")

    item = MenuItem(**item_in.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("/{item_id}", response_model=MenuItemResponse)
def get_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found.")
    return item

@router.put("/{item_id}", response_model=MenuItemResponse)
def update_menu_item(item_id: int, item_in: MenuItemUpdate, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found.")

    update_data = item_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != item.name:
        existing = db.query(MenuItem).filter(MenuItem.name == update_data["name"]).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Menu item '{update_data['name']}' already exists.")

    for field, val in update_data.items():
        setattr(item, field, val)

    db.commit()
    db.refresh(item)
    return item

@router.delete("/{item_id}")
def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found.")

    db.delete(item)
    db.commit()
    return {"status": "success", "message": f"Menu item '{item.name}' deleted."}
