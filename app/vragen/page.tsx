'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type UserProfile = {
  naam: string
  rol: 'student' | 'ouder'
  avatar_url: string | null
}

type ChatUser = {
  naam: string
  rol: string
  avatar_url: string | null
} | null

type Vraag = {
  id: string
  vraag: string
  context: string | null
  status: 'open' | 'beantwoord' | 'opgelost'
  created_at: string
  user_id: string
  vak: { naam: string; kleur: string } | null
  asker: ChatUser
  antwoorden: Array<{
    id: string
    antwoord: string
    created_at: string
    user_id: string
    user: ChatUser
  }>
}

function initials(name?: string | null) {
  if (!name) return '?'
  return name.trim().charAt(0).toUpperCase() || '?'
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getStatusBadge(status: string) {
  const badges = {
    open: { text: 'Open', class: 'bg-orange-100 text-orange-700' },
    opgelost: { text: 'Opgelost', class: 'bg-green-100 text-green-700' },
    beantwoord: { text: 'Beantwoord', class: 'bg-blue-100 text-blue-700' },
  } as const

  const badge = badges[status as keyof typeof badges] || badges.open
  return <span className={`px-2 py-1 rounded text-xs font-medium ${badge.class}`}>{badge.text}</span>
}

export default function VragenOverzichtPage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authUserId, setAuthUserId] = useState<string | null>(null)

  const [vragenRaw, setVragenRaw] = useState<Vraag[]>([])
  const [filter, setFilter] = useState<'open' | 'beantwoord' | 'all'>('open')

  const [openThreadId, setOpenThreadId] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')

  useEffect(() => {
    init()
  }, [])

  async function init() {
    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) {
        router.push('/auth/login')
        return
      }
      setAuthUserId(user.id)

      const { data: me, error } = await supabase
        .from('users')
        .select('naam, rol, avatar_url')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setProfile(me as UserProfile)

    } catch (e) {
      console.error('Init error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) loadVragen()
  }, [profile])

  async function loadVragen() {
    try {
      // GEEN .eq('user_id') filter - RLS policy regelt toegang!
      const { data, error } = await supabase
        .from('vragen')
        .select(
          `
          id,
          vraag,
          context,
          status,
          created_at,
          user_id,
          vak:vakken(naam, kleur),
          asker:users!vragen_user_id_fkey(naam, rol, avatar_url),
          antwoorden(
            id,
            antwoord,
            created_at,
            user_id,
            user:users(naam, rol, avatar_url)
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) {
        console.error('loadVragen error:', error)
        throw error
      }

      const rows = (data || []) as any as Vraag[]

      // zorg dat antwoorden altijd op tijd staan
      const normalized = rows.map((v) => ({
        ...v,
        antwoorden: (v.antwoorden || []).slice().sort((a, b) => {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        }),
      }))

      setVragenRaw(normalized)
    } catch (e) {
      console.error('Load vragen error:', e)
    }
  }

  const vragen = useMemo(() => {
    if (filter === 'open') return vragenRaw.filter((v) => v.status === 'open')
    if (filter === 'beantwoord') return vragenRaw.filter((v) => v.status === 'opgelost')
    return vragenRaw
  }, [vragenRaw, filter])

  const openCount = useMemo(() => vragenRaw.filter((v) => v.status === 'open').length, [vragenRaw])

  async function sendMessage(vraagId: string) {
    const text = messageText.trim()
    if (!text) return

    try {
      const { data: auth } = await supabase.auth.getUser()
      const user = auth?.user
      if (!user) {
        router.push('/auth/login')
        return
      }

      // alleen bericht toevoegen, status blijft open
      const { error } = await supabase.from('antwoorden').insert({
        vraag_id: vraagId,
        user_id: user.id,
        antwoord: text,
      })

      if (error) throw error

      setMessageText('')
      await loadVragen()
      setOpenThreadId(vraagId)
    } catch (e: any) {
      console.error('Send message error:', e)
      alert('Fout bij versturen: ' + (e?.message ?? 'Onbekend'))
    }
  }

  async function markAsOpgelost(vraagId: string) {
    try {
      const { error } = await supabase.from('vragen').update({ status: 'opgelost' }).eq('id', vraagId)
      if (error) throw error
      await loadVragen()
      setOpenThreadId(null)
      setMessageText('')
    } catch (e) {
      console.error('Mark opgelost error:', e)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laden...</div>
  }

  const isOuder = profile?.rol === 'ouder'
  const myId = authUserId

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </button>

            <h1 className="text-xl font-bold">{isOuder ? '👨‍👩‍👦 Vragen' : '❓ Mijn vragen'}</h1>

            {!isOuder ? (
              <button
                onClick={() => router.push('/vragen/nieuw')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Vraag
              </button>
            ) : (
              <div className="w-20" />
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('open')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'open' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Open {openCount > 0 ? `(${openCount})` : ''}
          </button>

          <button
            onClick={() => setFilter('beantwoord')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'beantwoord' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Opgelost
          </button>

          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Alles
          </button>
        </div>

        {vragen.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <div className="text-6xl mb-4">{filter === 'open' ? '🎉' : '❓'}</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'open' ? 'Geen open vragen' : 'Geen vragen'}
            </h3>
            {!isOuder && filter === 'open' && (
              <button
                onClick={() => router.push('/vragen/nieuw')}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Eerste vraag stellen
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {vragen.map((v) => {
              const threadOpen = openThreadId === v.id
              const isSolved = v.status === 'opgelost'

              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                          {v.asker?.avatar_url ? (
                            <img src={v.asker.avatar_url} alt={v.asker?.naam ?? 'Leerling'} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-gray-700">{initials(v.asker?.naam)}</span>
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {v.vak && (
                              <span
                                className="px-2 py-1 text-xs font-medium rounded"
                                style={{ backgroundColor: v.vak.kleur + '20', color: v.vak.kleur }}
                              >
                                {v.vak.naam}
                              </span>
                            )}
                            {getStatusBadge(v.status)}
                            <span className="text-sm text-gray-500">{formatDateTime(v.created_at)}</span>
                          </div>

                          {v.context && <p className="text-sm text-gray-600 mb-2">📍 {v.context}</p>}
                          <p className="text-gray-900 font-medium">{v.vraag}</p>

                          <button
                            onClick={() => setOpenThreadId(threadOpen ? null : v.id)}
                            className="mt-3 text-sm text-blue-600 hover:text-blue-800"
                          >
                            {threadOpen ? 'Verberg gesprek' : `Bekijk gesprek (${v.antwoorden?.length ?? 0})`}
                          </button>
                        </div>
                      </div>

                      {/* Lars mag oplossen */}
                      {!isOuder && !isSolved && (
                        <button
                          onClick={() => markAsOpgelost(v.id)}
                          className="px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                          disabled={(v.antwoorden?.length ?? 0) === 0}
                          title={(v.antwoorden?.length ?? 0) === 0 ? 'Eerst een antwoord ontvangen' : 'Markeer als opgelost'}
                        >
                          ✓ Opgelost
                        </button>
                      )}
                    </div>

                    {threadOpen && (
                      <div className="mt-5 border-t pt-4">
                        <div className="space-y-3">
                          {/* originele vraag als bubble */}
                          <div className="flex justify-start">
                            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100">
                              <div className="text-xs text-gray-600 mb-1">
                                {v.asker?.naam ?? 'Leerling'} · {formatDateTime(v.created_at)}
                              </div>
                              <div className="text-gray-900">{v.vraag}</div>
                            </div>
                          </div>

                          {(v.antwoorden || []).map((a) => {
                            const mine = myId ? a.user_id === myId : false
                            return (
                              <div key={a.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? 'bg-blue-600 text-white' : 'bg-blue-50 text-gray-900'}`}>
                                  <div className={`text-xs mb-1 ${mine ? 'text-blue-100' : 'text-gray-600'}`}>
                                    {a.user?.naam ?? 'Onbekend'} · {formatDateTime(a.created_at)}
                                  </div>
                                  <div>{a.antwoord}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Composer: beide mogen reageren zolang status open is */}
                        {!isSolved && (
                          <div className="mt-4 flex gap-2">
                            <input
                              value={messageText}
                              onChange={(e) => setMessageText(e.target.value)}
                              placeholder={isOuder ? 'Typ je antwoord...' : 'Typ je reactie...'}
                              className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  sendMessage(v.id)
                                }
                              }}
                            />
                            <button
                              onClick={() => sendMessage(v.id)}
                              disabled={!messageText.trim()}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                            >
                              Verstuur
                            </button>
                          </div>
                        )}

                        {isSolved && (
                          <div className="mt-4 text-sm text-gray-600 bg-green-50 px-4 py-3 rounded-lg">
                            ✓ Deze vraag is opgelost. Je kunt hier niet meer op reageren.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
