'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function AnalyticsPage() {
  const [report, setReport] = useState<any>(null);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function runAnalytics() {
      // 模拟复杂分析：计算每个用户的平均 Caption 产出
      const { data: users } = await supabase.from('profiles').select('id, count:captions(count)');
      const { data: flavors } = await supabase.from('humor_flavors').select('name, count:captions(count)');

      setReport({
        avgCaptionsPerUser: users ? (users.length / users.reduce((acc, curr) => acc + (curr.count?.[0]?.count || 0), 0)).toFixed(2) : 0,
        flavorDistribution: flavors
      });
    }
    runAnalytics();
  }, [supabase]);

  return (
    <div className="p-10 ml-64 bg-white min-h-screen">
      <h1 className="text-3xl font-bold mb-8">MSBA Analytics Engine 📊</h1>
      <div className="grid grid-cols-2 gap-8">
        <div className="p-6 border rounded-2xl bg-slate-50">
          <h3 className="text-slate-500 text-sm font-bold uppercase">User Productivity Index</h3>
          <p className="text-5xl font-black mt-2">{report?.avgCaptionsPerUser}</p>
          <p className="text-xs text-slate-400 mt-2">Captions generated per registered profile</p>
        </div>
        {/* 这里可以放更多复杂的统计图表 */}
      </div>
    </div>
  );
}