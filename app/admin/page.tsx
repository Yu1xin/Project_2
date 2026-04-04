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
  const [search, setSearch] = useState('');

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
      desc: 'Edit, and view Caption Examples',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/images',

      label: 'Images',
      desc: 'Edit, and view Images',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/users',
      label: 'User Profiles',
      desc: 'Search and view user info️',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      href: '/admin/humor-flavors',
      label: 'Humor flavors',
      desc: 'Add and View humor flavors️ and steps',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/term',
      label: 'Terms',
      desc: 'Edit, and view terms',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/llm_models',
      label: 'llm models',
      desc: 'Edit, and view Models used',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/llm_prompt_chain',
      label: 'llm prompt chains',
      desc: 'View prompt chains',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/caption_requests',
      label: 'Caption request info',
      desc: 'View caption requests',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/sign_up_domains',
      label: 'Sign up domains',
      desc: 'Edit, and view email domains allowed to sign up',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
      href: '/admin/whitelist_emails',
      label: 'Whitelist email addresses',
      desc: 'Edit, and view Whitelist email addresses',
      color: 'bg-blue-500 hover:bg-blue-600',
    },

    {
          href: '/admin/captions',
          label: 'Meme Captions',
          desc: 'View meme Captions',
          color: 'bg-blue-500 hover:bg-blue-600',
        },


    {
              href: '/admin/llm_providers',
              label: 'llm provider companies',
              desc: 'View company names',
              color: 'bg-blue-500 hover:bg-blue-600',
            },


    {
              href: '/admin/llm_responses',
              label: 'llm responses',
              desc: 'View llm outputs with user input',
              color: 'bg-blue-500 hover:bg-blue-600',
            },




  ];

  const q = search.toLowerCase();
  const matchesSearch = (item: DashboardButton) =>
    !q || item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);

  const analyticsButtons = dashboardButtons.filter(
    (item) => item.label === 'Data Analytics' && matchesSearch(item)
  );

  const llmButtons = dashboardButtons.filter((item) =>
    [
      'Humor flavors',
      'llm provider companies',
      'llm responses',
      'llm models',
      'llm prompt chains',
      'Caption request info',
    ].includes(item.label) && matchesSearch(item)
  );

  const materialButtons = dashboardButtons.filter((item) =>
    [
      'Images',
      'Meme Captions',
      'Caption Examples',
      'Terms',
    ].includes(item.label) && matchesSearch(item)
  );

  const userButtons = dashboardButtons.filter((item) =>
    [
      'Sign up domains',
      'User Profiles',
      'Whitelist email addresses',
    ].includes(item.label) && matchesSearch(item)
  );

  const totalResults = analyticsButtons.length + llmButtons.length + materialButtons.length + userButtons.length;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 rounded-[2rem] p-8 shadow-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
          <h1 className="text-4xl font-black text-zinc-900 dark:text-zinc-100 mb-2">
            Welcome To Admin Panel 🔓,
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 italic break-words">
            Here you can view data analysis and manage profile, images, as well as captions
          </p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search pages..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 px-5 py-3 pr-10 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          {search && (
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              {totalResults === 0 ? 'No pages match your search.' : `${totalResults} page${totalResults !== 1 ? 's' : ''} found`}
            </p>
          )}
        </div>

        {/* ===== Data Analytics Section ===== */}
        {analyticsButtons.length > 0 && <div className="mb-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            📊 Data Analytics
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
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
        </div>}

        {/* ===== LLM Related ===== */}
        {llmButtons.length > 0 && <div className="mb-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            LLM Related
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Manage humor flavors, prompt chains, models, providers, responses, and caption requests
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {llmButtons.map((item) => (
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
        </div>}

        {/* ===== Materials ===== */}
        {materialButtons.length > 0 && <div className="mb-10">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            Materials
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Manage images, captions, caption examples, and terms
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {materialButtons.map((item) => (
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
        </div>}

        {/* ===== User Related ===== */}
        {userButtons.length > 0 && <div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            User Related
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            Manage signup domains, user profiles, and whitelist emails
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {userButtons.map((item) => (
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
        </div>}

      </div>
    </div>
  );
}