'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function VoteGallery() {
  const [memes, setMemes] = useState<any[]>([]);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      // 1. 检查登录状态
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      // 2. 获取所有 Memes (Captions 联表 Images)
      const { data: captions, error } = await supabase
        .from('captions')
        .select('*, images(url)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching memes:", error);
      } else {
        setMemes(captions || []);
      }

      // 3. 获取当前用户已投票的 ID (用于更新进度条)
      const { data: userVotes } = await supabase
        .from('caption_votes')
        .select('caption_id')
        .eq('profile_id', session.user.id);

      if (userVotes) {
        setVotedIds(new Set(userVotes.map(v => v.caption_id)));
      }

      setLoading(false);
    }
    fetchData();
  }, [router, supabase]);

  // 💡 计算进度
  const total = memes.length;
  const currentCount = votedIds.size;
  const progressPercentage = total > 0 ? (currentCount / total) * 100 : 0;

  if (loading) return (
    <div className="flex h-screen items-center justify-center pl-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 🚀 顶部固定进度条 - 避开侧边栏宽度 */}
      <div className="fixed top-0 left-20 right-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-100 px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex-shrink-0">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Voting Progress</span>
            <div className="text-2xl font-black text-blue-600 leading-none">
              {currentCount} <span className="text-slate-300 text-lg">/ {total}</span>
            </div>
          </div>

          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
            <div
              className="h-full bg-blue-500 transition-all duration-700 ease-out shadow-[0_0_12px_rgba(59,130,246,0.4)]"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          <div className="text-right">
            <span className="text-sm font-black text-blue-600">{Math.round(progressPercentage)}%</span>
          </div>
        </div>
      </div>

      {/* 🖼️ 内容主体 - 左边距 pl-20 对应侧边栏，上边距 pt-28 对应进度条 */}
      <main className="pl-20 pt-28 pb-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-16 px-4">
          {memes.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400">No memes found yet. Go to Upload!</p>
            </div>
          ) : (
            memes.map((item, index) => (
              <div key={item.id} className="relative group animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${index * 50}ms` }}>
                {/* 编号标签 */}
                <div className="absolute -left-6 -top-6 w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center font-black shadow-2xl rotate-[-10deg] group-hover:rotate-0 transition-transform z-10 border-4 border-white">
                  {index + 1}
                </div>

                {/* 这里放你原来的投票组件 */}
                <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-slate-100">
                   <img src={item.images?.url} alt="Meme" className="w-full h-auto" />
                   <div className="p-8 text-center">
                      <p className="text-xl font-bold italic text-slate-800 mb-6">"{item.content}"</p>

                      {/* 注意：你原有的 VotingGroup 组件应该在这里调用 */}
                      {/* 请确保在 VotingGroup 投票成功后执行: setVotedIds(prev => new Set(prev).add(item.id)) */}
                      <div className="py-4 border-t border-slate-50 text-slate-400 text-xs">
                         Ready for your vote 🫡
                      </div>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}