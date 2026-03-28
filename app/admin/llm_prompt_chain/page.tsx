'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type LlmPromptChainRow = {
  id: number;
  created_datetime_utc: string | null;
  caption_request_id: number | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  modified_datetime_utc: string | null;
};

export default function LlmPromptChainsPage() {
  const [chains, setChains] = useState<LlmPromptChainRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchChains() {
      const { data, error } = await supabase
        .from('llm_prompt_chains')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setChains((data || []) as LlmPromptChainRow[]);
      }

      setLoading(false);
    }

    fetchChains();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-zinc-100 font-mono">
        Loading llm prompt chains...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-zinc-100 mb-8 flex items-center gap-3">
          <span className="bg-cyan-600 text-white p-2 rounded-lg text-xl">⛓️</span>
          LLM Prompt Chains
        </h1>

        {chains.length === 0 ? (
          <div className="text-zinc-900 p-12 rounded-3xl border-2 border-dashed border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 text-center">
            <p className="text-zinc-100 font-medium">No prompt chains found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {chains.map((chain) => (
              <div
                key={chain.id}
                className="text-zinc-900 p-6 rounded-2xl shadow-sm border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[10px] bg-slate-100 text-zinc-100 px-2 py-1 rounded uppercase font-mono">
                    ID: {chain.id}
                  </span>

                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                    Caption Request ID: {chain.caption_request_id ?? 'N/A'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-zinc-100">
                  <p>
                    <span className="font-bold text-zinc-100">Created By:</span>{' '}
                    <span className="font-mono text-xs">
                      {chain.created_by_user_id || 'N/A'}
                    </span>
                  </p>

                  <p>
                    <span className="font-bold text-zinc-100">Modified By:</span>{' '}
                    <span className="font-mono text-xs">
                      {chain.modified_by_user_id || 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="mt-4 text-[10px] text-zinc-100 font-mono">
                  {chain.created_datetime_utc && (
                    <>Created: {new Date(chain.created_datetime_utc).toLocaleString()}</>
                  )}
                  {chain.modified_datetime_utc && (
                    <> · Modified: {new Date(chain.modified_datetime_utc).toLocaleString()}</>
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