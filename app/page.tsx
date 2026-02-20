'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({ emoji, captionId, userId }: { emoji: string; captionId: string; userId: string | undefined }) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }
    setIsSubmitting(true);

    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1,
          profile_id: userId,
          caption_id: captionId // 这里的 id 现在是从 captions 表拿到的 UUID 了！
        }
      ]);

    if (error) {
      alert(`投票失败: ${error.message}`);
    } else {
      alert("投票成功！数据已进入 caption_votes。");
    }
    setIsSubmitting(false);
  };

  return (
    <button onClick={handleVote} disabled={isSubmitting} className="flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-full transition border cursor-pointer disabled:opacity-50">
      <span>{emoji}</span>
    </button>
  );
}

export default function ListPage() {
  const [items, setItems] = useState<any[]>([]);
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

      // 核心改动：去 captions 表拿数据，因为它有 UUID id 和 contents 文本
      const { data, error } = await supabase
        .from('captions')
        .select('id, contents');

      if (error) {
        console.error("获取数据失败:", error.message);
      } else {
        setItems(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-blue-600">正在寻找最好的 Caption... 🦁</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-2">🦁 Meme Captions</h1>
        <p className="text-gray-500 italic">"Now using the correct UUID data source!"</p>
      </header>

      <div className="grid gap-6">
        {items.map((item) => (
          <div key={item.id} className="p-6 border rounded-xl shadow-sm bg-white">
            <p className="text-lg text-gray-800 mb-6">{item.contents}</p>
            <div className="flex gap-3 border-t pt-4">
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}