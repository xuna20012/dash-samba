/*
  # Add read status to discussions

  1. Changes
    - Add `read` column to discussions table
    - Set default value to false for new messages
    - Update existing messages to be marked as read

  2. Security
    - No changes to RLS policies
*/

ALTER TABLE discussions
ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;

-- Mark all existing messages as read
UPDATE discussions SET read = true WHERE read IS NULL;