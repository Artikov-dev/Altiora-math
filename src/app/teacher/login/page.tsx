'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GraduationCap, Lock, Mail, AlertCircle, ArrowRight } from 'lucide-react';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(t.auth.loginError);
        setLoading(false);
        return;
      }

      if (data?.session) {
        router.push('/teacher');
        router.refresh();
      }
    } catch {
      setError(t.auth.loginError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-md mx-auto">
      {/* Top Header with Brand and ThemeToggle */}
      <header className="flex items-center justify-between py-2 safe-pt">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg tracking-tight">{t.app.name}</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Login Card */}
      <main className="w-full my-auto py-8">
        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {t.auth.teacherLogin}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t.app.tagline}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="email">
                {t.auth.email}
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.auth.emailPlaceholder}
                  className="w-full touch-target pl-11 pr-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" htmlFor="password">
                {t.auth.password}
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.auth.passwordPlaceholder}
                  className="w-full touch-target pl-11 pr-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full touch-target mt-2 py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <span>{t.auth.loggingIn}</span>
              ) : (
                <>
                  <span>{t.auth.loginButton}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              {t.auth.onlyAdminNote}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 safe-pb">
        © {new Date().getFullYear()} {t.app.name}. Barcha huquqlar himoyalangan.
      </footer>
    </div>
  );
}
