'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api';

type LoginStep = 'form' | 'polling' | 'captcha' | 'twofa' | 'success' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<LoginStep>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaUrl, setCaptchaUrl] = useState('');
  const [captchaText, setCaptchaText] = useState('');
  const [twofaCode, setTwofaCode] = useState('');
  const [error, setError] = useState('');
  const [pollCount, setPollCount] = useState(0);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('polling');
    setPollCount(0);

    try {
      const res = await authApi.login({ email, password });
      handleLoginResult(res.state, res.captcha_url, res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login request failed';
      setError(msg);
      setStep('error');
    }
  };

  const handleLoginResult = (state: string, captcha?: string, message?: string) => {
    if (state === 'success') {
      setStep('success');
      setTimeout(() => router.replace('/dashboard'), 1200);
    } else if (state === 'captcha_required' && captcha) {
      setCaptchaUrl(captcha);
      setStep('captcha');
    } else if (state === 'two_fa_required') {
      setStep('twofa');
    } else if (state === 'failed') {
      setError(message || 'Login failed');
      setStep('error');
    } else {
      // in_progress - poll
      pollLoginStatus();
    }
  };

  const pollLoginStatus = async () => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = async () => {
      try {
        const status = await authApi.getLoginStatus();
        attempts++;
        setPollCount(attempts);

        if (status.state === 'success') {
          setStep('success');
          setTimeout(() => router.replace('/dashboard'), 1200);
          return;
        }
        if (status.state === 'captcha_required' && status.captcha_url) {
          setCaptchaUrl(status.captcha_url);
          setStep('captcha');
          return;
        }
        if (status.state === 'two_fa_required') {
          setStep('twofa');
          return;
        }
        if (status.state === 'failed') {
          setError(status.message || 'Login failed');
          setStep('error');
          return;
        }

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setError('Login timed out. Please try again.');
          setStep('error');
        }
      } catch {
        attempts++;
        setPollCount(attempts);
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setError('Connection lost during login.');
          setStep('error');
        }
      }
    };

    poll();
  };

  const handleCaptcha = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await authApi.solveCaptcha({ captcha_text: captchaText });
      handleLoginResult(res.state);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Captcha submission failed';
      setError(msg);
    }
  };

  const handle2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const res = await authApi.verify2fa({ code: twofaCode });
      handleLoginResult(res.state);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '2FA verification failed';
      setError(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100">HH Bot</h1>
          <p className="text-sm text-slate-500 mt-1">Job Search Automation</p>
        </div>

        <div className="glass p-6">
          {step === 'form' && <LoginForm
            email={email} password={password}
            setEmail={setEmail} setPassword={setPassword}
            onSubmit={handleLogin} error={error}
          />}
          {step === 'polling' && <PollingState count={pollCount} />}
          {step === 'captcha' && <CaptchaForm
            captchaUrl={captchaUrl} captchaText={captchaText}
            setCaptchaText={setCaptchaText}
            onSubmit={handleCaptcha} error={error}
          />}
          {step === 'twofa' && <TwoFaForm
            code={twofaCode} setCode={setTwofaCode}
            onSubmit={handle2fa} error={error}
          />}
          {step === 'success' && <SuccessState />}
          {step === 'error' && <ErrorState
            message={error}
            onRetry={() => { setStep('form'); setError(''); }}
          />}
        </div>
      </div>
    </div>
  );
}

// --- Sub-components ---

function LoginForm({ email, password, setEmail, setPassword, onSubmit, error }: {
  email: string; password: string;
  setEmail: (v: string) => void; setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100 mb-1">Sign in to HH.ru</h2>
      <p className="text-sm text-slate-500 mb-4">
        Enter your HH.ru credentials. A browser will open on the server to authenticate.
      </p>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Email</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="input-dark w-full" placeholder="your@email.com" required
        />
      </div>

      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Password</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="input-dark w-full" placeholder="Password" required
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" className="btn-primary w-full">
        Login
      </button>
    </form>
  );
}

function PollingState({ count }: { count: number }) {
  return (
    <div className="text-center py-6 space-y-3">
      <div className="spinner mx-auto" />
      <p className="text-sm text-slate-300">
        Authenticating via browser...
      </p>
      <p className="text-xs text-slate-500">
        This may take up to 2 minutes. Attempt {count}
      </p>
    </div>
  );
}

function CaptchaForm({ captchaUrl, captchaText, setCaptchaText, onSubmit, error }: {
  captchaUrl: string; captchaText: string;
  setCaptchaText: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">CAPTCHA Required</h2>
      <p className="text-sm text-slate-500">HH.ru requires CAPTCHA verification.</p>

      <div className="flex justify-center">
        {captchaUrl ? (
          <img src={captchaUrl} alt="CAPTCHA" className="rounded-lg border border-white/10" />
        ) : (
          <div className="glass p-4 text-sm text-slate-500">Loading CAPTCHA...</div>
        )}
      </div>

      <input
        type="text" value={captchaText} onChange={(e) => setCaptchaText(e.target.value)}
        className="input-dark w-full" placeholder="Enter CAPTCHA text" required
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" className="btn-primary w-full">
        Submit CAPTCHA
      </button>
    </form>
  );
}

function TwoFaForm({ code, setCode, onSubmit, error }: {
  code: string; setCode: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void; error: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-100">Two-Factor Auth</h2>
      <p className="text-sm text-slate-500">
        Enter the code sent to your phone or email.
      </p>

      <input
        type="text" value={code} onChange={(e) => setCode(e.target.value)}
        className="input-dark w-full text-center text-lg tracking-widest"
        placeholder="000000" maxLength={6} required
      />

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" className="btn-primary w-full">
        Verify
      </button>
    </form>
  );
}

function SuccessState() {
  return (
    <div className="text-center py-6 space-y-3">
      <div className="w-12 h-12 bg-accent-600/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="text-sm text-accent-400 font-medium">Authenticated successfully</p>
      <p className="text-xs text-slate-500">Redirecting to dashboard...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-4 space-y-4">
      <div className="w-12 h-12 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <p className="text-sm text-red-400">{message}</p>
      <button onClick={onRetry} className="btn-secondary">
        Try Again
      </button>
    </div>
  );
}
