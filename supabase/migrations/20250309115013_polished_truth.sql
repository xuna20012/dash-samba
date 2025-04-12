/*
  # Update discussions table for read status tracking

  1. Changes
    - Add read column to discussions table
    - Set default value to false for new messages
    - Add index on session_id and read columns for better query performance
    - Update existing messages to be marked as read

  2. Security
    - No changes to RLS policies needed
*/

-- Add read column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'discussions' AND column_name = 'read'
  ) THEN
    ALTER TABLE discussions ADD COLUMN read BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Create index for better performance when querying unread messages
CREATE INDEX IF NOT EXISTS idx_discussions_session_read 
ON discussions(session_id, read);

-- Mark all existing messages as read
UPDATE discussions SET read = true WHERE read IS NULL;