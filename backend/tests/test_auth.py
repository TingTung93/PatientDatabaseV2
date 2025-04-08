import pytest
from src.app import create_app
from src.database.models import User
from src.database.db import db
from flask_jwt_extended import create_access_token

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_user(app):
    with app.app_context():
        user = User(
            username='admin',
            email='admin@test.com',
            role='admin'
        )
        user.set_password('testpassword')
        db.session.add(user)
        db.session.commit()
        return user

def test_register(client):
    response = client.post('/api/auth/register', json={
        'username': 'testuser',
        'email': 'test@test.com',
        'password': 'testpassword'
    })
    assert response.status_code == 201
    assert b'User created successfully' in response.data

def test_login(client, admin_user):
    response = client.post('/api/auth/login', json={
        'email': 'admin@test.com',
        'password': 'testpassword'
    })
    assert response.status_code == 200
    assert b'access_token' in response.data

def test_protected_route(client, admin_user):
    with client.application.app_context():
        access_token = create_access_token(identity=admin_user.id)
    
    response = client.get('/api/auth/protected', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 200
    assert b'protected' in response.data