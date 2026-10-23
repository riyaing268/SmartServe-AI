from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base, SessionLocal
from .models import MenuItem
from .services.synthetic_generator import seed_database
from .routers import menu, data, context, recommendations, logs, dashboard, reports, settings, agent

# Create all database tables
Base.metadata.create_all(bind=engine)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # If the database is completely fresh and has no menu items, seed with demo data
    db = SessionLocal()
    try:
        count = db.query(MenuItem).count()
        if count == 0:
            print("Database is empty. Automatically seeding 90 days of synthetic canteen operations...")
            seed_database(db, days=90)
            print("Initial demo seeding complete!")
    finally:
        db.close()
    yield

app = FastAPI(
    title="SmartServe AI",
    description="Intelligent Food Waste Reduction Agent for College Canteens",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all feature routers
app.include_router(data.router)
app.include_router(menu.router)
app.include_router(context.router)
app.include_router(recommendations.router)
app.include_router(logs.router)
app.include_router(dashboard.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(agent.router)



@app.get("/")
def root():
    return {
        "app": "SmartServe AI",
        "status": "online",
        "docs_url": "/docs",
        "description": "Intelligent Food Waste Reduction Agent for College Canteens"
    }
