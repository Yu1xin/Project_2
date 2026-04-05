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

type DailyActivity = { day: string; captions: number; votes: number; newUsers: number; newImages: number; newFlavors: number };

type FlavorPerformance = { slug: string; captionCount: number; avgLikes: number };

type WordScore = { word: string; topCount: number; bottomCount: number; score: number };
type StepCountBucket = { steps: number; flavorCount: number; captionCount: number; weightedAvgLikes: number };
type FlavorOutcome = { slug: string; stepCount: number; avgLikes: number; captionCount: number; reliability: string; expectedPer10: number };
type BestMix = { optimalSteps: number; predictedAvgLikes: number; keyTraits: string[]; bestStepData: StepCountBucket };
type FlavorInsights = {
  totalFlavorsAnalyzed: number;
  stepCountAnalysis: StepCountBucket[];
  topDiscriminatingWords: WordScore[];
  bottomDiscriminatingWords: WordScore[];
  bestMix: BestMix;
  flavorOutcomes: FlavorOutcome[];
};

export default function AdminAnalytics() {
  const [leaderboardSortBy, setLeaderboardSortBy] = useState<'avgLikes' | 'totalLikes'>('avgLikes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flavorInsights, setFlavorInsights] = useState<FlavorInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [selectedOutcomeFlavor, setSelectedOutcomeFlavor] = useState<string>('');

  const [charLenReg, setCharLenReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [sampleSize, setSampleSize] = useState(0);

  const [timeBucketFactors, setTimeBucketFactors] = useState<FactorCard[]>([]);
  const [topProfilesByLikes, setTopProfilesByLikes] = useState<LeaderboardCard[]>([]);
  const [topImagesByLikes, setTopImagesByLikes] = useState<LeaderboardCard[]>([]);
  const [topFlavorsByLikes, setTopFlavorsByLikes] = useState<LeaderboardCard[]>([]);
  const [topCaptionsByLikes, setTopCaptionsByLikes] = useState<LeaderboardCard[]>([]);
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
  const [activeTab, setActiveTab] = useState<'overview' | 'factors' | 'flavor'>('overview');

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
        setTopCaptionsByLikes(data.topCaptionsByLikes || []);
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

  useEffect(() => {
    fetch('/api/analytics/flavor-insights')
      .then(r => r.json())
      .then(d => { setFlavorInsights(d); setInsightsLoading(false); })
      .catch(() => setInsightsLoading(false));
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
                      avg {item.avgLikes.toFixed(4)} · total {item.totalLikes.toFixed(0)}{item.captionCount !== 1 ? ` · ${item.captionCount} captions` : ''}
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
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-8 border-b border-zinc-800 pb-4">
            {[
              { id: 'overview' as const, icon: '🏠', tabName: 'Overview' },
              { id: 'factors' as const, icon: '📊', tabName: 'Factors Impacting Scores' },
              { id: 'flavor' as const, icon: '🧠', tabName: 'Flavor Intelligence' },
            ].map(({ id, icon, tabName }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
              >
                {icon} {tabName}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (<>
          {/* ── (1) BUBBLE STATS ── */}
          {platformStats && (() => {
            const bubbles = [
              { label: 'Captions', rawValue: platformStats.totalCaptions, display: platformStats.totalCaptions.toLocaleString(), icon: '💬', bg: 'bg-blue-500/20', border: 'border-blue-500/40', color: 'text-blue-300' },
              { label: 'Images', rawValue: platformStats.totalImages, display: platformStats.totalImages.toLocaleString(), icon: '🖼️', bg: 'bg-cyan-500/20', border: 'border-cyan-500/40', color: 'text-cyan-300' },
              { label: 'Users', rawValue: platformStats.totalUsers, display: platformStats.totalUsers.toLocaleString(), icon: '👤', bg: 'bg-amber-500/20', border: 'border-amber-500/40', color: 'text-amber-300' },
              { label: 'Flavors', rawValue: platformStats.totalFlavors, display: platformStats.totalFlavors.toLocaleString(), icon: '😂', bg: 'bg-pink-500/20', border: 'border-pink-500/40', color: 'text-pink-300' },
            ];
            const allValues = [...bubbles.map(b => b.rawValue), platformStats.totalVotes];
            const maxVal = Math.max(...allValues);
            const MIN_PX = 80;
            const MAX_PX = 180;
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

          {/* ── (2) ACTIVITY CHART ── */}
          {dailyActivity.length > 0 && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 mb-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-blue-400 mb-1">📅 Activity Over Last 30 Days</h3>
              <p className="text-[11px] text-zinc-500 mb-4">Left axis: votes / users / images / flavors &nbsp;·&nbsp; Right axis: captions</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyActivity} margin={{ top: 4, right: 48, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  {/* Left Y-axis: small numbers */}
                  <YAxis yAxisId="left" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={36} />
                  {/* Right Y-axis: captions (large numbers) */}
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: '#60a5fa', fontSize: 11 }} width={48} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: 12 }}
                    labelStyle={{ color: '#e4e4e7' }}
                  />
                  <Legend wrapperStyle={{ color: '#a1a1aa', fontSize: 12 }} />
                  <Line yAxisId="left"  type="monotone" dataKey="votes"      stroke="#34d399" strokeWidth={2} dot={false} name="Votes" />
                  <Line yAxisId="left"  type="monotone" dataKey="newImages"  stroke="#22d3ee" strokeWidth={2} dot={false} name="New Images" />
                  <Line yAxisId="left"  type="monotone" dataKey="newFlavors" stroke="#f472b6" strokeWidth={2} dot={false} name="New Flavors" />
                  <Line yAxisId="right" type="monotone" dataKey="captions"   stroke="#60a5fa" strokeWidth={2.5} dot={false} name="Captions Created" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          </>}

          {activeTab === 'factors' && (<>
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
                      <th className="py-2 pl-4 text-zinc-400 font-semibold w-40">Usage (bar)</th>
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

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {renderLeaderboard('Top Profiles', '🏆', 'text-emerald-400', topProfilesByLikes)}
            {renderLeaderboard('Top Images', '🖼️', 'text-cyan-400', topImagesByLikes, imageUrlMap)}
            {renderLeaderboard('Top Flavors', '🙂', 'text-pink-400', topFlavorsByLikes)}
            {renderLeaderboard('Top Captions', '💬', 'text-yellow-400', topCaptionsByLikes)}
          </div>
          </>}

          {activeTab === 'flavor' && (<>
          {/* ── FLAVOR INTELLIGENCE ── */}
          <div className="mt-10 rounded-3xl border border-violet-800/50 bg-zinc-950 p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🧠</span>
              <h3 className="text-lg font-black text-violet-300">Flavor Intelligence</h3>
            </div>
            <p className="text-xs text-zinc-500 mb-6">Patterns from flavors with ≥30 captions · word frequency, step count correlation, and best-mix prediction</p>

            {insightsLoading && <div className="text-zinc-500 text-sm animate-pulse">Analyzing flavor patterns...</div>}

            {!insightsLoading && flavorInsights && (() => {
              const fi = flavorInsights;
              const selectedFlavor = fi.flavorOutcomes.find(f => f.slug === selectedOutcomeFlavor);
              const reliabilityColor = (r: string) => r === 'high' ? 'text-emerald-400' : r === 'medium' ? 'text-amber-400' : 'text-red-400';
              const reliabilityBg = (r: string) => r === 'high' ? 'bg-emerald-900/30 border-emerald-700/40' : r === 'medium' ? 'bg-amber-900/30 border-amber-700/40' : 'bg-red-900/30 border-red-700/40';

              return (
                <div className="space-y-8">

                  {/* Row 1: Step Count + Word Frequency side by side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Step count performance */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">📶 Step Count vs Performance</h4>
                      <div className="space-y-2">
                        {fi.stepCountAnalysis.map(b => {
                          const maxLikes = Math.max(...fi.stepCountAnalysis.map(x => x.weightedAvgLikes));
                          const barPct = maxLikes > 0 ? (b.weightedAvgLikes / maxLikes) * 100 : 0;
                          const isBest = b.steps === fi.bestMix.optimalSteps;
                          return (
                            <div key={b.steps} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${isBest ? 'bg-violet-900/30 border border-violet-700/50' : ''}`}>
                              <span className="w-16 text-xs font-mono text-zinc-300 shrink-0">
                                {b.steps} step{b.steps !== 1 ? 's' : ''} {isBest ? '⭐' : ''}
                              </span>
                              <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${barPct}%` }} />
                              </div>
                              <span className="text-[11px] font-mono text-violet-300 w-24 text-right shrink-0">
                                {b.weightedAvgLikes.toFixed(4)} avg · {b.flavorCount}f
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-3">Weighted by caption count across {fi.totalFlavorsAnalyzed} flavors. "f" = flavor count.</p>
                    </div>

                    {/* Word frequency */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">🔤 Words in Top vs Bottom Flavors</h4>
                      <div className="mb-3">
                        <p className="text-[11px] text-emerald-400 font-bold mb-1.5">✅ More common in top performers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fi.topDiscriminatingWords.map(w => (
                            <span key={w.word} className="rounded-lg bg-emerald-900/40 border border-emerald-700/40 px-2 py-0.5 text-[11px] font-mono text-emerald-300"
                              title={`top:${w.topCount} bottom:${w.bottomCount}`}>
                              {w.word}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] text-red-400 font-bold mb-1.5">❌ More common in bottom performers</p>
                        <div className="flex flex-wrap gap-1.5">
                          {fi.bottomDiscriminatingWords.map(w => (
                            <span key={w.word} className="rounded-lg bg-red-900/30 border border-red-700/40 px-2 py-0.5 text-[11px] font-mono text-red-300"
                              title={`top:${w.topCount} bottom:${w.bottomCount}`}>
                              {w.word}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-3">Hover for counts. Stopwords removed. Document frequency (per-flavor, not raw).</p>
                    </div>
                  </div>

                  {/* Row 2: Best Mix Card */}
                  <div className="rounded-2xl border border-violet-700/60 bg-gradient-to-br from-violet-950/60 to-zinc-950 p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">✨</div>
                      <div className="flex-1">
                        <h4 className="text-base font-black text-violet-200 mb-1">Anticipated Best Humor Mix</h4>
                        <p className="text-xs text-zinc-400 mb-4">Based on weighted performance of top-quartile flavors (≥30 captions each)</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                            <div className="text-2xl font-black text-violet-300">{fi.bestMix.optimalSteps}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Optimal steps</div>
                          </div>
                          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                            <div className="text-2xl font-black text-emerald-300">{(fi.bestMix.predictedAvgLikes).toFixed(4)}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Predicted avg likes</div>
                          </div>
                          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                            <div className="text-2xl font-black text-amber-300">{(fi.bestMix.predictedAvgLikes * 10).toFixed(2)}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Expected per 10 captions</div>
                          </div>
                          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-center">
                            <div className="text-2xl font-black text-cyan-300">{fi.bestMix.bestStepData.captionCount.toLocaleString()}</div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Captions at best step count</div>
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] text-zinc-400 mb-2">Key traits from top-performing flavors:</p>
                          <div className="flex flex-wrap gap-2">
                            {fi.bestMix.keyTraits.map(t => (
                              <span key={t} className="rounded-full bg-violet-900/50 border border-violet-600/40 px-3 py-1 text-xs font-mono text-violet-200">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-4">
                          ⚠️ All avg_likes in this dataset are small (&lt;0.3). This is expected — most captions get 0 votes.
                          Differences between flavors are statistically real but effect sizes are modest.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Outcome Estimator */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">🔮 Anticipated Outcome by Flavor</h4>
                    <div className="flex flex-wrap items-center gap-3 mb-5">
                      <select
                        value={selectedOutcomeFlavor}
                        onChange={e => setSelectedOutcomeFlavor(e.target.value)}
                        className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        <option value="">— pick a flavor —</option>
                        {fi.flavorOutcomes.sort((a, b) => b.avgLikes - a.avgLikes).map(f => (
                          <option key={f.slug} value={f.slug}>
                            {f.slug} ({f.captionCount} captions, {f.reliability} confidence)
                          </option>
                        ))}
                      </select>
                      {selectedFlavor && (
                        <span className={`text-xs font-bold rounded-full px-3 py-1 border ${reliabilityBg(selectedFlavor.reliability)} ${reliabilityColor(selectedFlavor.reliability)}`}>
                          {selectedFlavor.reliability} confidence
                        </span>
                      )}
                    </div>

                    {selectedFlavor ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-black text-zinc-100">{selectedFlavor.avgLikes.toFixed(4)}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">Avg likes per caption</div>
                        </div>
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-black text-amber-300">{selectedFlavor.expectedPer10.toFixed(2)}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">Expected likes per 10 captions</div>
                        </div>
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                          <div className="text-2xl font-black text-cyan-300">{selectedFlavor.stepCount}</div>
                          <div className="text-[10px] text-zinc-500 mt-1">Steps</div>
                        </div>
                        <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 text-center">
                          <div className={`text-2xl font-black ${selectedFlavor.avgLikes >= fi.bestMix.predictedAvgLikes ? 'text-emerald-300' : 'text-red-400'}`}>
                            {selectedFlavor.avgLikes >= fi.bestMix.predictedAvgLikes ? '▲' : '▼'}{' '}
                            {Math.abs((selectedFlavor.avgLikes - fi.bestMix.predictedAvgLikes) / fi.bestMix.predictedAvgLikes * 100).toFixed(0)}%
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-1">vs best mix</div>
                        </div>
                        <div className="col-span-2 md:col-span-4 rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                          <p className="text-xs text-zinc-300">
                            <strong className="text-violet-300">Interpretation:</strong>{' '}
                            If you generate 100 captions with <strong>{selectedFlavor.slug}</strong>, expect roughly{' '}
                            <strong className="text-amber-300">{(selectedFlavor.avgLikes * 100).toFixed(1)} total likes</strong>.{' '}
                            {selectedFlavor.stepCount > fi.bestMix.optimalSteps
                              ? `This flavor uses ${selectedFlavor.stepCount} steps — more than the optimal ${fi.bestMix.optimalSteps}. Reducing steps may improve performance.`
                              : selectedFlavor.stepCount < fi.bestMix.optimalSteps
                              ? `This flavor uses ${selectedFlavor.stepCount} steps — fewer than the optimal ${fi.bestMix.optimalSteps}. Adding an intermediate analysis step may help.`
                              : `Step count (${selectedFlavor.stepCount}) matches the optimal.`}
                            {' '}Confidence is <strong className={reliabilityColor(selectedFlavor.reliability)}>{selectedFlavor.reliability}</strong> ({selectedFlavor.captionCount.toLocaleString()} captions observed).
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs">
                          <thead>
                            <tr className="border-b border-zinc-800">
                              <th className="text-left py-2 pr-4 text-zinc-400 font-semibold">Flavor</th>
                              <th className="text-center py-2 pr-4 text-zinc-400 font-semibold">Steps</th>
                              <th className="text-right py-2 pr-4 text-zinc-400 font-semibold">Avg Likes</th>
                              <th className="text-right py-2 pr-4 text-zinc-400 font-semibold">Per 10</th>
                              <th className="text-center py-2 pr-4 text-zinc-400 font-semibold">Captions</th>
                              <th className="text-center py-2 text-zinc-400 font-semibold">Confidence</th>
                            </tr>
                          </thead>
                          <tbody>
                            {fi.flavorOutcomes.sort((a, b) => b.avgLikes - a.avgLikes).map(f => (
                              <tr
                                key={f.slug}
                                className="border-b border-zinc-800/40 hover:bg-zinc-800/30 cursor-pointer"
                                onClick={() => setSelectedOutcomeFlavor(f.slug)}
                              >
                                <td className="py-1.5 pr-4 font-mono text-zinc-200">{f.slug}</td>
                                <td className="py-1.5 pr-4 text-center text-zinc-300">{f.stepCount}{f.stepCount === fi.bestMix.optimalSteps ? ' ⭐' : ''}</td>
                                <td className={`py-1.5 pr-4 text-right font-mono font-bold ${f.avgLikes > 0 ? 'text-emerald-400' : f.avgLikes < 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                  {f.avgLikes > 0 ? '+' : ''}{f.avgLikes.toFixed(4)}
                                </td>
                                <td className="py-1.5 pr-4 text-right font-mono text-amber-300">{f.expectedPer10.toFixed(2)}</td>
                                <td className="py-1.5 pr-4 text-center text-zinc-400">{f.captionCount.toLocaleString()}</td>
                                <td className={`py-1.5 text-center font-bold ${reliabilityColor(f.reliability)}`}>{f.reliability}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
          </>}
        </>
      )}
    </div>
  );
}
