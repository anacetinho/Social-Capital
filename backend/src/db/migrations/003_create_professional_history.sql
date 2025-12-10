-- Professional History table: Career timeline for people in the network
-- Tracks where contacts have worked and when

CREATE TABLE professional_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  position VARCHAR(255),
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_professional_history_person_id ON professional_history(person_id);
CREATE INDEX idx_professional_history_company ON professional_history(company);
CREATE INDEX idx_professional_history_dates ON professional_history(start_date, end_date);
