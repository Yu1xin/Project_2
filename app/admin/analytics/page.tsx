'use client';
import { useEffect, useRef, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

function AnimatedCount({ value, className }: { value: number; className?: string }) {
  const display = useAnimatedNumber(value);
  return <span className={className}>{display.toLocaleString()}</span>;
}

// Animated number: counts from old value to new value over ~600ms
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
      const ease = 1 - Math.pow(1 - t, 3); // ease-out cubic
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
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { RegressionResult, FactorCard } from '@/types/analytics';

type LeaderboardCard = {
  name: string;
  totalLikes: number;
  avgLikes: number;
  captionCount: number;
};

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

type DailyActivity = { day: string; captions: number; votes: number };

type FlavorPerformance = { slug: string; captionCount: number; avgLikes: number };

export default function AdminAnalytics() {
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'avgLikes' | 'totalLikes'>('avgLikes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [charLenReg, setCharLenReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [sampleSize, setSampleSize] = useState(0);

  const [timeBucketFactors, setTimeBucketFactors] = useState<FactorCard[]>([]);
  const [topProfilesByLikes, setTopProfilesByLikes] = useState<LeaderboardCard[]>([]);
  const [topImagesByLikes, setTopImagesByLikes] = useState<LeaderboardCard[]>([]);
  const [topFlavorsByLikes, setTopFlavorsByLikes] = useState<LeaderboardCard[]>([]);
  const [imageUrlMap, setImageUrlMap] = useState<Record<string, string>>({});

  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [flavorPerformance, setFlavorPerformance] = useState<FlavorPerformance[]>([]);

  const [selectedX, setSelectedX] = useState<'char_len' | 'word_count'>('char_len');
  const currentReg = selectedX === 'char_len' ? charLenReg : wordCountReg;
  const xLabels = {
    char_len: { icon: '📏', name: 'Caption Length (chars)', unit: 'character' },
    word_count: { icon: '📝', name: 'Word Count', unit: 'word' },
  };
  const label = xLabels[selectedX];

  useEffect(() => {
    async function runAnalysis() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const data = await res.json();
        if (data.error) { setError(data.error); setLoading(false); return; }

        setSampleSize(data.sampleSize);
        setCharLenReg(data.charLenRegression);
        setWordCountReg(data.wordCountRegression);
        setTimeBucketFactors(data.timeBucketFactors || []);
        setTopProfilesByLikes(data.topProfilesByLikes || []);
        setTopImagesByLikes(data.topImagesByLikes || []);
        setTopFlavorsByLikes(data.topFlavorsByLikes || []);
        setPlatformStats(data.platformStats || null);
        setDailyActivity(data.dailyActivity || []);
        setFlavorPerformance(data.flavorPerformance || []);

        // Fetch image URLs for leaderboard
        const imageIds: string[] = (data.topImagesByLikes || []).map((i: LeaderboardCard) => i.name);
        if (imageIds.length > 0) {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          );
          const { data: imgRows } = await supabase.from('images').select('id, url').in('id', imageIds);
          if (imgRows) {
            const map: Record<string, string> = {};
            for (const row of imgRows) { if (row.url) map[row.id] = row.url; }
            setImageUrlMap(map);
          }
        }

        setLoading(false);
      } catch (err) {
        setError((err as Error).message || 'Failed to load analytics');
        setLoading(false);
      }
    }
    runAnalysis();
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

  function sortLeaderboard(items: LeaderboardCard[]) {
    return [...items].sort((a, b) =>
      leaderboardSortBy === 'avgLikes'
        ? Math.abs(b.avgLikes) - Math.abs(a.avgLikes)
        : Math.abs(b.totalLikes) - Math.abs(a.totalLikes)
    ).slice(0, 8);
  }

  const renderFactorList = (title: string, icon: string, colorClass: string, factors: FactorCard[]) => (
    <div className="bg-slate-800 p-6 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
      <h3 className={`text-sm font-bold uppercase tracking-wide mb-4 flex items-center gap-2 ${colorClass}`}>
        <span>{icon}</span> {title}
      </h3>
      <div className="space-y-3">
        {factors.length === 0 ? (
          <div className="text-zinc-100 text-sm">No data available</div>
        ) : (
          factors.map((c) => (
            <div key={c.factor} className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
              <div className="min-w-0 pr-4">
                <div className="text-sm text-zinc-100 break-words">{c.factor}</div>
                <div className="text-[11px] text-zinc-100">{c.desc}</div>
              </div>
              <span className={`font-mono font-bold ${c.impact > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {c.impact > 0 ? '+' : ''}{c.impact.toFixed(6)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderLeaderboard = (
    titleBase: string,
    icon: string,
    colorClass: string,
    items: LeaderboardCard[],
    urlMap?: Record<string, string>
  ) => {
    const sortedItems = sortLeaderboard(items);
    return (
      <div className="bg-slate-800 p-6 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
        <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-4 ${colorClass}`}>
          <span>{icon}</span>
          {titleBase} by {leaderboardSortBy === 'avgLikes' ? 'Avg |Likes|' : 'Total |Likes|'}
        </h3>
        <div className="space-y-3">
          {sortedItems.length === 0 ? (
            <div className="text-zinc-100 text-sm">No data available</div>
          ) : (
            sortedItems.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="bg-slate-950 p-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
                {urlMap?.[item.name] && (
                  <img src={urlMap[item.name]} alt="" className="w-full h-28 object-cover rounded-lg mb-3 border border-zinc-700" />
                )}
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-zinc-100 break-words">#{idx + 1} {item.name}</div>
                    <div className="text-[11px] text-zinc-100 mt-1">
                      avg {item.avgLikes.toFixed(4)} · total {item.totalLikes.toFixed(0)} · {item.captionCount} captions
                    </div>
                  </div>
                  <div className={`font-mono font-bold text-sm ${item.avgLikes >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {leaderboardSortBy === 'avgLikes' ? item.avgLikes.toFixed(4) : item.totalLikes.toFixed(0)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Caption Analytics Dashboard</h2>
          <p className="text-zinc-400 text-xs">Caption-level factors associated with likes</p>
        </div>
      </div>

      {loading && <div className="text-center text-zinc-100 py-10">Loading may take some time... Don't leave🥺</div>}
      {error && <div className="text-center text-red-400 py-10">Error: {error}</div>}

      {!loading && !error && (
        <>
          {/* ── (1) BUBBLE STATS ── */}
          {platformStats && (() => {
            const bubbles = [
              { label: 'Captions', rawValue: platformStats.totalCaptions, display: platformStats.totalCaptions.toLocaleString(), icon: '💬', bg: 'bg-blue-500/20', border: 'border-blue-500/40', color: 'text-blue-300' },
              { label: 'Images', rawValue: platformStats.totalImages, display: platformStats.totalImages.toLocaleString(), icon: '🖼️', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', color: 'text-cyan-300' },
              { label: 'Users', rawValue: platformStats.totalUsers, display: platformStats.totalUsers.toLocaleString(), icon: '👤', bg: 'bg-amber-500/20', border: 'border-amber-500/40', color: 'text-amber-300' },
              { label: 'Flavors', rawValue: platformStats.totalFlavors, display: platformStats.totalFlavors.toLocaleString(), icon: '😂', bg: 'bg-pink-500/20', border: 'border-pink-500/40', color: 'text-pink-300' },
            ];
            const maxVal = Math.max(...bubbles.map(b => b.rawValue));
            const MIN_PX = 80;
            const MAX_PX = 180;
            const voteSize = Math.round(MIN_PX + (platformStats.totalVotes / maxVal) * (MAX_PX - MIN_PX));
            const voteData = [
              { name: 'Upvotes', value: platformStats.totalUpvotes },
              { name: 'Downvotes', value: platformStats.totalDownvotes },
            ];
            return (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
                <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400 mb-6">Platform at a Glance</h3>
                <div className="flex flex-wrap items-end justify-center gap-6">
                  {/* Vote pie chart bubble */}
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center relative transition-transform hover:scale-105 overflow-hidden"
                      style={{ width: voteSize, height: voteSize }}
                    >
                      <PieChart width={voteSize} height={voteSize}>
                        <Pie
                          data={voteData}
                          cx={voteSize / 2}
                          cy={voteSize / 2}
                          innerRadius={voteSize * 0.25}
                          outerRadius={voteSize * 0.46}
                          dataKey="value"
                          strokeWidth={0}
                        >
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

                  {/* Regular bubbles */}
                  {bubbles.map(({ label, rawValue, display, icon, bg, border, color }) => {
                    const size = Math.round(MIN_PX + (rawValue / maxVal) * (MAX_PX - MIN_PX));
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

          {/* ── (2) ACTIVITY CHART ── */}
          {dailyActivity.length > 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-400 mb-4">📅 Activity Over Last 30 Days</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyActivity} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                  <Line type="monotone" dataKey="captions" stroke="#60a5fa" strokeWidth={2} dot={false} name="Captions Created" />
                  <Line type="monotone" dataKey="votes" stroke="#34d399" strokeWidth={2} dot={false} name="Votes Cast" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mb-6 text-sm text-zinc-400">
            Total analyzed captions: <strong className="text-zinc-100">{sampleSize.toLocaleString()}</strong>
          </div>

          {/* Regression + time bucket */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-800 p-6 rounded-3xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(xLabels).map(([key, { icon, name }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedX(key as 'char_len' | 'word_count')}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${selectedX === key ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-zinc-100'}`}
                  >
                    {icon} {name}
                  </button>
                ))}
              </div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide mb-4">
                Simple regression: Likes ~ {label.name}
              </h3>
              <div className="bg-slate-950 p-5 rounded-xl font-mono text-sm mb-4 border border-zinc-800">
                <span className="text-emerald-400 font-bold">Likes</span> ≈{' '}
                <span className="text-blue-300">{currentReg.slope.toFixed(6)}</span> ×{' '}
                <span className="text-blue-400">{label.unit}</span> +{' '}
                <span className="text-purple-300">{currentReg.intercept.toFixed(6)}</span>
              </div>
              <div className="text-xs text-zinc-400 space-y-1.5">
                <p>R² = {currentReg.r2.toFixed(6)}</p>
                <p>Samples = {currentReg.n.toLocaleString()}</p>
                <p className="pt-2">Each extra {label.unit} is associated with {currentReg.slope.toFixed(6)} more/fewer likes on average.</p>
              </div>
            </div>
            {renderFactorList('Time Bucket Impact', '🕒', 'text-purple-400', timeBucketFactors)}
          </div>

          {/* ── (3) FLAVOR USAGE VS PERFORMANCE TABLE ── */}
          {flavorPerformance.length > 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-pink-400 mb-4">😂 Flavor Usage vs Performance (top 20 by usage)</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left py-2 pr-6 text-zinc-400 font-semibold">Flavor</th>
                      <th className="text-right py-2 pr-6 text-zinc-400 font-semibold">Captions</th>
                      <th className="text-right py-2 text-zinc-400 font-semibold">Avg Likes</th>
                      <th className="py-2 pl-4 text-zinc-400 font-semibold w-40">Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flavorPerformance.map((f) => {
                      const maxCount = Math.max(...flavorPerformance.map(x => x.captionCount));
                      const barPct = Math.round((f.captionCount / maxCount) * 100);
                      return (
                        <tr key={f.slug} className="border-b border-zinc-800/50 hover:bg-zinc-900/50">
                          <td className="py-2 pr-6 text-zinc-100 font-mono text-xs">{f.slug}</td>
                          <td className="py-2 pr-6 text-right text-zinc-300">{f.captionCount.toLocaleString()}</td>
                          <td className={`py-2 pr-4 text-right font-bold font-mono text-xs ${f.avgLikes > 0 ? 'text-emerald-400' : f.avgLikes < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                            {f.avgLikes > 0 ? '+' : ''}{f.avgLikes.toFixed(3)}
                          </td>
                          <td className="py-2 pl-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${f.avgLikes >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                  style={{ width: `${barPct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Leaderboard sort toggle */}
          <div className="flex flex-wrap gap-3 mb-6">
            {(['avgLikes', 'totalLikes'] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setLeaderboardSortBy(opt)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${leaderboardSortBy === opt ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-700 hover:bg-slate-600 text-zinc-100'}`}
              >
                Sort by {opt === 'avgLikes' ? 'Avg |Likes|' : 'Total |Likes|'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {renderLeaderboard('Top Profiles', '🏆', 'text-emerald-400', topProfilesByLikes)}
            {renderLeaderboard('Top Images', '🖼️', 'text-cyan-400', topImagesByLikes, imageUrlMap)}
            {renderLeaderboard('Top Flavors', '🙂', 'text-pink-400', topFlavorsByLikes)}
          </div>
        </>
      )}
    </div>
  );
}
