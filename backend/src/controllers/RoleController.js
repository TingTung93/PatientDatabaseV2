const { dbInstance } = require('../database/init');
const { ValidationError } = require('../errors/ValidationError');
const BaseRepository = require('../repositories/BaseRepository');

class RoleController {
  constructor() {
    this.repository = new BaseRepository(dbInstance);
  }
  
  // Get all roles
  async getAllRoles() {
    try {
      const query = `
        SELECT * FROM roles
        ORDER BY name
      `;
      
      const roles = await this.repository.query(query);

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
      const query = 'SELECT * FROM roles WHERE name = ?';
      const role = await this.repository.queryOne(query, [name]);

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
      const checkQuery = 'SELECT name FROM roles WHERE name = ?';
      const existingRole = await this.repository.queryOne(checkQuery, [name]);
      
      if (existingRole) {
        throw new ValidationError('Role already exists', 400);
      }

      // Insert role
      const insertQuery = `
        INSERT INTO roles (name, description, permissions, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `;
      
      const result = await this.repository.run(insertQuery, [
        name, description, JSON.stringify(permissions)
      ]);

      return this.getRoleById(result.lastID);
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
      const updateQuery = `
        UPDATE roles 
        SET description = COALESCE(?, description),
            permissions = COALESCE(?, permissions),
            updated_at = datetime('now')
        WHERE name = ?
      `;
      
      const result = await this.repository.run(updateQuery, [
        description, 
        permissions ? JSON.stringify(permissions) : null, 
        name
      ]);

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
      const permissionsQuery = `
        UPDATE roles 
        SET permissions = ?, updated_at = datetime('now')
        WHERE name = ?
      `;
      
      const result = await this.repository.run(permissionsQuery, [
        JSON.stringify(permissions), 
        name
      ]);

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
      const usersQuery = `
        SELECT u.*, r.name as role_name, r.permissions
        FROM users u
        JOIN roles r ON u.role_id = r.id
        WHERE r.name = ?
        ORDER BY u.username
      `;
      
      const users = await this.repository.query(usersQuery, [name]);

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
    const roleQuery = 'SELECT * FROM roles WHERE id = ?';
    const role = await this.repository.queryOne(roleQuery, [id]);

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