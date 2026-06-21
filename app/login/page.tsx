'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Mail, Lock, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';

type Mode = 'signin' | 'signup';

/** Inline Google "G" mark (lucide v1 has no brand icon). */
function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { signInGoogle, signInEmail, signUpEmail } = useAuth();

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);

  const busy = loadingGoogle || loadingEmail;

  async function handleGoogle() {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInGoogle();
      router.push('/');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoadingGoogle(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }
    setLoadingEmail(true);
    try {
      if (mode === 'signin') {
        await signInEmail(email, password);
      } else {
        await signUpEmail(email, password);
      }
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด');
    } finally {
      setLoadingEmail(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 px-4 py-10">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-300/20 blur-3xl" />

      <div className="relative w-full max-w-md">
        {/* Brand header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 shadow-lg ring-1 ring-white/30 backdrop-blur">
            <Bot className="h-9 w-9 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-white">เข้าสู่ระบบ Story AI</h1>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-white/80">
            <Sparkles className="h-3.5 w-3.5" />
            ผู้ช่วยคอนเทนต์ประจำวัน สำหรับเจ้าของเพจ
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingGoogle ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
            ) : (
              <GoogleMark className="h-5 w-5" />
            )}
            เข้าสู่ระบบด้วย Google
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">หรือใช้อีเมล</span>
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Email / password form */}
          <form onSubmit={handleEmail} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">อีเมล</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">รหัสผ่าน</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-100"
                />
              </div>
              {mode === 'signup' && (
                <p className="mt-1.5 text-xs text-slate-400">อย่างน้อย 6 ตัวอักษร</p>
              )}
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loadingEmail}
              icon={<LogIn className="h-4 w-4" />}
              className="w-full justify-center"
            >
              {mode === 'signin' ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
            </Button>
          </form>

          {/* Toggle */}
          <p className="mt-5 text-center text-sm text-slate-500">
            {mode === 'signin' ? 'ยังไม่มีบัญชี?' : 'มีบัญชีอยู่แล้ว?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                setError(null);
              }}
              className="font-semibold text-violet-600 hover:text-violet-700"
            >
              {mode === 'signin' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
            </button>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/70">
          การเข้าสู่ระบบถือว่าคุณยอมรับเงื่อนไขการใช้งานของ Story AI
        </p>
      </div>
    </div>
  );
}
