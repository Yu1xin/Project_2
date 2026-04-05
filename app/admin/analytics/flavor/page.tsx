'use client';
import { useEffect, useState } from 'react';

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

export default function FlavorIntelligencePage() {
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [flavorInsights, setFlavorInsights] = useState<FlavorInsights | null>(null);
  const [selectedOutcomeFlavor, setSelectedOutcomeFlavor] = useState<string>('');

  useEffect(() => {
    fetch('/api/analytics/flavor-insights')
      .then(r => r.json())
      .then(d => { setFlavorInsights(d); setInsightsLoading(false); })
      .catch(() => setInsightsLoading(false));
  }, []);

  const reliabilityColor = (r: string) => r === 'high' ? 'text-emerald-400' : r === 'medium' ? 'text-amber-400' : 'text-red-400';
  const reliabilityBg    = (r: string) => r === 'high' ? 'bg-emerald-900/30 border-emerald-700/40' : r === 'medium' ? 'bg-amber-900/30 border-amber-700/40' : 'bg-red-900/30 border-red-700/40';

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-violet-500 rounded-2xl text-3xl">🧠</div>
        <div>
          <h2 className="text-2xl font-bold">Flavor Intelligence</h2>
          <p className="text-zinc-400 text-xs">Patterns from flavors with ≥30 captions · word frequency, step count correlation, and best-mix prediction</p>
        </div>
      </div>

      {insightsLoading && <div className="text-zinc-400 text-sm animate-pulse py-10 text-center">Analyzing flavor patterns...</div>}

      {!insightsLoading && !flavorInsights && (
        <div className="text-zinc-400 text-sm py-10 text-center">No flavor data available.</div>
      )}

      {!insightsLoading && flavorInsights && (() => {
        const fi = flavorInsights;
        const selectedFlavor = fi.flavorOutcomes.find(f => f.slug === selectedOutcomeFlavor);

        return (
          <div className="space-y-8">

            {/* Row 1: Step Count + Word Frequency */}
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

            {/* Best Mix Card */}
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
                      <div className="text-2xl font-black text-emerald-300">{fi.bestMix.predictedAvgLikes.toFixed(4)}</div>
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

            {/* Outcome Estimator */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-violet-400 mb-4">🔮 Anticipated Outcome by Flavor</h4>
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <select
                  value={selectedOutcomeFlavor}
                  onChange={e => setSelectedOutcomeFlavor(e.target.value)}
                  className="rounded-xl bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">— pick a flavor —</option>
                  {[...fi.flavorOutcomes].sort((a, b) => b.avgLikes - a.avgLikes).map(f => (
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
                      {[...fi.flavorOutcomes].sort((a, b) => b.avgLikes - a.avgLikes).map(f => (
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
  );
}
