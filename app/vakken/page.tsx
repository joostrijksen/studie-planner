'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Vak = {
  id: string;
  naam: string;
  kleur: string;
};

const KLEUREN = [
  { naam: 'Rood', waarde: '#EF4444' },
  { naam: 'Oranje', waarde: '#F59E0B' },
  { naam: 'Geel', waarde: '#EAB308' },
  { naam: 'Groen', waarde: '#10B981' },
  { naam: 'Blauw', waarde: '#3B82F6' },
  { naam: 'Indigo', waarde: '#6366F1' },
  { naam: 'Paars', waarde: '#8B5CF6' },
  { naam: 'Roze', waarde: '#EC4899' },
  { naam: 'Turquoise', waarde: '#06B6D4' },
  { naam: 'Teal', waarde: '#14B8A6' },
];

export default function VakkenPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVak, setEditingVak] = useState<Vak | null>(null);
  const [nieuwVakNaam, setNieuwVakNaam] = useState('');
  const [nieuwVakKleur, setNieuwVakKleur] = useState(KLEUREN[0].waarde);

  useEffect(() => {
    loadVakken();
  }, []);

  async function loadVakken() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('vakken')
        .select('*')
        .eq('user_id', user.id)
        .order('naam');

      if (error) throw error;
      setVakken(data || []);
    } catch (error) {
      console.error('Error loading vakken:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!nieuwVakNaam.trim()) {
      alert('Vul een vaknaam in');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (editingVak) {
        // Update bestaand vak
        const { error } = await supabase
          .from('vakken')
          .update({
            naam: nieuwVakNaam.trim(),
            kleur: nieuwVakKleur,
          })
          .eq('id', editingVak.id);

        if (error) throw error;
      } else {
        // Nieuw vak
        const { error } = await supabase
          .from('vakken')
          .insert({
            user_id: user.id,
            naam: nieuwVakNaam.trim(),
            kleur: nieuwVakKleur,
          });

        if (error) throw error;
      }

      // Reset form
      setShowForm(false);
      setEditingVak(null);
      setNieuwVakNaam('');
      setNieuwVakKleur(KLEUREN[0].waarde);

      // Reload
      await loadVakken();
    } catch (error: any) {
      console.error('Error saving vak:', error);
      alert('Fout bij opslaan: ' + error.message);
    }
  }

  async function handleDelete(vakId: string) {
    if (!confirm('Weet je zeker dat je dit vak wilt verwijderen? Alle toetsen en huiswerk voor dit vak blijven bestaan.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('vakken')
        .delete()
        .eq('id', vakId);

      if (error) throw error;

      await loadVakken();
    } catch (error: any) {
      console.error('Error deleting vak:', error);
      alert('Fout bij verwijderen: ' + error.message);
    }
  }

  function startEdit(vak: Vak) {
    setEditingVak(vak);
    setNieuwVakNaam(vak.naam);
    setNieuwVakKleur(vak.kleur);
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditingVak(null);
    setNieuwVakNaam('');
    setNieuwVakKleur(KLEUREN[0].waarde);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold">📚 Vakken Beheren</h1>
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              + Vak
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">
              {editingVak ? 'Vak Bewerken' : 'Nieuw Vak Toevoegen'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Vaknaam *</label>
                <input
                  type="text"
                  value={nieuwVakNaam}
                  onChange={(e) => setNieuwVakNaam(e.target.value)}
                  placeholder="Bijv. Frans, Muziek, LO"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kleur *</label>
                <div className="grid grid-cols-5 gap-3">
                  {KLEUREN.map((kleur) => (
                    <button
                      key={kleur.waarde}
                      onClick={() => setNieuwVakKleur(kleur.waarde)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        nieuwVakKleur === kleur.waarde
                          ? 'border-gray-900 scale-110'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: kleur.waarde }}
                      title={kleur.naam}
                    >
                      {nieuwVakKleur === kleur.waarde && (
                        <span className="text-white text-xl">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelForm}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                disabled={!nieuwVakNaam.trim()}
                className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {editingVak ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        )}

        {/* Vakken lijst */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Mijn Vakken ({vakken.length})</h2>

          {vakken.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Nog geen vakken
              </h3>
              <p className="text-gray-600 mb-6">
                Voeg je eerste vak toe om te beginnen
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Eerste vak toevoegen
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {vakken.map((vak) => (
                <div
                  key={vak.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg"
                      style={{ backgroundColor: vak.kleur }}
                    />
                    <div>
                      <h3 className="font-semibold text-lg">{vak.naam}</h3>
                      <p className="text-sm text-gray-600">{vak.kleur}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(vak)}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      ✏️ Bewerken
                    </button>
                    <button
                      onClick={() => handleDelete(vak.id)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      🗑️ Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Kies duidelijke kleuren die je makkelijk uit elkaar kan houden</li>
            <li>• Je kan vakken altijd later nog bewerken</li>
            <li>• Verwijder alleen vakken die je echt niet meer gebruikt</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
