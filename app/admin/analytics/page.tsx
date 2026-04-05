'use client';
import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const display = useAnimatedNumber(value);
  return <span className={className}>{display.toLocaleString()}</span>;
}

function useAnimatedNumber(target: number) {
  const [display, setDisplay] = useState(target);
  const prev = useRef(target);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + diff * ease));
      if (t < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prev.current = target;
      }
    };
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target]);

  return display;
}

type PlatformStats = {
  totalCaptions: number;
  publicCaptions: number;
  totalVotes: number;
  totalUpvotes: number;
  totalDownvotes: number;
  totalUsers: number;
  totalImages: number;
  totalFlavors: number;
  maxLikes: number;
  minLikes: number;
};

type DailyActivity = { day: string; captions: number; votes: number; newUsers: number; newImages: number; newFlavors: number };

export default function AdminAnalyticsOverview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);

  useEffect(() => {
    async function run() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (data.error) { setError(data.error); setLoading(false); return; }
        setPlatformStats(data.platformStats || null);
        setDailyActivity(data.dailyActivity || []);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message || 'Failed to load analytics');
        setLoading(false);
      }
    }
    run();
  }, []);

  // Realtime subscriptions — update stat bubbles live
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const channel = supabase
      .channel('analytics-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'captions' }, () => {
        setPlatformStats((prev) => prev ? { ...prev, totalCaptions: prev.totalCaptions + 1 } : prev);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'caption_votes' }, (payload) => {
        const vote = payload.new?.vote_value;
        setPlatformStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalVotes: prev.totalVotes + 1,
            totalUpvotes: prev.totalUpvotes + (vote === 1 ? 1 : 0),
            totalDownvotes: prev.totalDownvotes + (vote === -1 ? 1 : 0),
          };
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'caption_votes' }, (payload) => {
        const vote = payload.old?.vote_value;
        setPlatformStats((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalVotes: Math.max(0, prev.totalVotes - 1),
            totalUpvotes: Math.max(0, prev.totalUpvotes - (vote === 1 ? 1 : 0)),
            totalDownvotes: Math.max(0, prev.totalDownvotes - (vote === -1 ? 1 : 0)),
          };
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Caption Analytics Dashboard</h2>
          <p className="text-zinc-400 text-xs">Platform overview and recent activity</p>
        </div>
      </div>

      {loading && <div className="text-center text-zinc-400 py-10">Loading may take some time... Don't leave🥺</div>}
      {error && <div className="text-center text-red-400 py-10">Error: {error}</div>}

      {!loading && !error && (
        <>
          {/* ── BUBBLE STATS ── */}
          {platformStats && (() => {
            const bubbles = [
              { label: 'Captions', rawValue: platformStats.totalCaptions, icon: '💬', bg: 'bg-blue-500/20', border: 'border-blue-500/40', color: 'text-blue-300' },
              { label: 'Images',   rawValue: platformStats.totalImages,   icon: '🖼️', bg: 'bg-cyan-500/20',  border: 'border-cyan-500/40',  color: 'text-cyan-300' },
              { label: 'Users',    rawValue: platformStats.totalUsers,    icon: '👤', bg: 'bg-amber-500/20', border: 'border-amber-500/40', color: 'text-amber-300' },
              { label: 'Flavors',  rawValue: platformStats.totalFlavors,  icon: '😂', bg: 'bg-pink-500/20',  border: 'border-pink-500/40',  color: 'text-pink-300' },
            ];
            const allValues = [...bubbles.map(b => b.rawValue), platformStats.totalVotes];
            const maxVal = Math.max(...allValues);
            const MIN_PX = 80, MAX_PX = 180;
            const sqrtMax = Math.sqrt(maxVal);
            const voteSize = Math.round(MIN_PX + (Math.sqrt(platformStats.totalVotes) / sqrtMax) * (MAX_PX - MIN_PX));
            const voteData = [
              { name: 'Upvotes', value: platformStats.totalUpvotes },
              { name: 'Downvotes', value: platformStats.totalDownvotes },
            ];
            return (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400 mb-6">Platform at a Glance</h3>
                <div className="flex flex-wrap items-end justify-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center relative transition-transform hover:scale-105 overflow-hidden"
                      style={{ width: voteSize, height: voteSize }}
                    >
                      <PieChart width={voteSize} height={voteSize}>
                        <Pie data={voteData} cx={voteSize / 2} cy={voteSize / 2} innerRadius={voteSize * 0.25} outerRadius={voteSize * 0.46} dataKey="value" strokeWidth={0}>
                          <Cell fill="#34d399" />
                          <Cell fill="#f87171" />
                        </Pie>
                      </PieChart>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-base leading-none">🗳️</span>
                        <AnimatedCount value={platformStats.totalVotes} className={`font-black leading-tight text-center ${voteSize < 100 ? 'text-[10px]' : 'text-xs'} text-zinc-200`} />
                      </div>
                    </div>
                    <span className="text-[11px] text-zinc-400 text-center whitespace-nowrap">Votes</span>
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-emerald-400">⬆ <AnimatedCount value={platformStats.totalUpvotes} /></span>
                      <span className="text-red-400">⬇ <AnimatedCount value={platformStats.totalDownvotes} /></span>
                    </div>
                  </div>
                  {bubbles.map(({ label, rawValue, icon, bg, border, color }) => {
                    const size = Math.round(MIN_PX + (Math.sqrt(rawValue) / sqrtMax) * (MAX_PX - MIN_PX));
                    return (
                      <div key={label} className="flex flex-col items-center gap-2">
                        <div
                          className={`rounded-full border-2 ${bg} ${border} flex flex-col items-center justify-center transition-transform hover:scale-105`}
                          style={{ width: size, height: size }}
                        >
                          <span className="text-lg leading-none">{icon}</span>
                          <AnimatedCount value={rawValue} className={`font-black leading-tight text-center px-1 ${size < 100 ? 'text-xs' : size < 140 ? 'text-sm' : 'text-base'} ${color}`} />
                        </div>
                        <span className="text-[11px] text-zinc-400 text-center whitespace-nowrap">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── ACTIVITY CHART ── */}
          {dailyActivity.length > 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-400 mb-1">📅 Activity Over Last 30 Days</h3>
              <p className="text-[11px] text-zinc-500 mb-4">Left axis: votes / users / images / flavors &nbsp;·&nbsp; Right axis: captions</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyActivity} margin={{ top: 4, right: 48, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis yAxisId="left" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={36} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#60a5fa', fontSize: 11 }} width={48} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }} labelStyle={{ color: '#e4e4e7' }} />
                  <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="votes"      stroke="#34d399" strokeWidth={2}   dot={false} name="Votes" />
                  <Line yAxisId="left"  type="monotone" dataKey="newImages"  stroke="#22d3ee" strokeWidth={2}   dot={false} name="New Images" />
                  <Line yAxisId="left"  type="monotone" dataKey="newFlavors" stroke="#f472b6" strokeWidth={2}   dot={false} name="New Flavors" />
                  <Line yAxisId="right" type="monotone" dataKey="captions"   stroke="#60a5fa" strokeWidth={2.5} dot={false} name="Captions Created" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
