# Stap 5: Toetsen Overzicht

## Wat is er toegevoegd:

✅ **Toetsen Overzicht Pagina** (`/toetsen`)
- Alle toetsen chronologisch gesorteerd
- Filter tabs: Aankomend / Alle / Geweest
- Per toets:
  - Vak met kleur
  - Datum en "over X dagen" indicator
  - Titel (indien ingevuld)
  - Onderdelen met emoji's
  - Voortgang (% planning items voltooid)
  - Progress bar
- Acties per toets:
  - 📅 Planning bekijken
  - 🗑️ Verwijderen (inclusief planning)

✅ **Dashboard Update**
- Toetsen tegel heeft nu 2 knoppen:
  - "Overzicht" → naar /toetsen
  - "+ Nieuw" → naar /toetsen/nieuw

✅ **Visuele Indicators**
- 🔥 "Vandaag!" badge voor toetsen vandaag
- Oranje badge voor toetsen binnen 3 dagen
- "Geweest" badge voor oude toetsen
- Kleuren per vak
- Emoji's per type onderdeel

## Setup:

### Geen nieuwe database changes!

Gewoon bestanden kopiëren:

```bash
cd ~/Downloads
tar -xzf studie-planner-stap5-overzicht.tar.gz
cp -r studie-planner-stap5-overzicht/* /Users/joostrijksen/Documents/studie-planner/
cd /Users/joostrijksen/Documents/studie-planner
npm run dev -- -p 5001
```

## Testen:

1. Log in als Lars
2. Dashboard → klik "Overzicht" onder Toetsen
3. Zie je je aangemaakte toetsen?
4. Klik op de filter tabs (Aankomend/Alle/Geweest)
5. Zie je de voortgang percentages?
6. Klik op 📅 → ga je naar planning?
7. Probeer een toets te verwijderen met 🗑️

## Features:

**Filter tabs:**
- **Aankomend**: Toetsen vanaf vandaag
- **Alle**: Alle toetsen
- **Geweest**: Oude toetsen

**Per toets zie je:**
- Vak (met kleurcode)
- Datum (met dagen tot toets)
- Titel
- Onderdelen (met emoji's)
- Voortgang percentage
- Progress bar (groen)

**Urgentie indicators:**
- Vandaag: 🔥 "Vandaag!" (rood)
- 1-3 dagen: Oranje badge
- >3 dagen: Gewone weergave
- Geweest: "Geweest" badge (grijs)

## Volgende mogelijkheden:

1. **Huiswerk** - Vergelijkbaar met toetsen maar korter
2. **Q&A systeem** - Vragen stellen aan ouders
3. **Instellingen** - Studietijd aanpassen
4. **Statistieken** - Tijd per vak, voltooid percentage

**Wat wil je als volgende?**
