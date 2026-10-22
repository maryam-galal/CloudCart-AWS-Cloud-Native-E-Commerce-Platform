# CloudCart — AWS-Hosted E-Commerce Platform

CloudCart is a full-stack e-commerce application developed as part of the National Telecommunication Institute (NTI) training program. It provides customer authentication, product management, shopping cart operations, checkout, and order history through a REST API.

The project was deployed on Amazon Web Services (AWS), using Amazon CloudFront and Amazon S3 for frontend delivery, Amazon EC2 for backend processing, and Amazon RDS for MySQL database storage.

**Project status:** The AWS deployment was used to demonstrate the application and its cloud architecture. The runtime environment is being shut down after project completion, so live API functionality is not guaranteed to remain available. The source code and local development instructions are retained for future use.

## Features

- **Authentication:** Customer registration, sign-in, and JWT-based authorization.
- **Product management:** List and retrieve products, with administrator-only product creation, updates, and deactivation.
- **Shopping cart:** Add products, update quantities, remove items, and calculate totals.
- **Checkout:** Validate inventory, create orders, update stock, and clear purchased cart items within a database transaction.
- **Order history:** Retrieve customer orders while enforcing customer-level access control.
- **Health monitoring:** Check application availability and database connectivity through a health endpoint.
- **Automated testing:** Backend tests covering authentication, products, carts, checkout, and order access control.

## AWS Architecture

The application was deployed using AWS services that separate frontend delivery, application processing, database storage, networking, and access management.

| AWS service | Role |
|---|---|
| Amazon CloudFront | Delivers frontend assets over HTTPS and routes configured API paths to the backend origin. |
| Amazon S3 | Stores frontend build assets. |
| Amazon VPC | Provides network isolation for application and database resources. |
| Application Load Balancer (ALB) | Routes incoming API requests to the backend application. |
| Amazon EC2 | Runs the FastAPI backend. |
| Amazon RDS for MySQL | Stores application data, including users, products, carts, and orders. |
| AWS Systems Manager (SSM) | Supports remote instance management without routine direct SSH access. |
| AWS IAM | Controls permissions for AWS resources and instance access. |

### Request flow

1. A customer opens the CloudCart frontend through Amazon CloudFront.
2. CloudFront serves the static frontend assets stored in Amazon S3.
3. API requests matching the configured paths are forwarded to the Application Load Balancer.
4. The load balancer forwards requests to the FastAPI application running on Amazon EC2.
5. The backend validates requests, applies application rules, and accesses the MySQL database hosted by Amazon RDS.
6. The API returns the response to the frontend.

**Transport security note:** Visitors access the CloudFront endpoint over HTTPS. The configured CloudFront-to-ALB origin connection uses HTTP, so the deployment does not provide end-to-end HTTPS encryption across every network hop.


## Screenshots

### Application

**Homepage and Product Catalog**

![CloudCart homepage and product catalog](screenshots/cloudcart-homepage.png)

**Shopping Cart**

![CloudCart shopping cart](screenshots/cloudcart-cart.png)

**Order History**

![CloudCart order history](screenshots/cloudcart-orders.png)

### AWS Deployment

**AWS Architecture**

![CloudCart AWS architecture](screenshots/aws-architecture.png)

**Application Load Balancer and Target Health**

![CloudCart load balancer target health](screenshots/aws-load-balancer.png)

**EC2 Backend Instance**

![CloudCart EC2 instance](screenshots/aws-ec2.png)



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
- AWS IAM
- AWS Systems Manager

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
└── .gitignore
```

The repository may also contain additional documentation and configuration files.

Local files such as `.env`, private keys, virtual environments, and test database files must not be committed to the repository.

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
DATABASE_URL=mysql+pymysql://YOUR_DB_USER:YOUR_DB_PASSWORD@localhost:3306/cloudcart
```

Replace the placeholders with your local MySQL credentials. Generate a strong, random JWT secret and use a database account with appropriate permissions.

Do not commit `.env` or place real credentials in source code.

### 5. Create the database

For a local MySQL installation, create the database if it does not already exist:

```sql
CREATE DATABASE cloudcart;
```

Ensure the database credentials in `.env` match your local configuration.

The application creates mapped tables during startup using SQLAlchemy's `Base.metadata.create_all`. This is not a replacement for a database migration system.

### 6. Start the backend

From the repository root:

```powershell
python -m uvicorn app.main:app --app-dir backend --reload
```

Local endpoints:

- API base: `http://127.0.0.1:8000`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

### 7. Start the frontend

Open a second PowerShell terminal:

```powershell
cd frontend
npm install
npm run dev
```

Vite normally serves the development frontend at `http://localhost:5173`.

The frontend supports the `VITE_API_URL` environment variable. If it is unset, API requests use relative paths, which is suitable when the frontend delivery layer routes those paths to the API. For local development, configure the API base URL or a suitable Vite proxy when needed.

The backend's CORS configuration permits the local origins `http://localhost:5173` and `http://127.0.0.1:5173`.

### 8. Build the frontend

From the `frontend` directory:

```powershell
npm run build
```

The production build is generated in `frontend/dist`.

## API Endpoints

Protected endpoints require a valid bearer token unless otherwise specified.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/signup` | Register a customer. |
| POST | `/auth/signin` | Authenticate and obtain a JWT. |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/products/` | List active products. |
| GET | `/products/{product_id}` | Retrieve a product. |
| POST | `/products/` | Create a product; administrator access required. |
| PUT | `/products/{product_id}` | Update a product; administrator access required. |
| DELETE | `/products/{product_id}` | Deactivate a product; administrator access required. |

### Shopping Cart

| Method | Endpoint | Description |
|---|---|---|
| GET | `/cart/` | View the current customer's cart. |
| POST | `/cart/items` | Add a product to the cart. |
| PATCH | `/cart/items/{product_id}` | Update an item's quantity. |
| DELETE | `/cart/items/{product_id}` | Remove an item from the cart. |

### Orders and Checkout

| Method | Endpoint | Description |
|---|---|---|
| POST | `/orders/checkout` | Create an order from the cart. |
| GET | `/orders/` | View the current customer's order history. |
| GET | `/orders/{order_id}` | Retrieve an order belonging to the current customer. |

### Health and Protected Access

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check application and database connectivity. |
| GET | `/protected` | Test authenticated access. |

For request schemas and interactive API testing, start the local backend and open `/docs`.

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

The test suite has previously passed 29 tests covering authentication, product management, cart operations, checkout, inventory validation, and order access control. Run the command above to verify the current version.

## Deployment Notes

The AWS deployment demonstrated how a full-stack application can use managed cloud services for frontend delivery, backend hosting, database storage, networking, and access management.

The AWS runtime configuration is separate from the local `.env` configuration. The deployed environment used AWS Systems Manager Parameter Store to provide runtime configuration to the backend.

The live deployment is not maintained after project completion. Public demo endpoints may be unavailable once the backend compute and related AWS resources have been stopped or removed. Local development remains the recommended way to run and test the application.

AWS resources such as Application Load Balancers, NAT Gateways, EC2 instances, and RDS databases can incur ongoing charges. Review the AWS Console and remove resources that are no longer needed.

## Current Scope and Limitations

- The application implements customer authentication, product management, cart operations, checkout, and order history.
- Payment gateway integration is not included in the documented feature set.
- The deployed CloudFront-to-ALB origin connection used HTTP, even though visitors accessed the frontend through HTTPS.
- Local development configuration and AWS runtime configuration are separate.
- The AWS deployment is no longer intended to be a continuously available public demo.
- The project is an educational and portfolio application; production use would require additional security, operational, and deployment review.

## License

This project is licensed under the MIT License.

You are welcome to fork, use, and modify this project. If you reuse or build upon it, please give credit to the original project and **Maryam Galal**.

Original repository: [CloudCart](https://github.com/maryam-galal/CloudCart-AWS-Cloud-Native-E-Commerce-Platform)
