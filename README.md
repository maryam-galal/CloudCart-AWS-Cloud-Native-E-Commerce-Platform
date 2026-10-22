# CloudCart — AWS-Hosted E-Commerce Platform

CloudCart is a full-stack e-commerce application developed as part of the National Telecommunication Institute (NTI) training program. It provides customer authentication, product management, shopping cart operations, checkout, and order history through a REST API.

The project is deployed on AWS, with a React frontend delivered through Amazon CloudFront and a FastAPI backend running on Amazon EC2. The application uses Amazon RDS for MySQL database storage.

## Live Demo

- **Frontend:** https://d277tujoymsmm2.cloudfront.net
- **API health check:** https://d277tujoymsmm2.cloudfront.net/health
- **Interactive API documentation:** Open the deployed application’s API documentation endpoint if it is exposed by the current CloudFront routing configuration.

The health endpoint reports the API status and database connectivity.

## Features

- **Authentication:** Customer registration, sign-in, and JWT-based authorization.
- **Product management:** List and retrieve products, with administrator-only product creation, updates, and deactivation.
- **Shopping cart:** Add products, update quantities, remove items, and calculate totals.
- **Checkout:** Validate inventory, create orders, update stock, and clear purchased cart items within a database transaction.
- **Order history:** Retrieve customer orders while enforcing customer-level access control.
- **Health monitoring endpoint:** Check application availability and database connectivity.
- **Automated tests:** Backend tests covering authentication, products, carts, checkout, and order access control.

## AWS Architecture

The deployed architecture uses AWS services to separate frontend delivery, application processing, and database storage.

| AWS service | Role |
|---|---|
| Amazon CloudFront | Delivers the frontend over HTTPS and routes configured API paths to the backend origin. |
| Amazon S3 | Stores the frontend build assets. |
| Amazon VPC | Provides network isolation for application and database resources. |
| Application Load Balancer (ALB) | Routes incoming API requests to the backend application. |
| Amazon EC2 | Runs the FastAPI backend. |
| Amazon RDS for MySQL | Stores application data, including users, products, carts, and orders. |
| AWS Systems Manager (SSM) | Supports remote instance management without requiring routine direct SSH access. |
| AWS IAM | Controls permissions for AWS resources and instance access. |

### Request flow

1. A customer opens the CloudCart frontend through Amazon CloudFront.
2. CloudFront serves the static frontend assets stored in Amazon S3.
3. API requests matching the configured API paths are forwarded to the Application Load Balancer.
4. The load balancer forwards requests to the backend application running on EC2.
5. The backend validates requests, applies application rules, and accesses the MySQL database hosted by Amazon RDS.
6. The API returns the response to the frontend.

The CloudFront viewer endpoint uses HTTPS. The configured CloudFront-to-ALB origin connection uses HTTP, so this deployment should not be described as encrypted end-to-end.

## Technology Stack

### Frontend
- React
- JavaScript
- Vite
- CSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- JWT authentication
- Uvicorn

### Database
- MySQL
- Amazon RDS for MySQL

### Testing and Deployment
- Pytest
- FastAPI TestClient
- Amazon EC2
- Amazon S3
- Amazon CloudFront
- Application Load Balancer
- Amazon VPC
- AWS IAM and Systems Manager

## Repository Structure

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
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_products.py
│   │   ├── test_cart.py
│   │   └── test_orders.py
│   └── seed_data.py
├── database/
├── frontend/
├── requirements.txt
├── .gitignore
└── README.md
```

Local files such as `.env`, private keys, virtual environments, and test database files should not be committed to the repository.

## Local Development Setup

### Prerequisites

- Python 3.13 or a compatible Python version
- Node.js and npm
- Git
- MySQL Server, or another database supported by the configured SQLAlchemy connection
- PowerShell on Windows

### 1. Clone the repository

```powershell
git clone https://github.com/maryam-galal/CloudCart-AWS-Cloud-Native-E-Commerce-Platform.git
cd CloudCart-AWS-Cloud-Native-E-Commerce-Platform
```

### 2. Create a Python virtual environment

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3. Install backend dependencies

```powershell
py -m pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file in the project root:

```dotenv
JWT_SECRET_KEY=replace_with_a_secure_random_secret
DATABASE_URL=mysql+mysqlconnector://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/cloudcart
```

Replace the placeholders with your own local development values. Generate a strong, random JWT secret and use a database account with appropriate permissions.

Do not commit `.env` or place real credentials in source code.

### 5. Create the database

For a local MySQL installation, create the database if it does not already exist:

```sql
CREATE DATABASE cloudcart;
```

Ensure the database credentials in `.env` match your local MySQL configuration. The application creates mapped tables during startup using SQLAlchemy's `Base.metadata.create_all`; this is not a replacement for a database migration system.

### 6. Start the backend

From the repository root:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Local endpoints:

- API base: http://127.0.0.1:8000
- Swagger documentation: http://127.0.0.1:8000/docs
- Health check: http://127.0.0.1:8000/health

### 7. Start the frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally serves the development frontend at http://localhost:5173.

The frontend supports the `VITE_API_URL` environment variable. If it is unset, the API requests use relative paths, which is suitable for a deployment where the frontend delivery layer routes those paths to the API.

For local development, configure the API base URL or a suitable Vite proxy when needed. The backend's current CORS configuration permits the local origins `http://localhost:5173` and `http://127.0.0.1:5173`.

### 8. Build the frontend

```powershell
npm run build
```

The production build is generated in `frontend/dist`.

## API Endpoints

Protected endpoints require a valid bearer token unless otherwise specified.

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
| POST | `/products/` | Create a product; administrator access required |
| PUT | `/products/{product_id}` | Update a product; administrator access required |
| DELETE | `/products/{product_id}` | Deactivate a product; administrator access required |

### Shopping Cart

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart/` | View the current customer's cart |
| POST | `/cart/items` | Add a product to the cart |
| PATCH | `/cart/items/{product_id}` | Update an item's quantity |
| DELETE | `/cart/items/{product_id}` | Remove an item from the cart |

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

For request schemas and interactive testing, use the local Swagger documentation at `/docs`.

## Authentication

After signing in, use the returned access token when calling protected endpoints.

Include the token in the request header:

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
```

Access tokens expire after 30 minutes. Product creation, updates, and deactivation require administrator authorization.

## Checkout Behavior

The checkout endpoint:

1. Requires an authenticated customer.
2. Rejects an empty cart.
3. Validates product availability and stock.
4. Calculates the order total using current product prices.
5. Records the order and its items, including purchase-time prices.
6. Updates inventory and removes purchased items from the cart within a database transaction.

If stock validation fails, checkout is rejected without intentionally applying partial order changes.

## Running Tests

From the repository root, activate the virtual environment and run:

```powershell
python -m pytest backend/tests -v
```

The test suite has previously passed 29 tests covering authentication, product management, cart operations, checkout, inventory validation, and order access control. Run the command above to verify the current checkout.

## Deployment Notes

The deployed application uses AWS networking, compute, storage, and database services. Its AWS runtime configuration is managed separately from the local `.env` configuration.

The frontend's CloudFront URL is the public entry point. The backend and database should remain accessible through their intended AWS network paths rather than being exposed directly to public traffic.

AWS services such as the load balancer, NAT Gateway, EC2, and RDS can incur ongoing charges. Review the AWS billing console and clean up resources that are no longer needed.

## Current Scope and Limitations

- The application implements customer authentication, product management, cart operations, checkout, and order history.
- Payment gateway integration is not included in the documented feature set.
- The deployed CloudFront-to-ALB origin connection uses HTTP, even though visitors access the frontend through HTTPS.
- Local development configuration and AWS runtime configuration are separate.
- The project is an educational and portfolio application; production use would require additional security, operational, and deployment review.

## License

No license has been specified yet. Add a license if one is selected for this project.
