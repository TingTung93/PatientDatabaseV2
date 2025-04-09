const bcrypt = require('bcryptjs');

const testPassword = 'TestPass123!';
const testPasswordHash = bcrypt.hashSync(testPassword, 12);

const testUsers = [
    {
        username: 'test@example.com',
        email: 'test@example.com',
        password_hash: testPasswordHash,
        role: 'user',
        is_active: true
    }
];

const testCredentials = {
    email: 'test@example.com',
    password: testPassword
};

module.exports = {
    testUsers,
    testCredentials
};