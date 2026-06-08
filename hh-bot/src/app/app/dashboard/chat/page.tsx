'use client';

import { useEffect, useState, useCallback } from 'react';
import { negotiationsApi, type Negotiation } from '@/lib/api';
import { RowSkeleton, ErrorBlock } from '@/components/loading';

export default function ChatPage() {
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Negotiation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await negotiationsApi.list();
      setNegotiations(data.negotiations);
    } catch {
      setError('Failed to load negotiations');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Messages</h1>
        <p className="text-sm text-slate-500">Conversations with employers</p>
      </div>

      {error && <ErrorBlock message={error} onRetry={load} />}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <RowSkeleton key={i} />)}
        </div>
      ) : selected ? (
        <ChatDetail negotiation={selected} onBack={() => setSelected(null)} />
      ) : (
        <NegotiationList negotiations={negotiations} onSelect={setSelected} />
      )}
    </div>
  );
}

function NegotiationList({ negotiations, onSelect }: {
  negotiations: Negotiation[]; onSelect: (n: Negotiation) => void;
}) {
  if (!negotiations.length) {
    return (
      <div className="glass p-8 text-center text-sm text-slate-500">
        No conversations yet. Apply to vacancies to start negotiations.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {negotiations.map((n) => (
        <div key={n.id} className="bento-card cursor-pointer" onClick={() => onSelect(n)}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-slate-200 truncate">
                {n.vacancyTitle}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{n.employerName || n.company}</p>
              {n.lastMessage && (
                <p className="text-xs text-slate-500 mt-1.5 truncate">
                  {n.lastMessage}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={n.status === 'active' ? 'badge-green' : 'badge-yellow'}>
                {n.status}
              </span>
              {n.unread > 0 && (
                <span className="badge-blue">{n.unread}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ChatDetail({ negotiation, onBack }: {
  negotiation: Negotiation; onBack: () => void;
}) {
  return (
    <div>
      <button onClick={onBack} className="btn-ghost text-sm mb-4">
        Back to list
      </button>
      <div className="glass p-4 mb-4">
        <h2 className="text-sm font-semibold text-slate-200">{negotiation.vacancyTitle}</h2>
        <p className="text-xs text-slate-500">{negotiation.employerName || negotiation.company}</p>
      </div>
      <div className="glass p-4 space-y-3 max-h-96 overflow-y-auto">
        {negotiation.messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] p-3 rounded-lg text-sm ${
              msg.sender === 'bot' || msg.sender === 'user'
                ? 'ml-auto bg-accent-600/20 text-slate-200'
                : 'bg-white/5 text-slate-300'
            }`}
          >
            <p>{msg.text}</p>
            <p className="text-[10px] text-slate-500 mt-1">
              {msg.sender} {msg.isAutoReply ? '(auto)' : ''} - {formatTime(msg.timestamp)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(s: string): string {
  try {
    return new Date(s).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return s; }
}
