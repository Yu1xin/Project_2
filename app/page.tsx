'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

// 初始化 Supabase 客户端
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
  captionId: string; // 此时 captionId 将接收来自 captions 表的 UUID
  userId: string | undefined
}) {
  const [count, setCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 向 caption_votes 插入数据
    const { error } = await supabase
      .from('caption_votes')
      .insert([
        {
          vote_value: emoji === "👎" ? -1 : 1, // 映射为数字
          profile_id: userId,                  // 用户的 UUID
          caption_id: captionId                // 内容的 UUID
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert(`投票失败: ${error.message}`);
    } else {
      setCount(prev => prev + 1);
      alert("投票成功！已存入数据库。");
    }

    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting}
      className={`flex items-center gap-1 hover:bg-gray-100 px-4 py-2 rounded-full transition border ${
        isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
    >
      <span>{emoji}</span>
      <span className="text-sm text-gray-600 font-medium">{count}</span>
    </button>
  );
}

export default function ListPage() {
  const [captionsList, setCaptionsList] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetch() {
      // 1. 获取会话信息
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserId(session.user.id);

      // 2. 核心修改：从 captions 表获取数据，这里既有文本又有 UUID
      const { data, error } = await supabase
        .from('captions')
        .select('*');

      if (error) {
        setError(error.message);
      } else {
        setCaptionsList(data || []);
      }
      setLoading(false);
    }

    checkAuthAndFetch();
  }, [router]);

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold">Loading Columbia Wisdom... 🦁</div>;
  if (error) return <div className="p-10 text-red-500 text-center">Error fetching captions: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 font-sans bg-gray-50 min-h-screen">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-blue-700 mb-2">🦁 Columbia Meme Gallery</h1>
        <p className="text-gray-500 italic">Rate the best captions from our community</p>
      </header>

      <div className="grid gap-6">
        {captionsList.map((item) => (
          <div key={item.id} className="p-6 border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
            {/* 显示 captions 表中的 content 列 */}
            <p className="text-xl text-gray-800 mb-6 leading-relaxed italic">
              "{item.content}"
            </p>

            <div className="flex gap-4 border-t pt-4">
              {/* 这里的 item.id 是真正的 UUID */}
              <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
              <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
            </div>

            <div className="mt-4 text-[10px] text-gray-300 font-mono">
              ID: {item.id}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
        © 2026 CS Assignment - Data Mutation Success
      </footer>
    </div>
  );
}