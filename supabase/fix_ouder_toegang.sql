-- Fix Ouder Toegang tot Lars zijn data

-- Eerst: vind Lars zijn user ID
-- SELECT id, naam, rol FROM users;

-- TOETSEN: Ouders kunnen toetsen van Lars zien
DROP POLICY IF EXISTS "Ouders kunnen toetsen van Lars zien" ON toetsen;
CREATE POLICY "Ouders kunnen toetsen van Lars zien" ON toetsen
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE rol = 'student'
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'ouder'
    )
  );

-- TOETS ONDERDELEN: Ouders kunnen onderdelen zien
DROP POLICY IF EXISTS "Ouders kunnen toets onderdelen zien" ON toets_onderdelen;
CREATE POLICY "Ouders kunnen toets onderdelen zien" ON toets_onderdelen
  FOR SELECT USING (
    toets_id IN (
      SELECT id FROM toetsen WHERE user_id IN (
        SELECT id FROM users WHERE rol = 'student'
      )
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'ouder'
    )
  );

-- HUISWERK: Ouders kunnen huiswerk van Lars zien
DROP POLICY IF EXISTS "Ouders kunnen huiswerk van Lars zien" ON huiswerk;
CREATE POLICY "Ouders kunnen huiswerk van Lars zien" ON huiswerk
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE rol = 'student'
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'ouder'
    )
  );

-- PLANNING ITEMS: Ouders kunnen planning items van Lars zien
DROP POLICY IF EXISTS "Ouders kunnen planning van Lars zien" ON planning_items;
CREATE POLICY "Ouders kunnen planning van Lars zien" ON planning_items
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE rol = 'student'
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'ouder'
    )
  );

-- VAKKEN: Ouders kunnen vakken van Lars zien
DROP POLICY IF EXISTS "Ouders kunnen vakken van Lars zien" ON vakken;
CREATE POLICY "Ouders kunnen vakken van Lars zien" ON vakken
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE rol = 'student'
    )
    AND
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND rol = 'ouder'
    )
  );

-- Check policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('toetsen', 'huiswerk', 'planning_items', 'vragen', 'antwoorden', 'vakken')
ORDER BY tablename, policyname;
