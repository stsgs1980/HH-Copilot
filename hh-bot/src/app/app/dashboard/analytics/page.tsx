'use client';

import { useEffect, useState, useCallback } from 'react';
import { statsApi, type StatsResponse } from '@/lib/api';
import { CardSkeleton, ErrorBlock } from '@/components/loading';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await statsApi.getStats();
      setStats(data);
    } catch {
      setError('Failed to load analytics');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Analytics</h1>
        <p className="text-sm text-slate-500">Application funnel and statistics</p>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : stats ? (
        <>
          <MetricsGrid s={stats.stats} />
          <FunnelChart data={stats.chartData} />
        </>
      ) : null}
    </div>
  );
}

function MetricsGrid({ s }: { s: StatsResponse['stats'] }) {
  const rows = [
    { label: 'Total Vacancies', value: String(s.totalVacancies) },
    { label: 'Applied Today', value: String(s.appliedToday) },
    { label: 'Interview Invites', value: String(s.interviewInvites) },
    { label: 'Limit Remaining', value: String(s.dailyLimitRemaining) },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {rows.map((r) => (
        <div key={r.label} className="bg-white/5 rounded-lg p-3">
          <p className="text-xs text-slate-500">{r.label}</p>
          <p className="text-lg font-bold text-slate-200">{r.value}</p>
        </div>
      ))}
    </div>
  );
}

function FunnelChart({ data }: { data: StatsResponse['chartData'] }) {
  if (!data?.length) return null;

  const total = data.reduce((sum, d) => sum + d.applications, 0) || 1;
  const interviews = data.reduce((sum, d) => sum + d.interviews, 0);
  const maxVal = Math.max(...data.map((d) => d.applications), 1);

  const stages = [
    { label: 'Applications (7d)', value: total, pct: 100 },
    { label: 'Interviews (7d)', value: interviews, pct: Math.round((interviews / total) * 100) },
  ];

  return (
    <div className="glass p-4">
      <h2 className="text-sm font-semibold text-slate-300 mb-4">7-Day Funnel</h2>
      <div className="space-y-3 mb-6">
        {stages.map((s) => (
          <div key={s.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-400">{s.label}</span>
              <span className="text-slate-500">{s.value} ({s.pct}%)</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-600/60 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(s.pct, 1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-xs text-slate-500 mb-2">Daily Breakdown</h3>
      <div className="flex items-end gap-2 h-24">
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
