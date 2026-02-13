-- Studie Planner - Stap 7: Q&A Systeem

-- Vragen tabel
CREATE TABLE IF NOT EXISTS vragen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  vak_id UUID REFERENCES vakken(id) ON DELETE CASCADE,
  
  -- Vraag details
  vraag TEXT NOT NULL,
  context TEXT, -- Extra context, bijv. "Hoofdstuk 3, opgave 12"
  
  -- Optionele afbeelding
  afbeelding_url TEXT,
  
  -- Status
  status TEXT CHECK (status IN ('open', 'beantwoord', 'opgelost')) DEFAULT 'open',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Antwoorden tabel
CREATE TABLE IF NOT EXISTS antwoorden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vraag_id UUID REFERENCES vragen(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Antwoord
  antwoord TEXT NOT NULL,
  
  -- Optionele afbeelding
  afbeelding_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vragen_user_id ON vragen(user_id);
CREATE INDEX idx_vragen_status ON vragen(status);
CREATE INDEX idx_vragen_vak_id ON vragen(vak_id);
CREATE INDEX idx_antwoorden_vraag_id ON antwoorden(vraag_id);
CREATE INDEX idx_antwoorden_user_id ON antwoorden(user_id);

-- Row Level Security
ALTER TABLE vragen ENABLE ROW LEVEL SECURITY;
ALTER TABLE antwoorden ENABLE ROW LEVEL SECURITY;

-- Policies voor vragen
-- Students kunnen eigen vragen zien
CREATE POLICY "Students kunnen eigen vragen zien" ON vragen
  FOR SELECT USING (auth.uid() = user_id);

-- Students kunnen vragen toevoegen
CREATE POLICY "Students kunnen vragen toevoegen" ON vragen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Students kunnen eigen vragen updaten
CREATE POLICY "Students kunnen eigen vragen updaten" ON vragen
  FOR UPDATE USING (auth.uid() = user_id);

-- Ouders kunnen alle vragen zien
CREATE POLICY "Ouders kunnen alle vragen zien" ON vragen
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Ouders kunnen vragen updaten (status wijzigen)
CREATE POLICY "Ouders kunnen vragen updaten" ON vragen
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Policies voor antwoorden
-- Iedereen kan antwoorden zien van vragen waar ze toegang toe hebben
CREATE POLICY "Users kunnen antwoorden zien" ON antwoorden
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vragen 
      WHERE vragen.id = antwoorden.vraag_id 
      AND (
        vragen.user_id = auth.uid() OR
        auth.uid() IN (SELECT id FROM users WHERE rol = 'ouder')
      )
    )
  );

-- Ouders kunnen antwoorden toevoegen
CREATE POLICY "Ouders kunnen antwoorden toevoegen" ON antwoorden
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Users kunnen eigen antwoorden updaten
CREATE POLICY "Users kunnen eigen antwoorden updaten" ON antwoorden
  FOR UPDATE USING (auth.uid() = user_id);

-- Users kunnen eigen antwoorden verwijderen
CREATE POLICY "Users kunnen eigen antwoorden verwijderen" ON antwoorden
  FOR DELETE USING (auth.uid() = user_id);

-- Function om updated_at automatisch bij te werken
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers voor updated_at
CREATE TRIGGER update_vragen_updated_at 
  BEFORE UPDATE ON vragen
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_antwoorden_updated_at 
  BEFORE UPDATE ON antwoorden
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
