from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .auth import get_current_user
from .models import User
from .routes_auth import router as auth_router
from .schemas import ProtectedResponse
from .routes_products import router as products_router
from .routes_cart import router as cart_router
from .routes_orders import router as orders_router

from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CloudCart API",
    description="CloudCart E-Commerce REST API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(orders_router)


@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "service": "CloudCart API",
        "database": "connected",
    }


@app.get("/protected", response_model=ProtectedResponse)
def protected_route(
    current_user: User = Depends(get_current_user),
):
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "email": current_user.email,
    }