'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type MemeItem = {
  id: string;
  content: string | null;
  like_count: number | null;
  image_url?: string | null;
};

type FlavorItem = {
  id: number;
  slug: string | null;
  description: string | null;
};

type PileKey = 'myMemes' | 'myFlavors';

const PILE_CONFIG: Record<PileKey, {
  label: string; icon: string;
  cardBg: string; border: string; accent: string; countColor: string;
}> = {
  myMemes:   { label: 'My Memes',   icon: '🖼️', cardBg: 'bg-white dark:bg-zinc-950', border: 'border-emerald-200 dark:border-emerald-800', accent: 'text-emerald-600 dark:text-emerald-400', countColor: 'bg-emerald-600' },
  myFlavors: { label: 'My Flavors', icon: '🎭', cardBg: 'bg-white dark:bg-zinc-950', border: 'border-violet-200 dark:border-violet-800',  accent: 'text-violet-600 dark:text-violet-400',   countColor: 'bg-violet-600' },
};

// ── Meme modal (view-only) ────────────────────────────────────
function MemeModal({ item, onClose }: { item: MemeItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden bg-white dark:bg-zinc-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {item.image_url && (
          <img src={item.image_url} alt="" className="w-full max-h-96 object-cover" />
        )}
        <div className="p-6">
          <p className="text-lg font-semibold italic text-zinc-900 dark:text-zinc-100 leading-snug">
            "{item.content || '—'}"
          </p>
          {item.like_count != null && (
            <p className="mt-2 text-sm text-zinc-400 font-mono">
              {item.like_count > 0 ? '+' : ''}{item.like_count} likes
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white text-sm flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ── Cards ─────────────────────────────────────────────────────
function MemeCard({ item, onClick, onDelete }: { item: MemeItem; onClick: () => void; onDelete?: () => void }) {
  return (
    <div className="group relative cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150">
      <div onClick={onClick}>
        {item.image_url ? (
          <img src={item.image_url} alt="" className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">🖼️</div>
        )}
        <div className="p-2">
          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2 italic">
            "{item.content || '—'}"
          </p>
          {item.like_count != null && (
            <p className="mt-1 text-[10px] text-zinc-400 font-mono">{item.like_count > 0 ? '+' : ''}{item.like_count}</p>
          )}
        </div>
      </div>
      {onDelete && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all"
          title="Delete"
        >
          ×
        </button>
      )}
    </div>
  );
}

function FlavorCard({ item }: { item: FlavorItem }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-sm">
      <p className="text-xs font-bold text-violet-600 dark:text-violet-400 mb-1">{item.slug || `Flavor #${item.id}`}</p>
      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-3">{item.description || '—'}</p>
    </div>
  );
}

// ── PileCard (trigger only, no expanded content) ──────────────
function PileCard({
  pileKey, items, loading, isOpen, onToggle, countOverride,
}: {
  pileKey: PileKey;
  items: MemeItem[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
  countOverride?: number;
}) {
  const cfg = PILE_CONFIG[pileKey];
  const count = countOverride ?? items.length;
  const topImage = items[0]?.image_url;

  return (
    <button onClick={onToggle} className="w-full text-left group focus:outline-none">
      <div className={`relative rounded-2xl border-2 ${cfg.border} ${cfg.cardBg} overflow-hidden shadow-sm group-hover:shadow-md group-hover:-translate-y-0.5 transition-all duration-200 ${isOpen ? 'shadow-md' : ''}`}>
        {topImage && (
          <img src={topImage} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15 dark:opacity-10" />
        )}
        <div className="relative p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xl">{cfg.icon}</span>
            {loading ? (
              <span className="text-[9px] font-mono text-zinc-400 animate-pulse">…</span>
            ) : (
              <span className={`${cfg.countColor} text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none`}>
                {count}
              </span>
            )}
          </div>
          <div>
            <p className={`text-xs font-black ${cfg.accent} leading-tight`}>{cfg.label}</p>
            <p className="text-[9px] text-zinc-400 mt-0.5 leading-tight">
              {loading ? '—' : count === 0 ? 'Nothing yet' : isOpen ? 'tap to close' : 'tap to view'}
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function MainPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);

  const [myMemes, setMyMemes] = useState<MemeItem[]>([]);
  const [myFlavors, setMyFlavors] = useState<FlavorItem[]>([]);

  const [openPile, setOpenPile] = useState<PileKey | null>(null);
  const [modalMeme, setModalMeme] = useState<MemeItem | null>(null);
  const [topMemeUrl, setTopMemeUrl] = useState<string | null>(null);

  const router = useRouter();
  const supabase = useMemo(
    () => createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    []
  );

  useEffect(() => {
    async function loadSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserEmail(session.user.email || 'User');
      setUserId(session.user.id);
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, is_matrix_admin')
        .eq('id', session.user.id)
        .single();
      if (profile?.is_superadmin || profile?.is_matrix_admin) setIsSuperAdmin(true);
      setPageLoading(false);
    }
    loadSession();
  }, [supabase, router]);

  useEffect(() => {
    fetch('/api/top-images')
      .then(r => r.json())
      .then(d => { if (d[0]?.url) setTopMemeUrl(d[0].url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    setDataLoading(true);
    fetch(`/api/user-center?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        setMyMemes(d.myMemes ?? []);
        setMyFlavors(d.myFlavors ?? []);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [userId]);

  if (pageLoading) {
    return <div className="min-h-screen p-10 text-center font-mono text-zinc-300">LOADING...</div>;
  }

  const pileItems: Record<PileKey, MemeItem[]> = {
    myMemes, myFlavors: [],
  };

  function togglePile(key: PileKey) {
    setOpenPile(prev => prev === key ? null : key);
  }

  function openModal(item: MemeItem) {
    setModalMeme(item);
  }

  async function handleDeleteMeme(item: MemeItem) {
    if (!userId || !window.confirm('Delete this meme permanently?')) return;
    try {
      await supabase.from('captions').delete()
        .eq('id', item.id).eq('profile_id', userId);
      setMyMemes(prev => prev.filter(m => m.id !== item.id));
    } catch (err: any) { alert(`Failed: ${err.message}`); }
  }

  const expandedMemes = openPile && openPile !== 'myFlavors' ? pileItems[openPile] : null;
  const expandedFlavors = openPile === 'myFlavors' ? myFlavors : null;

  return (
    <div className="min-h-screen bg-background py-10">

      {/* Narrow sections */}
      <div className="px-6 mx-auto max-w-3xl">

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100">Welcome back</h1>
          <p className="mt-1 text-sm italic text-zinc-500 dark:text-zinc-400 break-words">{userEmail}</p>
        </div>

        {/* Pile row */}
        <section className="mb-1">
          <h2 className="mb-3 text-xs font-black text-zinc-400 uppercase tracking-widest">Your Collection</h2>
          <div className={`grid gap-3 ${isSuperAdmin ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {(['myMemes', ...(isSuperAdmin ? ['myFlavors'] : [])] as PileKey[]).map(key => (
              <PileCard
                key={key}
                pileKey={key}
                items={pileItems[key]}
                loading={dataLoading}
                isOpen={openPile === key}
                onToggle={() => togglePile(key)}
                countOverride={key === 'myFlavors' ? myFlavors.length : undefined}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Expanded pile content */}
      {openPile && !dataLoading && (
        <div className="px-6 py-4 mt-2 border-y border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-900/40">
          <div className="mx-auto max-w-4xl">
          {expandedMemes && expandedMemes.length === 0 && (
            <p className="text-center text-sm text-zinc-400 py-4">Nothing here yet</p>
          )}
          {expandedMemes && expandedMemes.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3">
              {expandedMemes.map(m => (
                <MemeCard
                  key={m.id}
                  item={m}
                  onClick={() => openModal(m)}
                  onDelete={openPile === 'myMemes' ? () => handleDeleteMeme(m) : undefined}
                />
              ))}
            </div>
          )}
          {expandedFlavors && expandedFlavors.length === 0 && (
            <p className="text-center text-sm text-zinc-400 py-4">Nothing here yet</p>
          )}
          {expandedFlavors && expandedFlavors.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {expandedFlavors.map(f => <FlavorCard key={f.id} item={f} />)}
            </div>
          )}
          </div>
        </div>
      )}

      {/* Nav buttons */}
      <div className="px-6 mx-auto max-w-3xl mt-8">
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Meme Board — live top-meme photo background */}
          <Link href="/main"
            className="group relative overflow-hidden rounded-[2.5rem] bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-2xl">
            {topMemeUrl && (
              <img
                src={topMemeUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity duration-300 select-none pointer-events-none"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-700/80 via-blue-600/70 to-blue-500/60 pointer-events-none" />
            <div className="relative p-12">
              <div className="mb-5 text-7xl group-hover:scale-110 transition-transform duration-200">🖼️</div>
              <div className="text-4xl font-black text-white mb-2 tracking-tight">Meme Board</div>
              <div className="text-base text-white/85 leading-relaxed">Browse, vote, and discover memes</div>
            </div>
          </Link>

          {/* Meme Lab — 3-step process as background decoration */}
          <Link href="/upload"
            className="group relative overflow-hidden rounded-[2.5rem] bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] transition-all shadow-2xl">
            {/* Decorative 3-step watermark */}
            <div className="absolute inset-0 flex flex-col justify-center gap-5 px-8 py-6 pointer-events-none select-none">
              {([['🖼️', 'Pick or upload', 'Browse gallery or upload your own'],
                 ['🎭', 'Choose a flavor', "Sets the AI's personality"],
                 ['✨', 'AI writes caption', 'Generates your meme text'],
              ] as const).map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3 opacity-20">
                  <span className="text-3xl leading-none mt-0.5">{icon}</span>
                  <div>
                    <p className="text-sm font-black text-white leading-tight">{title}</p>
                    <p className="text-xs text-white/80 leading-tight mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="relative p-12">
              <div className="mb-5 text-7xl group-hover:scale-110 transition-transform duration-200">🧪</div>
              <div className="text-4xl font-black text-white mb-2 tracking-tight">Meme Lab</div>
              <div className="text-base text-white/85 leading-relaxed">Upload an image and generate AI captions</div>
            </div>
          </Link>
        </section>
      </div>

      {/* Meme modal */}
      {modalMeme && (
        <MemeModal
          item={modalMeme}
          onClose={() => setModalMeme(null)}
        />
      )}
    </div>
  );
}
