
def create_customer(client, email="customer@example.com"):
    response = client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": email,
            "password": "CloudCartTest123!",
        },
    )
    assert response.status_code == 201

    response = client.post(
        "/auth/signin",
        data={
            "username": email,
            "password": "CloudCartTest123!",
        },
    )
    assert response.status_code == 200

    return response.json()["access_token"]


def create_admin(client, email="admin@example.com"):
    from app.database import get_db
    from app.models import User

    token = create_customer(client, email)

    db_generator = client.app.dependency_overrides[get_db]()
    db = next(db_generator)

    try:
        user = db.query(User).filter_by(email=email).first()
        assert user is not None
        user.role = "admin"
        db.commit()
    finally:
        db_generator.close()

    return token


def create_product(client, admin_token, **overrides):
    payload = {
        "name": "Wireless Mouse",
        "description": "Test product",
        "price": 599.99,
        "stock_quantity": 10,
        "image_url": None,
    }
    payload.update(overrides)

    response = client.post(
        "/products/",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 201
    return response.json()


def test_cart_requires_authentication(client):
    response = client.get("/cart/")
    assert response.status_code == 401


def test_customer_starts_with_empty_cart(client):
    token = create_customer(client)

    response = client.get(
        "/cart/",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0.0}


def test_customer_can_add_product_to_cart(client):
    admin_token = create_admin(client)
    product = create_product(client, admin_token)
    customer_token = create_customer(client)

    response = client.post(
        "/cart/items",
        json={"product_id": product["id"], "quantity": 2},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 200
    body = response.json()
    assert len(body["items"]) == 1
    assert body["items"][0]["product_id"] == product["id"]
    assert body["items"][0]["quantity"] == 2
    assert body["items"][0]["subtotal"] == 1199.98
    assert body["total"] == 1199.98


def test_adding_same_product_increases_quantity(client):
    admin_token = create_admin(client)
    product = create_product(
        client, admin_token, stock_quantity=10
    )
    customer_token = create_customer(client)

    headers = {"Authorization": f"Bearer {customer_token}"}
    payload = {"product_id": product["id"], "quantity": 2}

    first = client.post("/cart/items", json=payload, headers=headers)
    second = client.post("/cart/items", json=payload, headers=headers)

    assert first.status_code == 200
    assert second.status_code == 200
    assert len(second.json()["items"]) == 1
    assert second.json()["items"][0]["quantity"] == 4


def test_cart_rejects_quantity_above_stock(client):
    admin_token = create_admin(client)
    product = create_product(
        client, admin_token, stock_quantity=2
    )
    customer_token = create_customer(client)

    response = client.post(
        "/cart/items",
        json={"product_id": product["id"], "quantity": 3},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 400


def test_cart_rejects_nonexistent_product(client):
    customer_token = create_customer(client)

    response = client.post(
        "/cart/items",
        json={"product_id": 9999, "quantity": 1},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 404


def test_customer_can_update_cart_quantity(client):
    admin_token = create_admin(client)
    product = create_product(client, admin_token)
    customer_token = create_customer(client)

    headers = {"Authorization": f"Bearer {customer_token}"}

    client.post(
        "/cart/items",
        json={"product_id": product["id"], "quantity": 2},
        headers=headers,
    )

    response = client.patch(
        f"/cart/items/{product['id']}",
        json={"quantity": 4},
        headers=headers,
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 4


def test_customer_can_remove_cart_item(client):
    admin_token = create_admin(client)
    product = create_product(client, admin_token)
    customer_token = create_customer(client)

    headers = {"Authorization": f"Bearer {customer_token}"}

    client.post(
        "/cart/items",
        json={"product_id": product["id"], "quantity": 1},
        headers=headers,
    )

    response = client.delete(
        f"/cart/items/{product['id']}",
        headers=headers,
    )

    assert response.status_code == 204
    assert client.get("/cart/", headers=headers).json() == {
        "items": [],
        "total": 0.0,
    }


def test_customers_cannot_see_each_others_carts(client):
    admin_token = create_admin(client)
    product = create_product(client, admin_token)

    token_a = create_customer(client, "customer-a@example.com")
    token_b = create_customer(client, "customer-b@example.com")

    response = client.post(
        "/cart/items",
        json={"product_id": product["id"], "quantity": 2},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert response.status_code == 200

    response = client.get(
        "/cart/",
        headers={"Authorization": f"Bearer {token_b}"},
    )

    assert response.status_code == 200
    assert response.json() == {"items": [], "total": 0.0}
