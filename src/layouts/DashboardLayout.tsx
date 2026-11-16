import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Home, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { RoyalImmoLogo } from '../components/brand/RoyalImmoLogo';
import { usePlatform, useTheme } from '../hooks/usePlatform';
import { cn } from '../utils/cn';
import { formatDateFR } from '../utils/format';

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  items: SidebarNavItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  title,
  subtitle,
  items,
  activeTab,
  onSelectTab,
  children,
}) => {
  const { currentUser, notifications, store } = usePlatform();
  const { dark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#070D1D] dark:text-slate-100">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B1633]">
        <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
          <Link to="/">
            <RoyalImmoLogo />
          </Link>
        </div>

        <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.full_name}
              className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-[#1B3B8C]/10 text-[#1B3B8C] dark:bg-[#C89B3C]/15 dark:text-[#C89B3C] flex items-center justify-center text-xs font-bold shrink-0">
              {(currentUser?.full_name || 'RI').slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
              {currentUser?.full_name || 'Session Aperçu'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{subtitle}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer text-left',
                  active
                    ? 'bg-[#1B3B8C] text-white dark:bg-[#C89B3C] dark:text-[#0B1633]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Home className="h-4 w-4" />
            Retour au portail public
          </Link>
          <button
            type="button"
            onClick={async () => {
              await store.signOut();
              navigate('/');
            }}
            className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-68 max-w-[85vw] flex flex-col bg-white dark:bg-[#0B1633] border-r border-slate-200 dark:border-slate-800">
            <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800">
              <RoyalImmoLogo />
              <button type="button" onClick={() => setSidebarOpen(false)} className="p-1.5 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium cursor-pointer text-left',
                      active
                        ? 'bg-[#1B3B8C] text-white dark:bg-[#C89B3C] dark:text-[#0B1633]'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4 dark:border-slate-800 dark:bg-[#0B1633]/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              aria-label="Menu tableau de bord"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                ROYAL IMMO / {title}
              </div>
              <h1 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white truncate">
                {items.find((i) => i.id === activeTab)?.label || title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 relative">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Changer de thème"
              className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="Notifications"
              className="relative h-9 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              <span className="font-mono-tabular">{unreadCount}</span>
            </button>

            <Link
              to="/publier"
              className="hidden sm:inline-flex items-center rounded-lg bg-[#1B3B8C] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#142D6B] dark:bg-[#C89B3C] dark:text-[#0B1633] whitespace-nowrap shrink-0"
            >
              Nouvelle annonce
            </Link>

            {notifOpen && (
              <div className="absolute right-0 top-12 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-[#0E172E] z-50">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <span className="text-sm font-semibold">Notifications</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Fermer
                  </button>
                </div>
                <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-500">Aucune notification.</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => store.markNotificationRead(n.id)}
                        className={cn(
                          'w-full py-3 text-left transition-colors cursor-pointer',
                          !n.is_read ? 'opacity-100' : 'opacity-65'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">{n.title}</span>
                          <span className="text-[11px] text-slate-400">{formatDateFR(n.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
