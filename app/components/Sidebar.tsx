'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // 如果是在登录页，不显示侧边栏
  if (pathname === '/login') return null;

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-zinc-900 border-r bg-zinc-800 z-50 transition-all duration-300 ease-in-out shadow-lg flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* 顶部 Logo & 切换按钮 */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
        {isOpen && <span className="text-xl font-black text-blue-600 animate-in fade-in">MemeLab</span>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-zinc-400"
        >
          {isOpen ? '◀' : '▶'}
        </button>
      </div>

      {/* 导航区域 */}
      <nav className="flex-1 flex flex-col gap-2 p-3 mt-4">
        <SidebarLink href="/" icon="🏠" label="Dashboard" isOpen={isOpen} active={pathname === '/main'} />
        <SidebarLink href="/admin" icon="💻" label="Admin Page" isOpen={isOpen} active={pathname === '/admin'} />

      </nav>

      {/* 底部退出 */}
      <div className="p-4 border-t border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100">
        <Link
          href="/login"
          className="flex items-center gap-4 px-4 py-3 text-zinc-100 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
        >
          <span className="text-xl">🚪</span>
          {isOpen && <span className="font-medium">Logout</span>}
        </Link>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, isOpen, active }: { href: string; icon: string; label: string; isOpen: boolean; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all active:scale-95 ${
        active
          ? 'bg-blue-50 text-blue-600'
          : 'text-zinc-100 hover:bg-zinc-950 hover:text-blue-500'
      }`}
    >
      <span className="text-xl">{icon}</span>
      {isOpen && <span className="font-medium whitespace-nowrap animate-in slide-in-from-left-2">{label}</span>}
    </Link>
  );
}