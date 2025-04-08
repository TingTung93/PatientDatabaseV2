/* eslint-env node */
// backend/migrations/20250408125700_create_ocr_batch_jobs.js

exports.up = function(knex) {
  return knex.schema.createTable('ocr_batch_jobs', function(table) {
    table.increments('id').primary();
    table.string('file_path', 1024).notNullable(); // Path where the uploaded file is stored temporarily
    table.string('original_name', 255).notNullable(); // Original name of the uploaded file
    table.string('mime_type', 255).notNullable(); // Mime type of the uploaded file
    table.enum('status', ['queued', 'processing', 'completed', 'failed', 'error']).notNullable().defaultTo('queued');
    table.integer('user_id').unsigned().notNullable(); // Assuming user ID is an integer
    // Add foreign key constraint if you have a users table
    // table.foreign('user_id').references('id').inTable('users');
    table.jsonb('result').nullable(); // To store OCR results or error details
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('status');
    table.index('user_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('ocr_batch_jobs');
};