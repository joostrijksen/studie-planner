import { supabase } from '@/lib/supabase';

export class GameCredits {
  // Haal eigen credits op
  static async getCredits(userId: string): Promise<number> {
    const { data } = await supabase
      .from('game_credits')
      .select('credits')
      .eq('user_id', userId)
      .single();
    
    return data?.credits || 0;
  }

  // Voeg credits toe aan ALLE users (mirroring!)
  static async addCreditsToAll(amount: number): Promise<void> {
    await supabase.rpc('add_game_credits_to_all', { amount });
  }

  // Gebruik 1 credit van EIGEN credits
  static async spendCredit(): Promise<boolean> {
    const { data } = await supabase.rpc('spend_game_credit');
    return !!data;
  }

  // Sla score op
  static async saveScore(userId: string, score: number): Promise<void> {
    await supabase.from('game_scores').insert({
      user_id: userId,
      score,
    });
  }

  // Haal leaderboard op
  static async getLeaderboard(limit: number = 10) {
    const { data } = await supabase
      .from('game_scores')
      .select(`
        score,
        played_at,
        user:users!inner(naam)
      `)
      .order('score', { ascending: false })
      .limit(limit);
    
    return data || [];
  }
}
