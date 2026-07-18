'use client';

import {
  Bell,
  Calculator,
  CalendarDays,
  FolderOpen,
  Home,
  LayoutGrid,
  MessageSquare,
  Moon,
  Search,
  Sun,
  User,
  Workflow,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Avatar } from './Avatar';
import { useTheme } from '../lib/theme';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/catalogo', label: 'Catálogo', icon: LayoutGrid },
  { to: '/opinioes', label: 'Opiniões', icon: MessageSquare },
  { to: '/materiais', label: 'Materiais', icon: FolderOpen },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/ira', label: 'IRA', icon: Calculator },
  { to: '/fluxograma', label: 'Fluxograma', icon: Workflow },
  { to: '/perfil', label: 'Perfil', icon: User },
];

const ICON_BTN =
  'inline-flex items-center justify-center w-[38px] h-[38px] rounded-full border border-line bg-surface text-ink-2 cursor-pointer [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-accent-tint hover:text-accent-dark';

function isActivePath(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden mid:flex mid:flex-col mid:w-[232px] mid:shrink-0 mid:border-r mid:border-line mid:py-6 mid:px-4 mid:sticky mid:top-0 mid:h-screen mid:bg-surface">
        <div className="flex items-center gap-2.5 px-2 mb-8">
          <div className="w-[30px] h-[30px] rounded-[9px] bg-gradient-brand shadow-glow relative shrink-0 after:content-[''] after:absolute after:-right-[3px] after:-bottom-[3px] after:w-3 after:h-3 after:rounded after:bg-accent-2 after:border-2 after:border-surface" />
          <span className="font-heading font-bold text-lg">QuixHub</span>
        </div>
        <nav className="flex flex-col gap-0.5 flex-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <Link
              key={to}
              href={to}
              className={`flex items-center gap-3 py-[11px] px-3 rounded-md text-ink-2 font-heading font-semibold text-13-5 no-underline [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-surface-sunken hover:text-ink ${isActivePath(pathname, to, end) ? 'bg-accent-tint text-accent-dark' : ''}`}
            >
              <Icon size={18} strokeWidth={2.25} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between border-t border-line pt-4">
          <Avatar name="Guilherme Farias" size="sm" />
          <button className={ICON_BTN} onClick={toggle} aria-label="Alternar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="flex items-center gap-3 pt-4 px-4 pb-3 sticky top-0 z-20 bg-[color-mix(in_oklab,var(--color-bg)_85%,transparent)] backdrop-blur-[10px] mid:pt-5 mid:px-8">
          <div className="flex-1 flex items-center gap-2 border border-line bg-surface rounded-full py-[9px] px-4 text-ink-3 text-13 max-w-[420px]">
            <Search size={16} />
            <input
              placeholder="Buscar disciplinas, materiais..."
              className="border-none bg-transparent outline-none text-ink font-body text-13 flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className={ICON_BTN} aria-label="Notificações">
              <Bell size={17} />
            </button>
            <button className={ICON_BTN} onClick={toggle} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 pb-[100px] max-w-[1200px] w-full mx-auto mid:px-8 mid:pb-10">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 h-[68px] flex items-center justify-around bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] backdrop-blur-[12px] border-t border-line z-20 mid:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <Link
            key={to}
            href={to}
            className={`flex flex-col items-center gap-1 text-ink-3 no-underline font-heading font-semibold text-10 py-1.5 px-2.5 ${isActivePath(pathname, to, end) ? 'text-accent' : ''}`}
          >
            <Icon size={19} strokeWidth={2.25} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
