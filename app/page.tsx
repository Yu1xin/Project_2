'use client';

import { useState, useEffect, useRef } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function VotingGroup({ captionId, userId }: { captionId: string; userId: string | undefined }) {
  const [votedType, setVotedType] = useState<'up' | 'down' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (type: 'up' | 'down') => {
    if (!userId || votedType) return;
    setIsSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .upsert({
        vote_value: type === 'up' ? 1 : -1,
        profile_id: userId,
        caption_id: captionId,
        modified_datetime_utc: now,
        created_datetime_utc: now
      }, { onConflict: 'profile_id, caption_id' });

    if (!error) setVotedType(type);
    else alert(`Error: ${error.message}`);
    setIsSubmitting(false);
  };

  const handleUndo = async () => {
    if (!userId) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('caption_votes')
      .delete()
      .match({ profile_id: userId, caption_id: captionId });

    if (!error) setVotedType(null);
    else alert(`Undo failed: ${error.message}`);
    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => handleVote('up')}
        disabled={isSubmitting || votedType !== null}
        className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${
          votedType === 'up'
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50'
        } ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-zinc-800' : 'cursor-default'}`}
      >
        <span>👍</span>
        <span className="text-xs font-bold uppercase">{votedType === 'up' ? 'Upvoted' : 'Up'}</span>
      </button>

      <button
        onClick={() => handleVote('down')}
        disabled={isSubmitting || votedType !== null}
        className={`flex items-center gap-2 rounded-full border px-6 py-2 transition ${
          votedType === 'down'
            ? 'border-red-600 bg-red-600 text-white'
            : 'border-zinc-700 bg-zinc-900 text-zinc-200 disabled:opacity-50'
        } ${!votedType && !isSubmitting ? 'cursor-pointer hover:bg-zinc-800' : 'cursor-default'}`}
      >
        <span>👎</span>
        <span className="text-xs font-bold uppercase">{votedType === 'down' ? 'Downvoted' : 'Down'}</span>
      </button>

      {votedType && (
        <button
          onClick={handleUndo}
          className="ml-2 text-xs text-zinc-400 underline transition-colors hover:text-blue-400"
        >
          Reset Vote
        </button>
      )}
    </div>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);

      const { data, error } = await supabase.from('captions').select('*, images(url)');
      if (!error) setCaptionsList(data || []);
      setLoading(false);
    }
    fetchData();
  }, [router]);

  useEffect(() => {
    const updateActive = () => {
      const centerY = window.innerHeight / 2;
      let bestIndex = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      cardRefs.current.forEach((el, idx) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const elCenter = rect.top + rect.height / 2;
        const dist = Math.abs(elCenter - centerY);
        if (dist < bestDist) { bestIndex = idx; bestDist = dist; }
      });
      setActiveIndex(bestIndex);
    };
    window.addEventListener('scroll', updateActive);
    return () => window.removeEventListener('scroll', updateActive);
  }, [captionsList]);

  if (loading) return <div className="p-10 text-center font-mono text-zinc-300">LOADING...</div>;

  return (
    <div className="min-h-screen max-w-3xl mx-auto bg-transparent p-6 text-zinc-100">
      <header className="mb-16 text-center">
        <h1 className="mb-4 text-5xl font-black tracking-tight text-blue-400">Meme Board</h1>
      </header>

      <div className="space-y-16">
        {captionsList.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={item.id}
              ref={(el) => { cardRefs.current[index] = el; }}
              className={`overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 transition-all duration-500 ${
                isActive ? 'scale-105 opacity-100 shadow-2xl' : 'scale-90 opacity-50 shadow-sm'
              }`}
            >
              {item.images?.url && (
                <div className="w-full aspect-video">
                  <img src={item.images.url} alt="Meme" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-8">
                <blockquote className="mb-8 text-2xl font-semibold italic text-zinc-100">
                  "{item.content}"
                </blockquote>
                <VotingGroup captionId={item.id} userId={userId} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}