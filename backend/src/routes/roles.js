const express = require('express');
const router = express.Router();
const { validateRole, validateRoleUpdate, validatePermissionAssignment } = require('../middleware/validation');
const RoleController = require('../controllers/RoleController');

// Get all roles
router.get('/', async (req, res) => {
  try {
    const roles = await RoleController.getAllRoles();
    res.json(roles);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get role by name
router.get('/:name', async (req, res) => {
  try {
    const role = await RoleController.getRoleByName(req.params.name);
    res.json(role);
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Create new role
router.post('/', validateRole, async (req, res) => {
  try {
    const role = await RoleController.createRole(req.body);
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Update role
router.put('/:name', validateRoleUpdate, async (req, res) => {
  try {
    const role = await RoleController.updateRole(req.params.name, req.body);
    res.json(role);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Assign permissions to role
router.put('/:name/permissions', validatePermissionAssignment, async (req, res) => {
  try {
    const { permissions } = req.body;
    const role = await RoleController.assignPermissions(req.params.name, permissions);
    res.json(role);
  } catch (error) {
    console.error('Error assigning permissions:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Get users with role
router.get('/:name/users', async (req, res) => {
  try {
    const users = await RoleController.getUsersWithRole(req.params.name);
    res.json(users);
  } catch (error) {
    console.error('Error fetching users with role:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 