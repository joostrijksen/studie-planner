# Stap 6: Huiswerk Functionaliteit

## Wat is er toegevoegd:

✅ **Huiswerk Toevoegen** (`/huiswerk/nieuw`)
- Vak kiezen
- 3 types: Maken / Leren / Voorbereiden
- Beschrijving (wat moet je doen?)
- Deadline (datum)
- Geschatte tijd (quick buttons + vrij invoerveld)
- Notities (optioneel)

✅ **Huiswerk Overzicht** (`/huiswerk`)
- Filter tabs: Te doen / Voltooid / Alles
- Visuele urgentie indicators:
  - 🔥 Vandaag!
  - Morgen (oranje badge)
  - ⚠️ Te laat! (rood voor gemiste deadlines)
- Afvinken functionaliteit
- Per item: vak, type, beschrijving, deadline, tijd
- Verwijderen functie

✅ **Planning Integratie**
- Huiswerk wordt automatisch toegevoegd aan planning
- Planning logica:
  - Deadline morgen → plan vandaag
  - Deadline later → plan dag vóór deadline
- Huiswerk verschijnt in dagelijkse planning met 📝 badge
- Afvinken in planning synchroniseert met huiswerk overzicht

✅ **Dashboard Update**
- Huiswerk tegel met 2 knoppen: Overzicht + Nieuw

## Database:

Nieuwe tabel: `huiswerk`
- Vak, beschrijving, deadline, type
- Geschatte tijd, notities
- Voltooid status

Update: `planning_items` 
- Nieuwe kolom: `huiswerk_id` (naast `toets_id`)

## Setup:

### 1. Database schema uitvoeren

**BELANGRIJK:** Ga naar Supabase → SQL Editor:

```bash
# Open het bestand
/supabase/schema_stap6_huiswerk.sql
```

Kopieer de hele inhoud en voer uit in SQL Editor.

### 2. Bestanden kopiëren

```bash
cd ~/Downloads
tar -xzf studie-planner-stap6-huiswerk.tar.gz
cp -r studie-planner-stap6-huiswerk/* /Users/joostrijksen/Documents/studie-planner/
cd /Users/joostrijksen/Documents/studie-planner
npm run dev -- -p 5001
```

## Testen:

### Test 1: Huiswerk Toevoegen
1. Dashboard → Huiswerk → "+ Nieuw"
2. Kies vak (bijv. Wiskunde)
3. Kies type: "Maken"
4. Beschrijving: "Opgave 23-30 maken"
5. Deadline: morgen
6. Geschatte tijd: 45 min
7. Opslaan

### Test 2: Planning Bekijken
1. Ga naar Planning (📅)
2. Klik op vandaag
3. Zie je het huiswerk item met 📝 badge?
4. Vink af → wordt het groen?

### Test 3: Huiswerk Overzicht
1. Dashboard → Huiswerk → "Overzicht"
2. Zie je je toegevoegde huiswerk?
3. Zie je urgentie indicators?
4. Vink af in overzicht → synchroniseert met planning?

### Test 4: Filters
1. In huiswerk overzicht
2. Test filters: Te doen / Voltooid / Alles
3. Voeg meer huiswerk toe met verschillende deadlines
4. Test "vandaag", "morgen", "over 3 dagen"

## Features:

**Types:**
- ✍️ **Maken**: Opgaven, opdrachten
- 📚 **Leren**: Woordjes, stof
- 📋 **Voorbereiden**: Presentatie, etc.

**Urgentie:**
- 🔥 Vandaag = rood badge "Vandaag!"
- Morgen = oranje badge
- ⚠️ Te laat = rood waarschuwing

**Planning Logic:**
- Deadline morgen → huiswerk op vandaag
- Deadline later → dag voor deadline
- Automatisch planning item aanmaken

**Status:**
- Afvinken in huiswerk overzicht
- Afvinken in planning
- Synchroon met elkaar

## Wat werkt nu:

✅ Toetsen aanmaken (6 types leerstof)
✅ Automatische planning generator
✅ Huiswerk toevoegen (3 types)
✅ Planning overzicht (toetsen + huiswerk)
✅ Dagelijks afvinken
✅ Toetsen overzicht
✅ Huiswerk overzicht

## Volgende mogelijkheden:

1. **Q&A systeem** - Lars kan vragen stellen aan jou
2. **Instellingen** - Studietijd aanpassen, weekend, etc.
3. **Statistieken** - Tijd per vak, voortgang visualisatie
4. **Notificaties** - Herinneringen voor deadlines

**Wat wil je als volgende?**
