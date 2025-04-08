/**
 * Dependency Injection Middleware
 * 
 * This middleware initializes repositories and services and attaches them
 * to the request object for use in route handlers.
 */
const db = require('../database/db');
const OcrResultRepository = require('../repositories/OcrResultRepository');
const PatientRepository = require('../repositories/PatientRepository');
const UserRepository = require('../repositories/UserRepository');
const AuthService = require('../services/AuthService');
const OcrService = require('../services/OcrService');
const PatientService = require('../services/PatientService');

/**
 * Initialize all repositories and services and attach them to the request object
 */
function injectDependencies(req, res, next) {
  // Initialize repositories
  const patientRepository = new PatientRepository(db);
  const userRepository = new UserRepository(db);
  const ocrResultRepository = new OcrResultRepository(db);
  
  // Initialize services with their required repositories
  const patientService = new PatientService(patientRepository);
  const authService = new AuthService(userRepository);
  const ocrService = new OcrService(ocrResultRepository, patientRepository);
  
  // Attach repositories and services to request object
  req.repositories = {
    patient: patientRepository,
    user: userRepository,
    ocrResult: ocrResultRepository
  };
  
  req.services = {
    patient: patientService,
    auth: authService,
    ocr: ocrService
  };
  
  next();
}

module.exports = injectDependencies;