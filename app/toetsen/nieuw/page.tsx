'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type Vak = {
  id: string;
  naam: string;
  kleur: string;
};

type ToetsOnderdeel = {
  type: 'hoofdstukken' | 'woordjes' | 'opgaven' | 'grammatica' | 'formules' | 'tekst';
  beschrijving?: string;
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
  // Tijdsinschatting
  geschatte_tijd?: number;
};

type DetailFormData = {
  // Hoofdstukken
  invoerType?: 'gedetailleerd' | 'simpel';
  hoofdstukkenLijst?: string; // Voor gedetailleerde invoer (1 per regel)
  aantalHoofdstukken?: number;
  // Woordjes
  aantalWoorden?: number;
  woordenlijstNummers?: string;
  // Opgaven
  opgavenVan?: number;
  opgavenTot?: number;
  opgavenParagraaf?: string;
  // Grammatica
  grammaticaOnderwerpen?: string;
  // Formules
  aantalFormules?: number;
  formuleParagrafen?: string;
  // Tekst
  aantalPaginas?: number;
  boekHoofdstukken?: string;
  // Algemeen
  geschatteTijd?: number;
};

export default function NieuweToetsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [vakken, setVakken] = useState<Vak[]>([]);
  const [selectedVak, setSelectedVak] = useState('');
  const [datum, setDatum] = useState('');
  const [titel, setTitel] = useState('');
  const [onderdelen, setOnderdelen] = useState<ToetsOnderdeel[]>([]);
  const [currentStep, setCurrentStep] = useState<'basis' | 'kies-type' | 'details'>('basis');
  const [selectedType, setSelectedType] = useState<ToetsOnderdeel['type'] | ''>('');
  const [detailForm, setDetailForm] = useState<DetailFormData>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

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

  function handleAddOnderdeel() {
    if (!selectedType) return;
    setCurrentStep('details');
  }

  function handleSaveOnderdeel() {
    if (!selectedType) return;

    const nieuwOnderdeel: ToetsOnderdeel = {
      type: selectedType,
    };

    // Verwerk data op basis van type
    switch (selectedType) {
      case 'hoofdstukken':
        if (detailForm.invoerType === 'gedetailleerd' && detailForm.hoofdstukkenLijst) {
          const hoofdstukken = detailForm.hoofdstukkenLijst
            .split('\n')
            .filter(h => h.trim())
            .map(h => ({ naam: h.trim() }));
          nieuwOnderdeel.hoofdstukken = hoofdstukken;
        } else if (detailForm.aantalHoofdstukken) {
          nieuwOnderdeel.aantal_hoofdstukken = detailForm.aantalHoofdstukken;
        }
        break;
      
      case 'woordjes':
        nieuwOnderdeel.aantal_woorden = detailForm.aantalWoorden;
        nieuwOnderdeel.woordenlijst_nummers = detailForm.woordenlijstNummers;
        break;
      
      case 'opgaven':
        nieuwOnderdeel.opgaven_van = detailForm.opgavenVan;
        nieuwOnderdeel.opgaven_tot = detailForm.opgavenTot;
        nieuwOnderdeel.paragraaf = detailForm.opgavenParagraaf;
        break;
      
      case 'grammatica':
        if (detailForm.grammaticaOnderwerpen) {
          const onderwerpen = detailForm.grammaticaOnderwerpen
            .split('\n')
            .filter(o => o.trim())
            .map(o => o.trim());
          nieuwOnderdeel.grammatica_onderwerpen = onderwerpen;
        }
        break;
      
      case 'formules':
        nieuwOnderdeel.aantal_formules = detailForm.aantalFormules;
        nieuwOnderdeel.formule_paragrafen = detailForm.formuleParagrafen;
        break;
      
      case 'tekst':
        nieuwOnderdeel.aantal_paginas = detailForm.aantalPaginas;
        nieuwOnderdeel.boek_hoofdstukken = detailForm.boekHoofdstukken;
        break;
    }

    nieuwOnderdeel.geschatte_tijd = detailForm.geschatteTijd;

    if (editingIndex !== null) {
      // Update bestaand onderdeel
      const updated = [...onderdelen];
      updated[editingIndex] = nieuwOnderdeel;
      setOnderdelen(updated);
      setEditingIndex(null);
    } else {
      // Nieuw onderdeel toevoegen
      setOnderdelen([...onderdelen, nieuwOnderdeel]);
    }

    // Reset formulier
    setSelectedType('');
    setDetailForm({});
    setCurrentStep('kies-type');
  }

  function handleCancelDetail() {
    setSelectedType('');
    setDetailForm({});
    setEditingIndex(null);
    setCurrentStep('kies-type');
  }

  function handleEditOnderdeel(index: number) {
    const onderdeel = onderdelen[index];
    setSelectedType(onderdeel.type);
    setEditingIndex(index);
    
    // Vul formulier met bestaande data
    const formData: DetailFormData = {};
    
    switch (onderdeel.type) {
      case 'hoofdstukken':
        if (onderdeel.hoofdstukken && onderdeel.hoofdstukken.length > 0) {
          formData.invoerType = 'gedetailleerd';
          formData.hoofdstukkenLijst = onderdeel.hoofdstukken.map(h => h.naam).join('\n');
        } else if (onderdeel.aantal_hoofdstukken) {
          formData.invoerType = 'simpel';
          formData.aantalHoofdstukken = onderdeel.aantal_hoofdstukken;
        }
        break;
      case 'woordjes':
        formData.aantalWoorden = onderdeel.aantal_woorden;
        formData.woordenlijstNummers = onderdeel.woordenlijst_nummers;
        break;
      case 'opgaven':
        formData.opgavenVan = onderdeel.opgaven_van;
        formData.opgavenTot = onderdeel.opgaven_tot;
        formData.opgavenParagraaf = onderdeel.paragraaf;
        break;
      case 'grammatica':
        if (onderdeel.grammatica_onderwerpen) {
          formData.grammaticaOnderwerpen = onderdeel.grammatica_onderwerpen.join('\n');
        }
        break;
      case 'formules':
        formData.aantalFormules = onderdeel.aantal_formules;
        formData.formuleParagrafen = onderdeel.formule_paragrafen;
        break;
      case 'tekst':
        formData.aantalPaginas = onderdeel.aantal_paginas;
        formData.boekHoofdstukken = onderdeel.boek_hoofdstukken;
        break;
    }
    
    formData.geschatteTijd = onderdeel.geschatte_tijd;
    setDetailForm(formData);
    setCurrentStep('details');
  }

  async function handleSave() {
    if (!selectedVak || !datum) {
      alert('Vul vak en datum in');
      return;
    }

    if (onderdelen.length === 0) {
      alert('Voeg minimaal 1 onderdeel toe');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Toets opslaan
      const { data: toets, error: toetsError } = await supabase
        .from('toetsen')
        .insert({
          user_id: user.id,
          vak_id: selectedVak,
          datum,
          titel: titel || null,
        })
        .select()
        .single();

      if (toetsError) throw toetsError;

      // Onderdelen opslaan
      const onderdelenData = onderdelen.map(od => ({
        toets_id: toets.id,
        type: od.type,
        beschrijving: od.beschrijving,
        hoofdstukken: od.hoofdstukken ? JSON.stringify(od.hoofdstukken) : null,
        aantal_hoofdstukken: od.aantal_hoofdstukken,
        aantal_woorden: od.aantal_woorden,
        woordenlijst_nummers: od.woordenlijst_nummers,
        opgaven_van: od.opgaven_van,
        opgaven_tot: od.opgaven_tot,
        paragraaf: od.paragraaf,
        grammatica_onderwerpen: od.grammatica_onderwerpen ? JSON.stringify(od.grammatica_onderwerpen) : null,
        aantal_formules: od.aantal_formules,
        formule_paragrafen: od.formule_paragrafen,
        aantal_paginas: od.aantal_paginas,
        boek_hoofdstukken: od.boek_hoofdstukken,
        geschatte_tijd: od.geschatte_tijd,
      }));

      const { error: onderdelenError } = await supabase
        .from('toets_onderdelen')
        .insert(onderdelenData);

      if (onderdelenError) throw onderdelenError;

      // Genereer planning automatisch
      const { PlanningService } = await import('@/lib/planning/service');
      const planningGenerated = await PlanningService.generateAndSavePlanning(toets.id, user.id);

      if (!planningGenerated) {
        console.warn('Planning generation failed, but toets was saved');
      }

      router.push('/planning');
    } catch (error: any) {
      console.error('Error saving toets:', error);
      alert('Fout bij opslaan: ' + error.message);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  // Render detail formulier op basis van type
  function renderDetailForm() {
    if (!selectedType) return null;

    const typeLabels = {
      hoofdstukken: 'Hoofdstukken / Paragrafen',
      woordjes: 'Woordenlijst',
      opgaven: 'Opgaven / Oefeningen',
      grammatica: 'Grammatica / Regels',
      formules: 'Formules / Definities',
      tekst: 'Tekst / Literatuur',
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{typeLabels[selectedType]}</h2>
          <button
            onClick={handleCancelDetail}
            className="text-gray-600 hover:text-gray-900"
          >
            ✕
          </button>
        </div>

        {selectedType === 'hoofdstukken' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Hoe wil je invoeren?</label>
              <div className="flex gap-4">
                <button
                  onClick={() => setDetailForm({ ...detailForm, invoerType: 'gedetailleerd' })}
                  className={`flex-1 p-4 border-2 rounded-lg ${
                    detailForm.invoerType === 'gedetailleerd'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Gedetailleerd</div>
                  <div className="text-sm text-gray-600">Lijst van hoofdstukken</div>
                </button>
                <button
                  onClick={() => setDetailForm({ ...detailForm, invoerType: 'simpel' })}
                  className={`flex-1 p-4 border-2 rounded-lg ${
                    detailForm.invoerType === 'simpel'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300'
                  }`}
                >
                  <div className="font-semibold">Snel</div>
                  <div className="text-sm text-gray-600">Aantal hoofdstukken</div>
                </button>
              </div>
            </div>

            {detailForm.invoerType === 'gedetailleerd' && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Hoofdstukken (1 per regel)
                </label>
                <textarea
                  value={detailForm.hoofdstukkenLijst || ''}
                  onChange={(e) => setDetailForm({ ...detailForm, hoofdstukkenLijst: e.target.value })}
                  placeholder="Hoofdstuk 1: De Koude Oorlog&#10;Hoofdstuk 2: Dekolonisatie&#10;Hoofdstuk 3: Europa na 1945"
                  rows={6}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {detailForm.invoerType === 'simpel' && (
              <div>
                <label className="block text-sm font-medium mb-2">Aantal hoofdstukken</label>
                <input
                  type="number"
                  value={detailForm.aantalHoofdstukken || ''}
                  onChange={(e) => setDetailForm({ ...detailForm, aantalHoofdstukken: parseInt(e.target.value) })}
                  min="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        )}

        {selectedType === 'woordjes' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Aantal woorden</label>
              <input
                type="number"
                value={detailForm.aantalWoorden || ''}
                onChange={(e) => setDetailForm({ ...detailForm, aantalWoorden: parseInt(e.target.value) })}
                min="1"
                placeholder="Bijv. 150"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Woordenlijst nummers (optioneel)
              </label>
              <input
                type="text"
                value={detailForm.woordenlijstNummers || ''}
                onChange={(e) => setDetailForm({ ...detailForm, woordenlijstNummers: e.target.value })}
                placeholder="Bijv. Lijst 1 t/m 5"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {selectedType === 'opgaven' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Van opgave</label>
                <input
                  type="number"
                  value={detailForm.opgavenVan || ''}
                  onChange={(e) => setDetailForm({ ...detailForm, opgavenVan: parseInt(e.target.value) })}
                  min="1"
                  placeholder="1"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tot opgave</label>
                <input
                  type="number"
                  value={detailForm.opgavenTot || ''}
                  onChange={(e) => setDetailForm({ ...detailForm, opgavenTot: parseInt(e.target.value) })}
                  min="1"
                  placeholder="45"
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Paragraaf (optioneel)
              </label>
              <input
                type="text"
                value={detailForm.opgavenParagraaf || ''}
                onChange={(e) => setDetailForm({ ...detailForm, opgavenParagraaf: e.target.value })}
                placeholder="Bijv. Paragraaf 2.3"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {selectedType === 'grammatica' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Grammatica onderwerpen (1 per regel)
              </label>
              <textarea
                value={detailForm.grammaticaOnderwerpen || ''}
                onChange={(e) => setDetailForm({ ...detailForm, grammaticaOnderwerpen: e.target.value })}
                placeholder="Present perfect&#10;Past simple&#10;Conditionals"
                rows={6}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {selectedType === 'formules' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Aantal formules</label>
              <input
                type="number"
                value={detailForm.aantalFormules || ''}
                onChange={(e) => setDetailForm({ ...detailForm, aantalFormules: parseInt(e.target.value) })}
                min="1"
                placeholder="Bijv. 12"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Paragrafen (optioneel)
              </label>
              <input
                type="text"
                value={detailForm.formuleParagrafen || ''}
                onChange={(e) => setDetailForm({ ...detailForm, formuleParagrafen: e.target.value })}
                placeholder="Bijv. Paragraaf 3.1 t/m 3.4"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {selectedType === 'tekst' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Aantal pagina's</label>
              <input
                type="number"
                value={detailForm.aantalPaginas || ''}
                onChange={(e) => setDetailForm({ ...detailForm, aantalPaginas: parseInt(e.target.value) })}
                min="1"
                placeholder="Bijv. 45"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Hoofdstukken / Pagina's (optioneel)
              </label>
              <input
                type="text"
                value={detailForm.boekHoofdstukken || ''}
                onChange={(e) => setDetailForm({ ...detailForm, boekHoofdstukken: e.target.value })}
                placeholder="Bijv. Hoofdstuk 3-5 of pagina 45-92"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">
            Geschatte tijd (minuten, optioneel)
          </label>
          <input
            type="number"
            value={detailForm.geschatteTijd || ''}
            onChange={(e) => setDetailForm({ ...detailForm, geschatteTijd: parseInt(e.target.value) })}
            min="1"
            placeholder="Bijv. 60"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={handleCancelDetail}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            onClick={handleSaveOnderdeel}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {editingIndex !== null ? 'Bijwerken' : 'Toevoegen'}
          </button>
        </div>
      </div>
    );
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
            <h1 className="text-xl font-bold">Nieuwe Toets</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'basis' ? 'bg-blue-600 text-white' : 'bg-green-500 text-white'
            }`}>
              1
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'kies-type' ? 'bg-blue-600 text-white' : 
              currentStep === 'details' ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              2
            </div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              currentStep === 'details' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
            }`}>
              3
            </div>
          </div>
          <div className="flex items-center justify-center gap-8 mt-2 text-sm">
            <span className={currentStep === 'basis' ? 'font-semibold' : 'text-gray-600'}>Basis info</span>
            <span className={currentStep === 'kies-type' ? 'font-semibold' : 'text-gray-600'}>Type kiezen</span>
            <span className={currentStep === 'details' ? 'font-semibold' : 'text-gray-600'}>Details</span>
          </div>
        </div>

        {/* Stap 1: Basis informatie */}
        {currentStep === 'basis' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-6">Toets informatie</h2>

              <div className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium mb-2">Datum toets *</label>
                  <input
                    type="date"
                    value={datum}
                    onChange={(e) => setDatum(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Titel (optioneel)
                  </label>
                  <input
                    type="text"
                    value={titel}
                    onChange={(e) => setTitel(e.target.value)}
                    placeholder="Bijv. Hoofdstuk 3 toets"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuleren
              </button>
              <button
                onClick={() => setCurrentStep('kies-type')}
                disabled={!selectedVak || !datum}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Volgende: Leerstof toevoegen
              </button>
            </div>
          </>
        )}

        {/* Stap 2: Type kiezen */}
        {currentStep === 'kies-type' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <h2 className="text-2xl font-bold mb-4">Wat moet je leren?</h2>
              <p className="text-gray-600 mb-6">Kies het type leerstof en voeg details toe</p>

              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => {
                    setSelectedType('hoofdstukken');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📚</div>
                  <div className="font-semibold">Hoofdstukken / Paragrafen</div>
                  <div className="text-sm text-gray-600">Geschiedenis, biologie, etc.</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedType('woordjes');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📝</div>
                  <div className="font-semibold">Woordenlijst</div>
                  <div className="text-sm text-gray-600">Engels, Frans, Duits</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedType('opgaven');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">🔢</div>
                  <div className="font-semibold">Opgaven / Oefeningen</div>
                  <div className="text-sm text-gray-600">Wiskunde, natuurkunde</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedType('grammatica');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">✏️</div>
                  <div className="font-semibold">Grammatica / Regels</div>
                  <div className="text-sm text-gray-600">Talen, Nederlands</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedType('formules');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">🧮</div>
                  <div className="font-semibold">Formules / Definities</div>
                  <div className="text-sm text-gray-600">Scheikunde, natuurkunde</div>
                </button>

                <button
                  onClick={() => {
                    setSelectedType('tekst');
                    setDetailForm({});
                    setCurrentStep('details');
                  }}
                  className="p-4 border-2 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <div className="text-2xl mb-2">📖</div>
                  <div className="font-semibold">Tekst / Literatuur</div>
                  <div className="text-sm text-gray-600">Nederlands, literatuur</div>
                </button>
              </div>
            </div>

            {/* Toegevoegde onderdelen */}
            {onderdelen.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Toegevoegde onderdelen ({onderdelen.length})</h3>
                <div className="space-y-3">
                  {onderdelen.map((od, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium capitalize">{od.type.replace('_', ' ')}</span>
                        {od.type === 'hoofdstukken' && od.aantal_hoofdstukken && (
                          <span className="text-gray-600 ml-2">({od.aantal_hoofdstukken} hoofdstukken)</span>
                        )}
                        {od.type === 'woordjes' && od.aantal_woorden && (
                          <span className="text-gray-600 ml-2">({od.aantal_woorden} woorden)</span>
                        )}
                        {od.type === 'opgaven' && od.opgaven_van && od.opgaven_tot && (
                          <span className="text-gray-600 ml-2">(Opgave {od.opgaven_van}-{od.opgaven_tot})</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditOnderdeel(index)}
                          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Bewerken
                        </button>
                        <button
                          onClick={() => setOnderdelen(onderdelen.filter((_, i) => i !== index))}
                          className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                        >
                          Verwijder
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => setCurrentStep('basis')}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ← Vorige
              </button>
              <button
                onClick={handleSave}
                disabled={onderdelen.length === 0}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Toets opslaan
              </button>
            </div>
          </>
        )}

        {/* Stap 3: Details invullen */}
        {currentStep === 'details' && renderDetailForm()}
      </main>
    </div>
  );
}
