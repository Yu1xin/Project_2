'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({ emoji, captionId, userId }: { emoji: string; captionId: string; userId: string | undefined }) {
  const [count, setCount] = useState(0);
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
          vote_value: emoji === "👎" ? -1 : 1, // 匹配 int8 类型
          profile_id: userId,                  // 匹配 UUID 类型
          caption_id: captionId                // 匹配 UUID 类型
        }
      ]);

    if (error) {
      alert(`投票失败: ${error.message}`); // 如果还报 UUID 错误，说明 captionId 还是数字
    } else {
      setCount(prev => prev + 1);
      alert("投票成功！数据已写入 caption_votes 表。");
    }
    setIsSubmitting(false);
  };

  return (
    <button onClick={handleVote} disabled={isSubmitting} className="border p-2 rounded">
      {emoji} {count}
    </button>
  );
}

export default function ListPage() {
  const [items, setItems] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }
      setUserId(session.user.id);

      // 关键修改：改用 ID 为 UUID 的表
      const { data } = await supabase.from('caption_examples').select('*');
      setItems(data || []);
    }
    init();
  }, [router]);

  return (
    <div className="p-8">
      {items.map((item) => (
        <div key={item.id} className="mb-4 p-4 border rounded">
          <p>{item.caption_text || item.content}</p> {/* 根据表的实际列名调整 */}
          <div className="flex gap-2 mt-2">
            <InteractionButton emoji="👍" captionId={item.id} userId={userId} />
            <InteractionButton emoji="👎" captionId={item.id} userId={userId} />
          </div>
        </div>
      ))}
    </div>
  );
}