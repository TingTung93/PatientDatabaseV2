const request = require('supertest');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../../database/init');
const { validateUser, validateUserUpdate, validateUserLogin, validatePasswordReset, validatePasswordChange } = require('../../middleware/validation');
const { validateRole, validateRoleUpdate, validatePermissionAssignment } = require('../../middleware/validation');
const config = require('../../config/config');
const { User, Role, PasswordReset, sequelize } = require('../../database/models');
const { Op } = require('sequelize');

describe('User and Role Management Integration', () => {
  let app;
  let adminToken;
  let userToken;

  beforeAll(async () => {
    // Initialize database
    await sequelize.sync({ force: true });
    
    // Create default roles
    await Role.bulkCreate([
      { name: 'admin', description: 'Administrator' },
      { name: 'user', description: 'Regular user' },
      { name: 'viewer', description: 'Read-only user' }
    ]);

    // Create admin user
    const adminRole = await Role.findOne({ where: { name: 'admin' } });
    await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('admin123', 10),
      role_id: adminRole.id,
      is_active: true
    });

    app = express();
    app.use(express.json());
    
    // Import routes
    const userRoutes = require('../../routes/users');
    const roleRoutes = require('../../routes/roles');
    const authRoutes = require('../../routes/auth');
    
    app.use('/api/users', userRoutes);
    app.use('/api/roles', roleRoutes);
    app.use('/api/auth', authRoutes);
  });

  beforeEach(async () => {
    // Clear database except admin user and default roles
    await PasswordReset.destroy({ where: {} });
    await User.destroy({ where: { username: { [Op.ne]: 'admin' } } });
    await Role.destroy({ where: { name: { [Op.notIn]: ['admin', 'user', 'viewer'] } } });

    // Get admin token
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'admin',
        password: 'Admin123!@#'
      });
    adminToken = adminResponse.body.token;

    // Create test user
    const userResponse = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'testuser',
        email: 'test@example.com',
        password: 'Test123!@#',
        role: 'user',
        firstName: 'Test',
        lastName: 'User'
      });
    
    // Get user token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'Test123!@#'
      });
    userToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Authentication Flow', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        username: 'testuser',
        email: 'test@example.com',
        role: 'user'
      });
    });

    test('should reject invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    test('should request password reset', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'test@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify reset token was created
      const resetToken = db.prepare('SELECT * FROM password_resets WHERE user_id = (SELECT id FROM users WHERE email = ?)').get('test@example.com');
      expect(resetToken).toBeDefined();
    });

    test('should reset password with valid token', async () => {
      // Create reset token
      const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('test@example.com').id;
      const token = jwt.sign({ userId }, config.jwt.secret, { expiresIn: '1h' });
      
      db.prepare(`
        INSERT INTO password_resets (user_id, token, expires_at)
        VALUES (?, ?, datetime('now', '+1 hour'))
      `).run(userId, token);

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token,
          newPassword: 'NewTest123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify password was updated
      const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId);
      expect(bcrypt.compareSync('NewTest123!@#', user.password_hash)).toBe(true);
    });
  });

  describe('User Management Flow', () => {
    test('should create new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'newuser',
          email: 'new@example.com',
          password: 'NewUser123!@#',
          role: 'user',
          firstName: 'New',
          lastName: 'User'
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        username: 'newuser',
        email: 'new@example.com',
        role: 'user'
      });
    });

    test('should update user', async () => {
      const response = await request(app)
        .put('/api/users/testuser')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'Name'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        username: 'testuser',
        firstName: 'Updated',
        lastName: 'Name'
      });
    });

    test('should change password', async () => {
      const response = await request(app)
        .put('/api/users/testuser/password')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          currentPassword: 'Test123!@#',
          newPassword: 'NewTest123!@#'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');

      // Verify password was updated
      const user = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('testuser');
      expect(bcrypt.compareSync('NewTest123!@#', user.password_hash)).toBe(true);
    });

    test('should deactivate user', async () => {
      const response = await request(app)
        .put('/api/users/testuser')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false
        });

      expect(response.status).toBe(200);
      expect(response.body.isActive).toBe(false);

      // Verify user cannot login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'Test123!@#'
        });

      expect(loginResponse.status).toBe(401);
    });
  });

  describe('Role Management Flow', () => {
    test('should create new role', async () => {
      const response = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'custom_role',
          description: 'Custom role with specific permissions',
          permissions: ['read:patients', 'write:patients']
        });

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        name: 'custom_role',
        permissions: ['read:patients', 'write:patients']
      });
    });

    test('should update role', async () => {
      const response = await request(app)
        .put('/api/roles/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Updated user role description',
          permissions: ['read:patients', 'read:reports', 'write:reports']
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        name: 'user',
        description: 'Updated user role description',
        permissions: ['read:patients', 'read:reports', 'write:reports']
      });
    });

    test('should assign role to user', async () => {
      const response = await request(app)
        .put('/api/users/testuser/role')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'viewer'
        });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('viewer');

      // Verify user has new permissions
      const user = db.prepare(`
        SELECT r.permissions 
        FROM users u 
        JOIN roles r ON u.role_id = r.id 
        WHERE u.username = ?
      `).get('testuser');

      expect(JSON.parse(user.permissions)).toEqual(['read:patients']);
    });
  });

  describe('Permission Flow', () => {
    test('should enforce role-based access control', async () => {
      // Try to create user with viewer role
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          username: 'unauthorized',
          email: 'unauthorized@example.com',
          password: 'Test123!@#',
          role: 'user'
        });

      expect(response.status).toBe(403);
    });

    test('should allow permitted actions', async () => {
      // Try to read patients with viewer role
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });
  });
}); 