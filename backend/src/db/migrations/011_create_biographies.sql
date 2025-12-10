-- Biography notes table: Store biographical notes about people
-- Each note has a title, date, and free text content (max 5000 chars)

CREATE TABLE IF NOT EXISTS biographies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  note_date DATE NOT NULL,
  note TEXT CHECK (LENGTH(note) <= 5000),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_biographies_user_id ON biographies(user_id);
CREATE INDEX idx_biographies_person_id ON biographies(person_id);
CREATE INDEX idx_biographies_date ON biographies(note_date);
