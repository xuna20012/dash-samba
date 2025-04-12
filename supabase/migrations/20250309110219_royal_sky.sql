/*
  # Create discussions table

  1. New Tables
    - `discussions`
      - `id` (uuid, primary key)
      - `session_id` (text) - Unique conversation identifier
      - `type` (text) - Message type (human or ai)
      - `message` (text) - Message content
      - `client_name` (text) - Client's name
      - `created_at` (timestamp) - Message timestamp

  2. Security
    - Enable RLS on discussions table
    - Add policies for authenticated users to:
      - Read all discussions
      - Insert new messages
      - Delete discussions
*/

CREATE TABLE IF NOT EXISTS discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  type text NOT NULL CHECK (type IN ('human', 'ai')),
  message text NOT NULL,
  client_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read all discussions"
  ON discussions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON discussions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete discussions"
  ON discussions
  FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX discussions_session_id_idx ON discussions(session_id);
CREATE INDEX discussions_created_at_idx ON discussions(created_at);