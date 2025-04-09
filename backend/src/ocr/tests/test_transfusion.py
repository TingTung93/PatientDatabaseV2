import pytest
import json
from src.database.models import User, Patient, TransfusionRequirement
from src.database.db import db
from src import create_app

@pytest.fixture
def app():
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def auth_tokens(client):
    # Create a test admin user
    client.post('/auth/register', json={
        'email': 'admin@example.com',
        'password': 'adminpassword',
        'role': 'admin'
    })
    admin_login = client.post('/auth/login', json={
        'email': 'admin@example.com',
        'password': 'adminpassword'
    })
    admin_token = admin_login.json['access_token']
    
    # Create a test regular user
    client.post('/auth/register', json={
        'email': 'user@example.com',
        'password': 'userpassword',
        'role': 'user'
    })
    user_login = client.post('/auth/login', json={
        'email': 'user@example.com',
        'password': 'userpassword'
    })
    user_token = user_login.json['access_token']
    
    # Create unauthorized user
    client.post('/auth/register', json={
        'email': 'guest@example.com',
        'password': 'guestpassword',
        'role': 'guest'
    })
    guest_login = client.post('/auth/login', json={
        'email': 'guest@example.com',
        'password': 'guestpassword'
    })
    guest_token = guest_login.json['access_token']
    
    return {
        'admin': f"Bearer {admin_token}",
        'user': f"Bearer {user_token}",
        'guest': f"Bearer {guest_token}"
    }

@pytest.fixture
def test_patients(client, auth_tokens):
    # Create test patients with different blood types
    patient_a_pos = client.post('/patients/patients', 
        json={
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-01',
            'blood_type': 'A+'
        },
        headers={'Authorization': auth_tokens['admin']}
    )
    
    patient_o_neg = client.post('/patients/patients', 
        json={
            'first_name': 'Jane',
            'last_name': 'Smith',
            'date_of_birth': '1985-05-15',
            'blood_type': 'O-'
        },
        headers={'Authorization': auth_tokens['admin']}
    )
    
    return {
        'patient_a_pos': patient_a_pos.json['id'],
        'patient_o_neg': patient_o_neg.json['id']
    }

# 1. Test creating transfusion requirements
def test_create_transfusion_requirement(client, auth_tokens, test_patients):
    # Test creating with valid data (authorized user)
    patient_id = test_patients['patient_a_pos']
    response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['user']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 2,
            'urgency_level': 'Medium',
            'required_by_date': '2025-04-01',
            'status': 'Pending',
            'notes': 'Test transfusion requirement'
        }
    )
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'id' in data
    assert data['patient_id'] == patient_id
    assert data['blood_type_required'] == 'A+'
    
    # Test blood type compatibility validation
    response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'patient_id': patient_id,  # A+ patient
            'blood_type_required': 'B-',  # Incompatible blood type
            'units_required': 1,
            'urgency_level': 'High',
            'required_by_date': '2025-03-25',
            'status': 'Pending'
        }
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data
    assert 'blood type' in data['error'].lower()
    
    # Test unauthorized access
    response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['guest']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 1,
            'urgency_level': 'Low',
            'required_by_date': '2025-05-01',
            'status': 'Pending'
        }
    )
    
    assert response.status_code == 403
    
    # Test validation for required fields
    response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['user']},
        json={
            'patient_id': patient_id
            # Missing required fields
        }
    )
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'error' in data

# 2. Test retrieving requirements by patient
def test_get_transfusion_requirements_by_patient(client, auth_tokens, test_patients):
    patient_id = test_patients['patient_a_pos']
    
    # Create a test transfusion requirement first
    client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 2,
            'urgency_level': 'Medium',
            'required_by_date': '2025-04-01',
            'status': 'Pending',
            'notes': 'Test requirement'
        }
    )
    
    # Test successful retrieval
    response = client.get(
        f'/api/transfusions/patient/{patient_id}',
        headers={'Authorization': auth_tokens['user']}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]['patient_id'] == patient_id
    
    # Test for patient with no transfusions
    non_existent_id = 9999
    response = client.get(
        f'/api/transfusions/patient/{non_existent_id}',
        headers={'Authorization': auth_tokens['user']}
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) == 0
    
    # Test unauthenticated access
    response = client.get(f'/api/transfusions/patient/{patient_id}')
    assert response.status_code == 401

# 3. Test updating requirement status
def test_update_transfusion_requirement(client, auth_tokens, test_patients):
    patient_id = test_patients['patient_a_pos']
    
    # Create a test transfusion requirement first
    create_response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 2,
            'urgency_level': 'Medium',
            'required_by_date': '2025-04-01',
            'status': 'Pending',
            'notes': 'Initial notes'
        }
    )
    
    requirement_id = create_response.json['id']
    
    # Test update as admin
    response = client.put(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'status': 'In Progress',
            'notes': 'Updated by admin'
        }
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'In Progress'
    assert data['notes'] == 'Updated by admin'
    
    # Test update as regular user
    response = client.put(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['user']},
        json={
            'status': 'Completed',
            'notes': 'Updated by regular user'
        }
    )
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'Completed'
    
    # Test unauthorized update
    response = client.put(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['guest']},
        json={
            'status': 'Pending',
            'notes': 'Attempt by unauthorized user'
        }
    )
    
    assert response.status_code == 403
    
    # Test non-existent transfusion
    non_existent_id = 9999
    response = client.put(
        f'/api/transfusions/{non_existent_id}',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'status': 'Completed'
        }
    )
    
    assert response.status_code == 404

# 4. Test authorization for delete operation
def test_delete_transfusion_requirement(client, auth_tokens, test_patients):
    patient_id = test_patients['patient_a_pos']
    
    # Create a test transfusion requirement to delete
    create_response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 1,
            'urgency_level': 'Low',
            'required_by_date': '2025-05-15',
            'status': 'Pending',
            'notes': 'To be deleted'
        }
    )
    
    requirement_id = create_response.json['id']
    
    # Test delete as admin
    response = client.delete(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['admin']}
    )
    
    assert response.status_code == 204
    
    # Verify it was deleted
    response = client.get(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['admin']}
    )
    
    assert response.status_code == 404
    
    # Create another requirement for testing
    create_response = client.post(
        '/api/transfusions',
        headers={'Authorization': auth_tokens['admin']},
        json={
            'patient_id': patient_id,
            'blood_type_required': 'A+',
            'units_required': 1,
            'urgency_level': 'Low',
            'required_by_date': '2025-05-15',
            'status': 'Pending',
            'notes': 'Testing user delete permissions'
        }
    )
    
    requirement_id = create_response.json['id']
    
    # Test delete as regular user (should be rejected)
    response = client.delete(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['user']}
    )
    
    assert response.status_code == 403
    
    # Test delete as unauthorized user
    response = client.delete(
        f'/api/transfusions/{requirement_id}',
        headers={'Authorization': auth_tokens['guest']}
    )
    
    assert response.status_code == 403