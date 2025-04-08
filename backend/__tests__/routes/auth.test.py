import pytest
from src.database.models import User
from src.database.db import db
from src.routes.auth import bp as auth_bp
from flask_jwt_extended import create_access_token
import json

@pytest.fixture
def client(app):
    app.register_blueprint(auth_bp)
    return app.test_client()

def test_register_user(client):
    # Test successful registration
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'Test1234!',
        'first_name': 'Test',
        'last_name': 'User'
    })
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'user' in data
    assert data['user']['email'] == 'test@example.com'
    
    # Test duplicate registration
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'Test1234!'
    })
    assert response.status_code == 409

def test_login(client):
    # Create test user
    user = User(
        email='test@example.com',
        password_hash='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        first_name='Test',
        last_name='User'
    )
    db.session.add(user)
    db.session.commit()
    
    # Test successful login
    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'secret'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data
    assert 'refresh_token' in data
    
    # Test invalid credentials
    response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'wrong'
    })
    assert response.status_code == 401

def test_refresh_token(client):
    # Create test user
    user = User(
        email='test@example.com',
        password_hash='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        first_name='Test',
        last_name='User'
    )
    db.session.add(user)
    db.session.commit()
    
    # Get refresh token
    refresh_token = create_access_token(identity=user.id, fresh=False)
    
    # Test token refresh
    response = client.post('/auth/refresh', headers={
        'Authorization': f'Bearer {refresh_token}'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'access_token' in data

def test_get_current_user(client):
    # Create test user
    user = User(
        email='test@example.com',
        password_hash='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW',
        first_name='Test',
        last_name='User'
    )
    db.session.add(user)
    db.session.commit()
    
    # Get access token
    access_token = create_access_token(identity=user.id)
    
    # Test current user endpoint
    response = client.get('/auth/me', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['email'] == 'test@example.com'
    assert data['first_name'] == 'Test'
    assert data['last_name'] == 'User'

def test_validation_errors(client):
    # Test invalid email format
    response = client.post('/auth/register', json={
        'email': 'invalid-email',
        'password': 'Test1234!'
    })
    assert response.status_code == 400
    
    # Test short password
    response = client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'short'
    })
    assert response.status_code == 400
    
    # Test missing fields
    response = client.post('/auth/register', json={
        'email': 'test@example.com'
    })
    assert response.status_code == 400