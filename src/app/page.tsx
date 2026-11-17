'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { t } from '@/lib/i18n';
import { GraduationCap, ArrowRight, ShieldCheck, Zap, BookOpen } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const handleEnterTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      router.push(`/t/${code.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between py-3 safe-pt">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block leading-tight">{t.app.name}</span>
            <span className="text-xs text-muted-foreground hidden sm:block">{t.app.tagline}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/teacher/login"
            className="touch-target px-4 py-2 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center gap-1.5"
          >
            {t.auth.teacherLogin}
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="my-auto py-10 space-y-8 text-center sm:text-left">
        <div className="max-w-2xl mx-auto sm:mx-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-subtle text-accent text-xs font-semibold mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Anti-Cheat himoyalangan matematika platformasi</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight mb-4">
            Matematika nazorat ishlari va testlar tizimi
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground mb-8">
            O&apos;quvchilar uchun KaTeX formulalari bilan boyitilgan qulay test muhiti. Sahifadan chiqish va boshqa ilovalarga o&apos;tish avtomatik aniqlanadi.
          </p>

          {/* Student direct code entry */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-lg max-w-md">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              O&apos;quvchilar uchun
            </h2>
            <form onSubmit={handleEnterTest} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Test kodini kiriting (masalan: MTH101)"
                className="flex-1 touch-target px-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground uppercase tracking-widest text-center sm:text-left"
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="touch-target px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <span>Kirish</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Feature badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-border">
          <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-subtle text-accent">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Tezkor KaTeX</h3>
              <p className="text-xs text-muted-foreground">Formulalar brauzerda bir zumda chiroyli chiziladi.</p>
            </div>
          </div>

          <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-subtle text-accent">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Anti-Cheat nazorat</h3>
              <p className="text-xs text-muted-foreground">Tab almashtirish va chiqishlar jurnali yuritiladi.</p>
            </div>
          </div>

          <div className="bg-card/50 border border-border/60 rounded-xl p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-accent-subtle text-accent">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Avto va qo&apos;lda tekshiruv</h3>
              <p className="text-xs text-muted-foreground">Variantli, sonli va yozma yechimli savollar.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border/40 safe-pb">
        © {new Date().getFullYear()} {t.app.name}. Barcha huquqlar himoyalangan.
      </footer>
    </div>
  );
}
