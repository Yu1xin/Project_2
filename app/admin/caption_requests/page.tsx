'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CaptionRequestRow = {
  id: number;
  created_datetime_utc: string | null;
  profile_id: string | null;
  image_id: string | null;
  created_by_user_id: string | null;
  modified_by_user_id: string | null;
  modified_datetime_utc: string | null;
};

export default function CaptionRequestsPage() {
  const [requests, setRequests] = useState<CaptionRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchRequests() {
      const { data, error } = await supabase
        .from('caption_requests')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error('Fetch error:', error.message);
      } else {
        setRequests((data || []) as CaptionRequestRow[]);
      }

      setLoading(false);
    }

    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-slate-500 font-mono">
        Loading caption requests...
      </div>
    );
  }

  return (
    <div className="p-10 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-8 flex items-center gap-3">
          <span className="bg-pink-600 text-white p-2 rounded-lg text-xl">🖼️</span>
          Caption Requests
        </h1>

        {requests.length === 0 ? (
          <div className="text-zinc-900 p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <p className="text-slate-400 font-medium">No caption requests found...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="text-zinc-900 p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase font-mono">
                    ID: {req.id}
                  </span>
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase font-mono">
                    Profile: {req.profile_id ? req.profile_id.substring(0, 8) : 'N/A'}
                  </span>
                  <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-1 rounded uppercase font-mono">
                    Image: {req.image_id ? req.image_id.substring(0, 8) : 'N/A'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-700">
                  <p>
                    <span className="font-bold text-slate-500">Created By:</span>{' '}
                    <span className="font-mono text-xs">
                      {req.created_by_user_id || 'N/A'}
                    </span>
                  </p>
                  <p>
                    <span className="font-bold text-slate-500">Modified By:</span>{' '}
                    <span className="font-mono text-xs">
                      {req.modified_by_user_id || 'N/A'}
                    </span>
                  </p>
                </div>

                <div className="mt-4 text-[10px] text-slate-400 font-mono">
                  {req.created_datetime_utc && (
                    <>Created: {new Date(req.created_datetime_utc).toLocaleString()}</>
                  )}
                  {req.modified_datetime_utc && (
                    <> · Modified: {new Date(req.modified_datetime_utc).toLocaleString()}</>
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