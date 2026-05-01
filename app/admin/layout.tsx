'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function checkAdmin() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, is_matrix_admin')
        .eq('id', session.user.id)
        .single();

      if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
        alert("oops you don't have superadmin permission！");
        router.push('/');
      } else {
        setIsAdmin(true);
      }
      setLoading(false);
    }
    checkAdmin();
  }, [router, supabase]); // 确保括号闭合在这里

  if (loading) return <div className="p-10 font-bold text-blue-600">confirming identity...</div>;

  return isAdmin ? (
    <div className="min-h-screen bg-background">
      <main className="ml-64 p-8">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  ) : null;
}