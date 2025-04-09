import pytest
from src.app import create_app
from src.database.models import Patient, User
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
            password='testpassword',
            role='admin'
        )
        db.session.add(user)
        db.session.commit()
        return user

@pytest.fixture
def test_patient(app):
    with app.app_context():
        patient = Patient(
            first_name='John',
            last_name='Doe',
            date_of_birth='1990-01-01',
            gender='Male',
            contact_number='1234567890'
        )
        db.session.add(patient)
        db.session.commit()
        return patient

def test_create_patient(client, admin_user):
    with client.application.app_context():
        access_token = create_access_token(identity=admin_user.id)
    
    response = client.post('/api/patients', json={
        'first_name': 'Jane',
        'last_name': 'Smith',
        'date_of_birth': '1995-05-15',
        'gender': 'Female',
        'contact_number': '0987654321'
    }, headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 201
    assert b'Patient created successfully' in response.data

def test_get_patient(client, admin_user, test_patient):
    with client.application.app_context():
        access_token = create_access_token(identity=admin_user.id)
    
    response = client.get(f'/api/patients/{test_patient.id}', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 200
    assert b'John' in response.data
    assert b'Doe' in response.data

def test_update_patient(client, admin_user, test_patient):
    with client.application.app_context():
        access_token = create_access_token(identity=admin_user.id)
    
    response = client.put(f'/api/patients/{test_patient.id}', json={
        'first_name': 'Johnny',
        'last_name': 'Doe',
        'date_of_birth': '1990-01-01',
        'gender': 'Male',
        'contact_number': '1234567890'
    }, headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 200
    assert b'Johnny' in response.data

def test_delete_patient(client, admin_user, test_patient):
    with client.application.app_context():
        access_token = create_access_token(identity=admin_user.id)
    
    response = client.delete(f'/api/patients/{test_patient.id}', headers={
        'Authorization': f'Bearer {access_token}'
    })
    assert response.status_code == 204