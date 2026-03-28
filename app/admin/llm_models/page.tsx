'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type LlmModelRow = {
  id: number;
  name: string | null;
  llm_provider_id: number | null;
  provider_model_id: string | null;
  is_temperature_supported: boolean | null;
  created_datetime_utc?: string | null;
  modified_datetime_utc?: string | null;
};

export default function LlmModelsPage() {
  const [models, setModels] = useState<LlmModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchModels() {
      const { data, error } = await supabase
        .from('llm_models')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setModels((data || []) as LlmModelRow[]);
      }

      setLoading(false);
    }

    fetchModels();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 font-mono">
        Loading llm models...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-indigo-600 text-white p-2 rounded-lg text-xl">🤖</span>
          LLM Models
        </h1>

        {models.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-medium">No model data found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {models.map((model) => (
              <div
                key={model.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-indigo-700">
                      {model.name || 'Unnamed Model'}
                    </h2>
                    <p className="text-sm text-slate-500 font-mono mt-1">
                      provider_model_id: {model.provider_model_id || 'N/A'}
                    </p>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold ${
                      model.is_temperature_supported
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {model.is_temperature_supported
                      ? 'Temperature Supported'
                      : 'No Temperature'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                    ID: {model.id}
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                    Provider ID: {model.llm_provider_id ?? 'N/A'}
                  </span>
                </div>

                <div className="text-[10px] text-slate-400 font-mono">
                  {model.created_datetime_utc && (
                    <>Created: {new Date(model.created_datetime_utc).toLocaleDateString()}</>
                  )}
                  {model.modified_datetime_utc && (
                    <> · Modified: {new Date(model.modified_datetime_utc).toLocaleDateString()}</>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}