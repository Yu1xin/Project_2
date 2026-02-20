'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({
  emoji,
  captionId,
  userId
}: {
  emoji: string;
  captionId: string;
  userId: string | undefined
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false); // Track if voted locally

  const handleVote = async () => {
    if (!userId || hasVoted) return;

    setIsSubmitting(true);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('caption_votes')
      .upsert(
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId,
          modified_datetime_utc: now,
          created_datetime_utc: now
        },
        { onConflict: 'profile_id, caption_id' }
      );

    if (error) {
      console.error("Operation failed:", error.message);
      // Only alert for actual errors
      alert(`Error: ${error.message}`);
    } else {
      // Silent success: lock the button instead of alerting
      setHasVoted(true);
    }
    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting || hasVoted}
      className={`flex items-center gap-1 px-4 py-2 rounded-full transition border shadow-sm ${
        hasVoted
          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
          : 'hover:bg-blue-50 hover:border-blue-300 cursor-pointer active:scale-95'
      }`}
    >
      <span className={hasVoted ? 'grayscale opacity-50' : ''}>{emoji}</span>
      <span className="text-xs font-semibold">
        {hasVoted ? 'Voted' : (emoji === "👎" ? 'Down' : 'Up')}
      </span>
    </button>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);

      const { data, error } = await supabase
        .from('captions')
        .select('*');

      if (!error) {
        setCaptionsList(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-blue-600 font-medium">Loading Community Insights... 🦁</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans bg-white min-h-screen">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-slate-900 mb-3 tracking-tight">
          🦁 Columbia Meme Gallery
        </h1>
        <p className="text-slate-500 text-lg">
          Express your feelings on the latest campus trends.
        </p>
      </header>

      <div className="grid gap-8">
        {captionsList.map((item) => (
          <div key={item.id} className="p-8 border border-slate-200 rounded-3xl shadow-sm bg-slate-50/50">
            <p className="text-xl text-slate-800 mb-8 font-medium leading-relaxed italic">
              "{item.content}"
            </p>

            <div className="flex gap-4 items-center">
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />

              <div className="ml-auto text-[10px] text-slate-300 font-mono select-none">
                REF_ID: {item.id.slice(0, 8)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-24 text-center text-slate-400 text-xs pb-12">
        <p>Verified Student Identity: {userId?.slice(0, 12)}...</p>
        <p className="mt-2 font-mono uppercase tracking-widest">
          © 2026 CS DATA MUTATION PROJECT
        </p>
      </footer>
    </div>
  );
}