'use client';

import { useEffect, useState, useCallback } from 'react';
import { vacanciesApi, type Vacancy } from '@/lib/api';
import { RowSkeleton, ErrorBlock } from '@/components/loading';

export default function VacanciesPage() {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await vacanciesApi.list();
      setVacancies(data.vacancies);
    } catch {
      setError('Failed to load vacancies');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? vacancies.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase()) ||
        v.company.toLowerCase().includes(search.toLowerCase())
      )
    : vacancies;

  return (
    <div className="space-y-6">
      <Header />
      <SearchBar search={search} setSearch={setSearch} total={filtered.length} />

      {error && <ErrorBlock message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : (
        <VacancyList vacancies={filtered} onReload={load} />
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-100">Vacancies</h1>
      <p className="text-sm text-slate-500">Browse and apply to matched vacancies</p>
    </div>
  );
}

function SearchBar({ search, setSearch, total }: {
  search: string; setSearch: (v: string) => void; total: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          className="input-dark w-full pl-10" placeholder="Search vacancies..."
        />
      </div>
      <span className="text-sm text-slate-500 shrink-0">{total} found</span>
    </div>
  );
}

function VacancyList({ vacancies, onReload }: { vacancies: Vacancy[]; onReload: () => void }) {
  if (!vacancies.length) {
    return (
      <div className="glass p-8 text-center text-sm text-slate-500">
        No vacancies found. Run a search from Settings to populate.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {vacancies.map((v) => (
        <VacancyCard key={v.id} vacancy={v} onReload={onReload} />
      ))}
    </div>
  );
}

function VacancyCard({ vacancy, onReload }: { vacancy: Vacancy; onReload: () => void }) {
  const scoreColor = vacancy.matchScore
    ? vacancy.matchScore >= 80 ? 'badge-green'
    : vacancy.matchScore >= 60 ? 'badge-yellow'
    : 'badge-red'
    : '';

  return (
    <div className="bento-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-slate-200 truncate">{vacancy.title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{vacancy.company}</p>
          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
            {vacancy.location && <span>{vacancy.location}</span>}
            {vacancy.salary && <span>{vacancy.salary}</span>}
          </div>
          {vacancy.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {vacancy.skills.slice(0, 5).map((s, i) => (
                <span key={i} className="text-[10px] bg-white/5 px-1.5 py-0.5 rounded text-slate-400">{s}</span>
              ))}
              {vacancy.skills.length > 5 && (
                <span className="text-[10px] text-slate-600">+{vacancy.skills.length - 5}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {scoreColor && <span className={scoreColor}>{vacancy.matchScore}%</span>}
          <span className="text-xs text-slate-600">{vacancy.status}</span>
          {vacancy.status === 'new' && (
            <button
              onClick={() => vacanciesApi.apply(vacancy.id).then(onReload)}
              className="btn-primary text-xs px-2 py-1"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
