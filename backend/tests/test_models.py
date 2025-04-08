import pytest
from src.database.models import User, Patient, TransfusionRequirement
from src.database.db import db
from src import create_app

@pytest.fixture
def test_app():
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(test_app):
    return test_app.test_client()

def test_validate_email():
    # Test valid email
    assert User.validate_email('test@example.com') is True
    
    # Test invalid emails
    assert User.validate_email('invalid-email') is False
    assert User.validate_email('') is False
    assert User.validate_email('a' * 121 + '@example.com') is False

def test_validate_password():
    # Test valid password
    assert User.validate_password('ValidPass1!') is True
    
    # Test invalid passwords
    assert User.validate_password('short') is False
    assert User.validate_password('nouppercase1!') is False
    assert User.validate_password('NOLOWERCASE1!') is False
    assert User.validate_password('NoNumbers!!') is False
    assert User.validate_password('NoSpecialChars1') is False

def test_user_registration(test_app):
    with test_app.app_context():
        user = User(email='test@example.com')
        user.set_password('TestPass1!')
        db.session.add(user)
        db.session.commit()
        
        assert user.id is not None
        assert user.check_password('TestPass1!') is True
        assert user.check_password('wrong') is False

def test_patient_management(test_app):
    with test_app.app_context():
        user = User(email='test@example.com')
        user.set_password('TestPass1!')
        db.session.add(user)
        
        patient = Patient(
            name='John Doe',
            dob='1990-01-01',
            blood_type='A+',
            user_id=user.id
        )
        db.session.add(patient)
        db.session.commit()
        
        assert patient.id is not None
        assert patient.user_id == user.id
        assert len(user.patients) == 1

def test_transfusion_requirements(test_app):
    with test_app.app_context():
        user = User(email='test@example.com')
        user.set_password('TestPass1!')
        db.session.add(user)
        
        patient = Patient(
            name='John Doe',
            dob='1990-01-01',
            blood_type='A+',
            user_id=user.id
        )
        db.session.add(patient)
        
        transfusion = TransfusionRequirement(
            requirement_type='Red Blood Cells',
            frequency_days=30,
            last_transfusion='2025-01-01',
            patient_id=patient.id
        )
        db.session.add(transfusion)
        db.session.commit()
        
        assert transfusion.id is not None
        assert len(patient.transfusion_requirements) == 1