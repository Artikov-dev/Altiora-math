'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import confetti from 'canvas-confetti';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { MathRenderer } from '@/components/MathRenderer';
import {
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  ShieldAlert,
  Printer,
  XCircle,
  Eye,
  Check,
} from 'lucide-react';

interface ReviewQuestion {
  id: string;
  type: string;
  prompt: string;
  image_url?: string | null;
  points: number;
  options?: { id: string; text: string; is_correct: boolean; order_index: number }[];
  student_answer?: string;
  student_photo_url?: string | null;
  auto_score: number;
  manual_score: number | null;
  accepted_answers?: string[];
}

export default function StudentDonePage() {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('submitted');
  const [studentName, setStudentName] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');
  const [reviewQuestions, setReviewQuestions] = useState<ReviewQuestion[]>([]);
  const [showReview, setShowReview] = useState<boolean>(false);
  const [reviewAllowed, setReviewAllowed] = useState<boolean>(false);

  useEffect(() => {
    const savedScore = localStorage.getItem('exam_final_score');
    const savedMaxScore = localStorage.getItem('exam_final_max_score');
    const savedStatus = localStorage.getItem('exam_final_status');
    const savedName = localStorage.getItem('exam_student_name');
    const attemptId = localStorage.getItem('exam_attempt_id');
    const deviceToken = localStorage.getItem('exam_device_token');

    if (savedName) setStudentName(savedName);
    if (savedStatus) setStatus(savedStatus);
    if (savedScore !== null && savedScore !== 'null') setScore(Number(savedScore));
    if (savedMaxScore !== null && savedMaxScore !== 'null') setMaxScore(Number(savedMaxScore));

    // Launch confetti if not auto-submitted
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

    // Fetch review answers if allowed by teacher
    if (attemptId && deviceToken) {
      fetch(`/api/student/results?attempt_id=${attemptId}&device_token=${deviceToken}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.allowed) {
            setReviewAllowed(true);
            if (data.questions) setReviewQuestions(data.questions);
            if (data.test_title) setTestTitle(data.test_title);
          }
        })
        .catch(() => {});
    }
  }, []);

  const percentage = score !== null && maxScore !== null && maxScore > 0
    ? Math.round((score / maxScore) * 100)
    : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 sm:p-6 max-w-2xl mx-auto">
      {/* Top Header */}
      <header className="flex items-center justify-between py-2 safe-pt print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-bold text-base tracking-tight">{t.app.name}</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Done Card */}
      <main className="my-auto py-6 space-y-6">
        <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 print:border-none print:shadow-none">
          {status === 'auto_submitted' ? (
            <div className="w-16 h-16 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto print:hidden">
              <ShieldAlert className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto print:hidden">
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
            <div className="p-4 rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs text-left flex items-start gap-2.5 print:hidden">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{t.student.autoSubmittedNotice}</span>
            </div>
          )}

          {/* Score Certificate Card */}
          {percentage !== null && score !== null && maxScore !== null && (
            <div className="p-6 sm:p-8 rounded-3xl bg-background/80 border border-border space-y-4 shadow-sm text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-600 via-indigo-500 to-purple-600" />
              
              <div className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Award className="w-4 h-4 text-accent" />
                <span>{t.student.yourScore}</span>
              </div>

              {testTitle && (
                <div className="text-sm font-semibold text-foreground/80">
                  {testTitle}
                </div>
              )}

              <div className="text-5xl font-black text-foreground tracking-tight">
                {score} <span className="text-2xl font-normal text-muted-foreground">/ {maxScore}</span>
              </div>

              <div className="inline-block px-4 py-1.5 rounded-full bg-accent-subtle text-accent font-extrabold text-base border border-accent/20">
                {percentage}%
              </div>

              <div className="text-[11px] text-muted-foreground pt-2 border-t border-border/60">
                Topshiruvchi: <strong className="text-foreground">{studentName}</strong> • {new Date().toLocaleDateString('uz-UZ')}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 print:hidden">
            <button
              onClick={handlePrint}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-xs sm:text-sm font-semibold transition-all active:scale-95 shadow-sm"
            >
              <Printer className="w-4 h-4 text-accent" />
              <span>{t.student.printCertificate}</span>
            </button>

            {reviewAllowed && (
              <button
                onClick={() => setShowReview(!showReview)}
                className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-subtle hover:bg-accent/25 text-accent border border-accent/20 text-xs sm:text-sm font-semibold transition-all active:scale-95"
              >
                <Eye className="w-4 h-4" />
                <span>{showReview ? 'Javoblarni yashirish' : t.student.reviewTitle}</span>
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95"
            >
              <span>Bosh sahifa</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Detailed Question-by-Question Review (if allowed) */}
        {showReview && reviewQuestions.length > 0 && (
          <section className="bg-card border border-border rounded-3xl p-5 sm:p-7 shadow-xl space-y-5 print:hidden animate-fadeIn">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="font-bold text-base sm:text-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-accent" />
                <span>{t.student.reviewTitle}</span>
              </h2>
              <span className="text-xs text-muted-foreground">
                {reviewQuestions.length} ta savol
              </span>
            </div>

            <div className="space-y-4">
              {reviewQuestions.map((q, qIdx) => {
                const earned = q.manual_score !== null ? q.manual_score : q.auto_score;
                const isCorrect = earned >= q.points;
                const selectedOpt = q.options?.find((o) => o.id === q.student_answer);
                const correctOpt = q.options?.find((o) => o.is_correct);

                return (
                  <div
                    key={q.id || qIdx}
                    className="p-4 sm:p-5 rounded-2xl border border-border bg-background space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-accent">
                        Savol {qIdx + 1}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isCorrect
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-danger/10 text-danger'
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>{earned} / {q.points} ball</span>
                      </span>
                    </div>

                    <div className="text-sm font-serif text-foreground leading-relaxed">
                      <MathRenderer content={q.prompt} />
                    </div>

                    {q.type === 'multiple_choice' ? (
                      <div className="text-xs space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Sizning javobingiz:</span>
                          <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-danger font-semibold'}>
                            {selectedOpt ? <MathRenderer content={selectedOpt.text} inline /> : 'Javob berilmagan'}
                          </span>
                        </div>
                        {!isCorrect && correctOpt && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">To&apos;g&apos;ri javob:</span>
                            <span className="text-emerald-400 font-semibold">
                              <MathRenderer content={correctOpt.text} inline />
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Sizning javobingiz:</span>
                          <span className="font-mono font-semibold text-foreground">
                            {q.student_answer || 'Javob berilmagan'}
                          </span>
                        </div>
                        {q.accepted_answers && q.accepted_answers.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">To&apos;g&apos;ri javob:</span>
                            <span className="text-emerald-400 font-semibold font-mono">
                              {q.accepted_answers.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 safe-pb print:hidden">
        © {new Date().getFullYear()} {t.app.name}.
      </footer>
    </div>
  );
}
