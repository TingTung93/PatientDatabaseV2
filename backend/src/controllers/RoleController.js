const { db } = require('../database/init');
const { ValidationError } = require('../errors/ValidationError');

class RoleController {
  // Get all roles
  async getAllRoles() {
    try {
      const roles = db.prepare(`
        SELECT * FROM roles
        ORDER BY name
      `).all();

      return roles.map(role => ({
        ...role,
        permissions: JSON.parse(role.permissions)
      }));
    } catch (error) {
      console.error('Error fetching roles:', error);
      throw new Error('Failed to fetch roles');
    }
  }

  // Get role by name
  async getRoleByName(name) {
    try {
      const role = db.prepare('SELECT * FROM roles WHERE name = ?').get(name);

      if (!role) {
        throw new ValidationError('Role not found', 404);
      }

      return {
        ...role,
        permissions: JSON.parse(role.permissions)
      };
    } catch (error) {
      console.error('Error fetching role:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to fetch role');
    }
  }

  // Create new role
  async createRole(roleData) {
    try {
      const { name, description, permissions } = roleData;

      // Check if role already exists
      const existingRole = db.prepare('SELECT name FROM roles WHERE name = ?').get(name);
      if (existingRole) {
        throw new ValidationError('Role already exists', 400);
      }

      // Insert role
      const result = db.prepare(`
        INSERT INTO roles (name, description, permissions, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(name, description, JSON.stringify(permissions));

      return this.getRoleById(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating role:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to create role');
    }
  }

  // Update role
  async updateRole(name, updateData) {
    try {
      const { description, permissions } = updateData;

      // Update role
      const result = db.prepare(`
        UPDATE roles 
        SET description = COALESCE(?, description),
            permissions = COALESCE(?, permissions),
            updated_at = datetime('now')
        WHERE name = ?
      `).run(description, permissions ? JSON.stringify(permissions) : null, name);

      if (result.changes === 0) {
        throw new ValidationError('Role not found', 404);
      }

      return this.getRoleByName(name);
    } catch (error) {
      console.error('Error updating role:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to update role');
    }
  }

  // Assign permissions to role
  async assignPermissions(name, permissions) {
    try {
      // Update role permissions
      const result = db.prepare(`
        UPDATE roles 
        SET permissions = ?, updated_at = datetime('now')
        WHERE name = ?
      `).run(JSON.stringify(permissions), name);

      if (result.changes === 0) {
        throw new ValidationError('Role not found', 404);
      }

      return this.getRoleByName(name);
    } catch (error) {
      console.error('Error assigning permissions:', error);
      throw error instanceof ValidationError ? error : new Error('Failed to assign permissions');
    }
  }

  // Get users with role
  async getUsersWithRole(name) {
    try {
      const users = db.prepare(`
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = ?
        ORDER BY u.username
      `).all(name);

      return users.map(user => ({
        ...user,
        permissions: JSON.parse(user.permissions)
      }));
    } catch (error) {
      console.error('Error fetching users with role:', error);
      throw new Error('Failed to fetch users with role');
    }
  }

  // Helper method to get role by ID
  async getRoleById(id) {
    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(id);

    if (!role) {
      throw new ValidationError('Role not found', 404);
    }

    return {
      ...role,
      permissions: JSON.parse(role.permissions)
    };
  }
}

module.exports = new RoleController(); 