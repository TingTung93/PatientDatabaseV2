import pytest
from datetime import datetime
from src.utils.report_parser import ReportParser, ReportParsingError
from src.database.db import db
from src.models.report import Patient, PatientComment

@pytest.fixture
def parser():
    return ReportParser()

@pytest.fixture
def db_setup(monkeypatch):
    # Create all tables
    db.create_all()
    yield db
    # Clean up after tests
    db.session.remove()
    db.drop_all()

@pytest.fixture
def sample_patient_data():
    return {
        'mrn': '47152592000001',
        'last_name': 'SMITH',
        'first_name': 'Marissa',
        'middle_name': 'Josephine',
        'birth_date': '1993-04-22T00:00:00',
        'blood_type': 'O POS',
        'phenotype': None,
        'transfusion_requirements': None,
        'antibodies': None,
        'antigens': None,
        'comments': [
            {
                'timestamp': 'MAR/17/25 08:21:00',
                'user_id': 'RUTH.DALIDA.0001',
                'comment': 'HCLL Hx REVIEWED/ENTERED. No Hx'
            }
        ]
    }

@pytest.fixture
def sample_report():
    return """0067-BB                            P A T I E N T   T Y P I N G S   A N D   C O M M E N T S             Time:         08:22
8901 Wisconsin Ave                                    (by Patient Name)                                As of Date:   17MAR25
Bethesda, MD  20889-5600
                               Beginning Date: 17MAR25  00:00         Ending Date: 17MAR25  23:59

Facility: 0067A


                                    Medical                                                  Transfusion
              Name               Record Number    Birth Date       ABO/Rh       Phenotype    Requirements  Antibodies   Antigens
----------------------------  ---------------  -------------  -------------  ------------  ------------  -----------  --------
SMITH, Marissa Josephine      47152592000001   22APR93 00:00     O POS         <None>        <None>        <None>     <None>

                            * * * * * * * * * * * * * * * * Patient Comments * * * * * * * * * * * * * * * *
                            >> MAR/17/25 08:21:00  RUTH.DALIDA.0001   HCLL Hx REVIEWED/ENTERED. No Hx

BELLE, Christel B M          32274713000001   31DEC51 00:00      B POS         <None>        <None>        <None>     <None>

                            * * * * * * * * * * * * * * * * Patient Comments * * * * * * * * * * * * * * * *
                            >> JUN/04/24 16:56:00  PETER.LE.0001   WRNMMC DataArk CHECKED"""

def test_parse_complete_record(parser):
    """Test parsing a complete patient record"""
    line = "SMITH, Marissa Josephine      47152592000001   22APR93 00:00     O POS         <None>        <None>        <None>     <None>"
    result = parser.parse_patient_line(line)
    
    assert result is not None
    assert result['last_name'] == 'SMITH'
    assert result['first_name'] == 'Marissa'
    assert result['middle_name'] == 'Josephine'
    assert result['mrn'] == '47152592000001'
    assert result['blood_type'] == 'O POS'
    assert result['phenotype'] is None
    assert result['transfusion_requirements'] is None
    assert result['antibodies'] is None
    assert result['antigens'] is None

def test_parse_not_on_file(parser):
    """Test parsing a record marked as 'Not on File'"""
    line = "<Not on File>                 <Not on File>    <Not on File>     <None>         <None>        <None>        <None>     <None>"
    result = parser.parse_patient_line(line)
    assert result is None

def test_parse_comment(parser):
    """Test parsing a comment line"""
    line = ">> MAR/17/25 08:21:00  RUTH.DALIDA.0001   HCLL Hx REVIEWED/ENTERED. No Hx"
    result = parser.parse_comment(line)
    
    assert result is not None
    assert result['timestamp'] == 'MAR/17/25 08:21:00'
    assert result['user_id'] == 'RUTH.DALIDA.0001'
    assert result['comment'] == 'HCLL Hx REVIEWED/ENTERED. No Hx'

def test_parse_full_report(parser, sample_report):
    """Test parsing a complete report"""
    result = parser.parse(sample_report)
    
    assert result['facility'] == '0067A'
    assert len(result['patients']) == 2
    
    # Check first patient
    patient1 = result['patients'][0]
    assert patient1['last_name'] == 'SMITH'
    assert patient1['first_name'] == 'Marissa'
    assert patient1['middle_name'] == 'Josephine'
    assert patient1['mrn'] == '47152592000001'
    assert len(patient1['comments']) == 1
    assert patient1['comments'][0]['user_id'] == 'RUTH.DALIDA.0001'
    
    # Check second patient
    patient2 = result['patients'][1]
    assert patient2['last_name'] == 'BELLE'
    assert patient2['first_name'] == 'Christel'
    assert patient2['middle_name'] == 'B M'
    assert patient2['mrn'] == '32274713000001'
    assert len(patient2['comments']) == 1
    assert patient2['comments'][0]['user_id'] == 'PETER.LE.0001'

def test_invalid_date_format(parser):
    """Test handling invalid date format"""
    line = "SMITH, John      47152592000001   INVALID-DATE     O POS         <None>        <None>        <None>     <None>"
    result = parser.parse_patient_line(line)
    assert result['birth_date'] is None

def test_multiline_comment(parser):
    """Test parsing a comment that spans multiple lines"""
    text = """* * * * * * * * * * * * * * * * Patient Comments * * * * * * * * * * * * * * * *
             >> JAN/30/25 11:46:00  NIKKIMA.SUELO.0001   ATAMMC- No previous history in
             legacy system."""
    
    result = parser.parse(text)
    # Since this is just a comment section without a patient, there should be no patients
    assert len(result['patients']) == 0

def test_empty_report(parser):
    """Test parsing an empty report"""
    result = parser.parse("")
    assert result['facility'] is None
    assert len(result['patients']) == 0

def test_save_new_patient(parser, db_setup, sample_patient_data):
    """Test saving a new patient to the database"""
    # Save patient data
    patient = parser.save_to_db(sample_patient_data)
    
    # Verify patient was saved
    assert patient is not None
    assert patient.mrn == sample_patient_data['mrn']
    assert patient.last_name == sample_patient_data['last_name']
    assert patient.first_name == sample_patient_data['first_name']
    assert patient.middle_name == sample_patient_data['middle_name']
    assert patient.blood_type == sample_patient_data['blood_type']
    
    # Verify comment was saved
    assert len(patient.comments) == 1
    comment = patient.comments[0]
    assert comment.user_id == 'RUTH.DALIDA.0001'
    assert comment.comment == 'HCLL Hx REVIEWED/ENTERED. No Hx'

def test_update_existing_patient(parser, db_setup, sample_patient_data):
    """Test updating an existing patient in the database"""
    # First save creates the patient
    original_patient = parser.save_to_db(sample_patient_data)
    
    # Modify some data
    updated_data = sample_patient_data.copy()
    updated_data['blood_type'] = 'A NEG'
    updated_data['comments'].append({
        'timestamp': 'MAR/17/25 09:00:00',
        'user_id': 'JOHN.DOE.0001',
        'comment': 'Follow-up required'
    })
    
    # Update the patient
    updated_patient = parser.save_to_db(updated_data)
    
    # Verify updates
    assert updated_patient.id == original_patient.id
    assert updated_patient.blood_type == 'A NEG'
    assert len(updated_patient.comments) == 2
    assert updated_patient.comments[1].user_id == 'JOHN.DOE.0001'

def test_save_invalid_patient_data(parser, db_setup):
    """Test handling invalid patient data"""
    invalid_data = {
        'mrn': '12345',  # Too short
        'last_name': 'SMITH',
        'first_name': 'John',
        'middle_name': None,
        'birth_date': 'invalid-date',
        'blood_type': 'Invalid',
        'comments': []
    }
    
    # Attempt to save invalid data
    result = parser.save_to_db(invalid_data)
    assert result is None  # Should return None on failure
    
    # Verify no patient was saved
    saved_patient = Patient.query.filter_by(mrn='12345').first()
    assert saved_patient is None

def test_save_patient_with_invalid_comment(parser, db_setup, sample_patient_data):
    """Test handling invalid comment data"""
    # Add invalid comment
    data = sample_patient_data.copy()
    data['comments'].append({
        'timestamp': 'invalid-timestamp',
        'user_id': 'JOHN.DOE.0001',
        'comment': 'Test comment'
    })
    
    # Save should succeed but skip invalid comment
    patient = parser.save_to_db(data)
    assert patient is not None
    assert len(patient.comments) == 1  # Only valid comment should be saved
    assert patient.comments[0].user_id == 'RUTH.DALIDA.0001'