
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Cart, Product, User
from .schemas import (
    CartItemCreate,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
)

router = APIRouter(prefix="/cart", tags=["Cart"])


def build_cart_response(db: Session, user_id: int) -> CartResponse:
    cart_items = db.scalars(
        select(Cart).where(Cart.user_id == user_id).order_by(Cart.id)
    ).all()

    items = []
    total = 0.0

    for cart_item in cart_items:
        product = db.get(Product, cart_item.product_id)

        # Ignore items whose products are no longer available.
        if product is None or not product.is_active:
            continue

        subtotal = round(product.price * cart_item.quantity, 2)
        total += subtotal

        items.append(
            CartItemResponse(
                product_id=product.id,
                product_name=product.name,
                quantity=cart_item.quantity,
                unit_price=product.price,
                subtotal=subtotal,
            )
        )

    return CartResponse(items=items, total=round(total, 2))


@router.get("/", response_model=CartResponse)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_cart_response(db, current_user.id)


@router.post("/items", response_model=CartResponse)
def add_cart_item(
    item_data: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.get(Product, item_data.product_id)

    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    existing_item = db.scalar(
        select(Cart).where(
            Cart.user_id == current_user.id,
            Cart.product_id == product.id,
        )
    )

    new_quantity = item_data.quantity
    if existing_item is not None:
        new_quantity += existing_item.quantity

    if new_quantity > product.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested quantity exceeds available stock",
        )

    if existing_item is not None:
        existing_item.quantity = new_quantity
    else:
        db.add(
            Cart(
                user_id=current_user.id,
                product_id=product.id,
                quantity=new_quantity,
            )
        )

    db.commit()
    return build_cart_response(db, current_user.id)


@router.patch("/items/{product_id}", response_model=CartResponse)
def update_cart_item(
    product_id: int,
    item_data: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(Cart).where(
            Cart.user_id == current_user.id,
            Cart.product_id == product_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    product = db.get(Product, product_id)

    if product is None or not product.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found",
        )

    if item_data.quantity > product.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Requested quantity exceeds available stock",
        )

    item.quantity = item_data.quantity
    db.commit()

    return build_cart_response(db, current_user.id)


@router.delete(
    "/items/{product_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_cart_item(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    item = db.scalar(
        select(Cart).where(
            Cart.user_id == current_user.id,
            Cart.product_id == product_id,
        )
    )

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cart item not found",
        )

    db.delete(item)
    db.commit()
