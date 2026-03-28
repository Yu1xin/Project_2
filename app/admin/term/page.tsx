'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type TermRow = {
  id: number;
  term: string | null;
  definition: string | null;
  example: string | null;
  priority: number | null;
  created_datetime_utc?: string | null;
};

export default function TermsPage() {
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchTerms() {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .order('priority', { ascending: true });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setTerms((data || []) as TermRow[]);
      }

      setLoading(false);
    }

    fetchTerms();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 font-mono">
        Loading terms...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-purple-600 text-white p-2 rounded-lg text-xl">📚</span>
          Terms Glossary
        </h1>

        {terms.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-medium">
              No terms found...
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {terms.map((t) => (
              <div
                key={t.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                {/* TERM */}
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-bold text-purple-700">
                    {t.term || 'Untitled Term'}
                  </h2>

                  {t.priority !== null && (
                    <span className="text-xs bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-bold">
                      Priority {t.priority}
                    </span>
                  )}
                </div>

                {/* DEFINITION */}
                <p className="text-slate-700 mb-3 leading-relaxed">
                  {t.definition || 'No definition provided.'}
                </p>

                {/* EXAMPLE */}
                {t.example && (
                  <div className="bg-background border border-slate-200 rounded-xl p-3 text-sm text-slate-600 italic">
                    Example: {t.example}
                  </div>
                )}

                {/* META */}
                <div className="mt-4 text-[10px] text-slate-400 font-mono">
                  ID: {t.id}
                  {t.created_datetime_utc && (
                    <> · {new Date(t.created_datetime_utc).toLocaleDateString()}</>
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