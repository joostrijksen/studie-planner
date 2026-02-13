-- Studie Planner - Stap 2: Authenticatie en test gebruikers
-- Dit script maakt test accounts aan

-- BELANGRIJKE NOTEN:
-- 1. Deze query's moeten INDIVIDUEEL uitgevoerd worden in Supabase Dashboard
-- 2. Ga naar Authentication → Users → "Add user" voor elke gebruiker
-- 3. Of gebruik onderstaande queries in de SQL Editor

-- Test gebruikers aanmaken via SQL
-- Let op: Wachtwoorden moeten via Supabase dashboard worden ingesteld

-- Stap 1: Maak eerst de auth users aan in Supabase Dashboard:
-- Ga naar: Authentication → Users → Add user
-- 
-- Gebruiker 1: Lars (student)
-- Email: lars@test.nl
-- Password: lars123 (of wat je wilt)
-- Auto Confirm User: AAN
--
-- Gebruiker 2: Joost (ouder)  
-- Email: joost@test.nl
-- Password: joost123
-- Auto Confirm User: AAN
--
-- Gebruiker 3: Karin (ouder)
-- Email: karin@test.nl  
-- Password: karin123
-- Auto Confirm User: AAN

-- Stap 2: Na het aanmaken van auth users, voer onderstaande query uit
-- om de profiles in de users tabel toe te voegen

-- VERVANG de UUID's hieronder met de echte UUID's van je aangemaakte users!
-- Je vindt deze in: Authentication → Users → klik op user → kopieer UUID

-- Insert users into profiles table
-- VERVANG 'auth-uuid-hier' met de echte UUID's uit Supabase Authentication!

INSERT INTO users (id, email, naam, rol) VALUES
  ('VERVANG-MET-LARS-UUID', 'lars@test.nl', 'Lars', 'student'),
  ('VERVANG-MET-JOOST-UUID', 'joost@test.nl', 'Joost', 'ouder'),
  ('VERVANG-MET-KARIN-UUID', 'karin@test.nl', 'Karin', 'ouder')
ON CONFLICT (id) DO NOTHING;

-- Standaard vakken voor Lars toevoegen
INSERT INTO vakken (naam, kleur, user_id) VALUES
  ('Wiskunde', '#EF4444', 'VERVANG-MET-LARS-UUID'),
  ('Engels', '#10B981', 'VERVANG-MET-LARS-UUID'),
  ('Nederlands', '#F59E0B', 'VERVANG-MET-LARS-UUID'),
  ('Geschiedenis', '#8B5CF6', 'VERVANG-MET-LARS-UUID'),
  ('Aardrijkskunde', '#06B6D4', 'VERVANG-MET-LARS-UUID'),
  ('Biologie', '#14B8A6', 'VERVANG-MET-LARS-UUID'),
  ('Natuurkunde', '#6366F1', 'VERVANG-MET-LARS-UUID'),
  ('Scheikunde', '#EC4899', 'VERVANG-MET-LARS-UUID')
ON CONFLICT DO NOTHING;
