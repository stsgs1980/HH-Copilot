'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/dashboard/vacancies', label: 'Vacancies', icon: VacancyIcon },
  { href: '/dashboard/chat', label: 'Messages', icon: ChatIcon },
  { href: '/dashboard/resume', label: 'Resume', icon: ProfileIcon },
  { href: '/dashboard/analytics', label: 'Analytics', icon: AnalyticsIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <aside className="w-60 h-screen sticky top-0 glass-strong flex flex-col border-r border-white/10">
      <div className="p-4 border-b border-white/10">
        <Link href="/dashboard" className="text-lg font-semibold text-slate-100 tracking-tight">
          HH Bot
        </Link>
        <p className="text-xs text-slate-500 mt-0.5">Job Search Automation</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'nav-item-active' : 'nav-item'}
            >
              <Icon active={isActive} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-white/10">
        <StatusIndicator />
      </div>
    </aside>
  );
}

function StatusIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
      <div className="status-dot-online" />
      <span>Backend: localhost:8000</span>
    </div>
  );
}

// --- Icons (inline SVG, no external deps) ---

function DashboardIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    </svg>
  );
}

function VacancyIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

function ChatIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function AnalyticsIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  const c = active ? 'text-accent-400' : 'text-slate-500';
  return (
    <svg className={`w-5 h-5 ${c}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
