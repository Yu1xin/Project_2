'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { RegressionResult, FactorCard } from '@/types/analytics';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 回归结果（3种）
  const [charLenReg, setCharLenReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [wordCountReg, setWordCountReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });
  const [procTimeReg, setProcTimeReg] = useState<RegressionResult>({ slope: 0, intercept: 0, r2: 0, n: 0 });

  // 其他状态
  const [numericFactors, setNumericFactors] = useState<FactorCard[]>([]); // 现在只放处理时间相关系数
  const [modelFactors, setModelFactors] = useState<FactorCard[]>([]);
  const [flavorFactors, setFlavorFactors] = useState<FactorCard[]>([]);
  const [sampleSize, setSampleSize] = useState(0);
  const [procTimeN, setProcTimeN] = useState(0); // 用于显示处理时间样本量

  // 当前选中的 X
  const [selectedX, setSelectedX] = useState<'char_len' | 'word_count' | 'proc_time'>('char_len');

  useEffect(() => {
    async function runAnalysis() {
      try {
        const res = await fetch('/api/analytics');
        if (!res.ok) {
          throw new Error(`API error: ${res.status}`);
        }
        const data = await res.json();

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setSampleSize(data.sampleSize);
        setCharLenReg(data.charLenRegression);
        setWordCountReg(data.wordCountRegression);
        setProcTimeReg(data.procTimeRegression);
        setModelFactors(data.modelFactors || []);
        setFlavorFactors(data.flavorFactors || []);

        // 处理时间相关系数（从 server 端也可以算，但这里简单复用 procTimeReg 的 n）
        // 如果想精确 Pearson，可以在 route.ts 里再加一个字段返回
        setProcTimeN(data.procTimeRegression.n || 0);
        setNumericFactors([
          {
            factor: 'Processing Time (seconds)',
            impact: 0, // 如果需要 Pearson，可以在 route.ts 加计算
            desc: `Pearson correlation (n=${data.procTimeRegression.n || 0})`,
          },
        ]);

        setLoading(false);
      } catch (err) {
        setError((err as Error).message || 'Failed to load analytics');
        setLoading(false);
      }
    }
    runAnalysis();
  }, []);

  // 当前回归
  const currentReg = selectedX === 'char_len' ? charLenReg :
                     selectedX === 'word_count' ? wordCountReg :
                     procTimeReg;

  const xLabels = {
    char_len: { icon: '📏', name: 'Caption Length (chars)', unit: 'character' },
    word_count: { icon: '📝', name: 'Word Count', unit: 'word' },
    proc_time: { icon: '⏱️', name: 'Processing Time (seconds)', unit: 'second' },
  };

  const label = xLabels[selectedX];

  return (
    <div className="p-8 bg-slate-900 text-white rounded-[3rem] shadow-2xl mt-10 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-blue-500 rounded-2xl text-3xl">📈</div>
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics Engine</h2>
          <p className="text-slate-400 text-xs">
            What drives likes on generated meme captions?
          </p>
        </div>
      </div>

      {loading && <div className="text-center text-slate-400">Loading analysis...</div>}
      {error && <div className="text-center text-red-400">Error: {error}</div>}

      {!loading && !error && (
        <>
          <div className="mb-6 text-sm text-slate-400">
            Total analyzed captions: <strong>{sampleSize}</strong>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* 回归卡片 - 支持切换 */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <div className="flex flex-wrap gap-3 mb-6">
                {Object.entries(xLabels).map(([key, { icon, name }]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedX(key as any)}
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedX === key
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                    }`}
                  >
                    {icon} {name}
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wide mb-4">
                Linear Regression: Likes ~ {label.name}
              </h3>

              <div className="bg-slate-950 p-5 rounded-xl font-mono text-sm mb-4 border border-slate-700">
                <span className="text-emerald-400 font-bold">Likes</span> ≈{' '}
                <span className="text-blue-300">{currentReg.slope.toFixed(4)}</span> ×{' '}
                <span className="text-blue-400">{label.unit}</span> +{' '}
                <span className="text-purple-300">{currentReg.intercept.toFixed(2)}</span>
              </div>

              <div className="text-xs text-slate-400 space-y-1.5">
                <p>R² = {currentReg.r2.toFixed(4)}</p>
                <p>Samples = {currentReg.n}</p>
                <p className="pt-2">
                  Each extra {label.unit} is associated with {currentReg.slope.toFixed(4)}{' '}
                  more/fewer likes on average.
                </p>
              </div>
            </div>

            {/* Numeric Factor - 处理时间相关 */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wide mb-4">
                Numeric Factor Correlation
              </h3>
              <div className="space-y-4">
                {numericFactors.map((c) => (
                  <div
                    key={c.factor}
                    className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-700"
                  >
                    <div>
                      <div className="text-base font-medium text-slate-200">{c.factor}</div>
                      <div className="text-xs text-slate-500 mt-1">{c.desc}</div>
                    </div>
                    <span
                      className={`font-mono text-xl font-bold ${
                        c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {c.impact.toFixed(3)}
                    </span>
                  </div>
                ))}

                {procTimeN > 0 && procTimeN < 50 && (
                  <div className="text-xs text-yellow-400 mt-3 bg-yellow-950/40 p-3 rounded-lg border border-yellow-700/50">
                    ⚠️ Only {procTimeN} records have processing time data. Many requests may still be pending or failed.
                  </div>
                )}
              </div>
            </div>

            {/* LLM Model Impact */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>🧠</span> LLM Model Impact
              </h3>
              <div className="space-y-3">
                {modelFactors.length === 0 ? (
                  <div className="text-slate-500 text-sm">No model data available</div>
                ) : (
                  modelFactors.map((c) => (
                    <div
                      key={c.factor}
                      className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-slate-700"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{c.factor}</div>
                        <div className="text-[11px] text-slate-500">{c.desc}</div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {c.impact > 0 ? '+' : ''}
                        {c.impact.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Humor Flavor Impact */}
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700">
              <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wide mb-4 flex items-center gap-2">
                <span>😂</span> Humor Flavor Impact
              </h3>
              <div className="space-y-3">
                {flavorFactors.length === 0 ? (
                  <div className="text-slate-500 text-sm">No flavor data available</div>
                ) : (
                  flavorFactors.map((c) => (
                    <div
                      key={c.factor}
                      className="flex justify-between items-center bg-slate-950 p-3 px-4 rounded-lg border border-slate-700"
                    >
                      <div>
                        <div className="text-sm text-slate-200">{c.factor}</div>
                        <div className="text-[11px] text-slate-500">{c.desc}</div>
                      </div>
                      <span
                        className={`font-mono font-bold ${
                          c.impact > 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {c.impact > 0 ? '+' : ''}
                        {c.impact.toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}