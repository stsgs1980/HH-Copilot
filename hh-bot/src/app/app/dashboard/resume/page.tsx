'use client';

import { useEffect, useState, useCallback } from 'react';
import { resumesApi, type Resume } from '@/lib/api';
import { CardSkeleton, ErrorBlock } from '@/components/loading';

export default function ResumePage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await resumesApi.list();
      setResumes(data.resumes);
    } catch {
      setError('Failed to load resumes');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await resumesApi.sync();
      await load();
    } catch {
      setError('Sync failed');
    }
    setSyncing(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Resume</h1>
          <p className="text-sm text-slate-500">Your resumes from HH.ru</p>
        </div>
        <button onClick={handleSync} disabled={syncing} className="btn-secondary text-sm">
          {syncing ? 'Syncing...' : 'Sync from HH.ru'}
        </button>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : (
        <ResumeList resumes={resumes} />
      )}
    </div>
  );
}

function ResumeList({ resumes }: { resumes: Resume[] }) {
  if (!resumes.length) {
    return (
      <div className="glass p-8 text-center text-sm text-slate-500">
        No resumes found. Sync from HH.ru to load your resumes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resumes.map((r) => <ResumeCard key={r.id} resume={r} />)}
    </div>
  );
}

function ResumeCard({ resume }: { resume: Resume }) {
  return (
    <div className="bento-card">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-medium text-slate-200">{resume.title}</h3>
          {resume.position && <p className="text-xs text-slate-500">{resume.position}</p>}
          {resume.city && <p className="text-xs text-slate-500">{resume.city}</p>}
        </div>
        <span className={resume.isDefault ? 'badge-green' : 'badge-yellow'}>
          {resume.isDefault ? 'Default' : 'Active'}
        </span>
      </div>

      {resume.salary && (
        <p className="text-xs text-slate-400 mb-2">{resume.salary}</p>
      )}

      {resume.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resume.skills.slice(0, 12).map((skill, i) => (
            <span key={i} className="text-xs bg-white/5 px-2 py-0.5 rounded text-slate-400">
              {skill}
            </span>
          ))}
          {resume.skills.length > 12 && (
            <span className="text-xs text-slate-600">+{resume.skills.length - 12} more</span>
          )}
        </div>
      )}

      {resume.experience && (
        <p className="text-xs text-slate-500 mt-2">{resume.experience}</p>
      )}
    </div>
  );
}
