# Stap 3 Update: Detail Invoer voor Alle Types

## Wat is er toegevoegd:

✅ **Complete detail invoer voor alle 6 types:**

### 1. Hoofdstukken / Paragrafen
- **Gedetailleerd**: Lijst van hoofdstukken (1 per regel)
- **Snel**: Aantal hoofdstukken
- Optioneel: Geschatte tijd

### 2. Woordenlijst
- Aantal woorden
- Woordenlijst nummers (bijv. "Lijst 1 t/m 5")
- Optioneel: Geschatte tijd

### 3. Opgaven / Oefeningen
- Van opgave (nummer)
- Tot opgave (nummer)
- Optioneel: Paragraaf
- Optioneel: Geschatte tijd

### 4. Grammatica / Regels
- Lijst van grammatica onderwerpen (1 per regel)
- Optioneel: Geschatte tijd

### 5. Formules / Definities
- Aantal formules
- Optioneel: Paragrafen
- Optioneel: Geschatte tijd

### 6. Tekst / Literatuur
- Aantal pagina's
- Optioneel: Hoofdstukken/pagina's
- Optioneel: Geschatte tijd

## Flow:

1. **Stap 1**: Vak en datum kiezen
2. **Stap 2**: Type leerstof kiezen (klik op een van de 6 knoppen)
3. **Stap 3**: Details invullen voor dat type
4. Terug naar stap 2 om meer onderdelen toe te voegen
5. Opslaan

## Features:

✅ Multi-step formulier met progress indicator
✅ Meerdere onderdelen per toets toevoegen
✅ Bewerken van toegevoegde onderdelen
✅ Verwijderen van onderdelen
✅ Validatie (vak + datum verplicht)
✅ Geschatte tijd per onderdeel

## Setup:

Geen nieuwe database changes nodig - gebruik hetzelfde schema van stap 3!

```bash
# Download en uitpakken
cd ~/Downloads
tar -xzf studie-planner-stap3-detail.tar.gz

# Kopieer naar je project
cp -r studie-planner-stap3-detail/* /Users/joostrijksen/Documents/studie-planner/

# Ga naar project
cd /Users/joostrijksen/Documents/studie-planner

# Start (of restart als het al draait)
npm run dev -- -p 5001
```

## Testen:

1. Log in als Lars
2. Klik "Toets toevoegen"
3. Kies vak + datum → Volgende
4. Kies bijv. "Hoofdstukken" → Details invullen → Toevoegen
5. Kies nog een type → Details invullen → Toevoegen
6. Zie toegevoegde onderdelen in overzicht
7. Klik "Toets opslaan"

## Volgende stap:

Nu de invoer compleet is, kunnen we:
- **Optie A**: Toetsen overzicht pagina maken
- **Optie B**: Planning generator maken (het belangrijkste!)
- **Optie C**: Huiswerk functionaliteit

Wat wil je eerst?
