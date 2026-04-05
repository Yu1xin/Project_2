'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const USER_NAV = [
  { href: '/',              icon: '🏠', label: 'Dashboard' },
  { href: '/main',          icon: '🖼️', label: 'Vote Memes' },
  { href: '/list',          icon: '👀', label: 'Who is Online' },
];

type AdminLink = { href: string; icon: string; label: string };
type AdminSection = { key: string; icon: string; label: string; links: AdminLink[] };

const ADMIN_SECTIONS: AdminSection[] = [
  {
    key: 'analytics',
    icon: '📊',
    label: 'Analytics',
    links: [
      { href: '/admin/analytics', icon: '📈', label: 'Data Analytics' },
    ],
  },
  {
    key: 'llm',
    icon: '🤖',
    label: 'LLM Related',
    links: [
      { href: '/admin/humor-flavors',   icon: '😂', label: 'Humor Flavors' },
      { href: '/admin/llm_models',      icon: '🧠', label: 'LLM Models' },
      { href: '/admin/llm_prompt_chain',icon: '⛓️', label: 'Prompt Chains' },
      { href: '/admin/llm_providers',   icon: '🏢', label: 'LLM Providers' },
      { href: '/admin/llm_responses',   icon: '💬', label: 'LLM Responses' },
      { href: '/admin/caption_requests',icon: '📋', label: 'Caption Requests' },
    ],
  },
  {
    key: 'materials',
    icon: '📁',
    label: 'Materials',
    links: [
      { href: '/admin/images',           icon: '🖼️', label: 'Images' },
      { href: '/admin/caption_examples', icon: '📝', label: 'Caption Examples' },
      { href: '/admin/captions',         icon: '💭', label: 'Meme Captions' },
      { href: '/admin/term',             icon: '📖', label: 'Terms' },
    ],
  },
  {
    key: 'users',
    icon: '👥',
    label: 'User Related',
    links: [
      { href: '/admin/users',             icon: '👤', label: 'User Profiles' },
      { href: '/admin/sign_up_domains',   icon: '🌐', label: 'Sign Up Domains' },
      { href: '/admin/whitelist_emails',  icon: '✉️', label: 'Whitelist Emails' },
    ],
  },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    analytics: true,
    llm: true,
    materials: true,
    users: true,
  });

  const pathname = usePathname();
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load superadmin status once
  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_superadmin, is_matrix_admin')
        .eq('id', session.user.id)
        .single();
      if (profile?.is_superadmin || profile?.is_matrix_admin) {
        setIsSuperAdmin(true);
      }
    }
    loadProfile();
  }, []);

  // Auto-switch to admin sidebar when on /admin/* pages
  useEffect(() => {
    if (pathname.startsWith('/admin') && isSuperAdmin) {
      setViewMode('admin');
    }
  }, [pathname, isSuperAdmin]);

  if (pathname === '/login') return null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 shadow-xl transition-all duration-300 ease-in-out ${
        isOpen ? 'w-56' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-3">
        {isOpen && (
          <span className="animate-in fade-in text-lg font-black text-blue-500">
            {viewMode === 'admin' ? 'Admin' : 'MemeLab'}
          </span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-auto rounded-lg p-2 text-zinc-500 dark:text-zinc-400 transition-colors hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
          aria-label="Toggle sidebar"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-4">
        {viewMode === 'user' ? (
          // ── USER NAV ──
          <>
            {USER_NAV.map((link) => (
              <SidebarLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                isOpen={isOpen}
                active={pathname === link.href}
              />
            ))}
            {isSuperAdmin && (
              <>
                <div className="my-2 border-t border-zinc-200 dark:border-zinc-800" />
                <SidebarLink
                  href="/admin"
                  icon="🔓"
                  label="Admin Panel"
                  isOpen={isOpen}
                  active={pathname === '/admin'}
                />
              </>
            )}
          </>
        ) : (
          // ── ADMIN NAV ──
          ADMIN_SECTIONS.map((section) => (
            <div key={section.key}>
              {/* Section header */}
              <button
                onClick={() => isOpen && toggleSection(section.key)}
                title={!isOpen ? section.label : undefined}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
              >
                <span className="flex w-6 shrink-0 items-center justify-center text-base">{section.icon}</span>
                {isOpen && (
                  <span className="flex-1 text-left animate-in slide-in-from-left-2 whitespace-nowrap text-xs uppercase tracking-widest">
                    {section.label}
                  </span>
                )}
                {isOpen && (
                  <span className="text-[10px] text-zinc-400">
                    {openSections[section.key] ? '▾' : '▸'}
                  </span>
                )}
              </button>

              {/* Sub-links */}
              {(openSections[section.key] || !isOpen) && (
                <div className={isOpen ? 'ml-3 border-l border-zinc-200 dark:border-zinc-700 pl-2 space-y-0.5 mb-2' : 'space-y-0.5 mb-1'}>
                  {section.links.map((link) => (
                    <SidebarLink
                      key={link.href}
                      href={link.href}
                      icon={link.icon}
                      label={link.label}
                      isOpen={isOpen}
                      active={pathname === link.href || pathname.startsWith(link.href + '/')}
                      small
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </nav>

      {/* Bottom controls */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-2 space-y-1">
        {/* Admin toggle — superadmins only */}
        {isSuperAdmin && (
          <button
            onClick={() => setViewMode((v) => v === 'user' ? 'admin' : 'user')}
            title={!isOpen ? (viewMode === 'user' ? 'Switch to Admin' : 'Switch to User') : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all active:scale-95 ${
              viewMode === 'admin'
                ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-900/50'
                : 'text-zinc-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <span className="flex w-6 shrink-0 items-center justify-center text-lg">
              {viewMode === 'admin' ? '👤' : '💻'}
            </span>
            {isOpen && (
              <span className="whitespace-nowrap animate-in slide-in-from-left-2">
                {viewMode === 'admin' ? 'Back to General Sidebar' : 'Switch to Admin Sidebar'}
              </span>
            )}
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-zinc-500 dark:text-zinc-400 transition-all hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 active:scale-95"
        >
          <span className="flex w-6 shrink-0 items-center justify-center text-lg">🚪</span>
          {isOpen && <span className="whitespace-nowrap text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  isOpen,
  active,
  small = false,
}: {
  href: string;
  icon: string;
  label: string;
  isOpen: boolean;
  active: boolean;
  small?: boolean;
}) {
  return (
    <Link
      href={href}
      title={!isOpen ? label : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 transition-all active:scale-95 ${
        small ? 'py-2 text-xs' : 'py-3 text-sm'
      } font-medium ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-zinc-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      <span className={`flex shrink-0 items-center justify-center ${small ? 'w-5 text-base' : 'w-6 text-lg'}`}>{icon}</span>
      {isOpen && (
        <span className="animate-in slide-in-from-left-2 whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}
