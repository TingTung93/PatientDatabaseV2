-- Add blood_type column to caution_cards table if it doesn't exist already
-- Note: In SQLite, you can only add columns, not drop them
ALTER TABLE caution_cards ADD COLUMN blood_type TEXT;
ALTER TABLE caution_cards ADD COLUMN image_path TEXT; 