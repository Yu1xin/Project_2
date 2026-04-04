'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type LlmLogRow = {
  id: string; // uuid
  llm_model_response: string | null;
  llm_system_prompt: string | null;
  llm_user_prompt: string | null;
  llm_model_id: number | null; // smallint
  processing_time_seconds: number | null;
  created_datetime_utc: string | null;
};

type LlmModelRow = {
  id: number;
  name: string | null;
};

export default function LlmLogsPage() {
  const [logs, setLogs] = useState<LlmLogRow[]>([]);
  const [models, setModels] = useState<LlmModelRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  // 把这里改成你这个表的真实表名
  const tableName = 'llm_model_responses';

  async function loadData() {
    setLoading(true);

    try {
      const res = await fetch('/api/admin/llm-responses');
      const data = await res.json();
      if (!res.ok) {
        console.error('Fetch error:', data.error);
      } else {
        setLogs(data.logs as LlmLogRow[]);
        setModels(data.models as LlmModelRow[]);
      }
    } catch (err: any) {
      console.error('Fetch error:', err.message);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function getModelName(llmModelId: number | null) {
    if (llmModelId === null || llmModelId === undefined) return 'N/A';
    const model = models.find((m) => m.id === llmModelId);
    return model?.name || `Unknown Model (${llmModelId})`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10 text-center font-mono text-zinc-100">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-black text-zinc-100">
          <span className="rounded-lg bg-blue-600 p-2 text-xl text-white">🤖</span>
          LLM Prompt / Response Logs
        </h1>

        {logs.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 p-12 text-center text-zinc-100">
            <p className="font-medium text-zinc-400">No records found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-bold text-blue-400">
                      {getModelName(log.llm_model_id)}
                    </h2>

                    <div className="flex flex-wrap gap-2 text-xs font-mono">
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-100">
                        Model ID: {log.llm_model_id ?? 'N/A'}
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-100">
                        Processing Time: {log.processing_time_seconds ?? 'N/A'}s
                      </span>
                      <span className="rounded bg-zinc-800 px-2 py-1 text-zinc-100">
                        Log ID: {log.id}
                      </span>
                    </div>
                  </div>

                  <div className="text-right text-[10px] font-mono text-zinc-500">
                    {log.created_datetime_utc
                      ? new Date(log.created_datetime_utc).toLocaleString()
                      : 'No timestamp'}
                  </div>
                </div>

                <div className="grid gap-4">
                  <div>
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      System Prompt
                    </div>
                    <div className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-100">
                      {log.llm_system_prompt || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      User Prompt
                    </div>
                    <div className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-100">
                      {log.llm_user_prompt || 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-bold text-zinc-300">
                      Model Response
                    </div>
                    <div className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-100">
                      {log.llm_model_response || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}