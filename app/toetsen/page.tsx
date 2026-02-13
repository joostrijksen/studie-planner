'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Toets = {
  id: string;
  datum: string;
  titel: string | null;
  vak: {
    naam: string;
    kleur: string;
  };
  onderdelen: Array<{
    type: string;
  }>;
  planning_stats?: {
    totaal: number;
    voltooid: number;
  };
};

export default function ToetsenOverzichtPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [toetsen, setToetsen] = useState<Toets[]>([]);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    loadToetsen();
  }, [filter]);

  async function loadToetsen() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let query = supabase
        .from('toetsen')
        .select(`
          id,
          datum,
          titel,
          vak:vakken(naam, kleur),
          onderdelen:toets_onderdelen(type)
        `)
        .order('datum', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Filter op basis van datum
      const vandaag = new Date();
      vandaag.setHours(0, 0, 0, 0);

      let filtered = data || [];
      if (filter === 'upcoming') {
        filtered = filtered.filter(t => new Date(t.datum) >= vandaag);
      } else if (filter === 'past') {
        filtered = filtered.filter(t => new Date(t.datum) < vandaag);
      }

      // Haal planning statistieken op
      for (const toets of filtered) {
        const { data: planningItems } = await supabase
          .from('planning_items')
          .select('voltooid')
          .eq('toets_id', toets.id);

        if (planningItems) {
          toets.planning_stats = {
            totaal: planningItems.length,
            voltooid: planningItems.filter(p => p.voltooid).length,
          };
        }
      }

      setToetsen(filtered as any);
    } catch (error) {
      console.error('Error loading toetsen:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteToets(toetsId: string) {
    if (!confirm('Weet je zeker dat je deze toets wilt verwijderen? Ook de planning wordt verwijderd.')) {
      return;
    }

    try {
      // Planning items worden automatisch verwijderd door cascade
      const { error } = await supabase
        .from('toetsen')
        .delete()
        .eq('id', toetsId);

      if (error) throw error;

      // Reload
      await loadToetsen();
    } catch (error) {
      console.error('Error deleting toets:', error);
      alert('Fout bij verwijderen');
    }
  }

  function getDaysUntil(datum: string): number {
    const toetsDatum = new Date(datum);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    toetsDatum.setHours(0, 0, 0, 0);
    
    const diff = toetsDatum.getTime() - vandaag.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function formatDatum(datum: string): string {
    const date = new Date(datum);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  function getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      hoofdstukken: '📚',
      woordjes: '📝',
      opgaven: '🔢',
      grammatica: '✏️',
      formules: '🧮',
      tekst: '📖',
    };
    return emojis[type] || '📄';
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold">📚 Toetsen</h1>
            <button
              onClick={() => router.push('/toetsen/nieuw')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Toets
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Aankomend
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Alle
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'past'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Geweest
          </button>
        </div>

        {/* Toetsen lijst */}
        {toetsen.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'upcoming' ? 'Geen aankomende toetsen' : 
               filter === 'past' ? 'Geen oude toetsen' : 'Nog geen toetsen'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'upcoming' ? 'Je hebt geen toetsen gepland' : 
               filter === 'past' ? 'Je hebt nog geen toetsen gehad' : 'Begin met het toevoegen van een toets'}
            </p>
            <button
              onClick={() => router.push('/toetsen/nieuw')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Eerste toets toevoegen
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {toetsen.map((toets) => {
              const daysUntil = getDaysUntil(toets.datum);
              const isPast = daysUntil < 0;
              const isToday = daysUntil === 0;
              const progressPercentage = toets.planning_stats?.totaal 
                ? Math.round((toets.planning_stats.voltooid / toets.planning_stats.totaal) * 100)
                : 0;

              return (
                <div
                  key={toets.id}
                  className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className="px-3 py-1 rounded-lg font-semibold text-sm"
                            style={{
                              backgroundColor: toets.vak.kleur + '20',
                              color: toets.vak.kleur,
                            }}
                          >
                            {toets.vak.naam}
                          </span>
                          {isPast && (
                            <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                              Geweest
                            </span>
                          )}
                          {isToday && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                              🔥 Vandaag!
                            </span>
                          )}
                          {!isPast && !isToday && daysUntil <= 3 && (
                            <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium">
                              Over {daysUntil} dag{daysUntil !== 1 ? 'en' : ''}
                            </span>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-gray-900 mb-1">
                          {toets.titel || 'Toets'}
                        </h3>

                        <p className="text-gray-600 mb-3">
                          📅 {formatDatum(toets.datum)}
                          {!isPast && !isToday && daysUntil > 3 && (
                            <span className="ml-2 text-sm">
                              (over {daysUntil} dagen)
                            </span>
                          )}
                        </p>

                        {/* Onderdelen */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {toets.onderdelen.map((onderdeel, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm"
                            >
                              {getTypeEmoji(onderdeel.type)} {onderdeel.type}
                            </span>
                          ))}
                        </div>

                        {/* Progress */}
                        {toets.planning_stats && toets.planning_stats.totaal > 0 && !isPast && (
                          <div>
                            <div className="flex items-center justify-between text-sm mb-2">
                              <span className="text-gray-600">Voortgang</span>
                              <span className="font-medium">
                                {toets.planning_stats.voltooid} / {toets.planning_stats.totaal} taken
                                ({progressPercentage}%)
                              </span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${progressPercentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => router.push(`/planning`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Planning bekijken"
                        >
                          📅
                        </button>
                        <button
                          onClick={() => deleteToets(toets.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Verwijderen"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
