'use client';

import {
  Bell,
  Calculator,
  CalendarDays,
  Ellipsis,
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
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from './Avatar';
import { currentUser } from '../data/mock';
import { useTheme } from '../lib/theme';

// mobileTab: shown directly in the mobile bottom bar. Everything else goes
// behind "Mais" — 8 tabs don't fit a 390px bar (labels overflow/clip).
const NAV_ITEMS = [
  { to: '/', label: 'Início', icon: Home, end: true, mobileTab: true },
  { to: '/catalogo', label: 'Catálogo', icon: LayoutGrid, mobileTab: true },
  { to: '/opinioes', label: 'Opiniões', icon: MessageSquare, mobileTab: true },
  { to: '/materiais', label: 'Materiais', icon: FolderOpen },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/ira', label: 'IRA', icon: Calculator, mobileTab: true },
  { to: '/fluxograma', label: 'Fluxograma', icon: Workflow },
  { to: '/perfil', label: 'Perfil', icon: User },
];
const MOBILE_TABS = NAV_ITEMS.filter((item) => item.mobileTab);
const MOBILE_MORE = NAV_ITEMS.filter((item) => !item.mobileTab);

const MOBILE_TAB_BTN =
  'flex-1 min-w-0 flex flex-col items-center justify-center gap-1 no-underline font-heading font-semibold text-10 bg-transparent border-none cursor-pointer';

const ICON_BTN =
  'inline-flex items-center justify-center w-[38px] h-[38px] rounded-full border border-line bg-surface text-ink-2 cursor-pointer [transition:background-color_0.15s_ease,color_0.15s_ease] hover:bg-accent-tint hover:text-accent-dark';

function isActivePath(pathname: string, to: string, end?: boolean) {
  if (end) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const pathname = usePathname();

  // Remember which route the "Mais" menu was opened on, so navigating
  // anywhere (link tap, back button) closes it without an extra effect.
  const [moreOpenOn, setMoreOpenOn] = useState<string | null>(null);
  const moreOpen = moreOpenOn === pathname;
  const moreActive = moreOpen || MOBILE_MORE.some(({ to, end }) => isActivePath(pathname, to, end));
  const moreBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      setMoreOpenOn(null);
      moreBtnRef.current?.focus();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moreOpen]);

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
        <div className="border-t border-line pt-3">
          <Link
            href="/perfil"
            className="flex items-center gap-2.5 p-2 rounded-md no-underline text-inherit [transition:background-color_0.15s_ease] hover:bg-surface-sunken"
          >
            <Avatar name={currentUser.name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block font-heading font-semibold text-13 text-ink truncate">{currentUser.name}</span>
              <span className="block text-11 text-ink-3 truncate">{currentUser.course}</span>
            </span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 bg-[color-mix(in_oklab,var(--color-bg)_85%,transparent)] backdrop-blur-[10px]">
          {/* Same max-width/padding box as <main>, so the search and the
              page content share a left edge on wide screens. */}
          <div className="flex items-center gap-3 max-w-[1200px] w-full mx-auto pt-4 px-4 pb-3 mid:pt-5 mid:px-8">
            <div className="flex-1 flex items-center gap-2 border border-line bg-surface rounded-full py-[9px] px-4 text-ink-3 text-13 max-w-[420px]">
              <Search size={16} />
              <input
                placeholder="Buscar disciplinas, materiais..."
                className="border-none bg-transparent outline-none text-ink font-body text-13 flex-1"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <button className={ICON_BTN} aria-label="Notificações">
                <Bell size={17} />
              </button>
              <button className={ICON_BTN} onClick={toggle} aria-label="Alternar tema">
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-[100px] max-w-[1200px] w-full mx-auto mid:px-8 mid:pb-10">{children}</main>
      </div>

      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-30 bg-[oklch(0%_0_0/32%)] motion-safe:animate-[fadeIn_0.15s_ease] mid:hidden"
            onClick={() => setMoreOpenOn(null)}
            aria-hidden
          />
          <div
            id="mobile-more-menu"
            className="fixed left-3 right-3 bottom-[80px] z-40 grid grid-cols-2 gap-1 p-2 rounded-lg border border-line bg-surface-raised shadow-lg motion-safe:animate-[pop_0.18s_ease] mid:hidden"
          >
            {MOBILE_MORE.map(({ to, label, icon: Icon, end }) => {
              const active = isActivePath(pathname, to, end);
              return (
                <Link
                  key={to}
                  href={to}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMoreOpenOn(null)}
                  className={`flex items-center gap-3 py-3 px-3 rounded-md font-heading font-semibold text-13-5 no-underline ${active ? 'bg-accent-tint text-accent-dark' : 'text-ink-2 hover:bg-surface-sunken hover:text-ink'}`}
                >
                  <Icon size={18} strokeWidth={2.25} />
                  {label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      <nav className="fixed bottom-0 left-0 right-0 h-[68px] flex items-stretch px-1 bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] backdrop-blur-[12px] border-t border-line z-40 mid:hidden">
        {MOBILE_TABS.map(({ to, label, icon: Icon, end }) => {
          const active = isActivePath(pathname, to, end);
          return (
            <Link
              key={to}
              href={to}
              aria-current={active ? 'page' : undefined}
              className={`${MOBILE_TAB_BTN} ${active ? 'text-accent' : 'text-ink-3'}`}
            >
              <Icon size={19} strokeWidth={2.25} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          ref={moreBtnRef}
          type="button"
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          onClick={() => setMoreOpenOn(moreOpen ? null : pathname)}
          className={`${MOBILE_TAB_BTN} ${moreActive ? 'text-accent' : 'text-ink-3'}`}
        >
          <Ellipsis size={19} strokeWidth={2.25} />
          <span>Mais</span>
        </button>
      </nav>
    </div>
  );
}
