-- Favors table: Track favors given and received
-- Helps manage reciprocity in relationships

CREATE TABLE favors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  giver_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  date TIMESTAMP NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'completed', 'declined')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_favors_user_id ON favors(user_id);
CREATE INDEX idx_favors_giver_id ON favors(giver_id);
CREATE INDEX idx_favors_receiver_id ON favors(receiver_id);
CREATE INDEX idx_favors_status ON favors(status);
CREATE INDEX idx_favors_date ON favors(date);
