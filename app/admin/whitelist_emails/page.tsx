'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type WhitelistEmailRow = {
  id: number;
  created_datetime_utc: string | null;
  modified_datetime_utc: string | null;
  email_address: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
};

export default function WhitelistEmailAddressesPage() {
  const [emails, setEmails] = useState<WhitelistEmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchEmails() {
      const { data, error } = await supabase
        .from('whitelist_email_addresses')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setEmails((data || []) as WhitelistEmailRow[]);
      }

      setLoading(false);
    }

    fetchEmails();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 font-mono">
        Loading whitelist email addresses...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-amber-600 text-white p-2 rounded-lg text-xl">📧</span>
          Whitelist Email Addresses
        </h1>

        {emails.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-medium">No whitelist email addresses found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {emails.map((email) => (
              <div
                key={email.id}
                className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h2 className="text-xl font-bold text-amber-700 break-all">
                      {email.email_address || 'No Email Address'}
                    </h2>
                  </div>

                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                    ID: {email.id}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-bold text-slate-500">Created By:</span>{' '}
                    <span className="font-mono text-xs">
                      {email.created_by_user_id || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-500">Modified By:</span>{' '}
                    <span className="font-mono text-xs">
                      {email.modified_by_user_id || 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="mt-4 text-[10px] text-slate-400 font-mono">
                  {email.created_datetime_utc && (
                    <>Created: {new Date(email.created_datetime_utc).toLocaleString()}</>
                  )}
                  {email.modified_datetime_utc && (
                    <> · Modified: {new Date(email.modified_datetime_utc).toLocaleString()}</>
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