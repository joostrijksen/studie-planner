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

  // Voeg credits toe aan ALLE users
  static async addCreditsToAll(amount: number): Promise<void> {
    await supabase.rpc('add_game_credits_to_all', { amount });
  }

  // Gebruik 1 credit van EIGEN credits
  static async spendCredit(): Promise<boolean> {
    const { data } = await supabase.rpc('spend_game_credit');
    return !!data;
  }

  // Sla score op — game is 'breakout' | 'paratrooper'
  static async saveScore(
    userId: string,
    score: number,
    game: 'breakout' | 'paratrooper' = 'breakout'
  ): Promise<void> {
    await supabase.from('game_scores').insert({
      user_id: userId,
      score,
      game,
    });
  }

  // Haal leaderboard op per game
  static async getLeaderboard(
    limit: number = 10,
    game: 'breakout' | 'paratrooper' = 'breakout'
  ) {
    const { data: scores, error: scoresError } = await supabase
      .from('game_scores')
      .select('*')
      .eq('game', game)
      .order('score', { ascending: false })
      .limit(limit);

    if (scoresError || !scores) {
      console.log('Error fetching scores:', scoresError);
      return [];
    }

    const userIds = scores
      .map(s => s.user_id)
      .filter((v, i, a) => a.indexOf(v) === i);

    const { data: users } = await supabase
      .from('users')
      .select('id, naam')
      .in('id', userIds);

    return scores.map(score => ({
      ...score,
      user: users?.find(u => u.id === score.user_id),
    }));
  }
}
