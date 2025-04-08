const { db } = require('../init');

function up() {
  // Create roles table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL,
      permissions TEXT NOT NULL, -- JSON array of permissions
      is_active BOOLEAN DEFAULT true,
      metadata TEXT, -- JSON object for additional data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();

  // Create users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role_id INTEGER NOT NULL,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      department TEXT,
      is_active BOOLEAN DEFAULT true,
      last_login DATETIME,
      preferences TEXT, -- JSON object for user preferences
      metadata TEXT, -- JSON object for additional data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    )
  `).run();

  // Create password_resets table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used BOOLEAN DEFAULT false,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `).run();

  // Create indexes
  db.prepare('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)').run();
  db.prepare('CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id)').run();

  // Insert default roles
  const defaultRoles = [
    {
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: JSON.stringify(['admin']),
      is_active: true,
      metadata: JSON.stringify({ createdBy: 'system' })
    },
    {
      name: 'user',
      description: 'Standard user with basic access',
      permissions: JSON.stringify(['read:patients', 'read:reports']),
      is_active: true,
      metadata: JSON.stringify({ createdBy: 'system' })
    },
    {
      name: 'viewer',
      description: 'View-only user with limited access',
      permissions: JSON.stringify(['read:patients']),
      is_active: true,
      metadata: JSON.stringify({ createdBy: 'system' })
    }
  ];

  const insertRole = db.prepare(`
    INSERT INTO roles (name, description, permissions, is_active, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);

  defaultRoles.forEach(role => {
    insertRole.run(
      role.name,
      role.description,
      role.permissions,
      role.is_active,
      role.metadata
    );
  });

  // Insert default admin user
  const bcrypt = require('bcrypt');
  const defaultAdmin = {
    username: 'admin',
    email: 'admin@example.com',
    password_hash: bcrypt.hashSync('Admin123!@#', 10),
    role_id: 1, // admin role
    first_name: 'System',
    last_name: 'Administrator',
    is_active: true,
    metadata: JSON.stringify({ createdBy: 'system' })
  };

  const insertUser = db.prepare(`
    INSERT INTO users (
      username, email, password_hash, role_id, first_name, last_name,
      is_active, metadata
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(
    defaultAdmin.username,
    defaultAdmin.email,
    defaultAdmin.password_hash,
    defaultAdmin.role_id,
    defaultAdmin.first_name,
    defaultAdmin.last_name,
    defaultAdmin.is_active,
    defaultAdmin.metadata
  );
}

function down() {
  // Drop tables in reverse order
  db.prepare('DROP TABLE IF EXISTS password_resets').run();
  db.prepare('DROP TABLE IF EXISTS users').run();
  db.prepare('DROP TABLE IF EXISTS roles').run();

  // Drop indexes
  db.prepare('DROP INDEX IF EXISTS idx_users_username').run();
  db.prepare('DROP INDEX IF EXISTS idx_users_email').run();
  db.prepare('DROP INDEX IF EXISTS idx_users_role_id').run();
  db.prepare('DROP INDEX IF EXISTS idx_roles_name').run();
  db.prepare('DROP INDEX IF EXISTS idx_password_resets_token').run();
  db.prepare('DROP INDEX IF EXISTS idx_password_resets_user_id').run();
}

module.exports = {
  up,
  down
}; 