'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type DashboardButton = {
  href: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
};

export default function MainPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    async function loadSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      setUserEmail(session.user.email || 'Student');
      setLoading(false);
    }

    loadSession();
  }, [supabase, router]);

  const dashboardButtons: DashboardButton[] = [
    {
      href: '/main',
      icon: '🖼️',
      label: 'Vote Memes',
      desc: 'Browse memes and vote 👍👎',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      href: '/upload',
      icon: '📸',
      label: 'Upload Meme',
      desc: 'Upload a picture and generate a new meme',
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      href: '/least-favored',
      icon: '📉',
      label: 'Bottom 25 Agree or Disagree?',
      desc: 'See the memes with lowest performance and vote them',
      color: 'bg-rose-500 hover:bg-rose-600',
    },
    {
      href: '/list',
      icon: '👀',
      label: 'Who is online',
      desc: 'Latest 20 voting actions👁️👁️',
      color: 'bg-violet-500 hover:bg-violet-600',
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-10 text-center font-mono text-zinc-300">
        LOADING...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-[2rem] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-8 shadow-xl text-zinc-900 dark:text-zinc-100">
          <h1 className="mb-2 text-4xl font-black text-zinc-900 dark:text-zinc-100">
            Welcome back,
          </h1>
          <p className="break-words italic text-zinc-500 dark:text-zinc-400">{userEmail}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Choose where you want to go next.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {dashboardButtons.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${item.color} rounded-[2rem] text-white shadow-lg transition-all active:scale-95 hover:-translate-y-0.5`}
            >
              <div className="p-7 text-left">
                <div className="mb-4 text-3xl">{item.icon}</div>
                <div className="mb-2 text-xl font-bold">{item.label}</div>
                <div className="text-sm leading-relaxed text-white/85">
                  {item.desc}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}