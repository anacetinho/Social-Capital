-- Row-Level Security: Ensure users can only access their own data
-- Critical for multi-user data isolation in POC environment

-- Enable RLS on all user-owned tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE favors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- People: Users can only see their own contacts
CREATE POLICY people_isolation ON people
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Professional History: Access through owned people
CREATE POLICY professional_history_isolation ON professional_history
  FOR ALL
  USING (
    person_id IN (
      SELECT id FROM people
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Relationships: Users can only see their own relationship data
CREATE POLICY relationships_isolation ON relationships
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Events: Users can only see their own events
CREATE POLICY events_isolation ON events
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Event Participants: Access through owned events
CREATE POLICY event_participants_isolation ON event_participants
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE user_id = current_setting('app.current_user_id')::uuid
    )
  );

-- Favors: Users can only see their own favor records
CREATE POLICY favors_isolation ON favors
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);

-- Assets: Users can only see their own asset records
CREATE POLICY assets_isolation ON assets
  FOR ALL
  USING (user_id = current_setting('app.current_user_id')::uuid);
