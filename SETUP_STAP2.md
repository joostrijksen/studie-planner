# Stap 2: Authenticatie Setup

## Wat gaan we doen:
1. ✅ Test gebruikers aanmaken in Supabase
2. ✅ Login functionaliteit testen
3. ✅ Dashboard bekijken

## Stappen:

### 1. Gebruikers aanmaken in Supabase

**Ga naar je Supabase project → Authentication → Users**

Klik op "Add user" en maak 3 gebruikers aan:

**Gebruiker 1: Lars (student)**
- Email: `lars@test.nl`
- Password: `lars123` (of wat je wilt)
- ✅ Auto Confirm User: AAN

**Gebruiker 2: Joost (ouder)**
- Email: `joost@test.nl`  
- Password: `joost123`
- ✅ Auto Confirm User: AAN

**Gebruiker 3: Karin (ouder)**
- Email: `karin@test.nl`
- Password: `karin123`
- ✅ Auto Confirm User: AAN

### 2. User profiles toevoegen

**Voor elke aangemaakte user:**

1. Klik op de user in de lijst
2. Kopieer de UUID (eerste veld)
3. Ga naar SQL Editor
4. Voer uit (vervang UUID):

```sql
-- Voor Lars:
INSERT INTO users (id, email, naam, rol) 
VALUES ('UUID-VAN-LARS', 'lars@test.nl', 'Lars', 'student');

-- Voor Joost:
INSERT INTO users (id, email, naam, rol) 
VALUES ('UUID-VAN-JOOST', 'joost@test.nl', 'Joost', 'ouder');

-- Voor Karin:
INSERT INTO users (id, email, naam, rol) 
VALUES ('UUID-VAN-KARIN', 'karin@test.nl', 'Karin', 'ouder');
```

### 3. Vakken toevoegen voor Lars

```sql
INSERT INTO vakken (naam, kleur, user_id) VALUES
  ('Wiskunde', '#EF4444', 'UUID-VAN-LARS'),
  ('Engels', '#10B981', 'UUID-VAN-LARS'),
  ('Nederlands', '#F59E0B', 'UUID-VAN-LARS'),
  ('Geschiedenis', '#8B5CF6', 'UUID-VAN-LARS'),
  ('Aardrijkskunde', '#06B6D4', 'UUID-VAN-LARS'),
  ('Biologie', '#14B8A6', 'UUID-VAN-LARS'),
  ('Natuurkunde', '#6366F1', 'UUID-VAN-LARS'),
  ('Scheikunde', '#EC4899', 'UUID-VAN-LARS');
```

### 4. Testen!

1. Ga naar `http://localhost:5001`
2. Log in met `lars@test.nl` / `lars123`
3. Je zou het dashboard moeten zien!
4. Log uit en probeer ook met `joost@test.nl`

## Klaar? 

Als alles werkt, zie je:
- ✅ Login pagina op http://localhost:5001
- ✅ Na login: Dashboard met welkomstbericht
- ✅ 4 tegels: Toetsen, Huiswerk, Planning, Vragen
- ✅ Ouders zien extra "Ouder Dashboard" sectie

## Volgende stap:
Stap 3: Vakken pagina en beheer
