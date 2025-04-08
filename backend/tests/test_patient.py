import pytest
from src.database.models import User, Patient
from src.database.db import db
from src import create_app

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        # Create a test user
        test_user = User(email='test@example.com', password_hash='testhash')
        db.session.add(test_user)
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_token(client):
    # Register and login to get token
    client.post('/auth/register', json={
        'email': 'test@example.com',
        'password': 'testpassword'
    })
    login_response = client.post('/auth/login', json={
        'email': 'test@example.com',
        'password': 'testpassword'
    })
    return login_response.json['access_token']

def test_create_patient(client, auth_token):
    response = client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert response.status_code == 201
    assert 'id' in response.json

def test_get_patients(client, auth_token):
    # Create a patient first
    client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    
    response = client.get('/patients/patients', 
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert response.status_code == 200
    assert isinstance(response.json, list)
    assert len(response.json) > 0

def test_get_single_patient(client, auth_token):
    # Create a patient first
    create_response = client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    patient_id = create_response.json['id']
    
    response = client.get(f'/patients/patients/{patient_id}', 
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert response.status_code == 200
    assert response.json['id'] == patient_id

def test_update_patient(client, auth_token):
    # Create a patient first
    create_response = client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    patient_id = create_response.json['id']
    
    response = client.put(f'/patients/patients/{patient_id}', 
        json={
            'first_name': 'Jane',
            'last_name': 'Smith'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert response.status_code == 200
    assert response.json['message'] == 'Patient updated successfully'

def test_delete_patient(client, auth_token):
    # Create a patient first
    create_response = client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    patient_id = create_response.json['id']
    
    response = client.delete(f'/patients/patients/{patient_id}', 
        headers={'Authorization': f'Bearer {auth_token}'}
    )
    assert response.status_code == 200
    assert response.json['message'] == 'Patient deleted successfully'