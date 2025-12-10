-- Assets table: Track resources that can be leveraged through the network
-- Examples: skills, properties, equipment, expertise

CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  asset_type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  availability VARCHAR(100),
  estimated_value DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_assets_user_id ON assets(user_id);
CREATE INDEX idx_assets_owner_id ON assets(owner_id);
CREATE INDEX idx_assets_type ON assets(asset_type);
