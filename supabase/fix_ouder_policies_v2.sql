-- GEFIXTE OUDER POLICIES
-- Deze zijn simpeler en werken beter

-- TOETSEN
DROP POLICY IF EXISTS "Ouders kunnen toetsen van Lars zien" ON toetsen;
DROP POLICY IF EXISTS "Users kunnen eigen toetsen zien" ON toetsen;

-- Students kunnen eigen toetsen zien
CREATE POLICY "Users kunnen eigen toetsen zien" ON toetsen
  FOR SELECT USING (auth.uid() = user_id);

-- Ouders kunnen ALLE toetsen zien (van alle students)
CREATE POLICY "Ouders kunnen alle toetsen zien" ON toetsen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.rol = 'ouder'
    )
  );

-- TOETS ONDERDELEN
DROP POLICY IF EXISTS "Ouders kunnen toets onderdelen zien" ON toets_onderdelen;
DROP POLICY IF EXISTS "Users kunnen toets onderdelen zien" ON toets_onderdelen;

CREATE POLICY "Users kunnen toets onderdelen zien" ON toets_onderdelen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM toetsen 
      WHERE toetsen.id = toets_onderdelen.toets_id 
      AND toetsen.user_id = auth.uid()
    )
  );

CREATE POLICY "Ouders kunnen alle toets onderdelen zien" ON toets_onderdelen
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.rol = 'ouder'
    )
  );

-- HUISWERK
DROP POLICY IF EXISTS "Ouders kunnen huiswerk van Lars zien" ON huiswerk;
DROP POLICY IF EXISTS "Students kunnen eigen huiswerk zien" ON huiswerk;

CREATE POLICY "Students kunnen eigen huiswerk zien" ON huiswerk
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Ouders kunnen alle huiswerk zien" ON huiswerk
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.rol = 'ouder'
    )
  );

-- PLANNING ITEMS
DROP POLICY IF EXISTS "Ouders kunnen planning van Lars zien" ON planning_items;
DROP POLICY IF EXISTS "Users kunnen eigen planning zien" ON planning_items;

CREATE POLICY "Users kunnen eigen planning zien" ON planning_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Ouders kunnen alle planning zien" ON planning_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.rol = 'ouder'
    )
  );

-- VAKKEN
DROP POLICY IF EXISTS "Ouders kunnen vakken van Lars zien" ON vakken;
DROP POLICY IF EXISTS "Users kunnen eigen vakken zien" ON vakken;

CREATE POLICY "Users kunnen eigen vakken zien" ON vakken
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Ouders kunnen alle vakken zien" ON vakken
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.rol = 'ouder'
    )
  );

-- VRAGEN (deze was al goed, maar voor de zekerheid)
DROP POLICY IF EXISTS "Ouders kunnen alle vragen zien" ON vragen;

CREATE POLICY "Ouders kunnen alle vragen zien" ON vragen
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE rol = 'ouder'
    )
  );

-- Check resultaat
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('toetsen', 'huiswerk', 'planning_items', 'vragen', 'vakken')
ORDER BY tablename, policyname;
