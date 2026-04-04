// app/api/analytics/route.ts
import { createClient } from '@supabase/supabase-js';
async function fetchAllRows<T>(
  supabase: any,
  table: string,
  columns: string,
  pageSize = 1000
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;

    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, to);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows = allRows.concat(data as T[]);

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

type RegressionResult = {
  slope: number;
  intercept: number;
  r2: number;
  n: number;
};

type FactorCard = {
  factor: string;
  impact: number;
  desc: string;
};

type LeaderboardCard = {
  name: string;
  totalLikes: number;
  avgLikes: number;
  captionCount: number;
};

type CaptionRow = {
  id: string;
  like_count: number | null;
  content: string | null;
  image_id: string | null;
  humor_flavor_id: number | null;
  profile_id: string | null;
  created_datetime_utc: string | null;
};

type FlavorRow = {
  id: number;
  slug: string | null;
  description: string | null;
};

type ProfileRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type EnrichedCaptionRow = {
  id: string;
  like_count: number;
  caption_char_len: number;
  caption_word_count: number;
  image_id: string | null;
  humor_flavor_name: string;
  profile_name: string;
  created_bucket: string;
};

function safeMean(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function computeSimpleLinearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, n };

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const meanX = safeMean(xs);
  const meanY = safeMean(ys);

  let numerator = 0;
  let denominator = 0;

  for (const p of points) {
    numerator += (p.x - meanX) * (p.y - meanY);
    denominator += (p.x - meanX) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let ssTot = 0;
  let ssRes = 0;

  for (const p of points) {
    const yHat = intercept + slope * p.x;
    ssTot += (p.y - meanY) ** 2;
    ssRes += (p.y - yHat) ** 2;
  }

  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, intercept, r2, n };
}

function getTimeBucket(createdAt: string | null) {
  if (!createdAt) return 'Unknown';

  const hour = new Date(createdAt).getUTCHours();

  if (hour >= 3 && hour <= 10) return 'Morning (4–11)';
  if (hour >= 11 && hour <= 17) return 'Midday (12–19)';
  return 'Evening (20–3)';
}

function groupAverageImpact(
  rows: EnrichedCaptionRow[],
  key: 'image_id' | 'humor_flavor_name' | 'profile_name' | 'created_bucket',
  minGroupSize = 2
): FactorCard[] {
  const overallMean = safeMean(rows.map(r => r.like_count));
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }

  const results: FactorCard[] = [];

  for (const [groupName, likes] of groups.entries()) {
    if (likes.length < minGroupSize) continue;

    const avg = safeMean(likes);
    const uplift = avg - overallMean;

    results.push({
      factor: groupName,
      impact: uplift,
      desc: `Avg likes ${avg.toFixed(6)} vs overall ${overallMean.toFixed(6)} (n=${likes.length})`,
    });
  }

  return results.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

function buildLeaderboard(
  rows: EnrichedCaptionRow[],
  key: 'image_id' | 'humor_flavor_name' | 'profile_name',
  minGroupSize = 1
): LeaderboardCard[] {
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const groupName = row[key] ?? 'Unknown';
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName)!.push(row.like_count);
  }

  const results: LeaderboardCard[] = [];

  for (const [name, likes] of groups.entries()) {
    if (likes.length < minGroupSize) continue;

    results.push({
      name,
      totalLikes: likes.reduce((a, b) => a + b, 0),
      avgLikes: safeMean(likes),
      captionCount: likes.length,
    });
  }

  return results.sort((a, b) => Math.abs(b.avgLikes) - Math.abs(a.avgLikes));
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [captions, flavors, profiles, votesRes, , imageCountRes, dailyVotesRes, dailyUsersRes, dailyImagesRes, dailyFlavorsRes] = await Promise.all([
    fetchAllRows<CaptionRow>(supabase, 'captions', 'id, like_count, content, image_id, humor_flavor_id, profile_id, created_datetime_utc'),
    fetchAllRows<FlavorRow>(supabase, 'humor_flavors', 'id, description, slug'),
    fetchAllRows<ProfileRow>(supabase, 'profiles', 'id, first_name, last_name'),
    fetchAllRows<{ vote_value: number; created_datetime_utc: string }>(supabase, 'caption_votes', 'vote_value, created_datetime_utc'),
    Promise.resolve(null),
    supabase.from('images').select('id', { count: 'exact', head: true }),
    supabase.from('caption_votes').select('created_datetime_utc, vote_value').gte('created_datetime_utc', since30d),
    supabase.from('profiles').select('created_datetime_utc').gte('created_datetime_utc', since30d),
    supabase.from('images').select('created_datetime_utc').gte('created_datetime_utc', since30d),
    supabase.from('humor_flavors').select('created_datetime_utc').gte('created_datetime_utc', since30d),
  ]);


  const flavorNameById = new Map<number, string>();
  const flavorSlugById = new Map<number, string>();
  for (const f of flavors) {
    flavorNameById.set(f.id, f.description ?? f.slug ?? `Flavor ${f.id}`);
    flavorSlugById.set(f.id, f.slug ?? `flavor-${f.id}`);
  }

  const profileNameById = new Map<string, string>();

  for (const p of profiles) {
    const name = [p.first_name, p.last_name].filter(Boolean).join(' ').trim();
    profileNameById.set(
      p.id,
      name || `User ${p.id.slice(0, 8)}`
    );
  }

  const rows: EnrichedCaptionRow[] = captions.map((c) => ({
    id: c.id,
    like_count: Number(c.like_count ?? 0),
    caption_char_len: (c.content ?? '').length,
    caption_word_count: (c.content ?? '').trim().split(/\s+/).filter(Boolean).length,
    image_id: c.image_id,
    humor_flavor_name:
      c.humor_flavor_id != null
        ? flavorNameById.get(c.humor_flavor_id) ?? `Flavor ${c.humor_flavor_id}`
        : 'Unknown',
    profile_name:
      c.profile_id != null
        ? profileNameById.get(c.profile_id) ?? `User ${c.profile_id.slice(0, 8)}`
        : 'Unknown User',
    created_bucket: getTimeBucket(c.created_datetime_utc),
  }))
  .filter(r => Number.isFinite(r.like_count));

  const charLenRegression = computeSimpleLinearRegression(
    rows.map(r => ({ x: r.caption_char_len, y: r.like_count }))
  );

  const wordCountRegression = computeSimpleLinearRegression(
    rows.map(r => ({ x: r.caption_word_count, y: r.like_count }))
  );

  const timeBucketFactors = groupAverageImpact(rows, 'created_bucket', 2);

  const topProfilesByLikes = buildLeaderboard(rows, 'profile_name', 1).slice(0, 8);
  const topImagesByLikes = buildLeaderboard(rows, 'image_id', 1).slice(0, 8);
  const topFlavorsByLikes = buildLeaderboard(rows, 'humor_flavor_name', 1).slice(0, 8);

  // ── Platform stats ──
  const allVotes = votesRes;
  const totalUpvotes = allVotes.filter(v => v.vote_value === 1).length;
  const totalDownvotes = allVotes.filter(v => v.vote_value === -1).length;
  const platformStats = {
    totalCaptions: captions.length,
    publicCaptions: captions.filter(c => (c as any).is_public === true).length,
    totalVotes: allVotes.length,
    totalUpvotes,
    totalDownvotes,
    totalUsers: profiles.length,
    totalImages: imageCountRes.count ?? 0,
    totalFlavors: flavors.length,
    maxLikes: Math.max(...captions.map(c => Number(c.like_count ?? 0))),
    minLikes: Math.min(...captions.map(c => Number(c.like_count ?? 0))),
  };

  // ── Daily activity (last 30 days) ──
  function toDay(iso: string) { return iso.slice(0, 10); }
  const captionsByDay = new Map<string, number>();
  for (const c of captions) {
    if (!c.created_datetime_utc) continue;
    const day = toDay(c.created_datetime_utc);
    if (day < since30d.slice(0, 10)) continue;
    captionsByDay.set(day, (captionsByDay.get(day) ?? 0) + 1);
  }
  const votesByDay = new Map<string, number>();
  for (const v of (dailyVotesRes.data ?? [])) {
    if (!v.created_datetime_utc) continue;
    const day = toDay(v.created_datetime_utc);
    votesByDay.set(day, (votesByDay.get(day) ?? 0) + 1);
  }
  const usersByDay = new Map<string, number>();
  for (const r of (dailyUsersRes.data ?? [])) {
    if (!r.created_datetime_utc) continue;
    const day = toDay(r.created_datetime_utc);
    usersByDay.set(day, (usersByDay.get(day) ?? 0) + 1);
  }
  const imagesByDay = new Map<string, number>();
  for (const r of (dailyImagesRes.data ?? [])) {
    if (!r.created_datetime_utc) continue;
    const day = toDay(r.created_datetime_utc);
    imagesByDay.set(day, (imagesByDay.get(day) ?? 0) + 1);
  }
  const flavorsByDay = new Map<string, number>();
  for (const r of (dailyFlavorsRes.data ?? [])) {
    if (!r.created_datetime_utc) continue;
    const day = toDay(r.created_datetime_utc);
    flavorsByDay.set(day, (flavorsByDay.get(day) ?? 0) + 1);
  }

  const allDays = Array.from(new Set([
    ...captionsByDay.keys(), ...votesByDay.keys(),
    ...usersByDay.keys(), ...imagesByDay.keys(), ...flavorsByDay.keys(),
  ])).sort();
  const dailyActivity = allDays.map(day => ({
    day,
    captions: captionsByDay.get(day) ?? 0,
    votes: votesByDay.get(day) ?? 0,
    newUsers: usersByDay.get(day) ?? 0,
    newImages: imagesByDay.get(day) ?? 0,
    newFlavors: flavorsByDay.get(day) ?? 0,
  }));

  // ── Flavor usage vs performance ──
  const flavorStats = new Map<number, { count: number; totalLikes: number }>();
  for (const c of captions) {
    if (c.humor_flavor_id == null) continue;
    const cur = flavorStats.get(c.humor_flavor_id) ?? { count: 0, totalLikes: 0 };
    cur.count += 1;
    cur.totalLikes += Number(c.like_count ?? 0);
    flavorStats.set(c.humor_flavor_id, cur);
  }
  const flavorPerformance = Array.from(flavorStats.entries())
    .map(([id, { count, totalLikes }]) => ({
      slug: flavorSlugById.get(id) ?? `flavor-${id}`,
      captionCount: count,
      avgLikes: count > 0 ? totalLikes / count : 0,
    }))
    .sort((a, b) => b.captionCount - a.captionCount)
    .slice(0, 20);

  return Response.json({
    sampleSize: rows.length,
    charLenRegression,
    wordCountRegression,
    timeBucketFactors,
    topProfilesByLikes,
    topImagesByLikes,
    topFlavorsByLikes,
    platformStats,
    dailyActivity,
    flavorPerformance,
  });
}