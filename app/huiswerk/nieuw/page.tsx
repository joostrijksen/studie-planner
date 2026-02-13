'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Vak = {
  id: string;
  naam: string;
  kleur: string;
};

export default function NieuwHuiswerkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [selectedVak, setSelectedVak] = useState('');
  const [beschrijving, setBeschrijving] = useState('');
  const [deadline, setDeadline] = useState('');
  const [type, setType] = useState<'maken' | 'leren' | 'voorbereiden'>('maken');
  const [geschatteTijd, setGeschatteTijd] = useState<number>(30);
  const [notities, setNotities] = useState('');

  useEffect(() => {
    loadVakken();
    // Stel standaard deadline in op morgen
    const morgen = new Date();
    morgen.setDate(morgen.getDate() + 1);
    setDeadline(morgen.toISOString().split('T')[0]);
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
    if (!selectedVak || !beschrijving || !deadline) {
      alert('Vul minimaal vak, beschrijving en deadline in');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Huiswerk opslaan
      const { data: huiswerk, error: huiswerkError } = await supabase
        .from('huiswerk')
        .insert({
          user_id: user.id,
          vak_id: selectedVak,
          beschrijving,
          deadline,
          type,
          geschatte_tijd: geschatteTijd,
          notities: notities || null,
        })
        .select()
        .single();

      if (huiswerkError) throw huiswerkError;

      // Voeg planning item toe voor de dag vóór de deadline (of vandaag als deadline morgen is)
      const deadlineDate = new Date(deadline);
      const planningDate = new Date(deadlineDate);
      const vandaag = new Date();
      vandaag.setHours(0, 0, 0, 0);
      
      // Als deadline morgen is, plan voor vandaag. Anders plan voor dag voor deadline.
      const dagenTotDeadline = Math.ceil((deadlineDate.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dagenTotDeadline <= 1) {
        // Deadline is vandaag of morgen -> plan voor vandaag
        planningDate.setTime(vandaag.getTime());
      } else {
        // Plan voor de dag voor de deadline
        planningDate.setDate(deadlineDate.getDate() - 1);
      }

      const { error: planningError } = await supabase
        .from('planning_items')
        .insert({
          user_id: user.id,
          huiswerk_id: huiswerk.id,
          datum: planningDate.toISOString().split('T')[0],
          type: 'leren',
          beschrijving: `${type === 'maken' ? 'Maak' : type === 'leren' ? 'Leer' : 'Bereid voor'}: ${beschrijving}`,
          geschatte_tijd: geschatteTijd,
        });

      if (planningError) {
        console.warn('Planning item creation failed:', planningError);
      }

      router.push('/huiswerk');
    } catch (error: any) {
      console.error('Error saving huiswerk:', error);
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
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Terug
            </button>
            <h1 className="text-xl font-bold">Nieuw Huiswerk</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="space-y-6">
            {/* Vak */}
            <div>
              <label className="block text-sm font-medium mb-2">Vak *</label>
              <select
                value={selectedVak}
                onChange={(e) => setSelectedVak(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Kies een vak</option>
                {vakken.map((vak) => (
                  <option key={vak.id} value={vak.id}>
                    {vak.naam}
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Type *</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setType('maken')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    type === 'maken'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">✍️</div>
                  <div className="font-semibold">Maken</div>
                  <div className="text-xs text-gray-600">Opgaven, opdracht</div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('leren')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    type === 'leren'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📚</div>
                  <div className="font-semibold">Leren</div>
                  <div className="text-xs text-gray-600">Woordjes, stof</div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('voorbereiden')}
                  className={`p-4 border-2 rounded-lg transition-colors ${
                    type === 'voorbereiden'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📋</div>
                  <div className="font-semibold">Voorbereiden</div>
                  <div className="text-xs text-gray-600">Presentatie, etc</div>
                </button>
              </div>
            </div>

            {/* Beschrijving */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Wat moet je doen? *
              </label>
              <textarea
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder="Bijv. Opgave 23-45 maken, Woordjes lijst 3 leren"
                rows={3}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-sm font-medium mb-2">Deadline *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Meestal de datum van de volgende les
              </p>
            </div>

            {/* Geschatte tijd */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Geschatte tijd (minuten)
              </label>
              <div className="flex gap-2">
                {[15, 30, 45, 60, 90].map((tijd) => (
                  <button
                    key={tijd}
                    type="button"
                    onClick={() => setGeschatteTijd(tijd)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      geschatteTijd === tijd
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {tijd} min
                  </button>
                ))}
              </div>
              <input
                type="number"
                value={geschatteTijd}
                onChange={(e) => setGeschatteTijd(parseInt(e.target.value) || 30)}
                min="5"
                max="240"
                className="w-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 mt-2"
              />
            </div>

            {/* Notities */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Notities (optioneel)
              </label>
              <textarea
                value={notities}
                onChange={(e) => setNotities(e.target.value)}
                placeholder="Extra aantekeningen..."
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Knoppen */}
          <div className="flex gap-4 mt-8">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedVak || !beschrijving || !deadline}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Huiswerk opslaan
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
