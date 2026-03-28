'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type AllowedSignupDomainRow = {
  id: number;
  created_datetime_utc: string | null;
  apex_domain: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  modified_datetime_utc: string | null;
};

export default function AllowedSignupDomainsPage() {
  const [domains, setDomains] = useState<AllowedSignupDomainRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchDomains() {
      const { data, error } = await supabase
        .from('allowed_signup_domains')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setDomains((data || []) as AllowedSignupDomainRow[]);
      }

      setLoading(false);
    }

    fetchDomains();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 font-mono">
        Loading allowed signup domains...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-emerald-600 text-white p-2 rounded-lg text-xl">🌐</span>
          Allowed Signup Domains
        </h1>

        {domains.length === 0 ? (
          <div className="text-zinc-900 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-medium">No allowed domains found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {domains.map((domain) => (
              <div
                key={domain.id}
                className="text-zinc-900 p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-emerald-700">
                      {domain.apex_domain || 'Unnamed Domain'}
                    </h2>
                  </div>

                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                    ID: {domain.id}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-bold text-slate-500">Created By:</span>{' '}
                    <span className="font-mono text-xs">
                      {domain.created_by_user_id || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-500">Modified By:</span>{' '}
                    <span className="font-mono text-xs">
                      {domain.modified_by_user_id || 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="mt-4 text-[10px] text-slate-400 font-mono">
                  {domain.created_datetime_utc && (
                    <>Created: {new Date(domain.created_datetime_utc).toLocaleString()}</>
                  )}
                  {domain.modified_datetime_utc && (
                    <> · Modified: {new Date(domain.modified_datetime_utc).toLocaleString()}</>
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