'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    check();
  }, []);

  const check = async () => {
    try {
      const status = await authApi.getStatus();
      if (status.connected) {
        router.replace('/dashboard');
        return;
      }
    } catch {
      // backend unreachable or not authenticated
    }
    setChecking(false);
    router.replace('/login');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-lg mx-auto mb-4" />
          <p className="text-sm text-slate-500">HH Bot</p>
        </div>
      </div>
    );
  }

  return null;
}
