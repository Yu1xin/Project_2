'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type CaptionRow = {
  id: string;
  content: string | null;
  image_id: string | null;
  humor_flavor_id: number | null;
  created_by_user_id: string | null;
  images?: { url: string | null } | null;
};

export default function AdminCaptionsInfoPage() {
  const [captions, setCaptions] = useState<CaptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    async function loadCaptions() {
      setLoading(true);

      const { data, error } = await supabase
        .from('captions')
        .select('id, content, image_id, humor_flavor_id, created_by_user_id, images(url)')
        .order('created_datetime_utc', { ascending: false });

      if (error) {
        console.error('Fetch captions error:', error.message);
      } else {
        setCaptions((data || []) as unknown as CaptionRow[]);
      }

      setLoading(false);
    }

    loadCaptions();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-10 ml-64 text-zinc-300 font-mono">
        loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-10 ml-64 text-zinc-100">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-8 flex items-center gap-3 text-3xl font-black text-zinc-100">
          <span className="rounded-lg bg-blue-600 p-2 text-xl text-white">📋</span>
          Captions Info
        </h1>

        <div className="overflow-x-auto rounded-3xl border border-zinc-800 bg-zinc-900 shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-800 text-zinc-200">
              <tr>
                <th className="px-4 py-3 text-left font-bold">Content</th>
                <th className="px-4 py-3 text-left font-bold">Image</th>
                <th className="px-4 py-3 text-left font-bold">Humor Flavor ID</th>
                <th className="px-4 py-3 text-left font-bold">Created By User ID</th>
              </tr>
            </thead>

            <tbody>
              {captions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-zinc-400"
                  >
                    No caption data found.
                  </td>
                </tr>
              ) : (
                captions.map((caption, index) => (
                  <tr
                    key={caption.id}
                    className={index % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-950'}
                  >
                    <td className="max-w-md px-4 py-3 text-zinc-100">
                      {caption.content || '-'}
                    </td>
                    <td className="px-4 py-3">
                      {caption.images?.url ? (
                        <img
                          src={caption.images.url}
                          alt="Meme"
                          className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                        />
                      ) : (
                        <span className="font-mono text-zinc-500 text-xs">{caption.image_id?.substring(0, 8) ?? '-'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {caption.humor_flavor_id ?? '-'}
                    </td>
                    <td className="px-4 py-3 font-mono text-zinc-300">
                      {caption.created_by_user_id || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}