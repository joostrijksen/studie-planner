// Planning Service - opslaan en ophalen van planning items
import { supabase } from '@/lib/supabase';
import { PlanningGenerator } from './generator';

type PlanningItem = {
  datum: Date;
  type: 'leren' | 'herhalen';
  beschrijving: string;
  geschatte_tijd: number;
  toets_id: string;
  toets_onderdeel_id: string;
  hoofdstuk_nummers?: number[];
  woorden_van?: number;
  woorden_tot?: number;
  opgaven_van?: number;
  opgaven_tot?: number;
};

export class PlanningService {
  /**
   * Genereer en sla planning op voor een toets
   */
  static async generateAndSavePlanning(toetsId: string, userId: string): Promise<boolean> {
    try {
      // Haal toets op met alle onderdelen
      const { data: toets, error: toetsError } = await supabase
        .from('toetsen')
        .select(`
          *,
          onderdelen:toets_onderdelen(*)
        `)
        .eq('id', toetsId)
        .single();

      if (toetsError || !toets) {
        console.error('Error loading toets:', toetsError);
        return false;
      }

      // Haal user instellingen op
      const { data: instellingen } = await supabase
        .from('user_instellingen')
        .select('*')
        .eq('user_id', userId)
        .single();

      const userInstellingen = instellingen || {
        standaard_studietijd_per_dag: 120,
        studeren_op_weekend: true,
        buffer_dagen: 2,
        herhalings_frequentie: 3,
      };

      // Genereer planning
      const generator = new PlanningGenerator(userInstellingen);
      const planningItems = generator.generatePlanning({
        id: toets.id,
        datum: new Date(toets.datum),
        vak_id: toets.vak_id,
        onderdelen: toets.onderdelen.map((od: any) => ({
          id: od.id,
          type: od.type,
          hoofdstukken: od.hoofdstukken ? JSON.parse(od.hoofdstukken) : undefined,
          aantal_hoofdstukken: od.aantal_hoofdstukken,
          aantal_woorden: od.aantal_woorden,
          woordenlijst_nummers: od.woordenlijst_nummers,
          opgaven_van: od.opgaven_van,
          opgaven_tot: od.opgaven_tot,
          paragraaf: od.paragraaf,
          grammatica_onderwerpen: od.grammatica_onderwerpen ? JSON.parse(od.grammatica_onderwerpen) : undefined,
          aantal_formules: od.aantal_formules,
          formule_paragrafen: od.formule_paragrafen,
          aantal_paginas: od.aantal_paginas,
          boek_hoofdstukken: od.boek_hoofdstukken,
          geschatte_tijd: od.geschatte_tijd,
        })),
      });

      // Sla planning items op
      const itemsToInsert = planningItems.map(item => ({
        user_id: userId,
        toets_id: item.toets_id,
        toets_onderdeel_id: item.toets_onderdeel_id,
        datum: item.datum.toISOString().split('T')[0],
        type: item.type,
        beschrijving: item.beschrijving,
        geschatte_tijd: item.geschatte_tijd,
        hoofdstuk_nummers: item.hoofdstuk_nummers,
        woorden_van: item.woorden_van,
        woorden_tot: item.woorden_tot,
        opgaven_van: item.opgaven_van,
        opgaven_tot: item.opgaven_tot,
      }));

      const { error: insertError } = await supabase
        .from('planning_items')
        .insert(itemsToInsert);

      if (insertError) {
        console.error('Error inserting planning items:', insertError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error generating planning:', error);
      return false;
    }
  }

  /**
   * Verwijder bestaande planning voor een toets
   */
  static async deletePlanningForToets(toetsId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('planning_items')
        .delete()
        .eq('toets_id', toetsId);

      return !error;
    } catch (error) {
      console.error('Error deleting planning:', error);
      return false;
    }
  }

  /**
   * Haal planning op voor een specifieke datum
   */
  static async getPlanningForDate(userId: string, datum: Date) {
    const datumString = datum.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('planning_items')
      .select(`
        *,
        toets:toetsen(
          id,
          datum,
          titel,
          vak:vakken(naam, kleur)
        )
      `)
      .eq('user_id', userId)
      .eq('datum', datumString)
      .order('geschatte_tijd', { ascending: false });

    if (error) {
      console.error('Error loading planning:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Haal planning op voor een periode
   */
  static async getPlanningForPeriod(userId: string, van: Date, tot: Date) {
    const vanString = van.toISOString().split('T')[0];
    const totString = tot.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('planning_items')
      .select(`
        *,
        toets:toetsen(
          id,
          datum,
          titel,
          vak:vakken(naam, kleur)
        )
      `)
      .eq('user_id', userId)
      .gte('datum', vanString)
      .lte('datum', totString)
      .order('datum', { ascending: true })
      .order('geschatte_tijd', { ascending: false });

    if (error) {
      console.error('Error loading planning:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Markeer planning item als voltooid
   */
  static async markAsCompleted(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('planning_items')
        .update({
          voltooid: true,
          voltooid_op: new Date().toISOString(),
        })
        .eq('id', itemId);

      return !error;
    } catch (error) {
      console.error('Error marking as completed:', error);
      return false;
    }
  }

  /**
   * Markeer planning item als niet voltooid
   */
  static async markAsIncomplete(itemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('planning_items')
        .update({
          voltooid: false,
          voltooid_op: null,
        })
        .eq('id', itemId);

      return !error;
    } catch (error) {
      console.error('Error marking as incomplete:', error);
      return false;
    }
  }
}
