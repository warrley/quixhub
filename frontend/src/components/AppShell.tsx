import { Bell, CalendarDays, FolderOpen, Home, LayoutGrid, Moon, Search, Sun, User } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { Avatar } from './Avatar';
import { useTheme } from '../lib/theme';
import styles from './AppShell.module.css';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/catalogo', label: 'Catálogo', icon: LayoutGrid },
  { to: '/materiais', label: 'Materiais', icon: FolderOpen },
  { to: '/calendario', label: 'Calendário', icon: CalendarDays },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <div className={styles.brandMark} />
          <span className={styles.brandName}>QuixHub</span>
        </div>
        <nav className={styles.navList}>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')}
            >
              <Icon size={18} strokeWidth={2.25} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <Avatar name="Guilherme Farias" size="sm" />
          <button className={styles.iconBtn} onClick={toggle} aria-label="Alternar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input placeholder="Buscar disciplinas, materiais..." />
          </div>
          <div className={styles.topbarActions}>
            <button className={styles.iconBtn} aria-label="Notificações">
              <Bell size={17} />
            </button>
            <button className={styles.iconBtn} onClick={toggle} aria-label="Alternar tema">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>

      <nav className={styles.bottomNav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => [styles.bottomItem, isActive ? styles.bottomItemActive : ''].filter(Boolean).join(' ')}
          >
            <Icon size={19} strokeWidth={2.25} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
