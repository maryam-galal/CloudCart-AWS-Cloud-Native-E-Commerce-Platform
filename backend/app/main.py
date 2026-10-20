from fastapi import Depends, FastAPI
from sqlalchemy import text
from sqlalchemy.orm import Session

from . import models
from .database import Base, engine, get_db
from .auth import get_current_user
from .models import User
from .routes_auth import router as auth_router
from .schemas import ProtectedResponse

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CloudCart API",
    description="CloudCart E-Commerce REST API",
    version="1.0.0",
)

app.include_router(auth_router)


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