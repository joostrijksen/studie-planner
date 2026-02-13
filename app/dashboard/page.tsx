'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserProfile = {
  naam: string;
  rol: 'student' | 'ouder';
  avatar_url: string | null;
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function checkUser() {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      setUser(user);

      // Haal user profiel op (incl avatar_url)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('naam, rol, avatar_url')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
      }

      setProfile((profile as UserProfile) ?? null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/auth/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Laden...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <h1 className="text-2xl font-bold text-gray-900">📚 Studie Planner</h1>
              <button
                onClick={() => router.push('/vakken')}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Vakken beheren
              </button>
            </div>

            {/* ✅ Avatar rechtsboven + naam + profiel wijzigen + uitloggen */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile?.naam ?? 'Profiel'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-gray-700">
                      {(profile?.naam?.[0] ?? '?').toUpperCase()}
                    </span>
                  )}
                </div>

                <span className="text-gray-700">
                  {profile?.naam} ({profile?.rol})
                </span>
              </div>

              <button
                onClick={() => router.push('/profiel')}
                className="px-4 py-2 text-sm bg-white border hover:bg-gray-50 rounded-lg transition-colors"
              >
                Profiel wijzigen
              </button>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              >
                Uitloggen
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welkom {profile?.naam}! 👋</h2>
          <p className="text-gray-600">
            {profile?.rol === 'student'
              ? 'Hier vind je jouw persoonlijke studieplanning.'
              : 'Hier kun je Lars helpen met zijn studieplanning.'}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-xl font-semibold mb-2">Toetsen</h3>
            <p className="text-gray-600 text-sm mb-4">
              {profile?.rol === 'student' ? 'Plan je toetsen en verdeel de leerstof' : 'Bekijk toetsen van Lars'}
            </p>
            {profile?.rol === 'student' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/toetsen')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  Overzicht
                </button>
                <button
                  onClick={() => router.push('/toetsen/nieuw')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                >
                  + Nieuw
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/toetsen')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                Toetsen bekijken
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-xl font-semibold mb-2">Huiswerk</h3>
            <p className="text-gray-600 text-sm mb-4">
              {profile?.rol === 'student' ? 'Voeg huiswerk toe aan de planning' : 'Bekijk huiswerk van Lars'}
            </p>
            {profile?.rol === 'student' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/huiswerk')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  Overzicht
                </button>
                <button
                  onClick={() => router.push('/huiswerk/nieuw')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                >
                  + Nieuw
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/huiswerk')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                Huiswerk bekijken
              </button>
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-xl font-semibold mb-2">Planning</h3>
            <p className="text-gray-600 text-sm mb-4">
              {profile?.rol === 'student' ? 'Bekijk je dagelijkse planning' : 'Bekijk planning van Lars'}
            </p>
            <button
              onClick={() => router.push('/planning')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
            >
              Planning bekijken
            </button>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200">
            <div className="text-4xl mb-3">❓</div>
            <h3 className="text-xl font-semibold mb-2">Vragen</h3>
            <p className="text-gray-600 text-sm mb-4">
              {profile?.rol === 'student' ? 'Stel vragen aan papa' : 'Beantwoord vragen van Lars'}
            </p>
            {profile?.rol === 'student' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => router.push('/vragen')}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
                >
                  Mijn vragen
                </button>
                <button
                  onClick={() => router.push('/vragen/nieuw')}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                >
                  + Nieuw
                </button>
              </div>
            ) : (
              <button
                onClick={() => router.push('/vragen')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors"
              >
                Vragen beantwoorden
              </button>
            )}
          </div>
        </div>

        {profile?.rol === 'ouder' && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">👨‍👩‍👦 Ouder Dashboard</h3>
            <OuderDashboardWidget />
          </div>
        )}
      </main>
    </div>
  );
}

// Ouder Dashboard Widget Component
function OuderDashboardWidget() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    openVragen: 0,
    aankomendToetsen: [] as any[],
    huiswerkVandaag: 0,
    planningVoortgang: 0,
  });

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadStats() {
    try {
      const vandaag = new Date().toISOString().split('T')[0];
      const overWeek = new Date();
      overWeek.setDate(overWeek.getDate() + 7);
      const overWeekString = overWeek.toISOString().split('T')[0];

      // Open vragen
      const { data: vragen, count: vragenCount } = await supabase
        .from('vragen')
        .select('*', { count: 'exact' })
        .eq('status', 'open');

      // Aankomende toetsen
      const { data: toetsen } = await supabase
        .from('toetsen')
        .select('id, datum, titel, vak:vakken(naam, kleur)')
        .gte('datum', vandaag)
        .lte('datum', overWeekString)
        .order('datum', { ascending: true })
        .limit(3);

      // Huiswerk vandaag
      const { data: huiswerk, count: huiswerkCount } = await supabase
        .from('huiswerk')
        .select('*', { count: 'exact' })
        .eq('deadline', vandaag)
        .eq('voltooid', false);

      // Planning voortgang
      const { data: planningVandaag } = await supabase.from('planning_items').select('voltooid').eq('datum', vandaag);

      const voortgang =
        planningVandaag && planningVandaag.length > 0
          ? Math.round((planningVandaag.filter((p: any) => p.voltooid).length / planningVandaag.length) * 100)
          : 0;

      setStats({
        openVragen: vragenCount || vragen?.length || 0,
        aankomendToetsen: toetsen || [],
        huiswerkVandaag: huiswerkCount || huiswerk?.length || 0,
        planningVoortgang: voortgang,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-blue-700 text-sm">Laden...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <button
        onClick={() => router.push('/vragen')}
        className="bg-white rounded-lg p-4 border border-blue-200 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">❓</span>
          <span className={`text-2xl font-bold ${stats.openVragen > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {stats.openVragen}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-700">Open vragen</p>
      </button>

      <button
        onClick={() => router.push('/toetsen')}
        className="bg-white rounded-lg p-4 border border-blue-200 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">📚</span>
          <span className="text-2xl font-bold text-blue-600">{stats.aankomendToetsen.length}</span>
        </div>
        <p className="text-sm font-medium text-gray-700">Toetsen deze week</p>
      </button>

      <button
        onClick={() => router.push('/huiswerk')}
        className="bg-white rounded-lg p-4 border border-blue-200 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">📝</span>
          <span className={`text-2xl font-bold ${stats.huiswerkVandaag > 0 ? 'text-orange-600' : 'text-green-600'}`}>
            {stats.huiswerkVandaag}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-700">Huiswerk vandaag</p>
      </button>

      <button
        onClick={() => router.push('/planning')}
        className="bg-white rounded-lg p-4 border border-blue-200 hover:bg-blue-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl">📊</span>
          <span className="text-2xl font-bold text-green-600">{stats.planningVoortgang}%</span>
        </div>
        <p className="text-sm font-medium text-gray-700">Voortgang vandaag</p>
      </button>
    </div>
  );
}