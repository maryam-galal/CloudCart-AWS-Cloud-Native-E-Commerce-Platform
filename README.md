# CloudCart — E-Commerce Platform

CloudCart is an e-commerce platform project developed as part of the NTI training program. Its backend provides REST APIs for customer authentication, product management, shopping carts, checkout, and order history.

## Features

- **Authentication:** Customer registration, sign-in, and JWT-based authorization.
- **Product management:** Create, view, update, and deactivate products.
- **Shopping cart:** Add products, update quantities, remove items, and calculate totals.
- **Checkout:** Create orders from the customer's cart, validate available stock, update inventory, and clear the cart.
- **Order management:** View order history and individual orders with customer-level access control.
- **Automated testing:** API tests using pytest and FastAPI's test client.

## Technology Stack

- Python
- FastAPI
- SQLAlchemy
- MySQL
- JWT authentication
- Pydantic
- Pytest
- Uvicorn

## Project Structure

```text
CloudCart/
├── backend/
│   ├── app/
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── schemas.py
│   │   ├── routes_auth.py
│   │   ├── routes_products.py
│   │   ├── routes_cart.py
│   │   └── routes_orders.py
│   └── tests/
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_products.py
│       ├── test_cart.py
│       └── test_orders.py
├── database/
├── docs/
├── requirements.txt
├── .env
├── .gitignore
└── README.md
```

## Prerequisites

- Python 3.13 or a compatible Python version.
- MySQL Server.
- Git.
- PowerShell on Windows.

## Installation and Setup

### 1. Clone the repository

```powershell
git clone https://github.com/maryam-galal/CloudCart-AWS-Cloud-Native-E-Commerce-Platform.git
cd CloudCart-AWS-Cloud-Native-E-Commerce-Platform
```

### 2. Create and activate a virtual environment

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```powershell
py -m pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root with the following variables:

```dotenv
JWT_SECRET_KEY=replace_with_a_secure_random_secret
DATABASE_URL=mysql+mysqlconnector://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/cloudcart
```

Replace the database username and password with your local MySQL credentials. Generate a strong, random JWT secret for your environment.

**Security:** Never commit `.env` or publish database credentials or JWT secrets. Keep secrets out of source code and GitHub.

### 5. Prepare the database

Start MySQL Server and create the `cloudcart` database if it does not already exist:

```sql
CREATE DATABASE cloudcart;
```

Ensure the configured MySQL user has the necessary permissions. The application uses SQLAlchemy to create mapped tables when the application starts; this does not automatically migrate changes to existing tables.

### 6. Start the application

From the project root, run:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

The API will be available at:

- API base URL: `http://127.0.0.1:8000`
- Interactive Swagger documentation: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

The health endpoint checks database connectivity as well as application status.

## API Endpoints

All endpoints use the `/` path structure shown below. Protected endpoints require a valid bearer token unless otherwise specified.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register a customer |
| POST | `/auth/signin` | Authenticate and obtain a JWT |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products/` | List active products |
| GET | `/products/{product_id}` | Retrieve a product |
| POST | `/products/` | Create a product — admin only |
| PUT | `/products/{product_id}` | Update a product — admin only |
| DELETE | `/products/{product_id}` | Deactivate a product — admin only |

### Shopping Cart

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart/` | View the current customer's cart |
| POST | `/cart/items` | Add a product to the cart |
| PATCH | `/cart/items/{product_id}` | Update a cart item's quantity |
| DELETE | `/cart/items/{product_id}` | Remove a cart item |

### Orders and Checkout

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/checkout` | Create an order from the cart |
| GET | `/orders/` | View the current customer's order history |
| GET | `/orders/{order_id}` | Retrieve an order belonging to the current customer |

### Health and Protected Access

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check application and database connectivity |
| GET | `/protected` | Test authenticated access |

## Authentication

After signing in, use the returned access token to call protected endpoints.

Include the token in the HTTP request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Access tokens expire after 30 minutes. Product creation, updates, and deactivation require an authenticated administrator account.

## Checkout Behavior

The checkout endpoint:

1. Requires an authenticated customer.
2. Rejects an empty cart.
3. Checks that the requested products are active and have sufficient stock.
4. Calculates the order total using current product prices.
5. Records the order and its item details, including purchase-time prices.
6. Reduces inventory and removes purchased items from the cart within the same database transaction.

If stock validation fails, checkout is rejected without intentionally applying partial order changes.

## Running Tests

Run the automated backend tests from the project root:

```powershell
python -m pytest backend/tests -v
```

The suite currently contains 29 passing tests covering authentication, product management, cart operations, checkout, inventory validation, and order access control.

## Project Status

The backend currently implements authentication, product APIs, customer-specific shopping carts, checkout, and order history.

Payment processing and any additional features should be considered separate work unless explicitly implemented and tested.

## License

Add the applicable project license here if one is selected.
