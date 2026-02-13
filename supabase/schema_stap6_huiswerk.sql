-- Studie Planner - Stap 6: Huiswerk

-- Huiswerk tabel
CREATE TABLE IF NOT EXISTS huiswerk (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  vak_id UUID REFERENCES vakken(id) ON DELETE CASCADE NOT NULL,
  
  -- Details
  beschrijving TEXT NOT NULL,
  deadline DATE NOT NULL,
  geschatte_tijd INTEGER, -- minuten
  notities TEXT,
  
  -- Type
  type TEXT CHECK (type IN ('maken', 'leren', 'voorbereiden')) DEFAULT 'maken',
  
  -- Status
  voltooid BOOLEAN DEFAULT false,
  voltooid_op TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX idx_huiswerk_user_id ON huiswerk(user_id);
CREATE INDEX idx_huiswerk_deadline ON huiswerk(deadline);
CREATE INDEX idx_huiswerk_vak_id ON huiswerk(vak_id);

-- Row Level Security
ALTER TABLE huiswerk ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users kunnen eigen huiswerk zien" ON huiswerk
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen huiswerk toevoegen" ON huiswerk
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen huiswerk updaten" ON huiswerk
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen huiswerk verwijderen" ON huiswerk
  FOR DELETE USING (auth.uid() = user_id);

-- Ouders kunnen huiswerk van Lars zien
CREATE POLICY "Ouders kunnen huiswerk van Lars zien" ON huiswerk
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Update planning_items tabel om huiswerk te ondersteunen
ALTER TABLE planning_items 
ADD COLUMN IF NOT EXISTS huiswerk_id UUID REFERENCES huiswerk(id) ON DELETE CASCADE;

-- Index voor huiswerk_id
CREATE INDEX IF NOT EXISTS idx_planning_items_huiswerk ON planning_items(huiswerk_id);

-- Update policy voor planning items om huiswerk te includeren
DROP POLICY IF EXISTS "Users kunnen eigen planning toevoegen" ON planning_items;
CREATE POLICY "Users kunnen eigen planning toevoegen" ON planning_items
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM huiswerk 
      WHERE huiswerk.id = planning_items.huiswerk_id 
      AND huiswerk.user_id = auth.uid()
    )
  );
