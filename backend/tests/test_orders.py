
from app.models import Cart, Order, OrderItem, Product, User



def create_customer(client, email="customer@example.com"):
    response = client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": email,
            "password": "CloudCartTest123!",
        },
    )
    assert response.status_code in (200, 201), response.text

    login_response = client.post(
        "/auth/signin",
        data={
            "username": email,
            "password": "CloudCartTest123!",
        },
    )
    assert login_response.status_code == 200, login_response.text

    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_product(db_session, name="Test Product", price=25.0, stock=10):
    product = Product(
        name=name,
        description="Test product",
        price=price,
        stock_quantity=stock,
        is_active=True,
    )
    db_session.add(product)
    db_session.commit()
    db_session.refresh(product)
    return product


def get_db_session():
    # Use the same test database as the existing conftest fixture.
    from app.database import get_db

    return next(get_db())


def test_checkout_requires_authentication(client):
    response = client.post("/orders/checkout")
    assert response.status_code in (401, 403)


def test_checkout_rejects_empty_cart(client):
    headers = create_customer(client)
    response = client.post("/orders/checkout", headers=headers)

    assert response.status_code == 400
    assert response.json()["detail"] == "Cannot checkout with an empty cart"


def test_checkout_creates_order_and_reduces_stock(client):
    headers = create_customer(client)

    # Get the database session supplied by the test fixture.
    from app.database import get_db
    from app.main import app

    db_override = app.dependency_overrides[get_db]
    db = next(db_override())

    try:
        product = create_product(db, price=25.0, stock=10)
        product_id = product.id

        add_response = client.post(
            "/cart/items",
            headers=headers,
            json={"product_id": product_id, "quantity": 2},
        )
        assert add_response.status_code == 200

        response = client.post("/orders/checkout", headers=headers)
        assert response.status_code == 201

        order_data = response.json()
        assert order_data["total_amount"] == 50.0
        assert order_data["status"] == "pending"
        assert len(order_data["items"]) == 1
        assert order_data["items"][0]["product_id"] == product_id
        assert order_data["items"][0]["quantity"] == 2
        assert order_data["items"][0]["unit_price"] == 25.0
        assert order_data["items"][0]["subtotal"] == 50.0

        db.refresh(product)
        assert product.stock_quantity == 8

        cart_response = client.get("/cart/", headers=headers)
        assert cart_response.status_code == 200
        assert cart_response.json()["items"] == []
    finally:
        db.close()


def test_checkout_rejects_insufficient_stock(client):
    headers = create_customer(client)

    from app.database import get_db
    from app.main import app

    db_override = app.dependency_overrides[get_db]
    db = next(db_override())

    try:
        product = create_product(db, price=30.0, stock=1)
        product_id = product.id

        add_response = client.post(
            "/cart/items",
            headers=headers,
            json={"product_id": product_id, "quantity": 1},
        )
        assert add_response.status_code == 200

        # Simulate inventory changing after the item entered the cart.
        product.stock_quantity = 0
        db.commit()

        response = client.post("/orders/checkout", headers=headers)
        assert response.status_code == 400

        db.refresh(product)
        assert product.stock_quantity == 0

        cart_response = client.get("/cart/", headers=headers)
        assert len(cart_response.json()["items"]) == 1

        orders_response = client.get("/orders/", headers=headers)
        assert orders_response.status_code == 200
        assert orders_response.json()["orders"] == []
    finally:
        db.close()


def test_order_history_only_contains_current_users_orders(client):
    first_headers = create_customer(client, "first@example.com")
    second_headers = create_customer(client, "second@example.com")

    from app.database import get_db
    from app.main import app

    db_override = app.dependency_overrides[get_db]
    db = next(db_override())

    try:
        product = create_product(db, price=15.0, stock=5)
        product_id = product.id

        add_response = client.post(
            "/cart/items",
            headers=first_headers,
            json={"product_id": product_id, "quantity": 1},
        )
        assert add_response.status_code == 200

        checkout_response = client.post(
            "/orders/checkout",
            headers=first_headers,
        )
        assert checkout_response.status_code == 201
        first_order_id = checkout_response.json()["id"]

        first_history = client.get("/orders/", headers=first_headers)
        second_history = client.get("/orders/", headers=second_headers)

        assert len(first_history.json()["orders"]) == 1
        assert first_history.json()["orders"][0]["id"] == first_order_id
        assert second_history.json()["orders"] == []

        # Customers cannot access another customer's order.
        other_order = client.get(
            f"/orders/{first_order_id}",
            headers=second_headers,
        )
        assert other_order.status_code == 404
    finally:
        db.close()
