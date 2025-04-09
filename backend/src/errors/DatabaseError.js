class DatabaseError extends Error {
  constructor(message, code) {
    super(message || 'Database operation failed');
    this.name = 'DatabaseError';
    this.statusCode = 500;
    this.code = code;
  }
}

export default DatabaseError; 