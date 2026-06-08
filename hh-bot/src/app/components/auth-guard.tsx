'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    check();
  }, []);

  const check = async () => {
    try {
      const status = await authApi.getStatus();
      if (status.connected) {
        setConnected(true);
      } else {
        router.replace('/login');
        return;
      }
    } catch {
      router.replace('/login');
      return;
    }
    setChecking(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-3" />
          <p className="text-sm text-slate-500">Checking auth...</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return null;
  }

  return <>{children}</>;
}
