# Stap 4: Planning Generator - COMPLEET! 🎉

## Wat is er toegevoegd:

✅ **Planning Generator Algoritme**
- Automatische verdeling van leerstof over beschikbare dagen
- Intelligente herhalingscyclus voor woordjes en formules
- Rekening houden met weekenden en buffer dagen
- Type-specifieke planning logica

✅ **Database Schema**
- `user_instellingen`: studietijd per dag, weekend, buffer dagen
- `planning_items`: dagelijkse taken met status

✅ **Planning Overzicht Pagina**
- Week selector met huidige dag indicator
- Dagelijks overzicht van taken
- Taken afvinken functionaliteit
- Progress indicator (voortgang per dag)
- Kleuren per vak
- Type indicator (leren/herhalen)

✅ **Automatische Planning Generatie**
- Planning wordt automatisch gegenereerd bij toets aanmaken
- Na opslaan wordt je doorgestuurd naar planning overzicht

## Planning Algoritme per Type:

### 1. Hoofdstukken
- Verdeelt hoofdstukken gelijkmatig over beschikbare dagen
- Laatste dag(en): herhaling van alle hoofdstukken

### 2. Woordjes
- **Spaced Repetition!**
- Eerste helft van tijd: nieuwe woorden leren (25 per sessie)
- Tweede helft: herhalingen van eerdere woorden
- Finale herhaling vlak voor toets

### 3. Opgaven
- Verdeelt opgaven over dagen
- Laatste dag: moeilijke opgaven opnieuw maken

### 4. Grammatica
- Verdeelt onderwerpen over dagen
- Herhaling aan het eind

### 5. Formules
- Kleine groepjes leren (5 per keer)
- Regelmatige herhalingen (zoals woordjes)

### 6. Tekst
- Verdeelt pagina's over dagen (2 min leestijd per pagina)
- Herhaling: belangrijke passages opnieuw lezen

## Setup Instructies:

### 1. Download en uitpakken
```bash
cd ~/Downloads
tar -xzf studie-planner-stap4-planning.tar.gz
```

### 2. Kopieer naar je project
```bash
cp -r studie-planner-stap4-planning/* /Users/joostrijksen/Documents/studie-planner/
cd /Users/joostrijksen/Documents/studie-planner
```

### 3. Database schema uitvoeren
Ga naar Supabase → SQL Editor:
1. Open `supabase/schema_stap4_planning.sql`
2. Kopieer hele inhoud
3. Plak in SQL Editor
4. Klik "Run"

Dit maakt aan:
- `user_instellingen` tabel
- `planning_items` tabel
- Standaard instellingen voor bestaande users

### 4. Start de server
```bash
npm run dev -- -p 5001
```

## Testen:

### Test 1: Toets met Hoofdstukken
1. Log in als Lars
2. Klik "Toets toevoegen"
3. Kies vak: Geschiedenis
4. Datum: over 10 dagen vanaf nu
5. Kies "Hoofdstukken" → Snel → 5 hoofdstukken
6. Klik "Toevoegen" → "Toets opslaan"
7. Je wordt doorgestuurd naar Planning
8. Zie je de planning verspreid over de dagen?

### Test 2: Toets met Woordjes
1. Maak nieuwe toets
2. Vak: Engels
3. Datum: over 14 dagen
4. Kies "Woordjes" → 100 woorden
5. Opslaan
6. Check planning: zie je de spaced repetition? (nieuwe woorden + herhalingen)

### Test 3: Planning Afvinken
1. Ga naar Planning pagina
2. Klik op vandaag
3. Vink een taak af (groene vink verschijnt)
4. Zie progress bar updaten
5. Klik nog een keer om af te vinken ongedaan te maken

### Test 4: Navigatie
1. Klik op pijltjes om week te veranderen
2. Klik op verschillende dagen
3. Zie verschillende taken per dag

## Wat werkt nu:

✅ Toets aanmaken met alle 6 types
✅ Automatische planning generatie
✅ Planning overzicht per dag
✅ Week navigator
✅ Taken afvinken
✅ Progress tracking
✅ Kleuren per vak
✅ Type indicator (leren/herhalen)
✅ Tijd per taak
✅ Toets datum in overzicht

## Instellingen (standaard waarden):

- **Studietijd per dag**: 120 minuten (2 uur)
- **Studeren in weekend**: Ja
- **Buffer dagen voor herhaling**: 2 dagen
- **Herhalings frequentie**: Elke 3 dagen

Deze zijn op te vragen uit de database, later kunnen we een instellingen pagina maken.

## Volgende mogelijke stappen:

1. **Huiswerk functionaliteit** - Vergelijkbaar met toetsen
2. **Q&A systeem** - Vragen stellen aan ouders
3. **Toetsen overzicht** - Pagina met alle toetsen
4. **Instellingen pagina** - Studietijd aanpassen
5. **Notificaties** - Herinneringen voor taken
6. **Statistieken** - Hoeveel tijd besteed per vak

**Welke wil je als eerste?**

## Troubleshooting:

**Planning wordt niet gegenereerd?**
- Check of SQL script is uitgevoerd
- Check browser console voor errors
- Check of toets onderdelen zijn opgeslagen

**Planning is leeg?**
- Toetsdatum moet in de toekomst zijn
- Er moeten minimaal een paar dagen zijn tot de toets

**Taken verschijnen niet?**
- Refresh de pagina
- Check of je ingelogd bent als Lars (student)
