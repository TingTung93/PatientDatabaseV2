const express = require('express');
const router = express.Router();
const AuthService = require('../services/AuthService');
const UserValidator = require('../utils/validation/UserValidator');
const validateRequest = require('../middleware/validateRequest');

// Login route
router.post('/login', validateRequest(UserValidator.loginSchema), async (req, res, next) => {
    try {
        const { email, password } = req.validatedData;
        const result = await AuthService.login(email, password);
        res.json(result);
    } catch (error) {
        next(error);
    }
});

// Password reset request route
router.post('/reset-password-request', validateRequest(UserValidator.resetPasswordRequestSchema), async (req, res, next) => {
    try {
        const { email } = req.validatedData;
        await AuthService.requestPasswordReset(email);
        res.json({ message: 'Password reset email sent' });
    } catch (error) {
        next(error);
    }
});

// Password reset route
router.post('/reset-password', validateRequest(UserValidator.resetPasswordSchema), async (req, res, next) => {
    try {
        const { token, newPassword } = req.validatedData;
        await AuthService.resetPassword(token, newPassword);
        res.json({ message: 'Password reset successful' });
    } catch (error) {
        next(error);
    }
});

module.exports = router; 