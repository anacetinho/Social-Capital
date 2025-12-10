-- Relationships table: Connections between people in the network
-- Stores relationship type, strength (1-5 scale), and context

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_a_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  person_b_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100),
  strength INTEGER CHECK (strength BETWEEN 1 AND 5),
  context TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT different_people CHECK (person_a_id != person_b_id)
);

CREATE INDEX idx_relationships_user_id ON relationships(user_id);
CREATE INDEX idx_relationships_person_a ON relationships(person_a_id);
CREATE INDEX idx_relationships_person_b ON relationships(person_b_id);
CREATE INDEX idx_relationships_strength ON relationships(strength);
