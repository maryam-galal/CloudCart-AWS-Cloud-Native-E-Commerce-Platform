from getpass import getpass

from sqlalchemy import select

from .app.auth import hash_password
from .app.database import Base, SessionLocal, engine
from .app.models import Product, User

PRODUCTS = [
    {
        "name": "Wireless Headphones",
        "description": "Over-ear wireless headphones with immersive sound.",
        "price": 59.99,
        "stock_quantity": 25,
        "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600",
    },
    {
        "name": "Smart Watch",
        "description": "A stylish smartwatch for everyday activity tracking.",
        "price": 89.99,
        "stock_quantity": 18,
        "image_url": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600",
    },
    {
        "name": "Running Sneakers",
        "description": "Comfortable sneakers for running and daily wear.",
        "price": 74.50,
        "stock_quantity": 20,
        "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600",
    },
    {
        "name": "Travel Backpack",
        "description": "A versatile backpack for commuting and travel.",
        "price": 44.99,
        "stock_quantity": 15,
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600",
    },
    {
        "name": "Classic Sunglasses",
        "description": "Classic-frame sunglasses for sunny days.",
        "price": 29.99,
        "stock_quantity": 30,
        "image_url": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600",
    },
    {
        "name": "Mechanical Keyboard",
        "description": "A mechanical keyboard designed for work and gaming.",
        "price": 69.00,
        "stock_quantity": 12,
        "image_url": "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600",
    },
    {
        "name": "Portable Speaker",
        "description": "A compact speaker for music at home or outdoors.",
        "price": 39.99,
        "stock_quantity": 22,
        "image_url": "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600",
    },
    {
        "name": "Ceramic Coffee Mug",
        "description": "A simple ceramic mug for your favorite hot drink.",
        "price": 12.50,
        "stock_quantity": 40,
        "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600",
    },
]


def main():
    # Create any missing tables defined by the current SQLAlchemy models.
    Base.metadata.create_all(bind=engine)

    added = 0
    skipped = 0

    with SessionLocal() as db:
        for item in PRODUCTS:
            existing = db.scalar(
                select(Product).where(Product.name == item["name"])
            )

            if existing:
                skipped += 1
                continue

            db.add(Product(**item))
            added += 1

        db.commit()

        print(f"Products added: {added}")
        print(f"Existing products skipped: {skipped}")

        answer = input(
            "Create an admin account now? Type yes or no: "
        ).strip().lower()

        if answer == "yes":
            email = input("Admin email: ").strip().lower()
            password = getpass("Admin password (hidden): ")
            confirm = getpass("Confirm admin password: ")

            if not email or "@" not in email:
                print("Invalid email. No admin account created.")
                return

            if len(password) < 8:
                print("Password must contain at least 8 characters.")
                return

            if password != confirm:
                print("Passwords do not match. No admin account created.")
                return

            existing_user = db.scalar(
                select(User).where(User.email == email)
            )

            if existing_user:
                print(
                    "That email already exists. No role changes were made."
                )
                return

            admin = User(
                name="CloudCart Admin",
                email=email,
                password_hash=hash_password(password),
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()

            print(f"Admin account created: {email}")
            print("Sign in with this account to manage products.")
        else:
            print("Admin account creation skipped.")


if __name__ == "__main__":
    main()
