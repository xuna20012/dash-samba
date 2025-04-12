/*
  # Add agent assignment to discussions

  1. Changes
    - Add assigned_to_agent column to discussions table
    - Set default value to false
    - Add index for better query performance
    
  2. Notes
    - Safe to run on existing data
    - Maintains existing functionality
*/

-- Add assigned_to_agent column
ALTER TABLE discussions
ADD COLUMN IF NOT EXISTS assigned_to_agent boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_discussions_assigned_to_agent 
ON discussions(assigned_to_agent);