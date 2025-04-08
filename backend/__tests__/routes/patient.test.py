import pytest
from src.database.models import Patient, User
from src.database.db import db
from src.routes.patient import bp as patient_bp
from flask_jwt_extended import create_access_token
import json
from datetime import datetime

@pytest.fixture
def client(app):
    app.register_blueprint(patient_bp)
    return app.test_client()

@pytest.fixture
def auth_headers():
    # Create test user
    user = User(
        email='doctor@example.com',
        password_hash='hashed_password',
        first_name='John',
        last_name='Doe',
        role='doctor'
    )
    db.session.add(user)
    db.session.commit()
    
    # Create access token
    access_token = create_access_token(identity=user.id)
    return {'Authorization': f'Bearer {access_token}'}

def test_create_patient(client, auth_headers):
    response = client.post('/api/v1/patients', json={
        'name': 'Jane Smith',
        'dob': '1990-01-01',
        'gender': 'female',
        'contact_number': '+1234567890',
        'blood_type': 'A+'
    }, headers=auth_headers)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['name'] == 'Jane Smith'
    assert data['blood_type'] == 'A+'

def test_get_patients(client, auth_headers):
    # Create test patients
    user = User.query.filter_by(email='doctor@example.com').first()
    patients = [
        Patient(
            name='Patient One',
            dob=datetime(1980, 1, 1).date(),
            gender='male',
            contact_number='+1234567890',
            blood_type='O+',
            created_by=user.id,
            updated_by=user.id
        ),
        Patient(
            name='Patient Two',
            dob=datetime(1990, 1, 1).date(),
            gender='female',
            contact_number='+0987654321',
            blood_type='AB+',
            created_by=user.id,
            updated_by=user.id
        )
    ]
    db.session.add_all(patients)
    db.session.commit()
    
    response = client.get('/api/v1/patients', headers=auth_headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['patients']) == 2
    assert 'Patient One' in [p['name'] for p in data['patients']]
    assert 'Patient Two' in [p['name'] for p in data['patients']]
    assert 'total' in data
    assert 'pages' in data

def test_get_patient_details(client, auth_headers):
    # Create test patient
    user = User.query.filter_by(email='doctor@example.com').first()
    patient = Patient(
        name='Test Patient',
        dob=datetime(1985, 1, 1).date(),
        gender='female',
        contact_number='+1234567890',
        blood_type='B+',
        created_by=user.id,
        updated_by=user.id
    )
    db.session.add(patient)
    db.session.commit()
    
    response = client.get(f'/api/v1/patients/{patient.id}', headers=auth_headers)
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Test Patient'
    assert data['blood_type'] == 'B+'

def test_update_patient(client, auth_headers):
    # Create test patient
    user = User.query.filter_by(email='doctor@example.com').first()
    patient = Patient(
        name='Original Name',
        dob=datetime(1985, 1, 1).date(),
        gender='male',
        contact_number='+1234567890',
        blood_type='B+',
        created_by=user.id,
        updated_by=user.id
    )
    db.session.add(patient)
    db.session.commit()
    
    response = client.put(f'/api/v1/patients/{patient.id}', json={
        'name': 'Updated Name'
    }, headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['name'] == 'Updated Name'
    
    # Verify update
    updated_patient = Patient.query.get(patient.id)
    assert updated_patient.name == 'Updated Name'

def test_delete_patient(client, auth_headers):
    # Create test patient
    user = User.query.filter_by(email='doctor@example.com').first()
    patient = Patient(
        name='ToDelete Patient',
        dob=datetime(1985, 1, 1).date(),
        gender='female',
        contact_number='+1234567890',
        blood_type='B+',
        created_by=user.id,
        updated_by=user.id
    )
    db.session.add(patient)
    db.session.commit()
    
    response = client.delete(f'/api/v1/patients/{patient.id}', headers=auth_headers)
    assert response.status_code == 204
    
    # Verify deletion
    deleted_patient = Patient.query.get(patient.id)
    assert deleted_patient is None

def test_validation_errors(client, auth_headers):
    # Test missing required fields
    response = client.post('/patients', json={
        'first_name': 'Test'
    }, headers=auth_headers)
    assert response.status_code == 400
    
    # Test invalid date format
    response = client.post('/patients', json={
        'first_name': 'Test',
        'last_name': 'Patient',
        'date_of_birth': 'invalid-date',
        'medical_record_number': 'MRN12345',
        'blood_type': 'A+'
    }, headers=auth_headers)
    assert response.status_code == 400

def test_unauthorized_access(client):
    # Test endpoints without authentication
    response = client.get('/patients')
    assert response.status_code == 401
    
    response = client.post('/patients', json={})
    assert response.status_code == 401