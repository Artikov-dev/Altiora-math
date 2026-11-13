'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function StudentDonePage() {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('submitted');
  const [studentName, setStudentName] = useState<string>('');

  useEffect(() => {
    // Read cached result from localStorage
    const savedScore = localStorage.getItem('exam_final_score');
    const savedMaxScore = localStorage.getItem('exam_final_max_score');
    const savedStatus = localStorage.getItem('exam_final_status');
    const savedName = localStorage.getItem('exam_student_name');

    if (savedName) setStudentName(savedName);
    if (savedStatus) setStatus(savedStatus);
    if (savedScore !== null && savedScore !== 'null') {
      setScore(Number(savedScore));
    }
    if (savedMaxScore !== null && savedMaxScore !== 'null') {
      setMaxScore(Number(savedMaxScore));
    }

    // Launch confetti celebration if submitted normally
    if (savedStatus !== 'auto_submitted') {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b'],
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const percentage = score !== null && maxScore !== null && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 safe-pt">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-bold text-base tracking-tight">{t.app.name}</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Done Card */}
      <main className="my-auto py-8">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
          {status === 'auto_submitted' ? (
            <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-2">
              {t.student.doneTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {studentName ? `${studentName}, ` : ''}{t.student.doneMessage}
            </p>
          </div>

          {/* Auto submitted alert if violations reached */}
          {status === 'auto_submitted' && (
            <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs text-left flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{t.student.autoSubmittedNotice}</span>
            </div>
          )}

          {/* Score display if allowed by teacher */}
          {percentage !== null && score !== null && maxScore !== null && (
            <div className="p-6 rounded-2xl bg-background/70 border border-border space-y-2">
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Award className="w-4 h-4 text-accent" />
                <span>{t.student.yourScore}</span>
              </div>
              <div className="text-4xl font-extrabold text-foreground">
                {score} <span className="text-xl font-normal text-muted-foreground">/ {maxScore}</span>
              </div>
              <div className="inline-block px-3 py-1 rounded-full bg-accent-subtle text-accent font-bold text-sm">
                {percentage}%
              </div>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => router.push('/')}
              className="touch-target inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-background hover:bg-muted text-sm font-semibold transition-all"
            >
              <span>Bosh sahifaga qaytish</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 safe-pb">
        © {new Date().getFullYear()} {t.app.name}.
      </footer>
    </div>
  );
}
