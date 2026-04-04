import { createClient } from '@supabase/supabase-js';

const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','by','from',
  'is','are','was','were','be','been','being','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','can','not','no','so','if',
  'as','this','that','these','those','it','its','i','you','he','she','we','they',
  'what','which','who','how','when','where','your','our','their','my','his','her',
  'only','also','just','about','more','than','then','there','here','like','very',
  'all','any','each','both','few','more','most','other','some','such','into',
  'through','during','before','after','above','below','between','own','same',
  'return','only','valid','json','image','caption','captions','write','based',
  'do','not','does','your','job','output','step','steps','following',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function wordFrequency(texts: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const text of texts) {
    const seen = new Set<string>(); // count per-document, not raw frequency
    for (const word of tokenize(text)) {
      if (!seen.has(word)) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
        seen.add(word);
      }
    }
  }
  return freq;
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // ── Fetch flavor performance ──
  const { data: captionAgg } = await supabase
    .from('captions')
    .select('humor_flavor_id, like_count')
    .not('humor_flavor_id', 'is', null);

  const { data: flavors } = await supabase
    .from('humor_flavors')
    .select('id, slug, description');

  const { data: steps } = await supabase
    .from('humor_flavor_steps')
    .select('humor_flavor_id, order_by, llm_system_prompt, llm_user_prompt');

  if (!captionAgg || !flavors || !steps) {
    return Response.json({ error: 'Failed to load data' }, { status: 500 });
  }

  // Aggregate per flavor
  const flavorStats = new Map<number, { totalLikes: number; count: number }>();
  for (const c of captionAgg) {
    if (c.humor_flavor_id == null) continue;
    const cur = flavorStats.get(c.humor_flavor_id) ?? { totalLikes: 0, count: 0 };
    cur.totalLikes += Number(c.like_count ?? 0);
    cur.count += 1;
    flavorStats.set(c.humor_flavor_id, cur);
  }

  // Step counts per flavor
  const stepsByFlavor = new Map<number, { order: number; system: string; user: string }[]>();
  for (const s of steps) {
    if (!stepsByFlavor.has(s.humor_flavor_id)) stepsByFlavor.set(s.humor_flavor_id, []);
    stepsByFlavor.get(s.humor_flavor_id)!.push({
      order: s.order_by ?? 0,
      system: s.llm_system_prompt ?? '',
      user: s.llm_user_prompt ?? '',
    });
  }

  type EnrichedFlavor = {
    id: number; slug: string; description: string; stepCount: number;
    avgLikes: number; captionCount: number; promptText: string; reliability: string;
  };

  // Build enriched flavor list (only flavors with ≥30 captions for reliability)
  const enriched: EnrichedFlavor[] = flavors
    .map(f => {
      const stats = flavorStats.get(f.id);
      if (!stats || stats.count < 30) return null;
      const flavorSteps = (stepsByFlavor.get(f.id) ?? []).sort((a, b) => a.order - b.order);
      const allPromptText = [f.description ?? '', ...flavorSteps.map(s => s.system + ' ' + s.user)].join(' ');
      return {
        id: f.id,
        slug: f.slug ?? '',
        description: f.description ?? '',
        stepCount: flavorSteps.length,
        avgLikes: stats.totalLikes / stats.count,
        captionCount: stats.count,
        promptText: allPromptText,
        // reliability: low <100, medium 100-500, high >500
        reliability: stats.count < 100 ? 'low' : stats.count < 500 ? 'medium' : 'high',
      };
    })
    .filter((x): x is EnrichedFlavor => x !== null);

  // Sort by avg_likes
  enriched.sort((a, b) => b.avgLikes - a.avgLikes);

  // ── (1) Step count analysis ──
  const stepBuckets = new Map<number, { totalAvgLikes: number; totalCaptions: number; flavorCount: number }>();
  for (const f of enriched) {
    const sc = f.stepCount;
    const cur = stepBuckets.get(sc) ?? { totalAvgLikes: 0, totalCaptions: 0, flavorCount: 0 };
    // weight by caption count for more accurate avg
    cur.totalAvgLikes += f.avgLikes * f.captionCount;
    cur.totalCaptions += f.captionCount;
    cur.flavorCount += 1;
    stepBuckets.set(sc, cur);
  }
  const stepCountAnalysis = Array.from(stepBuckets.entries())
    .map(([steps, { totalAvgLikes, totalCaptions, flavorCount }]) => ({
      steps,
      flavorCount,
      captionCount: totalCaptions,
      weightedAvgLikes: totalCaptions > 0 ? totalAvgLikes / totalCaptions : 0,
    }))
    .sort((a, b) => a.steps - b.steps);

  // ── (2) Word frequency: top half vs bottom half ──
  const mid = Math.floor(enriched.length / 2);
  const topFlavors = enriched.slice(0, mid);
  const bottomFlavors = enriched.slice(mid);

  const topFreq = wordFrequency(topFlavors.map(f => f.promptText));
  const bottomFreq = wordFrequency(bottomFlavors.map(f => f.promptText));
  const topN = topFlavors.length;
  const bottomN = bottomFlavors.length;

  // Score = normalized frequency in top - normalized frequency in bottom
  const allWords = new Set([...topFreq.keys(), ...bottomFreq.keys()]);
  const wordScores: { word: string; topCount: number; bottomCount: number; score: number }[] = [];
  for (const word of allWords) {
    const topRate = (topFreq.get(word) ?? 0) / Math.max(topN, 1);
    const bottomRate = (bottomFreq.get(word) ?? 0) / Math.max(bottomN, 1);
    const score = topRate - bottomRate;
    const topCount = topFreq.get(word) ?? 0;
    if (topCount >= 2) { // must appear in at least 2 top flavors
      wordScores.push({ word, topCount, bottomCount: bottomFreq.get(word) ?? 0, score });
    }
  }
  // Top discriminating words (positive = more in top, negative = more in bottom)
  wordScores.sort((a, b) => b.score - a.score);
  const topDiscriminatingWords = wordScores.slice(0, 15);
  const bottomDiscriminatingWords = [...wordScores].sort((a, b) => a.score - b.score).slice(0, 10);

  // ── (3) Best Mix calculation ──
  // Find the optimal step count (weighted avg likes)
  const bestStepEntry = stepCountAnalysis.reduce((best, cur) =>
    cur.weightedAvgLikes > best.weightedAvgLikes ? cur : best
  );
  const optimalSteps = bestStepEntry.steps;

  // Predicted avg likes = weighted mean of top-quarter flavors
  const topQuarter = enriched.slice(0, Math.max(1, Math.floor(enriched.length / 4)));
  const totalWeight = topQuarter.reduce((s, f) => s + f.captionCount, 0);
  const predictedAvgLikes = topQuarter.reduce((s, f) => s + f.avgLikes * f.captionCount, 0) / Math.max(totalWeight, 1);

  // Key traits: top discriminating words as trait descriptors
  const keyTraits = topDiscriminatingWords.slice(0, 6).map(w => w.word);

  // ── (4) Per-flavor outcome table ──
  const flavorOutcomes = enriched.map(f => ({
    slug: f.slug,
    stepCount: f.stepCount,
    avgLikes: f.avgLikes,
    captionCount: f.captionCount,
    reliability: f.reliability,
    // Expected likes per 10 captions
    expectedPer10: f.avgLikes * 10,
  }));

  return Response.json({
    totalFlavorsAnalyzed: enriched.length,
    stepCountAnalysis,
    topDiscriminatingWords,
    bottomDiscriminatingWords,
    bestMix: {
      optimalSteps,
      predictedAvgLikes,
      keyTraits,
      bestStepData: bestStepEntry,
    },
    flavorOutcomes,
  });
}
