'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function InteractionButton({
  value,
  captionId,
  userId
}: {
  value: number;    // 对应你截图里的 vote_value (-1, 1 等)
  captionId: string; // 对应你截图里的 caption_id (uuid)
  userId: string | undefined
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async () => {
    if (!userId) {
      alert("请先登录！");
      return;
    }

    setIsSubmitting(true);

    // 重点：这里的字段名必须和你的截图完全一致
    const { error } = await supabase
      .from('caption_votes') // 请确认你的表名，截图上方被遮住了，假设是这个
      .insert([
        {
          vote_value: value,      // 对应截图第2列
          profile_id: userId,     // 对应截图第3列 (用户的UUID)
          caption_id: captionId   // 对应截图第4列 (Caption的UUID)
        }
      ]);

    if (error) {
      console.error("投票失败:", error.message);
      alert("提交失败，请检查数据库权限 (RLS)");
    } else {
      alert("投票成功！");
    }

    setIsSubmitting(false);
  };

  return (
    <button
      onClick={handleVote}
      disabled={isSubmitting}
      className="px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
    >
      {value > 0 ? "👍 Upvote" : "👎 Downvote"}
    </button>
  );
}

export default function ListPage() {
  const [contexts, setContexts] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // 获取用户信息
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id); // 这里就是你要的 profile_id

      // 获取数据
      const { data } = await supabase.from('community_contexts').select('*');
      setContexts(data || []);
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-8">
      {contexts.map((item) => (
        <div key={item.id} className="mb-6 p-4 border rounded shadow">
          <p className="text-lg mb-4">{item.content}</p>

          <div className="flex gap-4">
            {/* 关键点：将 item.id (caption_id) 和 userId (profile_id) 传下去 */}
            <InteractionButton value={1} captionId={item.id} userId={userId} />
            <InteractionButton value={-1} captionId={item.id} userId={userId} />
          </div>
        </div>
      ))}
    </div>
  );
}