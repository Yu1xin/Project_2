'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const NAV_LINKS = [
  { href: '/',             icon: '🏠', label: 'Dashboard' },
  { href: '/main',         icon: '🖼️', label: 'Vote Memes' },
  { href: '/upload',       icon: '📸', label: 'Upload' },
  { href: '/least-favored',icon: '📉', label: 'Bottom 25' },
  { href: '/list',         icon: '👀', label: 'Who's Online' },
];

const ADMIN_LINKS = [
  { href: '/admin', icon: '💻', label: 'Admin Panel' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login') return null;

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen z-50 flex flex-col bg-zinc-900 border-r border-zinc-800 shadow-xl transition-all duration-300 ease-in-out ${
        isOpen ? 'w-56' : 'w-16'
      }`}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-800 px-3">
        {isOpen && (
          <span className="animate-in fade-in text-lg font-black text-blue-500">
            MemeLab
          </span>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="ml-auto rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
          aria-label="Toggle sidebar"
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          )}
        </button>
      </div>

      {/* Main nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2 pt-4">
        {NAV_LINKS.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            isOpen={isOpen}
            active={pathname === link.href}
          />
        ))}

        {/* Divider + Admin */}
        <div className="my-3 border-t border-zinc-800" />
        {isOpen && (
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Admin
          </p>
        )}
        {ADMIN_LINKS.map((link) => (
          <SidebarLink
            key={link.href}
            href={link.href}
            icon={link.icon}
            label={link.label}
            isOpen={isOpen}
            active={pathname === link.href}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="border-t border-zinc-800 p-2">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-zinc-400 transition-all hover:bg-red-950 hover:text-red-400 active:scale-95"
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
}: {
  href: string;
  icon: string;
  label: string;
  isOpen: boolean;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      title={!isOpen ? label : undefined}
      className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all active:scale-95 ${
        active
          ? 'bg-blue-600 text-white'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
      }`}
    >
      <span className="flex w-6 shrink-0 items-center justify-center text-lg">{icon}</span>
      {isOpen && (
        <span className="animate-in slide-in-from-left-2 whitespace-nowrap">
          {label}
        </span>
      )}
    </Link>
  );
}