
from app.database import get_db
from app.models import User


def create_customer_and_token(client, email="customer@example.com"):
    signup_response = client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": email,
            "password": "CloudCartTest123!",
        },
    )
    assert signup_response.status_code == 201

    signin_response = client.post(
        "/auth/signin",
        data={
            "username": email,
            "password": "CloudCartTest123!",
        },
    )
    assert signin_response.status_code == 200

    return signin_response.json()["access_token"]


def promote_to_admin(client, email="admin@example.com"):
    token = create_customer_and_token(client, email)

    # Use the test database supplied by the existing fixture.
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


def product_payload():
    return {
        "name": "Wireless Mouse",
        "description": "Ergonomic wireless mouse",
        "price": 599.99,
        "stock_quantity": 10,
        "image_url": "https://example.com/mouse.jpg",
    }


def test_list_products_is_public(client):
    response = client.get("/products/")

    assert response.status_code == 200
    assert response.json() == []


def test_get_nonexistent_product_returns_404(client):
    response = client.get("/products/999")

    assert response.status_code == 404


def test_customer_cannot_create_product(client):
    token = create_customer_and_token(client)

    response = client.post(
        "/products/",
        json=product_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 403


def test_admin_can_create_and_read_product(client):
    token = promote_to_admin(client)

    create_response = client.post(
        "/products/",
        json=product_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )

    assert create_response.status_code == 201
    created_product = create_response.json()
    assert created_product["name"] == "Wireless Mouse"
    assert created_product["price"] == 599.99

    product_id = created_product["id"]

    get_response = client.get(f"/products/{product_id}")
    assert get_response.status_code == 200
    assert get_response.json()["id"] == product_id

    list_response = client.get("/products/")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1


def test_admin_can_update_product(client):
    token = promote_to_admin(client)

    create_response = client.post(
        "/products/",
        json=product_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201

    product_id = create_response.json()["id"]

    update_response = client.put(
        f"/products/{product_id}",
        json={"price": 499.99, "stock_quantity": 5},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert update_response.status_code == 200
    assert update_response.json()["price"] == 499.99
    assert update_response.json()["stock_quantity"] == 5


def test_customer_cannot_update_product(client):
    admin_token = promote_to_admin(client)

    create_response = client.post(
        "/products/",
        json=product_payload(),
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert create_response.status_code == 201

    product_id = create_response.json()["id"]
    customer_token = create_customer_and_token(client)

    response = client.put(
        f"/products/{product_id}",
        json={"price": 1.00},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 403


def test_admin_can_soft_delete_product(client):
    token = promote_to_admin(client)

    create_response = client.post(
        "/products/",
        json=product_payload(),
        headers={"Authorization": f"Bearer {token}"},
    )
    assert create_response.status_code == 201

    product_id = create_response.json()["id"]

    delete_response = client.delete(
        f"/products/{product_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert delete_response.status_code == 204

    # Soft-deleted products are hidden from public access.
    assert client.get(f"/products/{product_id}").status_code == 404
    assert client.get("/products/").json() == []


def test_product_creation_rejects_invalid_price(client):
    token = promote_to_admin(client)
    payload = product_payload()
    payload["price"] = -10

    response = client.post(
        "/products/",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 422
