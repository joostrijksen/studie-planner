// Planning Generator voor Studie Planner
// Dit algoritme genereert een dagelijkse planning op basis van toetsen en onderdelen

type ToetsData = {
  id: string;
  datum: Date;
  vak_id: string;
  onderdelen: ToetsOnderdeel[];
};

type ToetsOnderdeel = {
  id: string;
  type: 'hoofdstukken' | 'woordjes' | 'opgaven' | 'grammatica' | 'formules' | 'tekst';
  
  // Hoofdstukken
  hoofdstukken?: Array<{ naam: string; paginas?: number }>;
  aantal_hoofdstukken?: number;
  
  // Woordjes
  aantal_woorden?: number;
  woordenlijst_nummers?: string;
  
  // Opgaven
  opgaven_van?: number;
  opgaven_tot?: number;
  paragraaf?: string;
  
  // Grammatica
  grammatica_onderwerpen?: string[];
  
  // Formules
  aantal_formules?: number;
  formule_paragrafen?: string;
  
  // Tekst
  aantal_paginas?: number;
  boek_hoofdstukken?: string;
  
  geschatte_tijd?: number;
};

type PlanningItem = {
  datum: Date;
  type: 'leren' | 'herhalen';
  beschrijving: string;
  geschatte_tijd: number;
  toets_id: string;
  toets_onderdeel_id: string;
  
  // Specifieke velden
  hoofdstuk_nummers?: number[];
  woorden_van?: number;
  woorden_tot?: number;
  opgaven_van?: number;
  opgaven_tot?: number;
};

type UserInstellingen = {
  standaard_studietijd_per_dag: number;
  studeren_op_weekend: boolean;
  buffer_dagen: number;
  herhalings_frequentie: number;
};

export class PlanningGenerator {
  private instellingen: UserInstellingen;

  constructor(instellingen: UserInstellingen) {
    this.instellingen = instellingen;
  }

  /**
   * Genereer planning voor een toets
   */
  generatePlanning(toets: ToetsData): PlanningItem[] {
    const items: PlanningItem[] = [];
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    
    const toetsDatum = new Date(toets.datum);
    toetsDatum.setHours(0, 0, 0, 0);

    // Bereken beschikbare dagen
    const beschikbareDagen = this.getBeschikbareDagen(vandaag, toetsDatum);
    
    if (beschikbareDagen.length === 0) {
      console.warn('Geen beschikbare dagen voor planning');
      return items;
    }

    // Reserveer laatste dagen voor herhaling
    const bufferDagen = Math.min(this.instellingen.buffer_dagen, Math.floor(beschikbareDagen.length * 0.3));
    const leerDagen = beschikbareDagen.slice(0, beschikbareDagen.length - bufferDagen);
    const herhalingsDagen = beschikbareDagen.slice(beschikbareDagen.length - bufferDagen);

    // Genereer planning per onderdeel
    for (const onderdeel of toets.onderdelen) {
      const onderdeelItems = this.generateOnderdeelPlanning(
        onderdeel,
        leerDagen,
        herhalingsDagen,
        toets.id
      );
      items.push(...onderdeelItems);
    }

    return items;
  }

  /**
   * Genereer planning voor een specifiek onderdeel
   */
  private generateOnderdeelPlanning(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];

    switch (onderdeel.type) {
      case 'hoofdstukken':
        items.push(...this.planHoofdstukken(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
      case 'woordjes':
        items.push(...this.planWoordjes(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
      case 'opgaven':
        items.push(...this.planOpgaven(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
      case 'grammatica':
        items.push(...this.planGrammatica(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
      case 'formules':
        items.push(...this.planFormules(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
      case 'tekst':
        items.push(...this.planTekst(onderdeel, leerDagen, herhalingsDagen, toetsId));
        break;
    }

    return items;
  }

  /**
   * Plan hoofdstukken
   */
  private planHoofdstukken(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    let aantalHoofdstukken: number;
    let hoofdstukkenLijst: string[] = [];

    if (onderdeel.hoofdstukken && onderdeel.hoofdstukken.length > 0) {
      aantalHoofdstukken = onderdeel.hoofdstukken.length;
      hoofdstukkenLijst = onderdeel.hoofdstukken.map(h => h.naam);
    } else if (onderdeel.aantal_hoofdstukken) {
      aantalHoofdstukken = onderdeel.aantal_hoofdstukken;
      hoofdstukkenLijst = Array.from({ length: aantalHoofdstukken }, (_, i) => `Hoofdstuk ${i + 1}`);
    } else {
      return items;
    }

    // Verdeel hoofdstukken over beschikbare dagen
    const hoofdstukkenPerDag = Math.ceil(aantalHoofdstukken / leerDagen.length);
    
    let hoofdstukIndex = 0;
    for (let i = 0; i < leerDagen.length && hoofdstukIndex < aantalHoofdstukken; i++) {
      const hoofdstukkenVandaag: number[] = [];
      const beschrijvingen: string[] = [];
      
      for (let j = 0; j < hoofdstukkenPerDag && hoofdstukIndex < aantalHoofdstukken; j++) {
        hoofdstukkenVandaag.push(hoofdstukIndex + 1);
        beschrijvingen.push(hoofdstukkenLijst[hoofdstukIndex]);
        hoofdstukIndex++;
      }

      items.push({
        datum: leerDagen[i],
        type: 'leren',
        beschrijving: `Lees ${beschrijvingen.join(', ')}`,
        geschatte_tijd: onderdeel.geschatte_tijd || 45,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
        hoofdstuk_nummers: hoofdstukkenVandaag,
      });
    }

    // Herhaling toevoegen
    if (herhalingsDagen.length > 0) {
      items.push({
        datum: herhalingsDagen[0],
        type: 'herhalen',
        beschrijving: `Herhaal alle hoofdstukken`,
        geschatte_tijd: Math.ceil((onderdeel.geschatte_tijd || 45) * 0.5),
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    return items;
  }

  /**
   * Plan woordjes met herhalingscyclus
   */
  private planWoordjes(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    if (!onderdeel.aantal_woorden) return items;

    const aantalWoorden = onderdeel.aantal_woorden;
    const woordenPerSessie = 25; // Standaard 25 woorden per keer leren
    const aantalSessies = Math.ceil(aantalWoorden / woordenPerSessie);

    // Verdeel sessies over de helft van de beschikbare leerdagen (rest voor herhaling)
    const dagenVoorNieuweWoorden = Math.ceil(leerDagen.length / 2);
    const sessiesPerDag = Math.ceil(aantalSessies / dagenVoorNieuweWoorden);

    let woordIndex = 0;
    const gelerdeWoorden: Array<{ van: number; tot: number; datum: Date }> = [];

    // Nieuwe woorden leren
    for (let i = 0; i < dagenVoorNieuweWoorden && woordIndex < aantalWoorden; i++) {
      for (let j = 0; j < sessiesPerDag && woordIndex < aantalWoorden; j++) {
        const van = woordIndex + 1;
        const tot = Math.min(woordIndex + woordenPerSessie, aantalWoorden);
        
        items.push({
          datum: leerDagen[i],
          type: 'leren',
          beschrijving: `Leer woordjes ${van}-${tot}`,
          geschatte_tijd: 20,
          toets_id: toetsId,
          toets_onderdeel_id: onderdeel.id,
          woorden_van: van,
          woorden_tot: tot,
        });

        gelerdeWoorden.push({ van, tot, datum: leerDagen[i] });
        woordIndex = tot;
      }
    }

    // Herhalingen inplannen
    const restDagen = leerDagen.slice(dagenVoorNieuweWoorden).concat(herhalingsDagen);
    
    for (let i = 0; i < restDagen.length; i++) {
      // Herhaal woorden die een paar dagen geleden geleerd zijn
      const teHerhalenWoorden = gelerdeWoorden.filter(w => {
        const dagenGeleden = this.dagenTussen(w.datum, restDagen[i]);
        return dagenGeleden >= 2 && dagenGeleden <= 5;
      });

      if (teHerhalenWoorden.length > 0) {
        const van = Math.min(...teHerhalenWoorden.map(w => w.van));
        const tot = Math.max(...teHerhalenWoorden.map(w => w.tot));
        
        items.push({
          datum: restDagen[i],
          type: 'herhalen',
          beschrijving: `Herhaal woordjes ${van}-${tot}`,
          geschatte_tijd: 15,
          toets_id: toetsId,
          toets_onderdeel_id: onderdeel.id,
          woorden_van: van,
          woorden_tot: tot,
        });
      }
    }

    // Finale herhaling vlak voor toets
    if (herhalingsDagen.length > 0) {
      items.push({
        datum: herhalingsDagen[herhalingsDagen.length - 1],
        type: 'herhalen',
        beschrijving: `Herhaal alle woordjes (1-${aantalWoorden})`,
        geschatte_tijd: 25,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
        woorden_van: 1,
        woorden_tot: aantalWoorden,
      });
    }

    return items;
  }

  /**
   * Plan opgaven
   */
  private planOpgaven(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    if (!onderdeel.opgaven_van || !onderdeel.opgaven_tot) return items;

    const aantalOpgaven = onderdeel.opgaven_tot - onderdeel.opgaven_van + 1;
    const opgavenPerDag = Math.ceil(aantalOpgaven / leerDagen.length);

    let huidigeOpgave = onderdeel.opgaven_van;
    
    for (let i = 0; i < leerDagen.length && huidigeOpgave <= onderdeel.opgaven_tot; i++) {
      const van = huidigeOpgave;
      const tot = Math.min(huidigeOpgave + opgavenPerDag - 1, onderdeel.opgaven_tot);

      items.push({
        datum: leerDagen[i],
        type: 'leren',
        beschrijving: `Maak opgave ${van}-${tot}${onderdeel.paragraaf ? ` (${onderdeel.paragraaf})` : ''}`,
        geschatte_tijd: onderdeel.geschatte_tijd || 40,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
        opgaven_van: van,
        opgaven_tot: tot,
      });

      huidigeOpgave = tot + 1;
    }

    // Herhaling: moeilijke opgaven opnieuw maken
    if (herhalingsDagen.length > 0) {
      items.push({
        datum: herhalingsDagen[0],
        type: 'herhalen',
        beschrijving: `Oefen moeilijke opgaven opnieuw`,
        geschatte_tijd: Math.ceil((onderdeel.geschatte_tijd || 40) * 0.5),
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    return items;
  }

  /**
   * Plan grammatica
   */
  private planGrammatica(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    if (!onderdeel.grammatica_onderwerpen || onderdeel.grammatica_onderwerpen.length === 0) {
      return items;
    }

    const onderwerpen = onderdeel.grammatica_onderwerpen;
    const onderwerpenPerDag = Math.ceil(onderwerpen.length / leerDagen.length);

    let onderwerpIndex = 0;
    
    for (let i = 0; i < leerDagen.length && onderwerpIndex < onderwerpen.length; i++) {
      const onderwerpenVandaag: string[] = [];
      
      for (let j = 0; j < onderwerpenPerDag && onderwerpIndex < onderwerpen.length; j++) {
        onderwerpenVandaag.push(onderwerpen[onderwerpIndex]);
        onderwerpIndex++;
      }

      items.push({
        datum: leerDagen[i],
        type: 'leren',
        beschrijving: `Leer ${onderwerpenVandaag.join(', ')}`,
        geschatte_tijd: onderdeel.geschatte_tijd || 30,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    // Herhaling
    if (herhalingsDagen.length > 0) {
      items.push({
        datum: herhalingsDagen[0],
        type: 'herhalen',
        beschrijving: `Herhaal alle grammatica`,
        geschatte_tijd: Math.ceil((onderdeel.geschatte_tijd || 30) * 0.6),
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    return items;
  }

  /**
   * Plan formules (vergelijkbaar met woordjes)
   */
  private planFormules(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    if (!onderdeel.aantal_formules) return items;

    const aantalFormules = onderdeel.aantal_formules;
    const formulesPerSessie = 5;
    const aantalSessies = Math.ceil(aantalFormules / formulesPerSessie);

    const dagenVoorNieuweFormules = Math.ceil(leerDagen.length / 2);
    
    let formuleIndex = 0;

    // Nieuwe formules leren
    for (let i = 0; i < dagenVoorNieuweFormules && formuleIndex < aantalFormules; i++) {
      const van = formuleIndex + 1;
      const tot = Math.min(formuleIndex + formulesPerSessie, aantalFormules);
      
      items.push({
        datum: leerDagen[i],
        type: 'leren',
        beschrijving: `Leer formules ${van}-${tot}${onderdeel.formule_paragrafen ? ` (${onderdeel.formule_paragrafen})` : ''}`,
        geschatte_tijd: 25,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });

      formuleIndex = tot;
    }

    // Herhalingen
    const restDagen = leerDagen.slice(dagenVoorNieuweFormules).concat(herhalingsDagen);
    
    for (let i = 0; i < restDagen.length; i++) {
      items.push({
        datum: restDagen[i],
        type: 'herhalen',
        beschrijving: `Herhaal alle formules`,
        geschatte_tijd: 20,
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    return items;
  }

  /**
   * Plan tekst lezen
   */
  private planTekst(
    onderdeel: ToetsOnderdeel,
    leerDagen: Date[],
    herhalingsDagen: Date[],
    toetsId: string
  ): PlanningItem[] {
    const items: PlanningItem[] = [];
    
    if (!onderdeel.aantal_paginas) return items;

    const aantalPaginas = onderdeel.aantal_paginas;
    const paginasPerDag = Math.ceil(aantalPaginas / leerDagen.length);

    let huidigePagina = 1;
    
    for (let i = 0; i < leerDagen.length && huidigePagina <= aantalPaginas; i++) {
      const van = huidigePagina;
      const tot = Math.min(huidigePagina + paginasPerDag - 1, aantalPaginas);

      items.push({
        datum: leerDagen[i],
        type: 'leren',
        beschrijving: `Lees pagina ${van}-${tot}${onderdeel.boek_hoofdstukken ? ` (${onderdeel.boek_hoofdstukken})` : ''}`,
        geschatte_tijd: onderdeel.geschatte_tijd || Math.ceil((tot - van + 1) * 2), // 2 min per pagina
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });

      huidigePagina = tot + 1;
    }

    // Herhaling: belangrijke passages opnieuw lezen
    if (herhalingsDagen.length > 0) {
      items.push({
        datum: herhalingsDagen[0],
        type: 'herhalen',
        beschrijving: `Herlees belangrijke passages`,
        geschatte_tijd: Math.ceil((onderdeel.geschatte_tijd || 60) * 0.3),
        toets_id: toetsId,
        toets_onderdeel_id: onderdeel.id,
      });
    }

    return items;
  }

  /**
   * Bereken beschikbare dagen tussen vandaag en toetsdatum
   */
  private getBeschikbareDagen(van: Date, tot: Date): Date[] {
    const dagen: Date[] = [];
    const huidigeDatum = new Date(van);

    while (huidigeDatum < tot) {
      // Check of het weekend is
      const isWeekend = huidigeDatum.getDay() === 0 || huidigeDatum.getDay() === 6;
      
      if (!isWeekend || this.instellingen.studeren_op_weekend) {
        dagen.push(new Date(huidigeDatum));
      }

      huidigeDatum.setDate(huidigeDatum.getDate() + 1);
    }

    return dagen;
  }

  /**
   * Bereken aantal dagen tussen twee datums
   */
  private dagenTussen(datum1: Date, datum2: Date): number {
    const diff = datum2.getTime() - datum1.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
