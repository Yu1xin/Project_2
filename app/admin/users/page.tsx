'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function ManageUsersPage() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchProfiles() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_datetime_utc', { ascending: false });

      if (!error) {
        setProfiles(data || []);
        setFilteredProfiles(data || []);
      }
      setLoading(false);
    }
    fetchProfiles();
  }, [supabase]);

  // 🔍 搜索过滤逻辑
  useEffect(() => {
    if (!search.trim()) {
      setFilteredProfiles(profiles);
      return;
    }

    const keyword = search.toLowerCase();

    const filtered = profiles.filter((user) => {
      return (
        user.id?.toLowerCase().includes(keyword) ||
        user.first_name?.toLowerCase().includes(keyword) ||
        user.last_name?.toLowerCase().includes(keyword)
      );
    });

    setFilteredProfiles(filtered);
  }, [search, profiles]);

  if (loading) return <div className="p-10 font-mono">Loading user database...</div>;

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <h1 className="text-3xl font-black text-slate-900 mb-6 flex items-center gap-3">
          <span className="bg-blue-600 text-white p-2 rounded-lg text-xl">👥</span>
          User Management
        </h1>

        {/* 🔍 SEARCH BAR */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by first name, last name, or profile ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-5 py-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm"
          />
        </div>

        {/* TABLE */}
        <div className="text-zinc-900 rounded-[2rem] shadow-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-background border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
              <tr>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Profile ID</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Email</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-zinc-500 uppercase tracking-widest">Joined At</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50">
              {filteredProfiles.map((user) => (
                <tr key={user.id} className="hover:bg-blue-50/50 transition-colors">

                  <td className="px-6 py-4 font-mono text-[10px] text-zinc-500">
                    {user.id}
                  </td>

                  {/* 👇 新增 Name 列 */}
                  <td className="px-6 py-4 text-slate-700 font-semibold">
                    {(user.first_name || '') + ' ' + (user.last_name || '')}
                  </td>

                  <td className="px-6 py-4">
                    <span className="font-bold text-slate-700">{user.email}</span>
                  </td>

                  <td className="px-6 py-4">
                    {user.is_superadmin ? (
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-200">
                        SUPERADMIN
                      </span>
                    ) : (
                      <span className="text-zinc-500 text-xs font-bold px-3 py-1 bg-slate-100 rounded-full">
                        USER
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-sm text-zinc-400">
                    {user.created_datetime_utc
                      ? new Date(user.created_datetime_utc).toLocaleDateString()
                      : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <p className="mt-6 text-center text-zinc-500 text-xs font-medium italic">
          Showing {filteredProfiles.length} / {profiles.length} users
        </p>

      </div>
    </div>
  );
}