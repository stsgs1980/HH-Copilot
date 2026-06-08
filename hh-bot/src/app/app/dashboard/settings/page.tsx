'use client';

import { useEffect, useState, useCallback } from 'react';
import { settingsApi, type UserSettings } from '@/lib/api';
import { CardSkeleton, ErrorBlock } from '@/components/loading';

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await settingsApi.get();
      setSettings(data.settings);
    } catch {
      setError('Failed to load settings');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (updates: Partial<UserSettings>) => {
    if (!settings) return;
    setSaving(true);
    setSaved(false);
    try {
      const result = await settingsApi.update({ ...settings, ...updates });
      setSettings(result.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError('Failed to save settings');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500">Configure search and automation parameters</p>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : settings ? (
        <>
          <SearchSettings settings={settings} onSave={handleSave} saving={saving} />
          <AutomationSettings settings={settings} onSave={handleSave} saving={saving} />
          {saved && (
            <p className="text-xs text-accent-400 animate-fade-in">Settings saved</p>
          )}
        </>
      ) : null}
    </div>
  );
}

function SearchSettings({ settings, onSave, saving }: {
  settings: UserSettings; onSave: (u: Partial<UserSettings>) => void; saving: boolean;
}) {
  const [direction, setDirection] = useState(settings.careerDirection || '');
  const [minScore, setMinScore] = useState(settings.minMatchScore);
  const [dailyLimit, setDailyLimit] = useState(settings.dailyLimit);

  return (
    <div className="glass p-4 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300">Search Parameters</h2>

      <Field label="Career Direction" hint="Job title or keywords for search">
        <input type="text" value={direction} onChange={(e) => setDirection(e.target.value)}
          className="input-dark w-full" placeholder="Python Developer" />
      </Field>

      <Field label={`Min Match Score: ${minScore}%`}>
        <input type="range" min={0} max={100} value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full accent-accent-600" />
      </Field>

      <Field label={`Daily Limit: ${dailyLimit}`}>
        <input type="range" min={5} max={100} value={dailyLimit}
          onChange={(e) => setDailyLimit(Number(e.target.value))}
          className="w-full accent-accent-600" />
      </Field>

      <button onClick={() => onSave({ careerDirection: direction, minMatchScore: minScore, dailyLimit })}
        disabled={saving} className="btn-primary text-sm">
        {saving ? 'Saving...' : 'Save Search Settings'}
      </button>
    </div>
  );
}

function AutomationSettings({ settings, onSave, saving }: {
  settings: UserSettings; onSave: (u: Partial<UserSettings>) => void; saving: boolean;
}) {
  const [mode, setMode] = useState(settings.mode);
  const [letterTone, setLetterTone] = useState(settings.letterTone);
  const [searchInterval, setSearchInterval] = useState(settings.searchInterval);

  return (
    <div className="glass p-4 space-y-4">
      <h2 className="text-sm font-semibold text-slate-300">Automation</h2>

      <Field label="Apply Mode">
        <select value={mode} onChange={(e) => setMode(e.target.value)}
          className="input-dark w-full">
          <option value="semi_auto">Semi-Auto (confirm each)</option>
          <option value="full_auto">Full Auto (no confirmation)</option>
          <option value="manual">Manual only</option>
        </select>
      </Field>

      <Field label="Cover Letter Tone">
        <select value={letterTone} onChange={(e) => setLetterTone(e.target.value)}
          className="input-dark w-full">
          <option value="professional">Professional</option>
          <option value="confident">Confident</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </Field>

      <Field label={`Search Interval: ${searchInterval} min`}>
        <input type="range" min={15} max={120} step={5} value={searchInterval}
          onChange={(e) => setSearchInterval(Number(e.target.value))}
          className="w-full accent-accent-600" />
      </Field>

      <button onClick={() => onSave({ mode, letterTone, searchInterval })}
        disabled={saving} className="btn-primary text-sm">
        {saving ? 'Saving...' : 'Save Automation Settings'}
      </button>
    </div>
  );
}

function Field({ label, hint, children }: {
  label: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}
