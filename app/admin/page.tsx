//这里还没有放，其实是需要做一个dashboard收到保护才行的
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

type DashboardButton = {
  href: string;
  icon: string;
  label: string;
  desc: string;
  color: string;
};

export default function MainPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null);

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

      setUserEmail(session?.user?.email || 'Student');
    }

    loadSession();
  }, [supabase]);

  const dashboardButtons: DashboardButton[] = [
    {
      href: '/admin/analytics',
      icon: '📊',
      label: 'Data Analytics',
      desc: 'See how votes change',
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      href: '/admin/captions',
      icon: '📚',
      label: 'Manage Captions',
      desc: 'View, edit, and delete Captions',
      color: 'bg-emerald-500 hover:bg-emerald-600',
    },
    {
      href: '/admin/images',
      icon: '🖼️',
      label: 'Manage Images',
      desc: 'view and delete Images',
      color: 'bg-rose-500 hover:bg-rose-600',
    },
    {
      href: '/admin/users',
      icon: '👥',
      label: 'Manage User',
      desc: 'Search users and see user info️',
      color: 'bg-violet-500 hover:bg-violet-600',
    },
    {
          href: '/admin/humor-flavors',
          icon: '☑️',
          label: 'Manage Human flavors',
          desc: 'See humor flavors️',
          color: 'bg-violet-500 hover:bg-violet-600',
        },

    {
              href: '/admin/terms',
              icon: '📝️',
              label: 'Manage Terms',
              desc: 'See term explanations️',
              color: 'bg-violet-500 hover:bg-violet-600',
            },

    {
                  href: '/admin/llm_models',
                  icon: '🤖',
                  label: 'Manage llm_models',
                  desc: 'See what are models using️',
                  color: 'bg-violet-500 hover:bg-violet-600',
                },

  ];

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-[2rem] bg-white p-8 shadow-xl border border-slate-200">
          <h1 className="text-4xl font-black text-slate-900 mb-2">
            Welcome To Admin Panel 🔓,
          </h1>
          <p className="text-slate-500 italic break-words">
            Here you can view data analysis and manage profile, images, as well as captions
          </p>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm mt-1">
            Choose where you want to go next.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {dashboardButtons.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`${item.color} text-white rounded-[2rem] shadow-lg transition-all active:scale-95 hover:-translate-y-0.5`}
            >
              <div className="p-7 text-left">
                <div className="text-3xl mb-4">{item.icon}</div>
                <div className="text-xl font-bold mb-2">{item.label}</div>
                <div className="text-sm text-white/85 leading-relaxed">
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