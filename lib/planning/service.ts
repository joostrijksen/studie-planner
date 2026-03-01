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

// Lokale datum string — voorkomt UTC/tijdzone verschil (NL = UTC+1)
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class PlanningService {
  /**
   * Genereer en sla planning op voor een toets
   */
  static async generateAndSavePlanning(toetsId: string, userId: string): Promise<boolean> {
    try {
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
          grammatica_onderwerpen: od.grammatica_onderwerpen
            ? JSON.parse(od.grammatica_onderwerpen)
            : undefined,
          aantal_formules: od.aantal_formules,
          formule_paragrafen: od.formule_paragrafen,
          aantal_paginas: od.aantal_paginas,
          boek_hoofdstukken: od.boek_hoofdstukken,
          geschatte_tijd: od.geschatte_tijd,
        })),
      });

      const itemsToInsert = planningItems.map((item) => ({
        user_id: userId,
        toets_id: item.toets_id,
        toets_onderdeel_id: item.toets_onderdeel_id,
        datum: toLocalDateString(item.datum),
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
    const datumString = toLocalDateString(datum);

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
    const vanString = toLocalDateString(van);
    const totString = toLocalDateString(tot);

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
   * Haal credits op voor een user
   */
  static async getCredits(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.error('Error loading credits:', error);
      return 0;
    }

    return data.credits ?? 0;
  }

  /**
   * Pas credits aan voor een user in game_credits tabel
   * (positief = toevoegen, negatief = aftrekken)
   */
  private static async updateCredits(userId: string, delta: number): Promise<boolean> {
    console.log(`💰 Credits bijwerken in game_credits: user=${userId}, delta=${delta}`);

    // Haal huidige waarden op
    const { data: current, error: fetchError } = await supabase
      .from('game_credits')
      .select('credits, total_earned, total_spent')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Kan game_credits niet ophalen:', fetchError);
      return false;
    }

    if (!current) {
      // Rij bestaat nog niet → aanmaken
      const { error: insertError } = await supabase
        .from('game_credits')
        .insert({
          user_id: userId,
          credits: Math.max(0, delta),
          total_earned: delta > 0 ? delta : 0,
          total_spent: 0,
        });

      if (insertError) {
        console.error('❌ Kan game_credits niet aanmaken:', insertError);
        return false;
      }

      console.log(`✅ game_credits aangemaakt met ${Math.max(0, delta)} credits`);
      return true;
    }

    // Rij bestaat → update credits + total_earned/total_spent
    const nieuweCredits = Math.max(0, (current.credits ?? 0) + delta);
    const updateData: any = { credits: nieuweCredits };
    if (delta > 0) {
      updateData.total_earned = (current.total_earned ?? 0) + delta;
    }

    const { error: updateError } = await supabase
      .from('game_credits')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('❌ game_credits update mislukt:', updateError);
      return false;
    }

    console.log(`✅ game_credits bijgewerkt: ${current.credits} → ${nieuweCredits}`);
    return true;
  }

  /**
   * Markeer planning item als voltooid en schrijf credits bij
   */
  static async markAsCompleted(itemId: string): Promise<boolean> {
    try {
      // Haal item op om geschatte_tijd en huidige status te weten
      const { data: item, error: fetchError } = await supabase
        .from('planning_items')
        .select('geschatte_tijd, user_id, voltooid')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) {
        console.error('Error fetching item:', fetchError);
        return false;
      }

      // Voorkom dubbel credits bijschrijven als al voltooid
      if (item.voltooid) {
        console.log('⚠️ Item al voltooid, geen credits toegevoegd');
        return true;
      }

      // Markeer als voltooid
      const { error } = await supabase
        .from('planning_items')
        .update({
          voltooid: true,
          voltooid_op: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error marking as completed:', error);
        return false;
      }

      console.log(`✅ Item ${itemId} gemarkeerd als voltooid, ${item.geschatte_tijd} credits toevoegen`);

      // Schrijf credits bij (1 credit per minuut studietijd)
      const creditSuccess = await PlanningService.updateCredits(item.user_id, item.geschatte_tijd);
      if (!creditSuccess) {
        console.error('⚠️ Credits konden niet worden bijgewerkt, maar item is wel afgevinkt');
      }

      return true;
    } catch (error) {
      console.error('Error marking as completed:', error);
      return false;
    }
  }

  /**
   * Markeer planning item als niet voltooid en trek credits af
   */
  static async markAsIncomplete(itemId: string): Promise<boolean> {
    try {
      const { data: item, error: fetchError } = await supabase
        .from('planning_items')
        .select('geschatte_tijd, user_id, voltooid')
        .eq('id', itemId)
        .single();

      if (fetchError || !item) {
        console.error('Error fetching item:', fetchError);
        return false;
      }

      // Voorkom onnodig aftrekken als al niet voltooid
      if (!item.voltooid) {
        console.log('⚠️ Item al niet voltooid, geen credits afgetrokken');
        return true;
      }

      const { error } = await supabase
        .from('planning_items')
        .update({
          voltooid: false,
          voltooid_op: null,
        })
        .eq('id', itemId);

      if (error) {
        console.error('Error marking as incomplete:', error);
        return false;
      }

      console.log(`↩️ Item ${itemId} teruggedraaid, ${item.geschatte_tijd} credits aftrekken`);

      // Trek credits af
      const creditSuccess = await PlanningService.updateCredits(item.user_id, -item.geschatte_tijd);
      if (!creditSuccess) {
        console.error('⚠️ Credits konden niet worden afgetrokken');
      }

      return true;
    } catch (error) {
      console.error('Error marking as incomplete:', error);
      return false;
    }
  }
}
