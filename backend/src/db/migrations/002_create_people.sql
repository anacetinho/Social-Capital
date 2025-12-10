-- People table: Contacts in the user's network
-- Each person belongs to a specific user (data isolation via user_id)

CREATE TABLE people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  photo_url VARCHAR(500),
  birthday DATE,
  notes TEXT,
  importance INTEGER CHECK (importance BETWEEN 1 AND 5),
  last_contact_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_people_user_id ON people(user_id);
CREATE INDEX idx_people_name ON people(name);
CREATE INDEX idx_people_importance ON people(importance);
CREATE INDEX idx_people_last_contact ON people(last_contact_date);
