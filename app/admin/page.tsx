'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';



type DashboardButton = {
  href: string;
  label: string;
  desc: string;
  color: string;
  span?: string;
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

      label: 'Data Analytics',
      desc: 'See how votes change',
      color: 'bg-blue-500 hover:bg-blue-600',
      span: 'sm:col-span-2',
    },
    {
      href: '/admin/caption_examples',

      label: 'Caption Examples',
      desc: 'View, edit, and delete Caption Examples',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/images',

      label: 'Images',
      desc: 'view, update, and delete Images',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/users',
      label: 'User Profiles',
      desc: 'Search users and see user info️',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/humor-flavors',
      label: 'Humor flavors',
      desc: 'See humor flavors️ and steps',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/term',
      label: 'Terms',
      desc: 'See Terms and explanations, or add new ones',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/llm_models',
      label: 'llm_models',
      desc: 'See what are models being used; update data',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/llm_prompt_chain',
      label: 'llm prompt chains',
      desc: 'See what are create/modify time for captions️',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/caption_requests',
      label: 'Caption request info',
      desc: 'See the time and profile making and editing caption requests',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/sign_up_domains',
      label: 'Sign up domains',
      desc: 'Manage emails from what domains can sign up',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/whitelist_emails',
      label: 'Whitelist email addresses',
      desc: 'See and manage whitelist email addresses',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

  ];

  const analyticsButtons = dashboardButtons.filter(
      (item) => item.label === 'Data Analytics'
    );

    const managementButtons = dashboardButtons.filter(
      (item) => item.label !== 'Data Analytics'
    );

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-[2rem] text-zinc-900 p-8 shadow-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
          <h1 className="text-4xl font-black text-zinc-100 mb-2">
            Welcome To Admin Panel 🔓,
          </h1>
          <p className="text-zinc-400 italic break-words">
            Here you can view data analysis and manage profile, images, as well as captions
          </p>
        </div>

        <div className="mb-6">
        </div>

        {/* ===== Data Analytics Section ===== */}
        <div className="mb-10">
          <h3 className="text-lg font-semibold text-zinc-100 mb-3">
            📊 Data Analytics
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            View insights and performance trends
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {analyticsButtons.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${item.color} ${item.span || ''} text-white rounded-[2rem] shadow-lg transition-all active:scale-95 hover:-translate-y-0.5`}
              >
                <div className="p-7 text-left">

                  <div className="text-xl font-bold mb-2">{item.label}</div>
                  <div className="text-sm text-white/85">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== Data Management Section ===== */}
        <div>
          <h3 className="text-lg font-semibold text-zinc-100 mb-3">
            🗂️ Data Management
          </h3>
          <p className="text-sm text-zinc-400 mb-4">
            Manage captions, users, images, and system configurations
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {managementButtons.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`${item.color} ${item.span || ''} text-white rounded-[2rem] shadow-lg transition-all active:scale-95 hover:-translate-y-0.5`}
              >
                <div className="p-7 text-left">

                  <div className="text-xl font-bold mb-2">{item.label}</div>
                  <div className="text-sm text-white/85">{item.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}