'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function LeastFavoredPage() {
  const [leastFavored, setLeastFavored] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function getLeastFavored() {
      setLoading(true);
      // 1. 获取所有数据
      const { data: votes, error: vError } = await supabase.from('caption_votes').select('caption_id, vote_value');
      const { data: captions, error: cError } = await supabase.from('captions').select('*, images(url)');

      if (vError || cError || !captions) {
        console.error("Fetch Error:", vError || cError);
        return;
      }

      // 2. 创建一个 Map 来计算总分 (初始化所有 Caption 为 0 分)
      const scoreMap = new Map<string, number>();
      captions.forEach(c => scoreMap.set(c.id, 0));

      // 3. 累加分数 (关键点：确保字段名和类型匹配)
      if (votes) {
        votes.forEach(v => {
          if (scoreMap.has(v.caption_id)) {
            const current = scoreMap.get(v.caption_id) || 0;
            scoreMap.set(v.caption_id, current + v.vote_value);
          }
        });
      }

      // 调试：在控制台看看分数情况
      console.log("Calculated Scores:", Object.fromEntries(scoreMap));

      // 4. 转换回数组并排序
      const allCaptionsWithScores = captions.map(c => ({
        ...c,
        totalScore: scoreMap.get(c.id) || 0
      }));

      // 按分数从小到大排序
      const sorted = [...allCaptionsWithScores].sort((a, b) => a.totalScore - b.totalScore);

      // 5. 计算 20% Percentile 阈值
      // 如果总共有 10 个 meme，取第 2 个的分数作为阈值
      const thresholdIndex = Math.max(0, Math.floor(sorted.length * 0.2) - 1);
      const thresholdScore = sorted[thresholdIndex]?.totalScore ?? 0;

      console.log("Threshold Score (20%):", thresholdScore);

      // 6. 过滤出得分低于或等于阈值的（至少会展示底部的 20%）
      const filtered = sorted.filter(c => c.totalScore <= thresholdScore);

      setLeastFavored(filtered);
      setLoading(false);
    }
    getLeastFavored();
  }, []);



  if (loading) return <div className="p-20 text-center animate-pulse">Analyzing the "Least Favored"... 📉</div>;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white min-h-screen">
      <header className="mb-12">
        <h1 className="text-3xl font-black text-red-600 mb-2">Bottom 20% Gallery</h1>
        <p className="text-slate-500">The memes that didn't quite land with the crowd.</p>
      </header>

      <div className="grid gap-12">
        {leastFavored.map(item => (
          <div key={item.id} className="opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
            {item.images?.url && (
              <img src={item.images.url} className="w-full rounded-2xl mb-4 border border-slate-100" alt="Meme" />
            )}
            <p className="text-lg text-slate-700 italic mb-2">"{item.content}"</p>
            <div className="text-xs font-bold text-red-500 uppercase tracking-widest">
              Current Score: {item.totalScore}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-20 text-center">
        <Link href="/main" className="text-blue-600 hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );
}