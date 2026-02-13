# Studie Planner voor Lars

Een slimme studieplanning app die Lars helpt met het plannen van toetsen en huiswerk.

## Stap 1: Basis Setup ✅

### Features in deze versie:
- ✅ Next.js project met TypeScript
- ✅ Tailwind CSS styling
- ✅ Supabase configuratie
- ✅ Database schema (users & vakken)
- ✅ Basis homepage

## Setup Instructies

### 1. Supabase Project Aanmaken

1. Ga naar [supabase.com](https://supabase.com)
2. Maak een nieuw project aan
3. Kopieer de Project URL en anon key

### 2. Environment Variables

Kopieer `.env.local.example` naar `.env.local` en vul in:

```bash
cp .env.local.example .env.local
```

Vul de Supabase gegevens in:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Database Schema

Voer het SQL script uit in Supabase SQL Editor:
- Open Supabase Dashboard → SQL Editor
- Kopieer inhoud van `supabase/schema_stap1.sql`
- Voer uit

### 4. Dependencies Installeren

```bash
npm install
```

### 5. Development Server Starten

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Volgende Stappen

- [ ] Authenticatie implementeren
- [ ] Vakken pagina maken
- [ ] Toetsen functionaliteit
- [ ] Huiswerk functionaliteit
- [ ] Planning generator
- [ ] Q&A systeem

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
