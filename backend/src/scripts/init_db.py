import os
import sys

# Add the parent directory to Python path
parent_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, parent_dir)

from src.database.db import db
from src.database.models import User
from src.app import create_app

def init_db():
    """Initialize the database with a test user."""
    app = create_app()
    
    # Ensure instance directory exists
    os.makedirs(os.path.join(parent_dir, 'instance'), exist_ok=True)
    
    with app.app_context():
        # Drop existing tables
        try:
            db.drop_all()
        except Exception as e:
            print(f"Warning: Could not drop tables: {e}")
        
        # Create tables
        db.create_all()
        
        # Create test user
        test_user = User(
            username='test@example.com',
            email='test@example.com',
            role='admin'
        )
        test_user.set_password('Test123!')
        
        # Add and commit
        db.session.add(test_user)
        db.session.commit()
        
        print("Database initialized with test user:")
        print("Email: test@example.com")
        print("Password: Test123!")

if __name__ == '__main__':
    init_db()