const BaseValidator = require('./BaseValidator');

class PatientValidator extends BaseValidator {
  constructor() {
    super();
    this.bloodTypes = ['A POS', 'A NEG', 'B POS', 'B NEG', 'AB POS', 'AB NEG', 'O POS', 'O NEG'];
    this.genders = ['M', 'F', 'O'];
  }

  validate(data) {
    this.clearErrors();

    // Required fields
    this.validateRequired(data, [
      'name',
      'dob',
      'blood_type'
    ]);

    // Name validation
    if (data.name) {
      this.validateLength('name', data.name, 2, 100);
    }

    // Date of birth validation
    this.validateDate('dob', data.dob);

    // Blood type validation
    this.validateEnum('blood_type', data.blood_type, this.bloodTypes);

    // Gender validation (if provided)
    if (data.gender) {
      this.validateEnum('gender', data.gender, this.genders);
    }

    // Contact number validation (if provided)
    if (data.contact_number) {
      this.validatePhone('contact_number', data.contact_number);
    }

    // Antigen phenotype validation (if provided)
    if (data.antigen_phenotype) {
      this.validateLength('antigen_phenotype', data.antigen_phenotype, 1, 500);
    }

    // Transfusion restrictions validation (if provided)
    if (data.transfusion_restrictions) {
      this.validateLength('transfusion_restrictions', data.transfusion_restrictions, 1, 1000);
    }

    // Antibodies validation (if provided)
    if (data.antibodies) {
      this.validateJSON('antibodies', data.antibodies);
    }

    // Medical history validation (if provided)
    if (data.medical_history) {
      this.validateLength('medical_history', data.medical_history, 1, 5000);
    }

    // Allergies validation (if provided)
    if (data.allergies) {
      this.validateLength('allergies', data.allergies, 1, 1000);
    }

    // Current medications validation (if provided)
    if (data.current_medications) {
      this.validateLength('current_medications', data.current_medications, 1, 1000);
    }

    // Comments validation (if provided)
    if (data.comments) {
      this.validateJSON('comments', data.comments);
    }

    return !this.hasErrors();
  }

  validateUpdate(data) {
    // For updates, we only validate fields that are provided
    this.clearErrors();

    if (data.name !== undefined) {
      this.validateLength('name', data.name, 2, 100);
    }

    if (data.dob !== undefined) {
      this.validateDate('dob', data.dob);
    }

    if (data.blood_type !== undefined) {
      this.validateEnum('blood_type', data.blood_type, this.bloodTypes);
    }

    if (data.gender !== undefined) {
      this.validateEnum('gender', data.gender, this.genders);
    }

    if (data.contact_number !== undefined) {
      this.validatePhone('contact_number', data.contact_number);
    }

    if (data.antigen_phenotype !== undefined) {
      this.validateLength('antigen_phenotype', data.antigen_phenotype, 1, 500);
    }

    if (data.transfusion_restrictions !== undefined) {
      this.validateLength('transfusion_restrictions', data.transfusion_restrictions, 1, 1000);
    }

    if (data.antibodies !== undefined) {
      this.validateJSON('antibodies', data.antibodies);
    }

    if (data.medical_history !== undefined) {
      this.validateLength('medical_history', data.medical_history, 1, 5000);
    }

    if (data.allergies !== undefined) {
      this.validateLength('allergies', data.allergies, 1, 1000);
    }

    if (data.current_medications !== undefined) {
      this.validateLength('current_medications', data.current_medications, 1, 1000);
    }

    if (data.comments !== undefined) {
      this.validateJSON('comments', data.comments);
    }

    return !this.hasErrors();
  }
}

module.exports = PatientValidator; 