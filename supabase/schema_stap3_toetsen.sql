-- Studie Planner - Stap 3: Toetsen functionaliteit

-- Toetsen tabel
CREATE TABLE IF NOT EXISTS toetsen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  vak_id UUID REFERENCES vakken(id) ON DELETE CASCADE NOT NULL,
  datum DATE NOT NULL,
  titel TEXT,
  notities TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Toets onderdelen tabel
-- Elk onderdeel is een type leerstof (hoofdstukken, woordjes, opgaven, etc)
CREATE TABLE IF NOT EXISTS toets_onderdelen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toets_id UUID REFERENCES toetsen(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('hoofdstukken', 'woordjes', 'opgaven', 'grammatica', 'formules', 'tekst')),
  
  -- Generieke velden
  beschrijving TEXT,
  
  -- Voor hoofdstukken/paragrafen
  hoofdstukken JSONB, -- Array van hoofdstukken: [{"naam": "Hoofdstuk 1", "paginas": 20}, ...]
  aantal_hoofdstukken INTEGER,
  
  -- Voor woordjes
  aantal_woorden INTEGER,
  woordenlijst_nummers TEXT, -- "Lijst 1 t/m 5"
  
  -- Voor opgaven
  opgaven_van INTEGER,
  opgaven_tot INTEGER,
  paragraaf TEXT,
  
  -- Voor grammatica
  grammatica_onderwerpen JSONB, -- Array van onderwerpen: ["present perfect", "past simple"]
  
  -- Voor formules/definities
  aantal_formules INTEGER,
  formule_paragrafen TEXT,
  
  -- Voor tekst/literatuur
  aantal_paginas INTEGER,
  boek_hoofdstukken TEXT,
  
  -- Tijdsinschatting (minuten)
  geschatte_tijd INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes voor performance
CREATE INDEX idx_toetsen_user_id ON toetsen(user_id);
CREATE INDEX idx_toetsen_datum ON toetsen(datum);
CREATE INDEX idx_toets_onderdelen_toets_id ON toets_onderdelen(toets_id);

-- Row Level Security
ALTER TABLE toetsen ENABLE ROW LEVEL SECURITY;
ALTER TABLE toets_onderdelen ENABLE ROW LEVEL SECURITY;

-- Policies voor toetsen
CREATE POLICY "Users kunnen eigen toetsen zien" ON toetsen
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen toetsen toevoegen" ON toetsen
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen toetsen updaten" ON toetsen
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen toetsen verwijderen" ON toetsen
  FOR DELETE USING (auth.uid() = user_id);

-- Policies voor toets_onderdelen
CREATE POLICY "Users kunnen eigen toets onderdelen zien" ON toets_onderdelen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM toetsen 
      WHERE toetsen.id = toets_onderdelen.toets_id 
      AND toetsen.user_id = auth.uid()
    )
  );

CREATE POLICY "Users kunnen eigen toets onderdelen toevoegen" ON toets_onderdelen
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM toetsen 
      WHERE toetsen.id = toets_onderdelen.toets_id 
      AND toetsen.user_id = auth.uid()
    )
  );

CREATE POLICY "Users kunnen eigen toets onderdelen updaten" ON toets_onderdelen
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM toetsen 
      WHERE toetsen.id = toets_onderdelen.toets_id 
      AND toetsen.user_id = auth.uid()
    )
  );

CREATE POLICY "Users kunnen eigen toets onderdelen verwijderen" ON toets_onderdelen
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM toetsen 
      WHERE toetsen.id = toets_onderdelen.toets_id 
      AND toetsen.user_id = auth.uid()
    )
  );

-- Ouders kunnen toetsen van hun kind (Lars) zien
CREATE POLICY "Ouders kunnen toetsen van Lars zien" ON toetsen
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

CREATE POLICY "Ouders kunnen toets onderdelen van Lars zien" ON toets_onderdelen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM toetsen t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = toets_onderdelen.toets_id
      AND u.rol = 'student'
      AND auth.uid() IN (SELECT id FROM users WHERE rol = 'ouder')
    )
  );
