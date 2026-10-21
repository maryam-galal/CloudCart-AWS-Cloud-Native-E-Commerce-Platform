
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from .auth import get_current_user
from .database import get_db
from .models import Cart, Order, OrderItem, Product, User
from .schemas import (
    OrderItemResponse,
    OrderListResponse,
    OrderResponse,
)

router = APIRouter(prefix="/orders", tags=["Orders"])


def build_order_response(db: Session, order: Order) -> OrderResponse:
    order_items = db.scalars(
        select(OrderItem)
        .where(OrderItem.order_id == order.id)
        .order_by(OrderItem.id)
    ).all()

    items = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            subtotal=round(item.unit_price * item.quantity, 2),
        )
        for item in order_items
    ]

    return OrderResponse(
        id=order.id,
        total_amount=order.total_amount,
        status=order.status,
        items=items,
    )


@router.post(
    "/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        cart_items = db.scalars(
            select(Cart)
            .where(Cart.user_id == current_user.id)
            .order_by(Cart.id)
        ).all()

        if not cart_items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot checkout with an empty cart",
            )

        # Validate every cart item before making changes.
        purchases = []
        total = 0.0

        for cart_item in cart_items:
            product = db.scalar(
                select(Product)
                .where(Product.id == cart_item.product_id)
                .with_for_update()
            )

            if product is None or not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product {cart_item.product_id} is no longer available",
                )

            if cart_item.quantity > product.stock_quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.name}",
                )

            unit_price = product.price
            subtotal = round(unit_price * cart_item.quantity, 2)
            total += subtotal

            purchases.append(
                {
                    "cart_item": cart_item,
                    "product": product,
                    "quantity": cart_item.quantity,
                    "unit_price": unit_price,
                }
            )

        order = Order(
            user_id=current_user.id,
            total_amount=round(total, 2),
            status="pending",
        )
        db.add(order)
        db.flush()

        for purchase in purchases:
            product = purchase["product"]
            quantity = purchase["quantity"]

            db.add(
                OrderItem(
                    order_id=order.id,
                    product_id=product.id,
                    product_name=product.name,
                    quantity=quantity,
                    unit_price=purchase["unit_price"],
                )
            )

            product.stock_quantity -= quantity
            db.delete(purchase["cart_item"])

        db.commit()
        db.refresh(order)

        return build_order_response(db, order)

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise


@router.get("/", response_model=OrderListResponse)
def get_order_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    orders = db.scalars(
        select(Order)
        .where(Order.user_id == current_user.id)
        .order_by(Order.id.desc())
    ).all()

    return OrderListResponse(
        orders=[
            build_order_response(db, order)
            for order in orders
        ]
    )


@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.scalar(
        select(Order).where(
            Order.id == order_id,
            Order.user_id == current_user.id,
        )
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    return build_order_response(db, order)
