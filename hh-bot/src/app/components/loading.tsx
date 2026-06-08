export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-4 space-y-3">
      <div className="shimmer h-4 w-24 rounded" />
      <div className="shimmer h-8 w-16 rounded" />
      <div className="shimmer h-3 w-32 rounded" />
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="glass rounded-xl p-4 space-y-2">
      <div className="shimmer h-4 w-3/4 rounded" />
      <div className="shimmer h-3 w-1/2 rounded" />
      <div className="shimmer h-3 w-1/3 rounded" />
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="spinner-lg mx-auto mb-4" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}

export function InlineLoader({ text }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
      <span>{text || 'Loading...'}</span>
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="glass rounded-xl p-6 text-center">
      <div className="text-red-400 text-sm mb-3">{message}</div>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary text-sm">
          Retry
        </button>
      )}
    </div>
  );
}
