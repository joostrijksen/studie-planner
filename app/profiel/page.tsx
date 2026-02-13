'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type UserProfile = {
  naam: string;
  rol: 'student' | 'ouder';
  avatar_url: string | null;
};

export default function ProfielPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  async function loadProfile() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('naam, rol, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setProfile((data as UserProfile) ?? null);
    } catch (e) {
      console.error('loadProfile error', e);
    } finally {
      setLoading(false);
    }
  }

  async function saveAvatar() {
    if (!file) return;

    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${user.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrlBase = publicData?.publicUrl || null;

      if (!publicUrlBase) throw new Error('Geen public url');

      const cacheBustedUrl = `${publicUrlBase}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: cacheBustedUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setFile(null);
      await loadProfile();
      alert('Profielfoto opgeslagen');
    } catch (e: any) {
      console.error('saveAvatar error', e);
      alert('Opslaan mislukt: ' + (e?.message ?? 'Onbekend'));
    } finally {
      setSaving(false);
    }
  }

  async function removeAvatar() {
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (error) throw error;

      await loadProfile();
      alert('Profielfoto verwijderd');
    } catch (e: any) {
      console.error('removeAvatar error', e);
      alert('Verwijderen mislukt: ' + (e?.message ?? 'Onbekend'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </button>
            <h1 className="text-xl font-bold">Profiel</h1>
            <div className="w-20" />
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.naam ?? 'User'} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-700">
                  {(profile?.naam?.[0] ?? '?').toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="text-lg font-semibold">{profile?.naam}</div>
              <div className="text-sm text-gray-600">{profile?.rol}</div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Nieuwe foto kiezen</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm"
            />
            <p className="text-xs text-gray-500 mt-2">Tip: een vierkante foto werkt het mooist.</p>
          </div>

          <div className="mt-6 flex gap-2">
            <button
              onClick={saveAvatar}
              disabled={!file || saving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>

            <button
              onClick={removeAvatar}
              disabled={saving}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              Verwijderen
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}