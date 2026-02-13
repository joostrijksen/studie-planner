'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Huiswerk = {
  id: string;
  beschrijving: string;
  deadline: string;
  type: 'maken' | 'leren' | 'voorbereiden';
  geschatte_tijd: number;
  notities: string | null;
  voltooid: boolean;
  vak: {
    naam: string;
    kleur: string;
  };
};

export default function HuiswerkOverzichtPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [huiswerk, setHuiswerk] = useState<Huiswerk[]>([]);
  const [filter, setFilter] = useState<'todo' | 'voltooid' | 'all'>('todo');

  useEffect(() => {
    loadHuiswerk();
  }, [filter]);

  async function loadHuiswerk() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      let query = supabase
        .from('huiswerk')
        .select(`
          id,
          beschrijving,
          deadline,
          type,
          geschatte_tijd,
          notities,
          voltooid,
          vak:vakken(naam, kleur)
        `)
        .order('deadline', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      // Filter
      let filtered = data || [];
      if (filter === 'todo') {
        filtered = filtered.filter(h => !h.voltooid);
      } else if (filter === 'voltooid') {
        filtered = filtered.filter(h => h.voltooid);
      }

      setHuiswerk(filtered as any);
    } catch (error) {
      console.error('Error loading huiswerk:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVoltooid(id: string, currentStatus: boolean) {
    try {
      const { error } = await supabase
        .from('huiswerk')
        .update({
          voltooid: !currentStatus,
          voltooid_op: !currentStatus ? new Date().toISOString() : null,
        })
        .eq('id', id);

      if (error) throw error;

      // Reload
      await loadHuiswerk();
    } catch (error) {
      console.error('Error toggling huiswerk:', error);
    }
  }

  async function deleteHuiswerk(id: string) {
    if (!confirm('Weet je zeker dat je dit huiswerk wilt verwijderen?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('huiswerk')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await loadHuiswerk();
    } catch (error) {
      console.error('Error deleting huiswerk:', error);
      alert('Fout bij verwijderen');
    }
  }

  function getDaysUntil(deadline: string): number {
    const deadlineDate = new Date(deadline);
    const vandaag = new Date();
    vandaag.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diff = deadlineDate.getTime() - vandaag.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  function formatDeadline(deadline: string): string {
    const date = new Date(deadline);
    return date.toLocaleDateString('nl-NL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  function getTypeEmoji(type: string): string {
    const emojis: Record<string, string> = {
      maken: '✍️',
      leren: '📚',
      voorbereiden: '📋',
    };
    return emojis[type] || '📄';
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      maken: 'Maken',
      leren: 'Leren',
      voorbereiden: 'Voorbereiden',
    };
    return labels[type] || type;
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
            <h1 className="text-xl font-bold">📝 Huiswerk</h1>
            <button
              onClick={() => router.push('/huiswerk/nieuw')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Huiswerk
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('todo')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'todo'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Te doen
          </button>
          <button
            onClick={() => setFilter('voltooid')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'voltooid'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Voltooid
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Alles
          </button>
        </div>

        {/* Huiswerk lijst */}
        {huiswerk.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">
              {filter === 'todo' ? '🎉' : filter === 'voltooid' ? '✅' : '📝'}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'todo' ? 'Geen huiswerk te doen!' : 
               filter === 'voltooid' ? 'Nog geen huiswerk voltooid' : 'Nog geen huiswerk'}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'todo' ? 'Je bent helemaal bij' : 
               filter === 'voltooid' ? 'Voltooide taken verschijnen hier' : 'Begin met het toevoegen van huiswerk'}
            </p>
            {filter === 'todo' && (
              <button
                onClick={() => router.push('/huiswerk/nieuw')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Huiswerk toevoegen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {huiswerk.map((item) => {
              const daysUntil = getDaysUntil(item.deadline);
              const isPast = daysUntil < 0;
              const isVandaag = daysUntil === 0;
              const isMorgen = daysUntil === 1;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl shadow-sm border hover:shadow-md transition-all ${
                    item.voltooid ? 'opacity-60' : ''
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleVoltooid(item.id, item.voltooid)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-1 ${
                          item.voltooid
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {item.voltooid && (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <span
                            className="inline-block px-2 py-1 text-xs font-medium rounded"
                            style={{
                              backgroundColor: item.vak.kleur + '20',
                              color: item.vak.kleur,
                            }}
                          >
                            {item.vak.naam}
                          </span>

                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {getTypeEmoji(item.type)} {getTypeLabel(item.type)}
                          </span>

                          {isVandaag && !item.voltooid && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
                              🔥 Vandaag!
                            </span>
                          )}
                          {isMorgen && !item.voltooid && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                              Morgen
                            </span>
                          )}
                          {isPast && !item.voltooid && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                              ⚠️ Te laat!
                            </span>
                          )}
                        </div>

                        <p className={`font-medium mb-2 ${
                          item.voltooid ? 'line-through text-gray-500' : 'text-gray-900'
                        }`}>
                          {item.beschrijving}
                        </p>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>📅 {formatDeadline(item.deadline)}</span>
                          <span>⏱️ {item.geschatte_tijd} min</span>
                        </div>

                        {item.notities && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            {item.notities}
                          </p>
                        )}
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => deleteHuiswerk(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Verwijderen"
                      >
                        🗑️
                      </button>
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
