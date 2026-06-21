'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { useAuth } from '@/lib/auth';

/**
 * Login gate. Mounted INSIDE <AuthProvider>, wrapping the whole app shell.
 *
 *   • auth loading        → full-screen spinner
 *   • no user, not /login → redirect to /login, render nothing
 *   • on /login           → render children (the login page styles itself)
 *   • signed in           → render children (the app shell)
 *
 * The app shell (Sidebar/TopBar) only shows for signed-in users because the
 * gate renders nothing while redirecting an unauthenticated visitor.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const onLogin = pathname === '/login';

  useEffect(() => {
    if (loading) return;
    if (!user && !onLogin) {
      router.replace('/login');
    } else if (user && onLogin) {
      // Already signed in but sitting on /login → bounce to home.
      router.replace('/');
    }
  }, [loading, user, onLogin, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 text-white shadow-lg">
          <Bot className="h-7 w-7" />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-violet-600" />
          กำลังโหลด…
        </div>
      </div>
    );
  }

  // On /login, always render (signed in or out) — the effect handles bouncing
  // a signed-in user away, but we don't want to blank the login UI meanwhile.
  if (onLogin) {
    return <>{children}</>;
  }

  // Protected routes: render only when signed in; otherwise nothing (redirecting).
  if (!user) {
    return null;
  }

  return <>{children}</>;
}
