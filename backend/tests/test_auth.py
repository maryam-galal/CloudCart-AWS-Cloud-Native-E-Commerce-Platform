
def test_health_check(client):
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_signup(client):
    response = client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    assert response.status_code == 201
    assert response.json()["email"] == "customer@example.com"
    assert "password" not in response.json()
    assert "password_hash" not in response.json()


def test_duplicate_signup(client):
    payload = {
        "name": "Test Customer",
        "email": "customer@example.com",
        "password": "CloudCartTest123!",
    }

    first_response = client.post("/auth/signup", json=payload)
    second_response = client.post("/auth/signup", json=payload)

    assert first_response.status_code == 201
    assert second_response.status_code == 409


def test_signin(client):
    client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    response = client.post(
        "/auth/signin",
        data={
            "username": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_signin_wrong_password(client):
    client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    response = client.post(
        "/auth/signin",
        data={
            "username": "customer@example.com",
            "password": "WrongPassword123!",
        },
    )

    assert response.status_code == 401


def test_protected_without_token(client):
    response = client.get("/protected")

    assert response.status_code == 401


def test_protected_with_token(client):
    client.post(
        "/auth/signup",
        json={
            "name": "Test Customer",
            "email": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    signin_response = client.post(
        "/auth/signin",
        data={
            "username": "customer@example.com",
            "password": "CloudCartTest123!",
        },
    )

    token = signin_response.json()["access_token"]

    response = client.get(
        "/protected",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json()["email"] == "customer@example.com"
