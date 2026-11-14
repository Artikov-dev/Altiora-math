'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { MathRenderer } from '@/components/MathRenderer';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Question, Violation } from '@/types';
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Save,
  Check,
  ExternalLink,
  MessageSquare,
  Award,
} from 'lucide-react';

interface QuestionWithAnswer extends Question {
  student_answer?: {
    id: string;
    value: string;
    photo_url?: string | null;
    auto_score: number;
    manual_score?: number | null;
    comment?: string;
  } | null;
}

export default function StudentDetailResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;
  const attemptId = params?.attemptId as string;

  const [studentName, setStudentName] = useState('');
  const [testTitle, setTestTitle] = useState('');
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [status, setStatus] = useState<'in_progress' | 'submitted' | 'auto_submitted'>('submitted');
  const [questions, setQuestions] = useState<QuestionWithAnswer[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(true);

  // Manual grading state: map questionId -> { manual_score, comment }
  const [grades, setGrades] = useState<Record<string, { manual_score: number; comment: string }>>({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeSavedToast, setGradeSavedToast] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/tests/${testId}/results/${attemptId}`);
      if (res.status === 401) {
        router.push('/teacher/login');
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Natijani yuklab bo\'lmadi');
        router.push(`/teacher/tests/${testId}/results`);
        return;
      }

      setStudentName(data.attempt.student_name);
      setTestTitle(data.test.title);
      setScore(Number(data.attempt.score) || 0);
      setMaxScore(Number(data.attempt.max_score) || 0);
      setStatus(data.attempt.status);
      setQuestions(data.questions || []);
      setViolations(data.violations || []);

      // Initialize grading state
      const initialGrades: Record<string, { manual_score: number; comment: string }> = {};
      for (const q of data.questions || []) {
        const ans = q.student_answer;
        const currentScore = ans?.manual_score !== null && ans?.manual_score !== undefined
          ? Number(ans.manual_score)
          : Number(ans?.auto_score || 0);
        initialGrades[q.id!] = {
          manual_score: currentScore,
          comment: ans?.comment || '',
        };
      }
      setGrades(initialGrades);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [testId, attemptId, router]);

  useEffect(() => {
    if (testId && attemptId) {
      fetchDetail();
    }
  }, [testId, attemptId, fetchDetail]);

  const handleSaveGrades = async () => {
    setSavingGrade(true);
    try {
      const payload = {
        grades: Object.entries(grades).map(([question_id, val]) => ({
          question_id,
          manual_score: val.manual_score,
          comment: val.comment,
        })),
      };

      const res = await fetch(`/api/teacher/tests/${testId}/results/${attemptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setScore(data.score);
        setGradeSavedToast(true);
        setTimeout(() => setGradeSavedToast(false), 2500);
      } else {
        alert(data.error || 'Bahoni saqlashda xatolik');
      }
    } catch {
      alert('Server bilan aloqa uzildi');
    } finally {
      setSavingGrade(false);
    }
  };

  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border safe-pt">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/tests/${testId}/results`}
            className="touch-target p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center justify-center"
            title="Natijalar ro'yxatiga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <span className="text-xs text-muted-foreground">{testTitle}</span>
            <h1 className="font-bold text-xl tracking-tight leading-tight">{studentName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleSaveGrades}
            disabled={savingGrade}
            className="touch-target px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center gap-1.5 shadow-md active:scale-95 transition-all disabled:opacity-50 text-xs sm:text-sm"
          >
            {gradeSavedToast ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>{t.results.gradeSaved}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{savingGrade ? 'Saqlanmoqda...' : t.results.saveGrade}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
          <div className="h-64 rounded-2xl bg-card border border-border animate-pulse" />
        </div>
      ) : (
        <main className="space-y-8 flex-1">
          {/* Summary Score Card */}
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Umumiy natija
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-extrabold text-foreground">{score}</span>
                <span className="text-lg text-muted-foreground">/ {maxScore} ball</span>
                <span className="px-3 py-1 rounded-full bg-accent-subtle text-accent font-bold text-sm">
                  {percentage}%
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <span
                className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                  status === 'submitted'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : status === 'auto_submitted'
                    ? 'bg-danger/15 text-danger'
                    : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {t.results.statuses[status]}
              </span>

              {violations.length > 0 ? (
                <span className="px-3 py-1.5 rounded-xl bg-danger/15 text-danger text-xs font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  <span>{violations.length} ta qoidabuzarlik</span>
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-400 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Chiqishlar yo&apos;q</span>
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Questions & Answers */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-accent" />
              <span>{t.results.questionsList} ({questions.length})</span>
            </h2>

            <div className="space-y-6">
              {questions.map((q, idx) => {
                const ans = q.student_answer;
                const earnedPoints = grades[q.id!]?.manual_score ?? ans?.auto_score ?? 0;
                const commentVal = grades[q.id!]?.comment ?? ans?.comment ?? '';
                const maxPoints = Number(q.points) || 1;

                // For Multiple Choice
                const selectedOpt = q.options?.find((o) => o.id === ans?.value);
                const correctOpt = q.options?.find((o) => o.is_correct);
                const isMcqCorrect = selectedOpt && correctOpt && selectedOpt.id === correctOpt.id;

                return (
                  <div
                    key={q.id || idx}
                    className="bg-card border border-border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-border pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs uppercase font-semibold text-muted-foreground">
                          {t.builder.questionTypes[q.type]}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {earnedPoints} / {maxPoints} ball
                        </span>
                        {q.type !== 'open_manual' && (
                          earnedPoints === maxPoints ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-5 h-5 text-danger" />
                          )
                        )}
                      </div>
                    </div>

                    {/* Question Prompt with KaTeX */}
                    <div className="text-base font-serif text-foreground leading-relaxed">
                      <MathRenderer content={q.prompt} />
                    </div>

                    {/* Question image */}
                    {q.image_url && (
                      <div className="rounded-xl overflow-hidden border border-border max-w-sm">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.image_url} alt="Savol" className="object-contain" />
                      </div>
                    )}

                    {/* Answers Display */}
                    <div className="p-4 rounded-xl bg-background/60 border border-border space-y-3 text-sm">
                      {/* MCQ answer display */}
                      {q.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground min-w-[120px]">
                              {t.results.studentAnswer}
                            </span>
                            <div className={`font-serif ${isMcqCorrect ? 'text-emerald-400 font-semibold' : 'text-danger'}`}>
                              {selectedOpt ? (
                                <MathRenderer content={selectedOpt.text} inline />
                              ) : (
                                <span className="text-muted-foreground italic">{t.results.notAnswered}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground min-w-[120px]">
                              {t.results.correctAnswer}
                            </span>
                            <div className="font-serif text-emerald-400 font-semibold">
                              {correctOpt ? (
                                <MathRenderer content={correctOpt.text} inline />
                              ) : (
                                '-'
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Open Auto answer display */}
                      {q.type === 'open_auto' && (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground min-w-[120px]">
                              {t.results.studentAnswer}
                            </span>
                            <span className="font-mono font-bold text-foreground">
                              {ans?.value || <span className="text-muted-foreground italic font-normal">{t.results.notAnswered}</span>}
                            </span>
                          </div>

                          <div className="flex items-start gap-2">
                            <span className="text-xs font-semibold text-muted-foreground min-w-[120px]">
                              To&apos;g&apos;ri qabul qilingan:
                            </span>
                            <span className="font-mono text-emerald-400 text-xs">
                              {q.accepted_answers?.join(', ') || '-'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Open Manual (full solution + photo) */}
                      {q.type === 'open_manual' && (
                        <div className="space-y-3">
                          <div>
                            <span className="text-xs font-semibold text-muted-foreground block mb-1">
                              O&apos;quvchi yozgan yechim matni:
                            </span>
                            <div className="p-3 rounded-lg bg-card border border-border text-sm whitespace-pre-wrap font-sans">
                              {ans?.value || <span className="text-muted-foreground italic">{t.results.notAnswered}</span>}
                            </div>
                          </div>

                          {ans?.photo_url && (
                            <div>
                              <span className="text-xs font-semibold text-muted-foreground block mb-1">
                                O&apos;quvchi yuklagan daftar rasmi:
                              </span>
                              <a
                                href={ans.photo_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 p-2 rounded-xl border border-border bg-card hover:bg-muted text-accent text-xs font-semibold transition-all group"
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ans.photo_url}
                                  alt="Yechim rasmi"
                                  className="w-16 h-16 object-cover rounded-lg border border-border"
                                />
                                <span>Katta o&apos;lchamda ochish</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Teacher Manual Grading Controls (Especially for open questions) */}
                    <div className="pt-3 border-t border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-muted-foreground" htmlFor={`grade-${q.id}`}>
                          {t.results.setManualScore.replace('{max}', String(maxPoints))}
                        </label>
                        <input
                          id={`grade-${q.id}`}
                          type="number"
                          min="0"
                          max={maxPoints}
                          step="0.5"
                          value={earnedPoints}
                          onChange={(e) =>
                            setGrades({
                              ...grades,
                              [q.id!]: {
                                manual_score: Math.min(maxPoints, Math.max(0, Number(e.target.value))),
                                comment: commentVal,
                              },
                            })
                          }
                          className="w-20 px-3 py-1.5 rounded-lg border border-border bg-background text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                      </div>

                      <div className="flex-1 w-full sm:max-w-md">
                        <div className="relative">
                          <MessageSquare className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            value={commentVal}
                            onChange={(e) =>
                              setGrades({
                                ...grades,
                                [q.id!]: {
                                  manual_score: earnedPoints,
                                  comment: e.target.value,
                                },
                              })
                            }
                            placeholder={t.results.teacherComment}
                            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-accent"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 2: Full Violation Timeline / Audit Trail */}
          <section className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-danger" />
              <span>{t.results.violationsLog} ({violations.length})</span>
            </h2>

            {violations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <span>{t.results.noViolations}</span>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/50 border-b border-border uppercase font-semibold text-muted-foreground">
                      <tr>
                        <th className="py-3 px-4">№</th>
                        <th className="py-3 px-4">Qoidabuzarlik turi</th>
                        <th className="py-3 px-4">{t.results.occurredAt}</th>
                        <th className="py-3 px-4">{t.results.durationAway}</th>
                        <th className="py-3 px-4">Tafsilot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {violations.map((v, vIdx) => {
                        const durationSecs = v.duration_ms ? (v.duration_ms / 1000).toFixed(1) : 0;
                        const timeStr = new Date(v.occurred_at).toLocaleTimeString('uz-UZ', {
                          timeZone: 'Asia/Tashkent',
                        });

                        return (
                          <tr key={v.id || vIdx} className="hover:bg-muted/20">
                            <td className="py-3 px-4 font-mono font-bold text-muted-foreground">
                              {vIdx + 1}
                            </td>
                            <td className="py-3 px-4 font-semibold text-danger flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>{t.results.violationTypes[v.type] || v.type}</span>
                            </td>
                            <td className="py-3 px-4 font-mono text-muted-foreground">
                              {timeStr}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {v.duration_ms > 0 ? (
                                <span className="text-amber-400 font-bold">{durationSecs} soniya</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground font-mono text-[11px] truncate max-w-xs">
                              {v.meta && Object.keys(v.meta).length > 0 ? JSON.stringify(v.meta) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {/* Bottom Save Action */}
          <div className="pt-4 border-t border-border flex justify-end gap-3 safe-pb">
            <Link
              href={`/teacher/tests/${testId}/results`}
              className="touch-target px-5 py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-sm font-semibold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Natijalar ro&apos;yxatiga qaytish</span>
            </Link>

            <button
              onClick={handleSaveGrades}
              disabled={savingGrade}
              className="touch-target px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground text-sm font-semibold flex items-center gap-2 shadow-lg active:scale-95 transition-all disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingGrade ? 'Saqlanmoqda...' : t.results.saveGrade}</span>
            </button>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border safe-pb">
        © {new Date().getFullYear()} {t.app.name}.
      </footer>
    </div>
  );
}
