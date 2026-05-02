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

// Same MemeItem shape as homepage
type MemeItem = {
  id: string;
  content: string | null;
  like_count: number | null;
  image_url?: string | null;
};

type PileKey = 'liked' | 'disliked';

const PILE_CONFIG: Record<PileKey, {
  label: string; icon: string;
  cardBg: string; border: string; accent: string; countColor: string;
}> = {
  liked:    { label: 'Liked Memes',    icon: '👍', cardBg: 'bg-white dark:bg-zinc-950', border: 'border-blue-200 dark:border-blue-800',  accent: 'text-blue-600 dark:text-blue-400',  countColor: 'bg-blue-600' },
  disliked: { label: 'Disliked Memes', icon: '👎', cardBg: 'bg-white dark:bg-zinc-950', border: 'border-red-200 dark:border-red-800',    accent: 'text-red-600 dark:text-red-400',    countColor: 'bg-red-500'  },
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

// ── Meme modal (copied from homepage) ────────────────────────
function MemeModal({
  item, pile, onClose, onUnlike, onSwitchToDownvote, actionLoading,
}: {
  item: MemeItem;
  pile: PileKey | null;
  onClose: () => void;
  onUnlike?: () => void;
  onSwitchToDownvote?: () => void;
  actionLoading?: boolean;
}) {
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
          {(pile === 'liked' || pile === 'disliked') && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={onUnlike}
                disabled={actionLoading}
                className="flex-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 disabled:opacity-50 transition-all"
              >
                {pile === 'liked' ? '💔 Take back the like' : '🫶 Take back the dislike'}
              </button>
              <button
                onClick={onSwitchToDownvote}
                disabled={actionLoading}
                className={`flex-1 rounded-xl py-2.5 text-xs font-bold disabled:opacity-50 transition-all ${
                  pile === 'liked'
                    ? 'bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-950/70 text-red-600 dark:text-red-400'
                    : 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 text-blue-600 dark:text-blue-400'
                }`}
              >
                {pile === 'liked' ? '👎 Switch to downvote' : '👍 Switch to upvote'}
              </button>
            </div>
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

// ── MemeCard (copied from homepage) ──────────────────────────
function MemeCard({ item, onClick }: { item: MemeItem; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
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
  );
}

// ── PileCard (copied from homepage) ──────────────────────────
function PileCard({
  pileKey, items, loading, isOpen, onToggle,
}: {
  pileKey: PileKey;
  items: MemeItem[];
  loading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cfg = PILE_CONFIG[pileKey];
  const count = items.length;
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
      onVoteCast(type);
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
      {imageUrl && (
        <div className="w-full aspect-video relative group overflow-hidden">
          <img src={imageUrl} alt="Meme" className="h-full w-full object-cover" />
          {posLabel && (
            <span className="absolute top-3 right-3 z-10 rounded-full bg-black/40 backdrop-blur-sm px-2.5 py-1 text-xs font-mono font-bold text-white">
              {posLabel}
            </span>
          )}
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

// ── GridCard (collapsed + expanded with voting) ───────────────
function GridCard({
  item, idx, isSelected, onSelect, onVoteCast, onLikeCountChange, userId, router,
}: {
  item: CaptionItem;
  idx: number;
  isSelected: boolean;
  onSelect: (idx: number | null) => void;
  onVoteCast: (type: 'up' | 'down', idx: number) => void;
  onLikeCountChange: (id: string, n: number) => void;
  userId: string | undefined;
  router: ReturnType<typeof useRouter>;
}) {
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingVote, setLoadingVote] = useState(false);

  useEffect(() => {
    if (!isSelected || !userId) return;
    let cancelled = false;
    setLoadingVote(true);
    supabase.from('caption_votes').select('vote_value')
      .eq('profile_id', userId).eq('caption_id', item.id).maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setVotedType(data ? (data.vote_value === 1 ? 'up' : data.vote_value === -1 ? 'down' : null) : null);
        setLoadingVote(false);
      });
    return () => { cancelled = true; };
  }, [isSelected, item.id, userId]);

  const handleVote = async (type: 'up' | 'down') => {
    if (!userId || votedType || isSubmitting || loadingVote) return;
    setIsSubmitting(true);
    try {
      await supabase.from('caption_votes').upsert(
        { vote_value: type === 'up' ? 1 : -1, profile_id: userId, caption_id: item.id, created_by_user_id: userId, modified_by_user_id: userId },
        { onConflict: 'profile_id,caption_id' }
      );
      setVotedType(type);
      const newCount = await refreshCaptionLikeCount(item.id, userId);
      onLikeCountChange(item.id, newCount);
      onVoteCast(type, idx);
    } catch (err: any) { alert(`Vote failed: ${err.message}`); }
    finally { setIsSubmitting(false); }
  };

  const handleMakeSimilar = () => {
    const params = new URLSearchParams();
    if (item.image_id) {
      params.set('imageId', item.image_id);
      if (item.images?.url) params.set('imageUrl', item.images.url);
    }
    if (item.humor_flavor_id != null) params.set('flavorId', String(item.humor_flavor_id));
    router.push(`/upload?${params.toString()}`);
  };

  if (!isSelected) {
    return (
      <div
        onClick={() => onSelect(idx)}
        className="cursor-pointer rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
      >
        {item.images?.url ? (
          <img src={item.images.url} alt="" className="w-full h-24 object-cover" />
        ) : (
          <div className="w-full h-24 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl">🖼️</div>
        )}
        <div className="p-2">
          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 line-clamp-2 italic">"{item.content || '—'}"</p>
          {item.like_count != null && (
            <p className="mt-1 text-[10px] text-zinc-400 font-mono">{item.like_count > 0 ? '+' : ''}{item.like_count}</p>
          )}
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="col-span-2 rounded-2xl border-2 border-blue-400 dark:border-blue-500 bg-white dark:bg-zinc-900 overflow-hidden shadow-xl">
      <div className="relative">
        {item.images?.url ? (
          <img src={item.images.url} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-40 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-4xl">🖼️</div>
        )}
        <button
          onClick={() => onSelect(null)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center hover:bg-black/60 transition-colors"
        >✕</button>
      </div>
      <div className="p-3">
        <p className="text-xs text-zinc-700 dark:text-zinc-200 italic line-clamp-3 mb-3">"{item.content || '—'}"</p>
        <div className="flex gap-2">
          <button
            onClick={() => handleVote('up')}
            disabled={isSubmitting || loadingVote || votedType !== null}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all disabled:opacity-50 ${
              votedType === 'up' ? 'bg-blue-600 text-white' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-950/70'
            }`}
          >
            <span>👍</span>
            <span>{votedType === 'up' ? 'Liked!' : 'Like'}</span>
          </button>
          <button
            onClick={() => handleVote('down')}
            disabled={isSubmitting || loadingVote || votedType !== null}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all disabled:opacity-50 ${
              votedType === 'down' ? 'bg-red-600 text-white' : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/70'
            }`}
          >
            <span>👎</span>
            <span>{votedType === 'down' ? 'Noped!' : 'Nope'}</span>
          </button>
          <button
            onClick={handleMakeSimilar}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-950/70 transition-all"
          >
            <span>✨</span>
            <span>Similar</span>
          </button>
        </div>
      </div>
    </div>
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
  const [viewMode, setViewMode] = useState<'pile' | 'grid'>('pile');
  const [gridSelected, setGridSelected] = useState<number | null>(null);
  const [voteEffect, setVoteEffect] = useState<'idle' | 'liked' | 'disliked'>('idle');
  const [pile, setPile] = useState<Pile>('all');

  // Voted piles — persisted via user-center API
  const [likedMemes, setLikedMemes] = useState<MemeItem[]>([]);
  const [dislikedMemes, setDislikedMemes] = useState<MemeItem[]>([]);
  const [pilesLoading, setPilesLoading] = useState(false);
  const [openPile, setOpenPile] = useState<PileKey | null>(null);
  const [modalMeme, setModalMeme] = useState<MemeItem | null>(null);
  const [modalPile, setModalPile] = useState<PileKey | null>(null);
  const [modalActionLoading, setModalActionLoading] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchField, setSearchField] = useState<SearchField>('all');
  const [searchResults, setSearchResults] = useState<CaptionItem[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refs for stable keyboard handler
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
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

  // Load persisted liked/disliked from DB
  useEffect(() => {
    if (!userId) return;
    setPilesLoading(true);
    fetch(`/api/user-center?userId=${userId}`)
      .then(r => r.json())
      .then(d => {
        const map = (m: any): MemeItem => ({
          id: m.id,
          content: m.content ?? null,
          like_count: m.like_count ?? null,
          image_url: m.image_url ?? null,
        });
        setLikedMemes((d.liked ?? []).map(map));
        setDislikedMemes((d.disliked ?? []).map(map));
      })
      .catch(() => {})
      .finally(() => setPilesLoading(false));
  }, [userId]);

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
  displayListLenRef.current = displayList.length;

  useEffect(() => {
    setCurrentIndex(0);
    setVoteEffect('idle');
    setGridSelected(null);
  }, [displayList.length, searchQuery]);

  function navigateTo(newIndex: number, dir: 'next' | 'prev') {
    if (voteEffectRef.current !== 'idle') return;
    if (newIndex < 0 || newIndex >= displayListLenRef.current) return;
    // Slide out in the direction of navigation (next→right, prev→left)
    setVoteEffect(dir === 'next' ? 'liked' : 'disliked');
    setTimeout(() => {
      setCurrentIndex(newIndex);
      setVoteEffect('idle');
    }, 380);
  }

  const goNext = useCallback(() => navigateTo(currentIndexRef.current + 1, 'next'), []);
  const goPrev = useCallback(() => navigateTo(currentIndexRef.current - 1, 'prev'), []);

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
    const idx = currentIndexRef.current;
    const caption = displayList[idx];
    if (!caption) return;
    const meme: MemeItem = {
      id: caption.id,
      content: caption.content,
      like_count: caption.like_count,
      image_url: caption.images?.url ?? null,
    };
    if (voteType === 'up') {
      setLikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [...prev, meme]);
    } else {
      setDislikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [...prev, meme]);
    }
    setVoteEffect(voteType === 'up' ? 'liked' : 'disliked');
    setTimeout(() => {
      setVoteEffect('idle');
      if (!searchResults && idx < displayListLenRef.current - 1) {
        // Move voted card to end of pile; currentIndex stays put so the next card slides in
        setCaptionsList(prev => {
          const item = prev[idx];
          if (!item) return prev;
          return [...prev.slice(0, idx), ...prev.slice(idx + 1), item];
        });
      } else {
        // Last card in pile, or in search mode — just advance as before
        const next = idx + 1;
        if (next < displayListLenRef.current) setCurrentIndex(next);
      }
    }, 380);
  }

  function handleGridVoteCast(voteType: 'up' | 'down', itemIdx: number) {
    const caption = displayList[itemIdx];
    if (!caption) return;
    const meme: MemeItem = {
      id: caption.id,
      content: caption.content,
      like_count: caption.like_count,
      image_url: caption.images?.url ?? null,
    };
    if (voteType === 'up') {
      setLikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [...prev, meme]);
    } else {
      setDislikedMemes(prev => prev.some(m => m.id === meme.id) ? prev : [...prev, meme]);
    }
  }

  async function handleUnlike() {
    if (!modalMeme || !userId) return;
    setModalActionLoading(true);
    try {
      await supabase.from('caption_votes').delete()
        .eq('profile_id', userId).eq('caption_id', modalMeme.id);
      if (modalPile === 'liked') setLikedMemes(prev => prev.filter(m => m.id !== modalMeme.id));
      else setDislikedMemes(prev => prev.filter(m => m.id !== modalMeme.id));
      setModalMeme(null);
    } catch (err: any) { alert(`Failed: ${err.message}`); }
    finally { setModalActionLoading(false); }
  }

  async function handleSwitchVote() {
    if (!modalMeme || !userId) return;
    setModalActionLoading(true);
    const newValue = modalPile === 'liked' ? -1 : 1;
    try {
      await supabase.from('caption_votes')
        .update({ vote_value: newValue, modified_by_user_id: userId })
        .eq('profile_id', userId).eq('caption_id', modalMeme.id);
      if (modalPile === 'liked') {
        setLikedMemes(prev => prev.filter(m => m.id !== modalMeme.id));
        setDislikedMemes(prev => [modalMeme, ...prev]);
      } else {
        setDislikedMemes(prev => prev.filter(m => m.id !== modalMeme.id));
        setLikedMemes(prev => [modalMeme, ...prev]);
      }
      setModalMeme(null);
    } catch (err: any) { alert(`Failed: ${err.message}`); }
    finally { setModalActionLoading(false); }
  }

  if (loading) return <div className="p-10 text-center font-mono text-zinc-300">LOADING...</div>;

  const activeMeme = displayList[currentIndex] ?? null;
  const remaining = displayList.length - currentIndex - 1;

  const cardStyle: React.CSSProperties = voteEffect !== 'idle'
    ? {
        transition: 'transform 0.35s ease-in-out, opacity 0.35s ease-in-out',
        transform: voteEffect === 'liked'
          ? 'translateX(220px) scale(0.5) rotate(10deg)'
          : 'translateX(-220px) scale(0.5) rotate(-10deg)',
        opacity: 0,
      }
    : {
        transition: 'transform 0.22s ease-in-out, opacity 0.22s ease-in-out',
        transform: 'perspective(1000px) rotateY(0deg) scale(1)',
        opacity: 1,
      };

  return (
    <div className="min-h-screen bg-transparent text-zinc-900 dark:text-zinc-100 flex">

      {/* ── Left sidebar ── */}
      <aside className="hidden md:flex flex-col gap-5 w-52 shrink-0 sticky top-0 h-screen overflow-y-auto px-4 py-8 border-r border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-black tracking-tight text-blue-400 leading-tight">Meme<br/>Board</h1>

        {/* View mode toggle */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 text-xs font-bold">
          <button
            onClick={() => setViewMode('pile')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 transition-all ${viewMode === 'pile' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
            <span>🃏</span><span>Pile</span>
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
            <span>⊞</span><span>Grid</span>
          </button>
        </div>

        {/* Pile selector */}
        <div className="flex flex-col gap-1.5">
          {PILES.map(p => (
            <button key={p.key} onClick={() => { setPile(p.key); loadPile(p.key, userId); }} disabled={pileLoading}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all disabled:opacity-60 text-left ${pile === p.key ? 'bg-blue-600 text-white shadow-md' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}>
              <span>{p.icon}</span><span>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Count + Renew */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] text-zinc-400 font-mono leading-snug">
            {pileLoading ? 'loading...' : searchLoading ? 'searching…' : searchQuery ? `${displayList.length} results` : `${displayList.length} memes · ${PILES.find(p => p.key === pile)!.desc}`}
          </span>
          {pile !== 'all' && (
            <button onClick={() => loadPile(pile, userId)} disabled={pileLoading}
              className="flex items-center gap-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50 active:scale-95">
              <span className={pileLoading ? 'animate-spin' : ''}>🔄</span> Renew
            </button>
          )}
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2">
          <select value={searchField} onChange={e => setSearchField(e.target.value as SearchField)}
            className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {SEARCH_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>
          <div className="relative">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search memes..."
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs">✕</button>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 p-6">

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
      ) : viewMode === 'grid' ? (

        /* ── Grid mode ── */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {displayList.map((item, idx) => (
            <GridCard
              key={item.id}
              item={item}
              idx={idx}
              isSelected={gridSelected === idx}
              onSelect={setGridSelected}
              onVoteCast={handleGridVoteCast}
              onLikeCountChange={handleLikeCountChange}
              userId={userId}
              router={router}
            />
          ))}
        </div>

      ) : (

        /* ── Pile mode ── */
        <div className="flex flex-col items-center gap-6 max-w-lg mx-auto">

          {/* ── Liked / Disliked pile row ── */}
          <section className="w-full">
            <h2 className="mb-3 text-xs font-black text-zinc-400 uppercase tracking-widest">Your Votes</h2>
            <div className="grid grid-cols-2 gap-3">
              {(['liked', 'disliked'] as PileKey[]).map(key => (
                <PileCard
                  key={key}
                  pileKey={key}
                  items={key === 'liked' ? likedMemes : dislikedMemes}
                  loading={pilesLoading}
                  isOpen={openPile === key}
                  onToggle={() => setOpenPile(p => p === key ? null : key)}
                />
              ))}
            </div>
          </section>

          {/* ── Expanded pile content ── */}
          {openPile && !pilesLoading && (
            <div className="w-full border-y border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/80 dark:bg-zinc-900/40 rounded-2xl px-4 py-4">
              {(openPile === 'liked' ? likedMemes : dislikedMemes).length === 0 ? (
                <p className="text-center text-sm text-zinc-400 py-2">Nothing here yet</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {(openPile === 'liked' ? likedMemes : dislikedMemes).map(m => (
                    <MemeCard
                      key={m.id}
                      item={m}
                      onClick={() => { setModalMeme(m); setModalPile(openPile); }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Card deck ── */}
          <div className="relative w-full">
            {remaining >= 2 && (
              <div className="absolute inset-0 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900"
                style={{ transform: 'rotate(2.8deg) translate(14px, -5px)', zIndex: 1, pointerEvents: 'none' }} />
            )}
            {remaining >= 1 && (
              <div className="absolute inset-0 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800"
                style={{ transform: 'rotate(1.4deg) translate(7px, -2px)', zIndex: 2, pointerEvents: 'none' }} />
            )}

            {/* Side pile-thickness indicator */}
            <div className="absolute top-8 bottom-8 flex flex-col justify-center gap-[3px]"
              style={{ left: 'calc(100% + 10px)', pointerEvents: 'none' }}>
              {Array.from({ length: Math.min(remaining + 1, 16) }).map((_, i) => (
                <div key={i} style={{
                  height: 3, width: Math.max(5, 18 - i),
                  backgroundColor: i === 0 ? '#60a5fa' : '#d4d4d8',
                  borderRadius: '0 3px 3px 0',
                  opacity: Math.max(0.2, 1 - i * 0.055),
                }} />
              ))}
              {remaining + 1 > 16 && <div style={{ fontSize: 8, color: '#a1a1aa', fontFamily: 'monospace' }}>+{remaining + 1 - 16}</div>}
              <div style={{ fontSize: 11, fontWeight: 900, color: '#71717a', fontFamily: 'monospace', marginTop: 3 }}>{remaining + 1}</div>
            </div>

            <div className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl"
              style={{ zIndex: 10, ...cardStyle }}>
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
            <button onClick={goPrev}
              disabled={currentIndex === 0 || voteEffect !== 'idle'}
              className="w-11 h-11 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95">←</button>
            <span className="text-sm font-mono font-bold text-zinc-400 tabular-nums">{currentIndex + 1} / {displayList.length}</span>
            <button onClick={goNext}
              disabled={currentIndex >= displayList.length - 1 || voteEffect !== 'idle'}
              className="w-11 h-11 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 flex items-center justify-center text-lg text-zinc-600 dark:text-zinc-300 hover:border-blue-400 hover:text-blue-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95">→</button>
          </div>
          <p className="text-xs text-zinc-400 font-mono">← → arrow keys also work</p>
        </div>
      )}

      </div>

      {/* Meme modal */}
      {modalMeme && (
        <MemeModal
          item={modalMeme}
          pile={modalPile}
          onClose={() => setModalMeme(null)}
          onUnlike={handleUnlike}
          onSwitchToDownvote={handleSwitchVote}
          actionLoading={modalActionLoading}
        />
      )}

      {viewMode === 'pile' && <DuplicatePanel activeMeme={activeMeme} router={router} />}
    </div>
  );
}
