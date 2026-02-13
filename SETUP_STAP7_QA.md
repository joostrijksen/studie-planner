# Stap 7: Q&A Systeem

## Wat is er toegevoegd:

✅ **Vraag Stellen (Student)**
- Vak kiezen (optioneel)
- Context toevoegen (bijv. "Hoofdstuk 3, opgave 12")
- Vraag formuleren
- Tips voor goede vragen

✅ **Vragen Overzicht (Student)**
- Filter: Open / Beantwoord / Alles
- Alle vragen met status
- Antwoorden van ouders
- "Opgelost" knop wanneer vraag beantwoord is

✅ **Vragen Dashboard (Ouder)**
- Alle vragen van Lars zien
- Filter: Open / Beantwoord / Alles
- Antwoorden geven op open vragen
- Real-time updates

✅ **Status Workflow**
- **Open**: Nieuwe vraag, nog niet beantwoord
- **Beantwoord**: Ouder heeft geantwoord
- **Opgelost**: Lars heeft bevestigd dat probleem opgelost is

## Database:

Nieuwe tabellen:
- `vragen`: vraag, context, status, vak
- `antwoorden`: antwoord, gekoppeld aan vraag en user

## Setup:

### 1. Database schema uitvoeren

**BELANGRIJK:** Ga naar Supabase → SQL Editor:

```bash
# Open het bestand
/supabase/schema_stap7_qa.sql
```

Kopieer de hele inhoud en voer uit in SQL Editor.

### 2. Bestanden kopiëren

```bash
cd ~/Downloads
tar -xzf studie-planner-stap7-qa.tar.gz
cp -r studie-planner-stap7-qa/* /Users/joostrijksen/Documents/studie-planner/
cd /Users/joostrijksen/Documents/studie-planner
npm run dev -- -p 5001
```

## Testen:

### Test 1: Vraag stellen (als Lars)
1. Log in als Lars
2. Dashboard → Vragen → "+ Nieuw"
3. Kies vak: Wiskunde
4. Context: "Hoofdstuk 5, opgave 23"
5. Vraag: "Hoe los ik een vergelijking op met twee onbekenden?"
6. Verstuur
7. Zie je de vraag in het overzicht met status "Open"?

### Test 2: Antwoorden (als ouder)
1. Log uit
2. Log in als Joost
3. Dashboard → "Vragen bekijken"
4. Zie je de vraag van Lars?
5. Klik "Antwoord geven"
6. Typ antwoord
7. Verstuur
8. Status verandert naar "Beantwoord"?

### Test 3: Opgelost markeren (als Lars)
1. Log uit, log in als Lars
2. Ga naar Vragen
3. Zie je het antwoord van Joost?
4. Klik "✓ Opgelost"
5. Status verandert naar "Opgelost"?

### Test 4: Filters
1. Stel meerdere vragen
2. Laat sommige beantwoorden
3. Test alle filters (Open / Beantwoord / Alles)

## Features:

**Voor Student (Lars):**
- ❓ Vraag stellen met context
- 📋 Overzicht eigen vragen
- 📬 Antwoorden van ouders lezen
- ✓ Markeren als opgelost

**Voor Ouder (Joost/Karin):**
- 👀 Alle vragen van Lars zien
- 💬 Antwoorden geven
- 📊 Status per vraag
- 🔔 Aantal open vragen zichtbaar

**Status badges:**
- 🟠 **Open**: Nog niet beantwoord
- 🔵 **Beantwoord**: Ouder heeft geantwoord
- 🟢 **Opgelost**: Lars heeft bevestigd

## Tips:

**Voor goede communicatie:**
- Lars: wees specifiek in je vraag
- Ouders: geef duidelijke uitleg
- Gebruik context veld (hoofdstuk, opgave)
- Markeer als opgelost wanneer probleem opgelost is

## Wat werkt nu volledig:

✅ Toetsen met automatische planning
✅ Huiswerk met deadline tracking  
✅ Dagelijkse planning (geïntegreerd)
✅ Overzichten (toetsen + huiswerk)
✅ Q&A systeem (vragen + antwoorden)

## Nog mogelijke uitbreidingen:

1. **Notificaties** - Email/push bij nieuwe vraag/antwoord
2. **Afbeeldingen** - Foto's uploaden bij vraag (bijv. opgave)
3. **Instellingen pagina** - Studietijd aanpassen
4. **Statistieken** - Dashboard met voortgang

## Troubleshooting:

**Vraag wordt niet opgeslagen?**
- Check of SQL script is uitgevoerd
- Check browser console voor errors
- Refresh de pagina

**Ouders zien geen vragen?**
- Check of je ingelogd bent als ouder
- Check RLS policies in Supabase

**Antwoord niet zichtbaar?**
- Refresh de pagina
- Check of status is geupdate naar "beantwoord"
