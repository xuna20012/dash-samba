/*
  # Enable real-time for discussions table

  1. Changes
    - Enable real-time functionality for the discussions table
    - This allows clients to receive live updates when:
      - New messages are added
      - Messages are updated
      - Messages are deleted

  Note: Real-time must also be enabled in the Supabase dashboard under:
    Database -> Replication -> Real-time -> Add table to real-time publication
*/

-- First check if the table is already in the publication
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public'
    AND tablename = 'discussions'
  ) THEN
    -- Add table to publication only if it's not already there
    ALTER PUBLICATION supabase_realtime ADD TABLE discussions;
  END IF;
END $$;