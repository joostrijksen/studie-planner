'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Vak = {
  id: string;
  naam: string;
  kleur: string;
};

export default function NieuweVraagPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [selectedVak, setSelectedVak] = useState('');
  const [vraag, setVraag] = useState('');
  const [context, setContext] = useState('');

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

  async function handleSubmit() {
    if (!vraag.trim()) {
      alert('Vul een vraag in');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('vragen')
        .insert({
          user_id: user.id,
          vak_id: selectedVak || null,
          vraag: vraag.trim(),
          context: context.trim() || null,
          status: 'open',
        });

      if (error) throw error;

      router.push('/vragen');
    } catch (error: any) {
      console.error('Error saving vraag:', error);
      alert('Fout bij opslaan: ' + error.message);
    }
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
              onClick={() => router.push('/vragen')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Terug
            </button>
            <h1 className="text-xl font-bold">Nieuwe Vraag</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-6">
            {/* Vak (optioneel) */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Vak (optioneel)
              </label>
              <select
                value={selectedVak}
                onChange={(e) => setSelectedVak(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Algemeen / geen specifiek vak</option>
                {vakken.map((vak) => (
                  <option key={vak.id} value={vak.id}>
                    {vak.naam}
                  </option>
                ))}
              </select>
            </div>

            {/* Context */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Waar gaat het over? (optioneel)
              </label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Bijv. Hoofdstuk 3, opgave 12"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-600 mt-1">
                Helpt je ouders om je vraag beter te begrijpen
              </p>
            </div>

            {/* Vraag */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Je vraag *
              </label>
              <textarea
                value={vraag}
                onChange={(e) => setVraag(e.target.value)}
                placeholder="Wat wil je weten? Wees zo specifiek mogelijk..."
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Info box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">💡 Tips voor goede vragen:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Wees specifiek over wat je niet begrijpt</li>
                <li>• Geef aan wat je al hebt geprobeerd</li>
                <li>• Vermeld relevante opgave nummers of pagina's</li>
                <li>• Een goede vraag helpt je ouders je beter te helpen!</li>
              </ul>
            </div>
          </div>

          {/* Knoppen */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push('/vragen')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleSubmit}
              disabled={!vraag.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Vraag versturen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
