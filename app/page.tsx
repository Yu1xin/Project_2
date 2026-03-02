'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function VoteGallery() {
  const [memes, setMemes] = useState<any[]>([]);
  const [votedCount, setVotedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        // 1. 获取 Memes：显式选择需要的字段
        const { data: captionData, error: captionError } = await supabase
          .from('captions')
          .select(`
            id,
            content,
            image_id,
            images (url)
          `)
          .order('created_at', { ascending: false });

        if (captionError) throw captionError;
        console.log("Memes loaded:", captionData); // 调试：确保 console 能看到数据
        setMemes(captionData || []);

        // 2. 获取该用户的投票总数
        const { count, error: countError } = await supabase
          .from('caption_votes')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', session.user.id);

        if (countError) throw countError;
        setVotedCount(count || 0);

      } catch (err) {
        console.error("Critical Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [router]);

  const total = memes.length;
  const progress = total > 0 ? (votedCount / total) * 100 : 0;

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white font-bold text-blue-600 animate-pulse">
      LOADING DATA...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* 🚀 顶部进度条 - 使用 fixed 确保不随页面滚动 */}
      <div className="fixed top-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-sm border-b border-slate-200 h-24 flex items-center shadow-md">
        <div className="w-full max-w-5xl mx-auto px-6 md:px-32 flex items-center gap-8">
          <div className="flex-shrink-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">VOTING PROGRESS</p>
            <p className="text-2xl font-black text-blue-600 leading-none">
              {votedCount} <span className="text-slate-300 text-base">/ {total}</span>
            </p>
          </div>
          <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className="h-full bg-blue-500 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm font-black text-blue-600">{Math.round(progress)}%</p>
        </div>
      </div>

      {/* 🖼️ 内容主体 - 避让左侧侧边栏 (pl-20) 和顶部进度条 (pt-32) */}
      <main className="pt-32 pb-20 pl-20 transition-all">
        <div className="max-w-2xl mx-auto flex flex-col gap-12 px-6">
          {memes.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-200 text-center shadow-inner">
               <p className="text-slate-500 font-bold italic text-lg leading-relaxed">
                 "No memes found yet.<br/>Upload your first masterpiece!"
               </p>
            </div>
          ) : (
            memes.map((m, i) => (
              <div key={m.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                {/* 序号标签 */}
                <div className="absolute top-6 left-6 bg-black/90 text-white px-5 py-2 rounded-2xl font-black z-10 shadow-lg border border-white/20">
                  #{i + 1}
                </div>

                {/* 图片 */}
                <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                  {m.images?.url ? (
                    <img src={m.images.url} className="w-full h-full object-contain" alt="Meme" />
                  ) : (
                    <div className="text-slate-300 font-bold uppercase tracking-tighter">Image Missing</div>
                  )}
                </div>

                {/* 内容 */}
                <div className="p-10 text-center border-t border-slate-50">
                  <blockquote className="text-2xl font-black italic text-slate-800 leading-tight mb-8">
                    "{m.content}"
                  </blockquote>

                  {/* 投票按钮 */}
                  <div className="flex justify-center gap-4">
                    <button className="flex-1 max-w-[140px] bg-blue-50 text-blue-600 px-6 py-4 rounded-2xl font-black hover:bg-blue-600 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm">
                      👍 YES
                    </button>
                    <button className="flex-1 max-w-[140px] bg-red-50 text-red-600 px-6 py-4 rounded-2xl font-black hover:bg-red-600 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm">
                      👎 NO
                    </button>
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