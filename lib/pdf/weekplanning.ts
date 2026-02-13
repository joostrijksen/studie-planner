// PDF Generator voor weekplanning
// Gebruikt jsPDF en jspdf-autotable voor mooie tabellen

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type PlanningItem = {
  datum: string;
  beschrijving: string;
  geschatte_tijd: number;
  voltooid: boolean;
  type: 'leren' | 'herhalen';
  toets?: {
    vak: {
      naam: string;
      kleur: string;
    };
  };
  huiswerk?: {
    vak: {
      naam: string;
      kleur: string;
    };
  };
};

export async function generateWeekPlanningPDF(
  weekStart: Date,
  weekEnd: Date,
  planningPerDag: Map<string, PlanningItem[]>,
  userName: string
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Weekplanning', 14, 20);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`${userName}`, 14, 28);
  
  doc.setFontSize(10);
  doc.text(
    `${formatDatum(weekStart)} - ${formatDatum(weekEnd)}`,
    14,
    34
  );
  
  let yPosition = 45;
  
  // Loop door alle dagen
  const dagen = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'];
  const datumKeys = Array.from(planningPerDag.keys()).sort();
  
  for (const datumKey of datumKeys) {
    const items = planningPerDag.get(datumKey) || [];
    if (items.length === 0) continue;
    
    const datum = new Date(datumKey);
    const dagNaam = dagen[datum.getDay() === 0 ? 6 : datum.getDay() - 1];
    
    // Check of we een nieuwe pagina nodig hebben
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }
    
    // Dag header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${dagNaam} ${formatDatum(datum)}`, 14, yPosition);
    yPosition += 8;
    
    // Tabel met taken
    const tableData = items.map(item => {
      const vak = item.toets?.vak || item.huiswerk?.vak;
      const isHuiswerk = !!item.huiswerk;
      
      // Gebruik tekst in plaats van emoji's
      let type = '';
      if (isHuiswerk) {
        type = 'Huiswerk';
      } else if (item.type === 'leren') {
        type = 'Leren';
      } else {
        type = 'Herhalen';
      }
      
      return [
        vak?.naam || 'Algemeen',
        type,
        item.beschrijving,
        `${item.geschatte_tijd} min`,
        item.voltooid ? 'Ja' : 'Nee'
      ];
    });
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Vak', 'Type', 'Taak', 'Tijd', 'Klaar']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // blue-600
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 25 },
        2: { cellWidth: 90 },
        3: { cellWidth: 20 },
        4: { cellWidth: 15, halign: 'center' },
      },
      margin: { left: 14, right: 14 },
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Footer op laatste pagina
  const pageCount = doc.getNumberOfPages();
  doc.setPage(pageCount);
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  doc.text(
    `Gegenereerd op ${new Date().toLocaleDateString('nl-NL')} - Studie Planner`,
    14,
    doc.internal.pageSize.height - 10
  );
  
  // Download
  const weekNummer = getWeekNumber(weekStart);
  doc.save(`weekplanning-week${weekNummer}.pdf`);
}

function formatDatum(date: Date): string {
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
