'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { PlanningService } from '@/lib/planning/service';

type PlanningItem = {
  id: string;
  datum: string;
  type: 'leren' | 'herhalen';
  beschrijving: string;
  geschatte_tijd: number;
  voltooid: boolean;
  toets?: {
    id: string;
    datum: string;
    titel: string | null;
    vak: {
      naam: string;
      kleur: string;
    };
  };
  huiswerk?: {
    id: string;
    beschrijving: string;
    deadline: string;
    type: string;
    vak: {
      naam: string;
      kleur: string;
    };
  };
};

export default function PlanningPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [planningItems, setPlanningItems] = useState<PlanningItem[]>([]);
  const [weekDays, setWeekDays] = useState<Date[]>([]);
  const [userName, setUserName] = useState('');
  const [weekPlanningData, setWeekPlanningData] = useState<Map<string, PlanningItem[]>>(new Map());
  const [initialized, setInitialized] = useState(false);

  // Lokale datum string — voorkomt UTC/tijdzone verschil (NL = UTC+1)
  function toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Eenmalige initialisatie: user laden → doorschuiven → planning laden
  useEffect(() => {
    async function init() {
      const today = new Date();
      const weeks = generateWeekDays();
      await loadUser();
      await checkAndMoveUncompletedItems(today);
      await loadPlanningForDate(today);
      await loadWeekPlanning(weeks);
      setLoading(false);
      setInitialized(true);
    }
    init();
  }, []);

  // Datum wijziging: herlaad bij datumwijziging én wanneer init klaar is
  useEffect(() => {
    if (!initialized) return;
    const dateSnapshot = new Date(selectedDate);
    async function refresh() {
      await checkAndMoveUncompletedItems(dateSnapshot);
      await loadPlanningForDate(dateSnapshot);
    }
    refresh();
  }, [selectedDate, initialized]);

  // Week wijziging: herlaad weekplanning
  useEffect(() => {
    if (weekDays.length > 0 && initialized) {
      loadWeekPlanning(weekDays);
    }
  }, [weekDays]);

  function generateWeekDays(): Date[] {
    const days: Date[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    setWeekDays(days);
    return days;
  }

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/login');
      return;
    }

    const { data: userData } = await supabase
      .from('users')
      .select('naam')
      .eq('id', user.id)
      .single();

    if (userData) {
      setUserName(userData.naam);
    }
  }

  async function checkAndMoveUncompletedItems(forDate: Date) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nu = new Date();
      const vandaag = new Date();
      vandaag.setHours(0, 0, 0, 0);
      const vandaagString = toLocalDateString(vandaag);

      const morgen = new Date(vandaag);
      morgen.setDate(morgen.getDate() + 1);
      const morgenString = toLocalDateString(morgen);

      const gisteren = new Date(vandaag);
      gisteren.setDate(gisteren.getDate() - 1);
      const gisterenString = toLocalDateString(gisteren);

      // Scenario 1: Na 22:00 → schuif onafgevinkte items van VANDAAG naar morgen
      if (nu.getHours() >= 22) {
        const { data: vandaagOnafgevinkt } = await supabase
          .from('planning_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('datum', vandaagString)
          .eq('voltooid', false);

        if (vandaagOnafgevinkt && vandaagOnafgevinkt.length > 0) {
          const { data: morgenItems } = await supabase
            .from('planning_items')
            .select('toets_onderdeel_id, huiswerk_id')
            .eq('user_id', user.id)
            .eq('datum', morgenString);

          const bestaandeMorgen = new Set(
            morgenItems
              ?.map(item => item.toets_onderdeel_id || item.huiswerk_id)
              .filter(Boolean) || []
          );

          const teKopierenNaarMorgen = vandaagOnafgevinkt.filter(item => {
            const key = item.toets_onderdeel_id || item.huiswerk_id;
            return !key || !bestaandeMorgen.has(key);
          });

          if (teKopierenNaarMorgen.length > 0) {
            const nieuweItemsMorgen = teKopierenNaarMorgen.map(item => ({
              user_id: item.user_id,
              toets_id: item.toets_id,
              toets_onderdeel_id: item.toets_onderdeel_id,
              huiswerk_id: item.huiswerk_id,
              datum: morgenString,
              type: item.type,
              beschrijving: `🔄 ${item.beschrijving.replace(/^🔄 /, '')}`,
              geschatte_tijd: item.geschatte_tijd,
              hoofdstuk_nummers: item.hoofdstuk_nummers,
              woorden_van: item.woorden_van,
              woorden_tot: item.woorden_tot,
              opgaven_van: item.opgaven_van,
              opgaven_tot: item.opgaven_tot,
              voltooid: false,
            }));

            await supabase.from('planning_items').insert(nieuweItemsMorgen);
          }
        }
      }

      // Scenario 2: Alle onafgevinkte items van VOOR vandaag → doorschuiven naar vandaag
      // (niet alleen gisteren, maar ook oudere dagen die gemist zijn)
      const { data: oudeOnafgevinkt } = await supabase
        .from('planning_items')
        .select('*')
        .eq('user_id', user.id)
        .lt('datum', vandaagString)   // alles vóór vandaag
        .eq('voltooid', false);

      if (!oudeOnafgevinkt || oudeOnafgevinkt.length === 0) return;

      const { data: vandaagBestaand } = await supabase
        .from('planning_items')
        .select('toets_onderdeel_id, huiswerk_id, beschrijving')
        .eq('user_id', user.id)
        .eq('datum', vandaagString);

      const bestaandeVandaag = new Set(
        vandaagBestaand
          ?.map(item => item.toets_onderdeel_id || item.huiswerk_id)
          .filter(Boolean) || []
      );

      // Voorkom ook duplicaten op basis van beschrijving (voor items zonder onderdeel_id)
      const bestaandeBeschrijvingen = new Set(
        vandaagBestaand?.map(item => item.beschrijving.replace(/^🔄 /, '')) || []
      );

      const teKopierenNaarVandaag = oudeOnafgevinkt.filter(item => {
        const key = item.toets_onderdeel_id || item.huiswerk_id;
        const beschrijving = item.beschrijving.replace(/^🔄 /, '');
        if (key) return !bestaandeVandaag.has(key);
        return !bestaandeBeschrijvingen.has(beschrijving);
      });

      if (teKopierenNaarVandaag.length === 0) return;

      const nieuweItemsVandaag = teKopierenNaarVandaag.map(item => ({
        user_id: item.user_id,
        toets_id: item.toets_id,
        toets_onderdeel_id: item.toets_onderdeel_id,
        huiswerk_id: item.huiswerk_id,
        datum: vandaagString,
        type: item.type,
        beschrijving: `🔄 ${item.beschrijving.replace(/^🔄 /, '')}`,
        geschatte_tijd: item.geschatte_tijd,
        hoofdstuk_nummers: item.hoofdstuk_nummers,
        woorden_van: item.woorden_van,
        woorden_tot: item.woorden_tot,
        opgaven_van: item.opgaven_van,
        opgaven_tot: item.opgaven_tot,
        voltooid: false,
      }));

      await supabase.from('planning_items').insert(nieuweItemsVandaag);
    } catch (error) {
      console.error('Error moving uncompleted items:', error);
    }
  }

  async function loadPlanningForDate(date: Date) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Gebruik altijd de meegegeven date, nooit selectedDate uit closure
      const datumString = toLocalDateString(new Date(date));

      const { data, error } = await supabase
        .from('planning_items')
        .select(`
          *,
          toets:toetsen(
            id,
            datum,
            titel,
            vak:vakken(naam, kleur)
          ),
          huiswerk:huiswerk(
            id,
            beschrijving,
            deadline,
            type,
            vak:vakken(naam, kleur)
          )
        `)
        .eq('user_id', user.id)
        .eq('datum', datumString)
        .order('geschatte_tijd', { ascending: false });

      if (error) {
        console.error('Error loading planning:', error);
        return;
      }

      setPlanningItems(data as any);
    } catch (error) {
      console.error('Error loading planning:', error);
    }
  }

  async function loadWeekPlanning(days: Date[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekData = new Map<string, PlanningItem[]>();

      for (const day of days) {
        const datumString = toLocalDateString(day);

        const { data, error } = await supabase
          .from('planning_items')
          .select(`
            *,
            toets:toetsen(
              id,
              datum,
              titel,
              vak:vakken(naam, kleur)
            ),
            huiswerk:huiswerk(
              id,
              beschrijving,
              deadline,
              type,
              vak:vakken(naam, kleur)
            )
          `)
          .eq('user_id', user.id)
          .eq('datum', datumString)
          .order('geschatte_tijd', { ascending: false });

        if (!error && data) {
          weekData.set(datumString, data as any);
        }
      }

      setWeekPlanningData(weekData);
    } catch (error) {
      console.error('Error loading week planning:', error);
    }
  }

  async function handleExportPDF() {
    if (weekDays.length === 0) return;

    try {
      const { generateWeekPlanningPDF } = await import('@/lib/pdf/weekplanning');
      await generateWeekPlanningPDF(weekDays[0], weekDays[6], weekPlanningData, userName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Fout bij genereren PDF. Probeer het opnieuw.');
    }
  }

  async function toggleItemCompleted(itemId: string, currentStatus: boolean) {
    try {
      if (currentStatus) {
        await PlanningService.markAsIncomplete(itemId);
      } else {
        await PlanningService.markAsCompleted(itemId);
      }
      await loadPlanningForDate(selectedDate);
    } catch (error) {
      console.error('Error toggling item:', error);
    }
  }

  function formatDate(date: Date): string {
    const days = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'];
    const months = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
    return `${days[date.getDay()]} ${date.getDate()} ${months[date.getMonth()]}`;
  }

  function isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  function getTotalTime(): number {
    return planningItems.reduce((sum, item) => sum + item.geschatte_tijd, 0);
  }

  function getCompletedTime(): number {
    return planningItems
      .filter(item => item.voltooid)
      .reduce((sum, item) => sum + item.geschatte_tijd, 0);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  const totalTime = getTotalTime();
  const completedTime = getCompletedTime();
  const progressPercentage = totalTime > 0 ? Math.round((completedTime / totalTime) * 100) : 0;

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
            <h1 className="text-xl font-bold">📅 Planning</h1>
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              📄 Export PDF
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => {
                const newWeek = weekDays.map(d => {
                  const nd = new Date(d);
                  nd.setDate(nd.getDate() - 7);
                  return nd;
                });
                setWeekDays(newWeek);
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 7);
                setSelectedDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ←
            </button>
            <h2 className="text-lg font-semibold">
              Week {weekDays[0] && formatDate(weekDays[0])} - {weekDays[6] && formatDate(weekDays[6])}
            </h2>
            <button
              onClick={() => {
                const newWeek = weekDays.map(d => {
                  const nd = new Date(d);
                  nd.setDate(nd.getDate() + 7);
                  return nd;
                });
                setWeekDays(newWeek);
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 7);
                setSelectedDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              →
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day, index) => {
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDate(new Date(day))}
                  className={`p-3 rounded-lg text-center transition-colors ${
                    selected
                      ? 'bg-blue-600 text-white'
                      : today
                      ? 'bg-blue-50 text-blue-600 border-2 border-blue-200'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {formatDate(day).split(' ')[0]}
                  </div>
                  <div className="text-xl font-bold">
                    {day.getDate()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">
              {isToday(selectedDate) ? 'Vandaag' : formatDate(selectedDate)}
            </h2>
            {planningItems.length > 0 && (
              <div className="text-sm text-gray-600">
                {completedTime} / {totalTime} min ({progressPercentage}%)
              </div>
            )}
          </div>

          {planningItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Niks te doen!</h3>
              <p className="text-gray-600">Je hebt geen taken voor deze dag.</p>
            </div>
          ) : (
            <>
              {totalTime > 0 && (
                <div className="mb-6">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {planningItems.map((item) => {
                  const vak = item.toets?.vak || item.huiswerk?.vak;
                  const isHuiswerk = !!item.huiswerk;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        item.voltooid
                          ? 'bg-green-50 border-green-200'
                          : 'bg-white border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <button
                          onClick={() => toggleItemCompleted(item.id, item.voltooid)}
                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
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

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {vak && (
                              <span
                                className="inline-block px-2 py-1 text-xs font-medium rounded"
                                style={{
                                  backgroundColor: vak.kleur + '20',
                                  color: vak.kleur,
                                }}
                              >
                                {vak.naam}
                              </span>
                            )}
                            {isHuiswerk ? (
                              <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-700">
                                📝 Huiswerk
                              </span>
                            ) : (
                              <span className={`text-xs px-2 py-1 rounded ${
                                item.type === 'leren'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-orange-100 text-orange-700'
                              }`}>
                                {item.type === 'leren' ? '📚 Leren' : '🔄 Herhalen'}
                              </span>
                            )}
                          </div>

                          <p className={`font-medium mb-1 ${
                            item.voltooid ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                            {item.beschrijving}
                          </p>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span>⏱️ {item.geschatte_tijd} min</span>
                            {item.toets && (
                              <span>
                                📅 Toets: {new Date(item.toets.datum).toLocaleDateString('nl-NL')}
                                {(() => {
                                  const toetsDatum = new Date(item.toets.datum);
                                  toetsDatum.setHours(0, 0, 0, 0);
                                  const vandaag = new Date();
                                  vandaag.setHours(0, 0, 0, 0);
                                  const dagenTot = Math.ceil((toetsDatum.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24));

                                  if (dagenTot === 0) return ' (vandaag!)';
                                  if (dagenTot === 1) return ' (morgen)';
                                  if (dagenTot > 1) return ` (nog ${dagenTot} dagen)`;
                                  return '';
                                })()}
                              </span>
                            )}
                            {item.huiswerk && (
                              <span>📅 Deadline: {new Date(item.huiswerk.deadline).toLocaleDateString('nl-NL')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {planningItems.length > 0 && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Vink taken af als je ze hebt gedaan</li>
              <li>• Neem pauzes tussen taken</li>
              <li>• Begin met de moeilijkste taken</li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
