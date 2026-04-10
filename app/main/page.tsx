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

// ── VotingGroup ───────────────────────────────────────────────
function VotingGroup({
  captionId, userId, initialLikeCount, onLikeCountChange, onVoteCast, imageUrl, posLabel, caption,
}: {
  captionId: string;
  userId: string | undefined;
  initialLikeCount: number;
  onLikeCountChange: (id: string, n: number) => void;
  onVoteCast: (type: 'up' | 'down') => void;
  imageUrl?: string | null;
  posLabel?: string;
  caption?: string | null;
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
      onVoteCast(type); // immediate — parent handles disappear animation
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
    <div className="flex flex-col">
      {/* Image full-bleed with left/right vote overlays */}
      {imageUrl && (
        <div className="w-full aspect-video relative group overflow-hidden">
          <img src={imageUrl} alt="Meme" className="h-full w-full object-cover" />

          {posLabel && (
            <span className="absolute top-3 right-3 z-10 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-xs font-mono font-bold text-white">
              {posLabel}
            </span>
          )}

          {/* Left half — Upvote */}
          <button
            onClick={() => handleVote('up')}
            disabled={isSubmitting || isLoadingVote || votedType !== null}
            className={`absolute inset-y-0 left-0 w-1/2 flex items-center justify-center transition-all duration-200
              ${votedType === 'up'
                ? 'bg-blue-500/50 opacity-100 cursor-default'
                : votedType === null
                  ? 'opacity-0 group-hover:opacity-100 bg-blue-500/30 hover:bg-blue-500/50 cursor-pointer'
                  : 'opacity-0 pointer-events-none'
              }`}
          >
            <div className="flex flex-col items-center gap-1 text-white drop-shadow-lg select-none">
              <span className="text-5xl">👍</span>
              <span className="text-sm font-black uppercase tracking-wide">
                {votedType === 'up' ? 'Upvoted!' : 'Upvote'}
              </span>
            </div>
          </button>

          {/* Right half — Downvote */}
          <button
            onClick={() => handleVote('down')}
            disabled={isSubmitting || isLoadingVote || votedType !== null}
            className={`absolute inset-y-0 right-0 w-1/2 flex items-center justify-center transition-all duration-200
              ${votedType === 'down'
                ? 'bg-red-500/50 opacity-100 cursor-default'
                : votedType === null
                  ? 'opacity-0 group-hover:opacity-100 bg-red-500/30 hover:bg-red-500/50 cursor-pointer'
                  : 'opacity-0 pointer-events-none'
              }`}
          >
            <div className="flex flex-col items-center gap-1 text-white drop-shadow-lg select-none">
              <span className="text-5xl">👎</span>
              <span className="text-sm font-black uppercase tracking-wide">
                {votedType === 'down' ? 'Downvoted!' : 'Downvote'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Content area */}
      <div className="p-6 flex flex-col gap-3">
        {caption && (
          <blockquote className="text-xl font-semibold italic text-zinc-900 dark:text-zinc-100 leading-snug">
            "{caption}"
          </blockquote>
        )}
        <div className="flex items-center gap-4">
          <div className="text-sm font-mono text-zinc-500 dark:text-zinc-400">
            likes: <span className="text-blue-500 dark:text-blue-400">{initialLikeCount}</span>
          </div>
          {!imageUrl && (
            <>
              <button onClick={() => handleVote('up')} disabled={isSubmitting || isLoadingVote || votedType !== null}
                className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${votedType === 'up' ? 'border-blue-600 bg-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-50'} ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800' : 'cursor-default'}`}>
                <span>👍</span><span className="text-xs font-bold uppercase">{votedType === 'up' ? 'Upvoted' : 'Up'}</span>
              </button>
              <button onClick={() => handleVote('down')} disabled={isSubmitting || isLoadingVote || votedType !== null}
                className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${votedType === 'down' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-300 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 disabled:opacity-50'} ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-gray-200 dark:hover:bg-zinc-800' : 'cursor-default'}`}>
                <span>👎</span><span className="text-xs font-bold uppercase">{votedType === 'down' ? 'Downvoted' : 'Down'}</span>
              </button>
            </>
          )}
          {votedType && (
            <button onClick={handleUndo} disabled={isSubmitting}
              className="text-xs text-zinc-500 dark:text-zinc-400 underline hover:text-blue-500 dark:hover:text-blue-400 disabled:opacity-50">
              Reset Vote
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── MiniPile ──────────────────────────────────────────────────
function MiniPile({
  type, memes, isOpen, onToggle, glow, loading,
}: {
  type: 'liked' | 'disliked';
  memes: CaptionItem[];
  isOpen: boolean;
  onToggle: () => void;
  glow: boolean;
  loading?: boolean;
}) {
  const topMeme = memes[0];
  const isEmpty = memes.length === 0 && !loading;
  const isLiked = type === 'liked';

  return (
    <button
      onClick={onToggle}
      disabled={isEmpty}
      title={isLiked ? 'Liked memes' : 'Disliked memes'}
      className={`relative w-20 focus:outline-none transition-all duration-300
        ${isEmpty ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:-translate-y-1'}
        ${glow ? 'scale-110' : 'scale-100'}
      `}
    >
      {/* Ghost card 2 */}
      {memes.length >= 3 && (
        <div
          className={`absolute inset-0 rounded-2xl border ${isLiked ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/60' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/60'}`}
          style={{ transform: `rotate(${isLiked ? 3 : -3}deg) translate(${isLiked ? 5 : -5}px, -4px)`, zIndex: 1, pointerEvents: 'none' }}
        />
      )}
      {/* Ghost card 1 */}
      {memes.length >= 2 && (
        <div
          className={`absolute inset-0 rounded-2xl border ${isLiked ? 'border-blue-200 dark:border-blue-800 bg-blue-100/80 dark:bg-blue-900/40' : 'border-red-200 dark:border-red-800 bg-red-100/80 dark:bg-red-900/40'}`}
          style={{ transform: `rotate(${isLiked ? 1.5 : -1.5}deg) translate(${isLiked ? 2.5 : -2.5}px, -2px)`, zIndex: 2, pointerEvents: 'none' }}
        />
      )}

      {/* Top card */}
      <div
        className={`relative z-10 rounded-2xl border overflow-hidden shadow-md transition-all duration-300
          ${isLiked
            ? `border-blue-200 dark:border-blue-800 ${glow ? 'ring-2 ring-blue-400 shadow-lg shadow-blue-200 dark:shadow-blue-900/50' : ''}`
            : `border-red-200 dark:border-red-800 ${glow ? 'ring-2 ring-red-400 shadow-lg shadow-red-200 dark:shadow-red-900/50' : ''}`
          }`}
      >
        {topMeme?.images?.url ? (
          <img src={topMeme.images.url} alt="" className="w-full h-14 object-cover" />
        ) : (
          <div className={`w-full h-14 flex items-center justify-center text-2xl ${isLiked ? 'bg-blue-50 dark:bg-blue-950' : 'bg-red-50 dark:bg-red-950'}`}>
            {isLiked ? '👍' : '👎'}
          </div>
        )}
        <div className={`px-2 py-1.5 text-center ${isLiked ? 'bg-blue-50 dark:bg-blue-950/60' : 'bg-red-50 dark:bg-red-950/60'}`}>
          <div className="text-base leading-none mb-0.5">{isLiked ? '👍' : '👎'}</div>
          <div className={`text-[10px] font-black font-mono ${isLiked ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
            {loading ? '…' : isEmpty ? '—' : memes.length}
          </div>
        </div>
      </div>

      {/* "open" indicator */}
      {isOpen && !isEmpty && (
        <div className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full ${isLiked ? 'bg-blue-400' : 'bg-red-400'}`} />
      )}
    </button>
  );
}

// ── DuplicatePanel ────────────────────────────────────────────
function DuplicatePanel({ activeMeme, router }: { activeMeme: CaptionItem | null; router: ReturnType<typeof useRouter> }) {
  const [copyCaption, setCopyCaption] = useState(false);
  const [copyImage, setCopyImage] = useState(false);
  const [copyFlavor, setCopyFlavor] = useState(false);
  const [collapsed, setCollapsed] = useState(true);

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
    { key: 'caption', label: 'Copy Caption',     icon: '💬', checked: copyCaption, set: setCopyCaption, available: !!activeMeme?.content },
    { key: 'image',   label: 'Copy Image',        icon: '🖼️', checked: copyImage,   set: setCopyImage,   available: !!activeMeme?.image_id },
    { key: 'flavor',  label: 'Copy Humor Flavor', icon: '😂', checked: copyFlavor,  set: setCopyFlavor,  available: activeMeme?.humor_flavor_id != null },
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
            <div className="mb-3 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-3 text-center text-[11px] text-zinc-400">No meme selected</div>
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

// ── Page ──────────────────────────────────────────────────────
export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<CaptionItem[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [pileLoading, setPileLoading] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipPhase, setFlipPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const [flipDir, setFlipDir] = useState<'next' | 'prev'>('next');
  const [voteEffect, setVoteEffect] = useState<'idle' | 'liked' | 'disliked'>('idle');
  const [pile, setPile] = useState<Pile>('all');

  // Voted piles
  const [likedMemes, setLikedMemes] = useState<CaptionItem[]>([]);
  const [dislikedMemes, setDislikedMemes] = useState<CaptionItem[]>([]);
  const [pilesLoading, setPilesLoading] = useState(false);
  const [openPile, setOpenPile] = useState<'liked' | 'disliked' | null>(null);
  const [likedGlow, setLikedGlow] = useState(false);
  const [dislikedGlow, setDislikedGlow] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [searchResults, setSearchResults] = useState<CaptionItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for stable keyboard handler
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const flipPhaseRef = useRef(flipPhase);
  flipPhaseRef.current = flipPhase;
  const voteEffectRef = useRef(voteEffect);
  voteEffectRef.current = voteEffect;
  const displayListLenRef = useRef(0);

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

  // Load persisted liked/disliked from DB once userId is known
  useEffect(() => {
    if (!userId) return;
    setPilesLoading(true);
    fetch(`/api/user-center?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const mapToItem = (m: any): CaptionItem => ({
          id: m.id,
          content: m.content ?? null,
          like_count: m.like_count ?? null,
          image_id: null,
          humor_flavor_id: null,
          profile_id: null,
          images: m.image_url ? { url: m.image_url } : null,
        });
        setLikedMemes((d.liked ?? []).map(mapToItem));
        setDislikedMemes((d.disliked ?? []).map(mapToItem));
      })
      .catch(() => {})
      .finally(() => setPilesLoading(false));
  }, [userId]);

  const displayList = searchResults ?? captionsList;
  displayListLenRef.current = displayList.length;

  // Reset to first card when list changes
  useEffect(() => {
    setCurrentIndex(0);
    setFlipPhase('idle');
    setVoteEffect('idle');
  }, [displayList.length, searchQuery]);

  // Navigation with flip animation (for prev/next buttons & keyboard)
  function navigateTo(newIndex: number, dir: 'next' | 'prev') {
    if (flipPhaseRef.current !== 'idle' || voteEffectRef.current !== 'idle') return;
    if (newIndex < 0 || newIndex >= displayListLenRef.current) return;
    setFlipDir(dir);
    setFlipPhase('exit');
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setFlipPhase('enter');
      requestAnimationFrame(() => requestAnimationFrame(() => setFlipPhase('idle')));
    }, 220);
  }

  const goNext = useCallback(() => navigateTo(currentIndexRef.current + 1, 'next'), []);
  const goPrev = useCallback(() => navigateTo(currentIndexRef.current - 1, 'prev'), []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext();
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goNext, goPrev]);

  function handleLikeCountChange(captionId: string, newLikeCount: number) {
    setCaptionsList(prev => prev.map(item => item.id === captionId ? { ...item, like_count: newLikeCount } : item));
  }

  function handleVoteCast(voteType: 'up' | 'down') {
    const meme = displayList[currentIndexRef.current];
    if (!meme) return;

    if (voteType === 'up') {
      setLikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [meme, ...prev]);
      setLikedGlow(true);
      setTimeout(() => setLikedGlow(false), 700);
    } else {
      setDislikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [meme, ...prev]);
      setDislikedGlow(true);
      setTimeout(() => setDislikedGlow(false), 700);
    }

    // Card disappear effect
    setVoteEffect(voteType === 'up' ? 'liked' : 'disliked');
    setTimeout(() => {
      setVoteEffect('idle');
      const next = currentIndexRef.current + 1;
      if (next < displayListLenRef.current) setCurrentIndex(next);
    }, 380);
  }

  if (loading) return <div className="p-10 text-center font-mono text-zinc-300">LOADING...</div>;

  const activeMeme = displayList[currentIndex] ?? null;
  const remaining = displayList.length - currentIndex - 1;

  // Card style: vote-effect takes priority over flip
  const cardStyle: React.CSSProperties = voteEffect !== 'idle'
    ? {
        transition: 'transform 0.35s ease-in-out, opacity 0.35s ease-in-out',
        transform: voteEffect === 'liked'
          ? 'translateX(220px) scale(0.5) rotate(10deg)'
          : 'translateX(-220px) scale(0.5) rotate(-10deg)',
        opacity: 0,
      }
    : {
        transition: flipPhase === 'enter' ? 'none' : 'transform 0.22s ease-in-out, opacity 0.22s ease-in-out',
        transform: flipPhase === 'exit'
          ? `perspective(1000px) rotateY(${flipDir === 'next' ? '80deg' : '-80deg'}) scale(0.95)`
          : flipPhase === 'enter'
            ? `perspective(1000px) rotateY(${flipDir === 'next' ? '-80deg' : '80deg'}) scale(0.95)`
            : 'perspective(1000px) rotateY(0deg) scale(1)',
        opacity: flipPhase === 'exit' ? 0 : 1,
      };

  return (
    <div className="min-h-screen bg-transparent p-6 text-zinc-900 dark:text-zinc-100">
      <header className="mb-10 text-center max-w-3xl mx-auto">
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
        <div className="flex flex-col items-center gap-6">

          {/* ── Three-column: disliked | card deck | liked ── */}
          <div className="flex items-start justify-center gap-5 w-full">

            {/* Disliked pile — left */}
            <div className="flex-shrink-0 pt-6">
              <MiniPile
                type="disliked"
                memes={dislikedMemes}
                isOpen={openPile === 'disliked'}
                onToggle={() => setOpenPile(p => p === 'disliked' ? null : 'disliked')}
                glow={dislikedGlow}
                loading={pilesLoading}
              />
            </div>

            {/* Card deck + navigation */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative" style={{ width: '100%', maxWidth: 520 }}>

                {/* Ghost cards */}
                {remaining >= 2 && (
                  <div
                    className="absolute inset-0 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                    style={{ transform: 'rotate(2.8deg) translate(14px, -5px)', zIndex: 1, pointerEvents: 'none' }}
                  />
                )}
                {remaining >= 1 && (
                  <div
                    className="absolute inset-0 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                    style={{ transform: 'rotate(1.4deg) translate(7px, -2px)', zIndex: 2, pointerEvents: 'none' }}
                  />
                )}

                {/* Side pile-thickness indicator */}
                <div
                  className="absolute top-8 bottom-8 flex flex-col justify-center gap-[3px]"
                  style={{ left: 'calc(100% + 10px)', pointerEvents: 'none' }}
                >
                  {Array.from({ length: Math.min(remaining + 1, 16) }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        height: 3,
                        width: Math.max(5, 18 - i),
                        backgroundColor: i === 0 ? '#60a5fa' : '#d4d4d8',
                        borderRadius: '0 3px 3px 0',
                        opacity: Math.max(0.2, 1 - i * 0.055),
                      }}
                    />
                  ))}
                  {remaining + 1 > 16 && (
                    <div style={{ fontSize: 8, color: '#a1a1aa', fontFamily: 'monospace' }}>+{remaining + 1 - 16}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#71717a', fontFamily: 'monospace', marginTop: 3 }}>
                    {remaining + 1}
                  </div>
                </div>

                {/* Main card */}
                <div
                  className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl"
                  style={{ zIndex: 10, ...cardStyle }}
                >
                  <VotingGroup
                    key={activeMeme?.id}
                    captionId={activeMeme?.id ?? ''}
                    userId={userId}
                    initialLikeCount={Number(activeMeme?.like_count ?? 0)}
                    onLikeCountChange={handleLikeCountChange}
                    onVoteCast={handleVoteCast}
                    imageUrl={activeMeme?.images?.url}
                    posLabel={`${currentIndex + 1} / ${displayList.length}`}
                    caption={activeMeme?.content}
                  />
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-5">
                <button
                  onClick={goPrev}
                  disabled={currentIndex === 0 || flipPhase !== 'idle' || voteEffect !== 'idle'}
                  className="w-11 h-11 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                >←</button>
                <span className="text-sm font-mono font-bold text-zinc-400 tabular-nums">
                  {currentIndex + 1} / {displayList.length}
                </span>
                <button
                  onClick={goNext}
                  disabled={currentIndex >= displayList.length - 1 || flipPhase !== 'idle' || voteEffect !== 'idle'}
                  className="w-11 h-11 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95"
                >→</button>
              </div>
              <p className="text-xs text-zinc-400 font-mono">← → arrow keys also work</p>
            </div>

            {/* Liked pile — right */}
            <div className="flex-shrink-0 pt-6">
              <MiniPile
                type="liked"
                memes={likedMemes}
                isOpen={openPile === 'liked'}
                onToggle={() => setOpenPile(p => p === 'liked' ? null : 'liked')}
                glow={likedGlow}
                loading={pilesLoading}
              />
            </div>
          </div>

          {/* ── Expanded pile panel ── */}
          {openPile && (
            <div className={`w-full max-w-2xl rounded-2xl border p-4 transition-all
              ${openPile === 'liked'
                ? 'border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20'
                : 'border-red-200 dark:border-red-800 bg-red-50/40 dark:bg-red-950/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-black ${openPile === 'liked' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'}`}>
                  {openPile === 'liked' ? '👍 Liked' : '👎 Disliked'} · {(openPile === 'liked' ? likedMemes : dislikedMemes).length}
                </h3>
                <button
                  onClick={() => setOpenPile(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm px-1"
                >✕</button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(openPile === 'liked' ? likedMemes : dislikedMemes).map(m => (
                  <div key={m.id} className="rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                    {m.images?.url ? (
                      <img src={m.images.url} alt="" className="w-full h-16 object-cover" />
                    ) : (
                      <div className="w-full h-16 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xl">
                        {openPile === 'liked' ? '👍' : '👎'}
                      </div>
                    )}
                    <p className="text-[9px] text-zinc-500 dark:text-zinc-400 p-1.5 italic line-clamp-2">"{m.content || '—'}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      <DuplicatePanel activeMeme={activeMeme} router={router} />
    </div>
  );
}
