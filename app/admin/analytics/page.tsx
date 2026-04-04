'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
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
          {/* ── (1) STAT CARDS ── */}
          {platformStats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Captions', value: platformStats.totalCaptions.toLocaleString(), icon: '💬', color: 'text-blue-400' },
                { label: 'Total Votes', value: platformStats.totalVotes.toLocaleString(), icon: '🗳️', color: 'text-emerald-400' },
                { label: 'Total Users', value: platformStats.totalUsers.toLocaleString(), icon: '👤', color: 'text-amber-400' },
                { label: 'Total Images', value: platformStats.totalImages.toLocaleString(), icon: '🖼️', color: 'text-cyan-400' },
                { label: 'Upvotes', value: platformStats.totalUpvotes.toLocaleString(), icon: '⬆️', color: 'text-emerald-400' },
                { label: 'Downvotes', value: platformStats.totalDownvotes.toLocaleString(), icon: '⬇️', color: 'text-red-400' },
                { label: 'Upvote Rate', value: `${platformStats.totalVotes ? ((platformStats.totalUpvotes / platformStats.totalVotes) * 100).toFixed(1) : 0}%`, icon: '📊', color: 'text-violet-400' },
                { label: 'Flavors', value: platformStats.totalFlavors.toLocaleString(), icon: '😂', color: 'text-pink-400' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <div className="text-lg mb-1">{icon}</div>
                  <div className={`text-2xl font-black ${color}`}>{value}</div>
                  <div className="text-xs text-zinc-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          )}

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
