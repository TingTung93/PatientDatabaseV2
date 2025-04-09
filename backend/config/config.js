import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  JWT_SECRET: 'your-secret-key',
  JWT_EXPIRES_IN: '1h',
  PORT: 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_TO_FILE: process.env.LOG_TO_FILE || true,
  development: {
    database: {
      path: path.join(__dirname, '..', 'data', 'development.sqlite'),
      logging: true
    }
  },
  test: {
    database: {
      path: ':memory:',
      logging: false
    }
  },
  production: {
    database: {
      path: process.env.DB_STORAGE || path.join(__dirname, '..', 'data', 'production.sqlite'),
      logging: false
    }
  }
};