'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_superadmin) {
        alert("oops you don't have superadmin permission！");
        router.push('/');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    }
    checkAdmin();
  }, []);

  if (loading) return <div className="p-10 font-bold text-blue-600 animate-pulse">confirming identity...</div>;

    return isAdmin ? (
      <div className="min-h-screen bg-slate-50">
        {/* 🚀 关键：添加 ml-64 (256px) 或者根据你侧边栏实际宽度调整 */}
        {/* pl-20 是为了给内容和侧边栏之间留一点呼吸感 */}
        <main className="ml-64 p-8 pt-12 min-h-screen">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    ) : null;
  }