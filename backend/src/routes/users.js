const express = require('express');
const router = express.Router();
const { validateUser, validateUserUpdate, validatePasswordChange } = require('../middleware/validation');
const UserController = require('../controllers/UserController');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await UserController.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by username
router.get('/:username', async (req, res) => {
  try {
    const user = await UserController.getUserByUsername(req.params.username);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create new user
router.post('/', validateUser, async (req, res) => {
  try {
    const user = await UserController.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Update user
router.put('/:username', validateUserUpdate, async (req, res) => {
  try {
    const user = await UserController.updateUser(req.params.username, req.body);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Change password
router.put('/:username/password', validatePasswordChange, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await UserController.changePassword(
      req.params.username,
      currentPassword,
      newPassword
    );
    res.json(result);
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Assign role to user
router.put('/:username/role', async (req, res) => {
  try {
    const { role } = req.body;
    const user = await UserController.assignRole(req.params.username, role);
    res.json(user);
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

module.exports = router; 