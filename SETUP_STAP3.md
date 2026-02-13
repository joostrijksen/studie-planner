# Stap 3: Toetsen Functionaliteit

## Wat is er toegevoegd:

✅ Database tabellen voor toetsen en toets onderdelen
✅ Toets toevoegen pagina
✅ 6 verschillende types leerstof:
  - Hoofdstukken / Paragrafen
  - Woordenlijst
  - Opgaven / Oefeningen  
  - Grammatica / Regels
  - Formules / Definities
  - Tekst / Literatuur

## Setup Stappen:

### 1. Database schema uitvoeren

Ga naar Supabase → SQL Editor en voer uit:
- Open `supabase/schema_stap3_toetsen.sql`
- Kopieer en plak in SQL Editor
- Klik "Run"

Dit maakt de tabellen `toetsen` en `toets_onderdelen` aan.

### 2. Nieuwe code deployen

Als je de bestanden hebt gekopieerd:

```bash
# Stop de server (Ctrl+C)
# Start opnieuw
npm run dev -- -p 5001
```

### 3. Testen

1. Log in als Lars
2. Klik op "Toets toevoegen →" in het dashboard
3. Je komt op de nieuwe toets pagina:
   - Kies een vak
   - Kies datum
   - Kies type leerstof (bijv. "Hoofdstukken")
   - Klik "Toets opslaan"

## Wat werkt nu:

- ✅ Toets aanmaken met vak en datum
- ✅ Keuze uit 6 types leerstof
- ✅ Meerdere onderdelen per toets toevoegen
- ✅ Opslaan in database

## Volgende stap:

We moeten nog:
- Detail invoer per type leerstof (aantal hoofdstukken, woordjes, etc.)
- Toetsen overzicht pagina
- Planning generator

Wil je eerst de detail invoer afmaken, of eerst een overzicht maken van alle toetsen?
