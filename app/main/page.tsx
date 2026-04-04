'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Pile = 'all' | 'latest' | 'top' | 'bottom';
type SearchField = 'all' | 'content' | 'image_id' | 'image_description' | 'profile_id';

const PILES: { key: Pile; label: string; icon: string; desc: string }[] = [
  { key: 'all',    label: 'All Memes',      icon: '🌐', desc: 'Latest 100' },
  { key: 'latest', label: 'Latest 30',      icon: '🕐', desc: 'Newest first' },
  { key: 'top',    label: 'Most Liked 30',  icon: '🔥', desc: 'Top scores' },
  { key: 'bottom', label: 'Least Liked 30', icon: '📉', desc: 'Bottom scores' },
];

const SEARCH_FIELDS: { key: SearchField; label: string }[] = [
  { key: 'all',               label: 'All fields' },
  { key: 'content',          label: 'Caption' },
  { key: 'image_id',         label: 'Image ID' },
  { key: 'image_description',label: 'Image Description' },
  { key: 'profile_id',       label: 'Profile ID' },
];

type CaptionItem = {
  id: string;
  content: string | null;
  like_count: number | null;
  image_id: string | null;
  humor_flavor_id: number | null;
  profile_id: string | null;
  images?: { url?: string | null; image_description?: string | null } | null;
};

async function refreshCaptionLikeCount(captionId: string, userId: string) {
  const { data, error } = await supabase
    .from('caption_votes').select('vote_value').eq('caption_id', captionId);
  if (error) throw error;
  const score = (data || []).reduce((sum, row) => sum + Number(row.vote_value || 0), 0);
  const { error: updateError } = await supabase
    .from('captions').update({ like_count: score, modified_by_user_id: userId }).eq('id', captionId);
  if (updateError) throw updateError;
  return score;
}

function VotingGroup({
  captionId, userId, initialLikeCount, onLikeCountChange, onVoteCast,
}: {
  captionId: string;
  userId: string | undefined;
  initialLikeCount: number;
  onLikeCountChange: (id: string, n: number) => void;
  onVoteCast: () => void;
}) {
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingVote, setIsLoadingVote] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchExistingVote() {
      if (!userId) { setIsLoadingVote(false); return; }
      const { data, error } = await supabase
        .from('caption_votes').select('vote_value')
        .eq('profile_id', userId).eq('caption_id', captionId).maybeSingle();
      if (!cancelled) {
        if (!error && data) setVotedType(data.vote_value === 1 ? 'up' : data.vote_value === -1 ? 'down' : null);
        else setVotedType(null);
        setIsLoadingVote(false);
      }
    }
    fetchExistingVote();
    return () => { cancelled = true; };
  }, [captionId, userId]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!userId || votedType || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('caption_votes').upsert(
        { vote_value: type === 'up' ? 1 : -1, profile_id: userId, caption_id: captionId, created_by_user_id: userId, modified_by_user_id: userId },
        { onConflict: 'profile_id,caption_id' }
      );
      if (error) throw error;
      setVotedType(type);
      const newLikeCount = await refreshCaptionLikeCount(captionId, userId);
      onLikeCountChange(captionId, newLikeCount);
      setTimeout(onVoteCast, 500);
    } catch (err: any) { alert(`Vote failed: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleUndo = async () => {
    if (!userId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('caption_votes').delete().match({ profile_id: userId, caption_id: captionId });
      if (error) throw error;
      setVotedType(null);
      const newLikeCount = await refreshCaptionLikeCount(captionId, userId!);
      onLikeCountChange(captionId, newLikeCount);
    } catch (err: any) { alert(`Undo failed: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
        likes: <span className="text-blue-500 dark:text-blue-400">{initialLikeCount}</span>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => handleVote('up')} disabled={isSubmitting || isLoadingVote || votedType !== null}
          className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${votedType === 'up' ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-50'} ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800' : 'cursor-default'}`}>
          <span>👍</span><span className="text-xs font-bold uppercase">{votedType === 'up' ? 'Upvoted' : 'Up'}</span>
        </button>
        <button onClick={() => handleVote('down')} disabled={isSubmitting || isLoadingVote || votedType !== null}
          className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${votedType === 'down' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-50'} ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800' : 'cursor-default'}`}>
          <span>👎</span><span className="text-xs font-bold uppercase">{votedType === 'down' ? 'Downvoted' : 'Down'}</span>
        </button>
        {votedType && (
          <button onClick={handleUndo} disabled={isSubmitting}
            className="ml-2 text-xs text-zinc-500 dark:text-zinc-400 underline hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50">
            Reset Vote
          </button>
        )}
      </div>
    </div>
  );
}

function DuplicatePanel({ activeMeme, router }: { activeMeme: CaptionItem | null; router: ReturnType<typeof useRouter> }) {
  const [copyCaption, setCopyCaption] = useState(false);
  const [copyImage, setCopyImage] = useState(false);
  const [copyFlavor, setCopyFlavor] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const nothingSelected = !copyCaption && !copyImage && !copyFlavor;

  function handleGo() {
    if (!activeMeme || nothingSelected) return;
    const params = new URLSearchParams();
    if (copyCaption && activeMeme.content) params.set('caption', activeMeme.content);
    if (copyImage && activeMeme.image_id) {
      params.set('imageId', activeMeme.image_id);
      if (activeMeme.images?.url) params.set('imageUrl', activeMeme.images.url);
    }
    if (copyFlavor && activeMeme.humor_flavor_id != null) params.set('flavorId', String(activeMeme.humor_flavor_id));
    router.push(`/upload?${params.toString()}`);
  }

  const checks = [
    { key: 'caption', label: 'Copy Caption',       icon: '💬', checked: copyCaption, set: setCopyCaption, available: !!activeMeme?.content },
    { key: 'image',   label: 'Copy Image',          icon: '🖼️', checked: copyImage,   set: setCopyImage,   available: !!activeMeme?.image_id },
    { key: 'flavor',  label: 'Copy Humor Flavor',   icon: '😂', checked: copyFlavor,  set: setCopyFlavor,  available: activeMeme?.humor_flavor_id != null },
  ];

  return (
    <div className={`fixed right-4 top-1/2 -translate-y-1/2 z-40 transition-all duration-300 ${collapsed ? 'w-44' : 'w-56'}`}>
      {collapsed ? (
        <button onClick={() => setCollapsed(false)}
          className="w-full rounded-2xl border border-violet-300/30 dark:border-violet-700/40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm shadow-xl px-3 py-2.5 text-left hover:border-violet-400 dark:hover:border-violet-500 transition-all">
          <span className="text-xs font-black text-violet-600 dark:text-violet-300 uppercase tracking-wide">want to make your own?</span>
        </button>
      ) : (
        <div className="rounded-2xl border border-violet-300/30 dark:border-violet-700/40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-base">🎭</span>
              <span className="text-xs font-black text-violet-600 dark:text-violet-300 uppercase tracking-wide">Duplicate the Humor</span>
            </div>
            <button onClick={() => setCollapsed(true)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs px-1">✕</button>
          </div>

          {activeMeme ? (
            <div className="mb-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-2.5 border border-zinc-200 dark:border-zinc-800">
              {activeMeme.images?.url && (
                <img src={activeMeme.images.url} alt="" className="w-full h-20 object-cover rounded-lg mb-2 border border-zinc-200 dark:border-zinc-700" />
              )}
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 italic line-clamp-2">"{activeMeme.content || '—'}"</p>
            </div>
          ) : (
            <div className="mb-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-3 text-center text-[11px] text-zinc-400">Scroll to a meme</div>
          )}

          <div className="space-y-2 mb-4">
            {checks.map(c => (
              <label key={c.key}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2 cursor-pointer transition-all ${!c.available ? 'opacity-40 cursor-not-allowed' : c.checked ? 'bg-violet-100 dark:bg-violet-900/40 border border-violet-300 dark:border-violet-700' : 'bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-violet-300 dark:hover:border-violet-700'}`}>
                <input type="checkbox" checked={c.checked} disabled={!c.available} onChange={e => c.set(e.target.checked)} className="accent-violet-600 w-3.5 h-3.5" />
                <span className="text-sm">{c.icon}</span>
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-200">{c.label}</span>
              </label>
            ))}
          </div>

          <button onClick={handleGo} disabled={nothingSelected || !activeMeme}
            className="w-full rounded-xl bg-violet-600 py-2.5 text-sm font-black text-white shadow-md transition-all hover:bg-violet-700 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
            Let's go 🚀
          </button>
          {nothingSelected && activeMeme && (
            <p className="text-[10px] text-zinc-400 text-center mt-2">Pick at least one option</p>
          )}

          <button onClick={() => router.push('/upload')}
            className="w-full mt-2 rounded-xl border border-violet-300/30 dark:border-violet-700/40 py-2.5 px-3 text-left transition-all hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50/50 dark:hover:bg-violet-900/10">
            <div className="flex items-center gap-1.5">
              <span className="text-base">✏️</span>
              <span className="text-xs font-black text-violet-600 dark:text-violet-300 uppercase tracking-wide">Start from Scratch</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<CaptionItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [pileLoading, setPileLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pile, setPile] = useState<Pile>('all');

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [searchResults, setSearchResults] = useState<CaptionItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  const loadPile = useCallback(async (selectedPile: Pile, uid: string | undefined) => {
    setPileLoading(true);
    setSearchQuery('');
    setSearchResults(null);
    try {
      const params = new URLSearchParams({ pile: selectedPile });
      if (uid) params.set('userId', uid);
      const res = await fetch(`/api/main?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setCaptionsList((data || []) as CaptionItem[]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      alert(`Failed to load: ${err.message}`);
    } finally {
      setPileLoading(false);
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { router.push('/login'); return; }
        setUserId(session.user.id);
        await loadPile('all', session.user.id);
      } catch (err: any) { alert(`Failed to load: ${err.message}`); }
      finally { setLoading(false); }
    }
    fetchData();
  }, [router, loadPile]);

  // When searchQuery changes, debounce → call API
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    const q = searchQuery.trim();
    if (!q) { setSearchResults(null); setSearchLoading(false); return; }

    setSearchLoading(true);
    searchDebounce.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: q, searchField });
        const res = await fetch(`/api/main?${params}`);
        const data = await res.json();
        setSearchResults(res.ok ? (data as CaptionItem[]) : []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 350);
  }, [searchQuery, searchField]);

  const displayList = searchResults ?? captionsList;

  useEffect(() => {
    const updateActive = () => {
      const centerY = window.innerHeight / 2;
      let bestIndex = 0; let bestDist = Number.POSITIVE_INFINITY;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height / 2 - centerY);
        if (dist < bestDist) { bestIndex = idx; bestDist = dist; }
      });
      setActiveIndex(bestIndex);
    };
    updateActive();
    window.addEventListener('scroll', updateActive);
    return () => window.removeEventListener('scroll', updateActive);
  }, [displayList]);

  function handleLikeCountChange(captionId: string, newLikeCount: number) {
    setCaptionsList(prev => prev.map(item => item.id === captionId ? { ...item, like_count: newLikeCount } : item));
  }

  function scrollToNext(currentIndex: number) {
    const nextEl = cardRefs.current[currentIndex + 1];
    if (nextEl) nextEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (loading) return <div className="p-10 text-center font-mono text-zinc-300">LOADING...</div>;

  const activeMeme = displayList[activeIndex] ?? null;

  return (
    <div className="min-h-screen max-w-3xl mx-auto bg-transparent p-6 text-zinc-900 dark:text-zinc-100">
      <header className="mb-10 text-center">
        <h1 className="mb-6 text-5xl font-black tracking-tight text-blue-400">Meme Board</h1>

        {/* Pile selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {PILES.map(p => (
            <button key={p.key} onClick={() => { setPile(p.key); loadPile(p.key, userId); }} disabled={pileLoading}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-all disabled:opacity-60 ${pile === p.key ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500'}`}>
              <span>{p.icon}</span><span>{p.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="text-xs text-zinc-400 font-mono">
            {pileLoading ? 'loading...' : searchLoading ? 'searching…' : searchQuery ? `${displayList.length} results across all memes` : `${displayList.length} memes · ${PILES.find(p => p.key === pile)!.desc}`}
          </span>
          {pile !== 'all' && (
            <button onClick={() => loadPile(pile, userId)} disabled={pileLoading}
              className="flex items-center gap-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 active:scale-95">
              <span className={pileLoading ? 'animate-spin' : ''}>🔄</span> Renew
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="flex gap-2 max-w-lg mx-auto">
          <select value={searchField} onChange={e => setSearchField(e.target.value as SearchField)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-400 shrink-0">
            {SEARCH_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search memes..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm">✕</button>
            )}
          </div>
        </div>
      </header>

      {pileLoading ? (
        <div className="flex justify-center py-20">
          <div className="text-zinc-400 font-mono text-sm animate-pulse">loading pile...</div>
        </div>
      ) : displayList.length === 0 ? (
        <div className="text-center py-20 text-zinc-400">
          {searchQuery ? (
            <>
              <p className="text-4xl mb-4">🔍</p>
              <p className="font-bold">No memes match "{searchQuery}"</p>
              <button onClick={() => setSearchQuery('')} className="mt-3 text-sm text-blue-500 underline">Clear search</button>
            </>
          ) : (
            <>
              <p className="text-4xl mb-4">🎉</p>
              <p className="font-bold">You've voted on everything in this pile!</p>
              <p className="text-sm mt-2">Try another pile or come back later.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-16">
          {displayList.map((item, index) => {
            const isActive = index === activeIndex;
            const posLabel = `${index + 1} / ${displayList.length}`;
            return (
              <div key={item.id} ref={el => { cardRefs.current[index] = el; }}
                className={`overflow-hidden rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-all duration-500 ${isActive ? 'scale-105 opacity-100 shadow-2xl' : 'scale-90 opacity-50 shadow-sm'}`}>
                {item.images?.url && (
                  <div className="w-full aspect-video relative">
                    <img src={item.images.url} alt="Meme" className="h-full w-full object-cover" />
                    {/* Position indicator */}
                    <span className="absolute top-3 right-3 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-xs font-mono font-bold text-white">
                      {posLabel}
                    </span>
                  </div>
                )}
                <div className="p-8">
                  {/* Position indicator for image-less cards */}
                  {!item.images?.url && (
                    <div className="flex justify-end mb-2">
                      <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        {posLabel}
                      </span>
                    </div>
                  )}
                  <blockquote className="mb-8 text-2xl font-semibold italic text-zinc-900 dark:text-zinc-100">
                    "{item.content}"
                  </blockquote>
                  <VotingGroup
                    captionId={item.id}
                    userId={userId}
                    initialLikeCount={Number(item.like_count ?? 0)}
                    onLikeCountChange={handleLikeCountChange}
                    onVoteCast={() => scrollToNext(index)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DuplicatePanel activeMeme={activeMeme} router={router} />
    </div>
  );
}
