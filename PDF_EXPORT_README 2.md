# PDF Export Functie

## Wat is er toegevoegd:

✅ **"Export PDF" knop** in planning pagina
- Genereert een mooie PDF van de hele week
- Inclusief alle taken per dag
- Professionele layout met tabellen
- Bestandsnaam: `weekplanning-weekXX.pdf`

## Features:

**PDF Inhoud:**
- 📚 Header met naam en weeknummer
- 📅 Elke dag met eigen sectie
- 📊 Tabel per dag met:
  - Vak
  - Type (Leren/Herhalen/Huiswerk)
  - Taak beschrijving
  - Geschatte tijd
  - Checkbox (voltooid/niet voltooid)
- 📄 Footer met datum gegenereerd

**Layout:**
- Automatische paginabreuk bij lange weken
- Grid layout voor overzichtelijkheid
- Kleuren voor headers
- Checkbox ☐ of ✓ voor status

## Setup:

### 1. Dependencies installeren

```bash
cd /Users/joostrijksen/Documents/studie-planner
npm install jspdf jspdf-autotable
```

### 2. Bestanden kopiëren

```bash
cd ~/Downloads
tar -xzf studie-planner-met-pdf.tar.gz
cp -r studie-planner-met-pdf/* /Users/joostrijksen/Documents/studie-planner/
```

### 3. Server herstarten

```bash
cd /Users/joostrijksen/Documents/studie-planner
npm run dev -- -p 5001
```

**Geen nieuwe SQL nodig!**

## Testen:

1. Log in als Lars
2. Ga naar Planning (📅)
3. Zorg dat je wat planning items hebt
4. Klik rechtsboven op **"📄 Export PDF"**
5. PDF wordt automatisch gedownload
6. Open de PDF - zie je:
   - Jouw naam
   - Weeknummer en datums
   - Alle dagen met taken
   - Tabel per dag met details

## PDF Voorbeeld:

```
📚 Weekplanning
Lars
6 jan 2025 - 12 jan 2025

Maandag 6 januari
┌──────────┬─────────┬──────────────────────────┬────────┬──────┐
│ Vak      │ Type    │ Taak                     │ Tijd   │ Klaar│
├──────────┼─────────┼──────────────────────────┼────────┼──────┤
│ Wiskunde │ 📝 Hw   │ Opgave 23-30 maken       │ 45 min │ ☐    │
│ Engels   │ 📚 Leren│ Leer woordjes 1-25       │ 20 min │ ✓    │
└──────────┴─────────┴──────────────────────────┴────────┴──────┘

Dinsdag 7 januari
...
```

## Gebruik:

**Voor Lars:**
- Print de PDF uit
- Hang op je kamer
- Vink af met pen
- Of: bekijk op tablet/phone

**Voor Ouders:**
- Download PDF
- Zie overzicht van Lars zijn week
- Print voor op de koelkast

## Technische details:

- **Library**: jsPDF + jspdf-autotable
- **Bestandsgrootte**: ~50-100KB per week
- **Format**: A4 PDF
- **Font**: Helvetica
- **Kleuren**: Blauw/grijs/groen
- **Dynamisch**: Nieuwe pagina bij veel taken

## Troubleshooting:

**PDF wordt niet gedownload?**
- Check browser console voor errors
- Probeer andere browser
- Check of jsPDF is geïnstalleerd: `npm list jspdf`

**PDF is leeg?**
- Zorg dat je planning items hebt voor die week
- Refresh de planning pagina

**Layout is raar?**
- Beschrijvingen te lang? PDF probeert ze in te korten
- Te veel taken per dag? Automatisch nieuwe pagina

## Volgende Features (optioneel):

- Email PDF naar ouders
- Automatisch printen
- Kleur per vak in PDF
- Toets deadlines highlighten
- Week selectie (niet alleen huidige week)

🎉 **De app is nu 100% compleet met PDF export!**
