'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  GraduationCap,
  Clock,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  User,
  Maximize2,
} from 'lucide-react';

export default function StudentLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || '';

  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [testInfo, setTestInfo] = useState<{
    title: string;
    description: string;
    duration_minutes: number;
    max_violations: number;
    require_fullscreen: boolean;
  } | null>(null);
  const [loadingTest, setLoadingTest] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch test details for landing
  useEffect(() => {
    if (!code) return;
    const fetchInfo = async () => {
      try {
        setLoadingTest(true);
        const res = await fetch(`/api/student/info?code=${code}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Test topilmadi');
          return;
        }
        setTestInfo(data.test);
      } catch {
        setError('Test ma\'lumotlarini yuklashda xatolik');
      } finally {
        setLoadingTest(false);
      }
    };
    fetchInfo();
  }, [code]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (studentName.trim().length < 3) {
      setError(t.student.nameMinError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/student/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          student_name: studentName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Boshlashda xatolik yuz berdi');
        setLoading(false);
        return;
      }

      // Save credentials in localStorage
      localStorage.setItem('exam_attempt_id', data.attempt_id);
      localStorage.setItem('exam_device_token', data.device_token);
      localStorage.setItem('exam_test_code', code);
      localStorage.setItem('exam_student_name', studentName.trim());

      // Redirect to test screen
      router.push(`/t/${code}/take`);
    } catch {
      setError('Server bilan aloqa o\'rnatib bo\'lmadi');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 safe-pt">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight block">{t.app.name}</span>
            <span className="text-xs text-muted-foreground font-mono">#{code}</span>
          </div>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Container */}
      <main className="my-auto py-6">
        {loadingTest ? (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-4">
            <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Test ma&apos;lumotlari yuklanmoqda...</p>
          </div>
        ) : error && !testInfo ? (
          <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold">Xatolik</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="touch-target px-5 py-2 rounded-xl bg-card border border-border text-sm font-medium hover:bg-muted"
            >
              Bosh sahifaga qaytish
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
            {/* Title & Metadata */}
            <div className="text-center space-y-2">
              <span className="px-3 py-1 rounded-full bg-accent-subtle text-accent text-xs font-semibold uppercase tracking-wider">
                {t.student.welcome}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {testInfo?.title}
              </h1>
              {testInfo?.description && (
                <p className="text-sm text-muted-foreground">
                  {testInfo.description}
                </p>
              )}
            </div>

            {/* Duration badge */}
            <div className="flex items-center justify-center gap-4 py-2 border-y border-border text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 font-medium text-foreground">
                <Clock className="w-4 h-4 text-accent" />
                {testInfo?.duration_minutes} {t.teacher.minutes}
              </span>
              {testInfo?.require_fullscreen && (
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <Maximize2 className="w-4 h-4 text-violet-400" />
                  To&apos;liq ekran
                </span>
              )}
            </div>

            {/* Anti-cheat rules list */}
            <div className="p-4 rounded-2xl bg-background/60 border border-border space-y-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-accent text-xs uppercase tracking-wider">
                <ShieldAlert className="w-4 h-4" />
                <span>{t.student.testRules}</span>
              </div>
              <ul className="space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span>{t.student.rule1}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span>{t.student.rule2}</span>
                </li>
                {testInfo?.require_fullscreen && (
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                    <span>{t.student.rule3}</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                  <span>
                    Ruxsat etilgan limit: <strong>{testInfo?.max_violations}</strong> ta qoidabuzarlik. Limit tugasa, test avtomatik topshiriladi.
                  </span>
                </li>
                <li className="flex items-start gap-2 text-amber-400/90 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <span>
                    Ekranning chetidan &quot;orqaga&quot; surish (swipe) jestini qilmang va bildirishnomalarni ochmang — bu sahifadan chiqish deb qayd etiladi.
                  </span>
                </li>
              </ul>
              <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground/80 italic">
                {t.student.honestyNotice}
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name Input Form */}
            <form onSubmit={handleStart} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium" htmlFor="student-name">
                  {t.student.nameLabel} *
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    id="student-name"
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder={t.student.namePlaceholder}
                    className="w-full touch-target pl-11 pr-4 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || studentName.trim().length < 3}
                className="w-full touch-target py-3 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span>{t.student.starting}</span>
                ) : (
                  <>
                    <span>{t.student.startButton}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 safe-pb">
        © {new Date().getFullYear()} {t.app.name}.
      </footer>
    </div>
  );
}
