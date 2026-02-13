-- Studie Planner Database Schema
-- Stap 1: Basis tabellen voor users en vakken

-- Users tabel
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  naam TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('student', 'ouder')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vakken tabel
CREATE TABLE IF NOT EXISTS vakken (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  naam TEXT NOT NULL,
  kleur TEXT NOT NULL DEFAULT '#3B82F6',
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Standaard vakken voor Lars (voeg later toe na user aanmaken)
-- INSERT INTO vakken (naam, kleur, user_id) VALUES
-- ('Wiskunde', '#EF4444', 'lars-user-id'),
-- ('Engels', '#10B981', 'lars-user-id'),
-- ('Nederlands', '#F59E0B', 'lars-user-id'),
-- ('Geschiedenis', '#8B5CF6', 'lars-user-id'),
-- ('Aardrijkskunde', '#06B6D4', 'lars-user-id'),
-- ('Biologie', '#14B8A6', 'lars-user-id'),
-- ('Natuurkunde', '#6366F1', 'lars-user-id'),
-- ('Scheikunde', '#EC4899', 'lars-user-id');

-- Row Level Security inschakelen
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vakken ENABLE ROW LEVEL SECURITY;

-- Policies: Users kunnen alleen hun eigen data zien
CREATE POLICY "Users kunnen eigen profiel zien" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users kunnen eigen profiel updaten" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Policies: Vakken
CREATE POLICY "Users kunnen eigen vakken zien" ON vakken
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen vakken toevoegen" ON vakken
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen vakken updaten" ON vakken
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users kunnen eigen vakken verwijderen" ON vakken
  FOR DELETE USING (auth.uid() = user_id);
