'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { t } from '@/lib/i18n';
import { MathRenderer } from '@/components/MathRenderer';
import { MathKeyboard } from '@/components/MathKeyboard';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AntiCheatModal } from '@/components/AntiCheatModal';
import { useExamGuard } from '@/hooks/useExamGuard';
import { Question } from '@/types';
import {
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Upload,
  Flag,
} from 'lucide-react';

export default function StudentTakePage() {
  const params = useParams();
  const router = useRouter();
  const code = (params?.code as string)?.toUpperCase() || '';

  const [attemptId, setAttemptId] = useState<string>('');
  const [deviceToken, setDeviceToken] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [testTitle, setTestTitle] = useState<string>('');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { value: string; photo_url?: string | null }>>({});

  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [maxViolations, setMaxViolations] = useState<number>(3);
  const [requireFullscreen, setRequireFullscreen] = useState<boolean>(true);
  const [initialViolations, setInitialViolations] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial test data
  useEffect(() => {
    const storedAttemptId = localStorage.getItem('exam_attempt_id');
    const storedDeviceToken = localStorage.getItem('exam_device_token');
    const storedName = localStorage.getItem('exam_student_name');

    if (!storedAttemptId || !storedDeviceToken) {
      router.push(`/t/${code}`);
      return;
    }

    setAttemptId(storedAttemptId);
    setDeviceToken(storedDeviceToken);
    if (storedName) setStudentName(storedName);

    const loadTest = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `/api/student/test?attempt_id=${storedAttemptId}&device_token=${storedDeviceToken}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Testni yuklashda xatolik');
          return;
        }

        if (data.isFinished) {
          localStorage.setItem('exam_final_score', String(data.score));
          localStorage.setItem('exam_final_max_score', String(data.max_score));
          localStorage.setItem('exam_final_status', data.status);
          router.push(`/t/${code}/done`);
          return;
        }

        setTestTitle(data.test_title);
        setStudentName(data.student_name);
        setQuestions(data.questions || []);
        setAnswers(data.saved_answers || {});
        setRemainingSeconds(data.remaining_seconds);
        if (data.max_violations) setMaxViolations(data.max_violations);
        if (data.require_fullscreen !== undefined) setRequireFullscreen(data.require_fullscreen);
        if (data.violations_count !== undefined) setInitialViolations(data.violations_count);
      } catch {
        setError('Serverga ulanishda xatolik');
      } finally {
        setLoading(false);
      }
    };

    loadTest();
  }, [code, router]);

  // Submit test handler
  const handleSubmitTest = useCallback(
    async (reason: 'manual' | 'timeout' = 'manual') => {
      if (submitting) return;
      setSubmitting(true);

      try {
        const res = await fetch('/api/student/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            attempt_id: attemptId,
            device_token: deviceToken,
            reason,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          localStorage.setItem('exam_final_score', String(data.score));
          localStorage.setItem('exam_final_max_score', String(data.max_score));
          localStorage.setItem('exam_final_status', data.status);
          router.push(`/t/${code}/done`);
        } else {
          alert(data.error || 'Testni yakunlashda xatolik yuz berdi');
          setSubmitting(false);
        }
      } catch {
        alert('Server bilan aloqa uzildi. Iltimos qayta urining.');
        setSubmitting(false);
      }
    },
    [attemptId, deviceToken, code, router, submitting]
  );

  // Anti-Cheat Exam Guard hook
  const {
    violationsCount,
    isWarningOpen,
    isFullscreenBlocked,
    isMultiTabBlocked,
    dismissWarning,
    requestFullscreen,
  } = useExamGuard({
    attemptId,
    deviceToken,
    maxViolations,
    requireFullscreen,
    initialViolationsCount: initialViolations,
    isActive: !loading && !submitting && remainingSeconds !== null && remainingSeconds > 0,
    onAutoSubmit: () => {
      localStorage.setItem('exam_final_status', 'auto_submitted');
      router.push(`/t/${code}/done`);
    },
  });

  // Authoritative countdown timer countdown
  useEffect(() => {
    if (remainingSeconds === null) return;

    timerIntervalRef.current = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          handleSubmitTest('timeout');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [remainingSeconds, handleSubmitTest]);

  // Debounced answer autosave
  const saveAnswer = useCallback(
    (questionId: string, value: string, photoUrl?: string | null) => {
      setSaveStatus('saving');
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await fetch('/api/student/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attempt_id: attemptId,
              device_token: deviceToken,
              question_id: questionId,
              value,
              photo_url: photoUrl,
            }),
          });
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (err) {
          console.error('Failed to autosave answer', err);
          setSaveStatus('idle');
        }
      }, 500);
    },
    [attemptId, deviceToken]
  );

  // Update current answer
  const handleUpdateCurrentAnswer = (value: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !currentQ.id) return;

    const currentAnswer = answers[currentQ.id];
    const newAnswers = {
      ...answers,
      [currentQ.id]: {
        value,
        photo_url: currentAnswer?.photo_url || null,
      },
    };
    setAnswers(newAnswers);
    saveAnswer(currentQ.id, value, currentAnswer?.photo_url);
  };

  // Math keyboard insertion
  const handleInsertMath = (symbol: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ || !currentQ.id) return;
    const currentVal = answers[currentQ.id]?.value || '';
    handleUpdateCurrentAnswer(currentVal + symbol);
  };

  // Photo upload for open manual questions
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const currentQ = questions[currentIndex];
    if (!file || !currentQ || !currentQ.id) return;

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('attempt_id', attemptId);
      formData.append('question_id', currentQ.id);

      const res = await fetch('/api/student/upload-photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.photo_url) {
        const currentAnswer = answers[currentQ.id];
        const newAnswers = {
          ...answers,
          [currentQ.id]: {
            value: currentAnswer?.value || '',
            photo_url: data.photo_url,
          },
        };
        setAnswers(newAnswers);
        saveAnswer(currentQ.id, currentAnswer?.value || '', data.photo_url);
      } else {
        alert(data.error || 'Rasm yuklashda xatolik');
      }
    } catch {
      alert('Rasm yuklashda xatolik yuz berdi');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Format MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Savollar tayyorlanmoqda...</p>
        </div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 max-w-md mx-auto">
        <div className="bg-card border border-border rounded-3xl p-8 text-center space-y-4 w-full">
          <AlertCircle className="w-10 h-10 text-danger mx-auto" />
          <h2 className="text-xl font-bold">Xatolik</h2>
          <p className="text-sm text-muted-foreground">{error || 'Savollar mavjud emas'}</p>
          <button
            onClick={() => router.push(`/t/${code}`)}
            className="touch-target px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-semibold"
          >
            Qaytadan urinish
          </button>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const currentAnswer = currentQ?.id ? answers[currentQ.id] : undefined;
  const answeredCount = Object.keys(answers).filter((k) => answers[k]?.value?.trim()).length;
  const progressPercent = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-2xl mx-auto p-4 sm:p-6 no-select">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 pt-2 pb-3 border-b border-border/70 safe-pt space-y-2">
        <div className="flex items-center justify-between gap-3">
          {/* Student name & test title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent-subtle text-accent flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="truncate max-w-[130px] sm:max-w-[200px]">
              <span className="font-semibold text-xs sm:text-sm block truncate text-foreground">
                {studentName}
              </span>
              {testTitle && (
                <span className="text-[10px] text-muted-foreground block truncate">
                  {testTitle}
                </span>
              )}
            </div>
          </div>

          {/* Centered Minimalist Synced Timer */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-mono text-xs sm:text-sm font-bold border transition-all ${
              remainingSeconds !== null && remainingSeconds < 300
                ? 'bg-danger/10 text-danger border-danger/30 animate-pulse'
                : 'bg-card text-foreground border-border/80 shadow-subtle'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingSeconds !== null ? formatTime(remainingSeconds) : '--:--'}</span>
          </div>

          {/* Theme & Finish Header Button */}
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setShowFinishConfirm(true)}
              className="touch-target px-3.5 py-1.5 rounded-xl bg-accent-subtle hover:bg-accent/20 text-accent text-xs font-semibold border border-accent/20 transition-all flex items-center gap-1 active:scale-95"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>{t.student.finish}</span>
            </button>
          </div>
        </div>

        {/* Flush progress line and save indicator */}
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {t.student.question} {currentIndex + 1} / {questions.length}
            </span>
            <span className="font-mono flex items-center gap-1">
              {saveStatus === 'saving' && (
                <span className="text-amber-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  {t.student.autosaving}
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {t.student.autosaved}
                </span>
              )}
              {saveStatus === 'idle' && `${progressPercent}%`}
            </span>
          </div>
          <div className="w-full h-1 bg-border/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </header>

      {/* Main Question Display */}
      <main
        className={`my-auto py-4 space-y-5 flex-1 transition-all duration-200 ${
          isWarningOpen || isFullscreenBlocked || isMultiTabBlocked
            ? 'filter blur-lg pointer-events-none select-none'
            : ''
        }`}
      >
        {/* Question Navigator Drawer/Grid */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
          {questions.map((q, idx) => {
            const isAnswered = q.id && answers[q.id]?.value?.trim();
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`touch-target w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs flex items-center justify-center border transition-all flex-shrink-0 ${
                  isCurrent
                    ? 'border-accent bg-accent text-accent-foreground shadow-glow scale-105'
                    : isAnswered
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-border/80 bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 sm:p-7 shadow-card space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">
              {t.student.question} {currentIndex + 1}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
              {currentQ.points} ball
            </span>
          </div>

          {/* Question Prompt with KaTeX */}
          <div className="text-base sm:text-lg leading-relaxed text-foreground font-sans">
            <MathRenderer content={currentQ.prompt} />
          </div>

          {/* Question Image if present */}
          {currentQ.image_url && (
            <div className="rounded-2xl overflow-hidden border border-border/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQ.image_url}
                alt="Savol illyustratsiyasi"
                className="max-h-60 mx-auto object-contain"
              />
            </div>
          )}

          {/* Multiple choice options */}
          {currentQ.type === 'multiple_choice' && (
            <div className="space-y-2.5 pt-1">
              {currentQ.options?.map((opt, optIdx) => {
                const isSelected = currentAnswer?.value === opt.id;
                return (
                  <button
                    key={opt.id || optIdx}
                    type="button"
                    onClick={() => opt.id && handleUpdateCurrentAnswer(opt.id)}
                    className={`w-full touch-target text-left p-3.5 sm:p-4 rounded-2xl border transition-all flex items-center gap-3.5 active:scale-[0.99] ${
                      isSelected
                        ? 'border-accent bg-accent-subtle shadow-subtle ring-1 ring-accent'
                        : 'border-border/70 bg-background/60 hover:bg-muted/60'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-accent text-accent-foreground shadow-sm'
                          : 'border border-border/80 text-muted-foreground'
                      }`}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </div>
                    <div className="flex-1 text-sm sm:text-base font-sans">
                      <MathRenderer content={opt.text} inline />
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isSelected
                          ? 'border-accent bg-accent text-white'
                          : 'border-muted-foreground/30'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Open Auto (numeric/short text) */}
          {currentQ.type === 'open_auto' && (
            <div className="space-y-4 pt-1">
              <input
                type="text"
                value={currentAnswer?.value || ''}
                onChange={(e) => handleUpdateCurrentAnswer(e.target.value)}
                placeholder={t.student.openAnswerPlaceholder}
                className="w-full touch-target px-4 rounded-2xl border border-border/80 bg-background/80 focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-base font-mono transition-all"
              />
              <MathKeyboard onInsert={handleInsertMath} />
            </div>
          )}

          {/* Open Manual (solution textarea + optional photo upload) */}
          {currentQ.type === 'open_manual' && (
            <div className="space-y-4 pt-1">
              <textarea
                rows={4}
                value={currentAnswer?.value || ''}
                onChange={(e) => handleUpdateCurrentAnswer(e.target.value)}
                placeholder={t.student.manualAnswerPlaceholder}
                className="w-full p-4 rounded-2xl border border-border/80 bg-background/80 focus:outline-none focus:ring-2 focus:ring-accent text-foreground text-sm transition-all"
              />

              <MathKeyboard onInsert={handleInsertMath} />

              {/* Photo Upload Section */}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <label className="text-xs font-semibold text-muted-foreground block">
                  {t.student.uploadPhoto}
                </label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold cursor-pointer transition-all active:scale-95">
                    <Upload className="w-4 h-4 text-accent" />
                    <span>
                      {uploadingPhoto ? t.student.uploading : 'Rasm tanlash / Kamera'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      disabled={uploadingPhoto}
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>

                  {currentAnswer?.photo_url && (
                    <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.student.photoUploaded}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Navigation Buttons */}
      <footer className="sticky bottom-0 z-20 bg-background/80 backdrop-blur-xl -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-4 border-t border-border/70 flex items-center justify-between gap-3 safe-pb">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="touch-target flex-1 max-w-[130px] px-4 py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted text-foreground font-semibold flex items-center justify-center gap-1.5 disabled:opacity-30 active:scale-95 transition-all text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{t.student.prev}</span>
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setShowFinishConfirm(true)}
            className="touch-target flex-1 px-6 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-accent-foreground font-bold flex items-center justify-center gap-1.5 shadow-glow active:scale-95 transition-all text-sm"
          >
            <Flag className="w-4 h-4" />
            <span>{t.student.finish}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
            className="touch-target flex-1 max-w-[130px] px-4 py-3 rounded-2xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-1.5 shadow-subtle active:scale-95 transition-all text-sm"
          >
            <span>{t.student.next}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </footer>

      {/* Finish Confirmation Dialog */}
      {showFinishConfirm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto">
              <Flag className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold">{t.student.finishConfirmTitle}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.student.finishConfirmDesc}
            </p>
            <div className="p-3 rounded-xl bg-background border border-border text-xs text-muted-foreground">
              Javob berilgan savollar: <strong className="text-foreground">{answeredCount} / {questions.length}</strong>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmitTest('manual')}
                className="touch-target w-full py-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-bold shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Yuborilmoqda...' : t.student.confirmYes}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowFinishConfirm(false)}
                className="touch-target w-full py-2.5 rounded-xl border border-border bg-card hover:bg-muted text-sm font-medium transition-all"
              >
                {t.student.confirmCancel}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Anti-Cheat Warning / Blocking Modal */}
      <AntiCheatModal
        isOpen={isWarningOpen}
        violationsCount={violationsCount}
        maxViolations={maxViolations}
        onDismiss={dismissWarning}
        isFullscreenBlocked={isFullscreenBlocked}
        onRequestFullscreen={requestFullscreen}
        isMultiTabBlocked={isMultiTabBlocked}
      />
    </div>
  );
}
