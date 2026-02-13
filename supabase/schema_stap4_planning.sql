-- Studie Planner - Stap 4: Planning Generator

-- Instellingen tabel voor studietijd en voorkeuren
CREATE TABLE IF NOT EXISTS user_instellingen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Studietijd instellingen
  standaard_studietijd_per_dag INTEGER DEFAULT 120, -- minuten per dag
  studeren_op_weekend BOOLEAN DEFAULT true,
  
  -- Planning voorkeuren
  buffer_dagen INTEGER DEFAULT 2, -- aantal dagen buffer voor herhaling
  herhalings_frequentie INTEGER DEFAULT 3, -- elke X dagen herhalen voor woordjes/formules
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Planning items tabel (dagelijkse taken)
CREATE TABLE IF NOT EXISTS planning_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Koppeling
  toets_id UUID REFERENCES toetsen(id) ON DELETE CASCADE,
  toets_onderdeel_id UUID REFERENCES toets_onderdelen(id) ON DELETE CASCADE,
  
  -- Planning details
  datum DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('leren', 'herhalen', 'oefenen')),
  
  -- Wat moet gedaan worden
  beschrijving TEXT NOT NULL,
  geschatte_tijd INTEGER, -- minuten
  
  -- Status
  voltooid BOOLEAN DEFAULT false,
  voltooid_op TIMESTAMP WITH TIME ZONE,
  
  -- Voor hoofdstukken: welke hoofdstukken
  hoofdstuk_nummers INTEGER[], -- [1, 2] = hoofdstuk 1 en 2
  
  -- Voor woordjes: welk bereik
  woorden_van INTEGER,
  woorden_tot INTEGER,
  
  -- Voor opgaven: welk bereik
  opgaven_van INTEGER,
  opgaven_tot INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_planning_items_user_datum ON planning_items(user_id, datum);
CREATE INDEX idx_planning_items_datum ON planning_items(datum);
CREATE INDEX idx_planning_items_toets ON planning_items(toets_id);
CREATE INDEX idx_user_instellingen_user_id ON user_instellingen(user_id);

-- Row Level Security
ALTER TABLE user_instellingen ENABLE ROW LEVEL SECURITY;
ALTER TABLE planning_items ENABLE ROW LEVEL SECURITY;

-- Policies voor user_instellingen
CREATE POLICY "Users kunnen eigen instellingen zien" ON user_instellingen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen instellingen toevoegen" ON user_instellingen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen instellingen updaten" ON user_instellingen
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies voor planning_items
CREATE POLICY "Users kunnen eigen planning zien" ON planning_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen planning toevoegen" ON planning_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen planning updaten" ON planning_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen planning verwijderen" ON planning_items
  FOR DELETE USING (auth.uid() = user_id);

-- Ouders kunnen planning van Lars zien
CREATE POLICY "Ouders kunnen planning van Lars zien" ON planning_items
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Standaard instellingen voor bestaande users
INSERT INTO user_instellingen (user_id)
SELECT id FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM user_instellingen WHERE user_instellingen.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Function om automatisch instellingen aan te maken bij nieuwe user
CREATE OR REPLACE FUNCTION create_user_instellingen()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_instellingen (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger om instellingen aan te maken
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_instellingen();
