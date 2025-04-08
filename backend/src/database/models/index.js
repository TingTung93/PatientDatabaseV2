const { pool } = require('../init');
const PasswordReset = require('./PasswordReset');

// Patient model
const Patient = {
  findAndCountAll: async (options) => {
    const { limit = 10, offset = 0, where = {} } = options;
    const values = [];
    let whereClause = '';
    
    if (Object.keys(where).length > 0) {
      whereClause = 'WHERE ' + Object.entries(where)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
    }

    const result = await pool.query(`
      SELECT * FROM patients
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM patients ${whereClause}
    `, values);

    return {
      rows: result.rows,
      count: parseInt(countResult.rows[0].count)
    };
  },

  findByPk: async (id) => {
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { first_name, last_name, date_of_birth, gender, contact_number, email, address } = data;
    const result = await pool.query(`
      INSERT INTO patients (
        first_name, last_name, date_of_birth, gender,
        contact_number, email, address
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [first_name, last_name, date_of_birth, gender, contact_number, email, address]);
    return result.rows[0];
  },

  update: async (id, data) => {
    const entries = Object.entries(data);
    const setClause = entries
      .map((_, index) => `${entries[index][0]} = $${index + 2}`)
      .join(', ');
    
    const values = entries.map(entry => entry[1]);
    const result = await pool.query(`
      UPDATE patients
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);
    return result.rows[0];
  },

  destroy: async (id) => {
    await pool.query('DELETE FROM patients WHERE id = $1', [id]);
  }
};

// Report model
const Report = {
  findAndCountAll: async (options) => {
    const { limit = 10, offset = 0, where = {} } = options;
    const values = [];
    let whereClause = '';
    
    if (Object.keys(where).length > 0) {
      whereClause = 'WHERE ' + Object.entries(where)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
    }

    const result = await pool.query(`
      SELECT r.*, p.first_name, p.last_name
      FROM reports r
      LEFT JOIN patients p ON r.patient_id = p.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM reports ${whereClause}
    `, values);

    return {
      rows: result.rows,
      count: parseInt(countResult.rows[0].count)
    };
  },

  findByPk: async (id) => {
    const result = await pool.query(`
      SELECT r.*, p.first_name, p.last_name
      FROM reports r
      LEFT JOIN patients p ON r.patient_id = p.id
      WHERE r.id = $1
    `, [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { patient_id, report_type, report_date, content, status } = data;
    const result = await pool.query(`
      INSERT INTO reports (
        patient_id, report_type, report_date, content, status
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [patient_id, report_type, report_date, content, status]);
    return result.rows[0];
  },

  update: async (id, data) => {
    const entries = Object.entries(data);
    const setClause = entries
      .map((_, index) => `${entries[index][0]} = $${index + 2}`)
      .join(', ');
    
    const values = entries.map(entry => entry[1]);
    const result = await pool.query(`
      UPDATE reports
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);
    return result.rows[0];
  },

  destroy: async (id) => {
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
  }
};

// CautionCard model
const CautionCard = {
  findAndCountAll: async (options) => {
    const { limit = 10, offset = 0, where = {} } = options;
    const values = [];
    let whereClause = '';
    
    if (Object.keys(where).length > 0) {
      whereClause = 'WHERE ' + Object.entries(where)
        .map(([key, value], index) => {
          values.push(value);
          return `${key} = $${index + 1}`;
        })
        .join(' AND ');
    }

    const result = await pool.query(`
      SELECT c.*, p.first_name, p.last_name
      FROM caution_cards c
      LEFT JOIN patients p ON c.patient_id = p.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${values.length + 1} OFFSET $${values.length + 2}
    `, [...values, limit, offset]);

    const countResult = await pool.query(`
      SELECT COUNT(*) as count FROM caution_cards ${whereClause}
    `, values);

    return {
      rows: result.rows,
      count: parseInt(countResult.rows[0].count)
    };
  },

  findByPk: async (id) => {
    const result = await pool.query(`
      SELECT c.*, p.first_name, p.last_name
      FROM caution_cards c
      LEFT JOIN patients p ON c.patient_id = p.id
      WHERE c.id = $1
    `, [id]);
    return result.rows[0];
  },

  create: async (data) => {
    const { patient_id, blood_type, antibodies, transfusion_requirements, file_name, file_path, status } = data;
    const result = await pool.query(`
      INSERT INTO caution_cards (
        patient_id, blood_type, antibodies, transfusion_requirements,
        file_name, file_path, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [patient_id, blood_type, antibodies, transfusion_requirements, file_name, file_path, status]);
    return result.rows[0];
  },

  update: async (id, data) => {
    const entries = Object.entries(data);
    const setClause = entries
      .map((_, index) => `${entries[index][0]} = $${index + 2}`)
      .join(', ');
    
    const values = entries.map(entry => entry[1]);
    const result = await pool.query(`
      UPDATE caution_cards
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `, [id, ...values]);
    return result.rows[0];
  },

  destroy: async (id) => {
    await pool.query('DELETE FROM caution_cards WHERE id = $1', [id]);
  }
};

module.exports = {
  Patient,
  Report,
  CautionCard,
  PasswordReset: PasswordReset(sequelize, Sequelize.DataTypes)
}; 