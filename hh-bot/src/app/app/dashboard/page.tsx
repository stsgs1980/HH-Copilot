'use client';

import { useEffect, useState, useCallback } from 'react';
import { authApi, statsApi, type AuthStatusResponse, type StatsResponse } from '@/lib/api';
import { CardSkeleton, ErrorBlock } from '@/components/loading';

export default function DashboardPage() {
  const [auth, setAuth] = useState<AuthStatusResponse | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [statsError, setStatsError] = useState('');

  const loadAuth = useCallback(async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const data = await authApi.getStatus();
      setAuth(data);
    } catch {
      setAuthError('Cannot reach backend');
    }
    setAuthLoading(false);
  }, []);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError('');
    try {
      const data = await statsApi.getStats();
      setStats(data);
    } catch {
      setStatsError('Failed to load stats');
    }
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    loadAuth();
    loadStats();
  }, [loadAuth, loadStats]);

  return (
    <div className="space-y-6">
      <Header />
      <AuthCard auth={auth} loading={authLoading} error={authError} onRetry={loadAuth} />
      <KpiGrid stats={stats} loading={statsLoading} error={statsError} onRetry={loadStats} />
      <ChartSection data={stats?.chartData} />
      <ActivitySection entries={stats?.activityLog} loading={statsLoading} />
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500">Job search automation overview</p>
      </div>
      <div className="text-xs text-slate-500">
        {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
      </div>
    </div>
  );
}

function AuthCard({ auth, loading, error, onRetry }: {
  auth: AuthStatusResponse | null; loading: boolean; error: string; onRetry: () => void;
}) {
  if (loading) return <CardSkeleton />;
  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;

  return (
    <div className="glass-accent p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={auth?.connected ? 'status-dot-online' : 'status-dot-offline'} />
        <div>
          <p className="text-sm font-medium text-slate-100">
            HH.ru {auth?.connected ? 'Connected' : 'Disconnected'}
          </p>
          {auth?.email && (
            <p className="text-xs text-slate-500">{auth.email}</p>
          )}
        </div>
      </div>
      {auth?.tokenExpiry && (
        <p className="text-xs text-slate-500">
          Expires: {new Date(auth.tokenExpiry).toLocaleString('ru-RU')}
        </p>
      )}
    </div>
  );
}

function KpiGrid({ stats, loading, error, onRetry }: {
  stats: StatsResponse | null; loading: boolean; error: string; onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (error) return <ErrorBlock message={error} onRetry={onRetry} />;
  if (!stats) return null;

  const s = stats.stats;
  const kpis = [
    { label: 'Vacancies', value: s.totalVacancies, color: 'text-accent-400' },
    { label: 'Applied Today', value: s.appliedToday, color: 'text-blue-400' },
    { label: 'Interviews', value: s.interviewInvites, color: 'text-purple-400' },
    { label: 'Limit Left', value: s.dailyLimitRemaining, color: 'text-yellow-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="kpi-card">
          <p className="text-xs text-slate-500 uppercase tracking-wider">{kpi.label}</p>
          <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}

function ChartSection({ data }: { data: StatsResponse['chartData'] | undefined }) {
  if (!data?.length) return null;
  const maxVal = Math.max(...data.map((d) => d.applications), 1);

  return (
    <div className="glass p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Weekly Activity</h2>
      <div className="flex items-end gap-2 h-32">
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full bg-accent-600/40 rounded-t"
              style={{ height: `${Math.max((d.applications / maxVal) * 100, 4)}%` }}
            />
            <span className="text-[10px] text-slate-500">{d.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection({ entries, loading }: {
  entries: StatsResponse['activityLog'] | undefined; loading: boolean;
}) {
  if (loading || !entries?.length) return null;

  return (
    <div className="glass p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-3">Recent Activity</h2>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {entries.slice(0, 10).map((item) => (
          <div key={item.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-600 mt-1.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-300 truncate">{item.description}</p>
            </div>
            <span className="text-xs text-slate-600 shrink-0">
              {formatTime(item.timestamp)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString('ru-RU', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
