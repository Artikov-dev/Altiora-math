'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft,
  RefreshCw,
  Radio,
  Users,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Send,
  Slash,
  AlertTriangle,
  ExternalLink,
  X,
  Search,
} from 'lucide-react';

interface LiveStudent {
  id: string;
  student_name: string;
  status: 'in_progress' | 'submitted' | 'auto_submitted';
  live_status: 'active' | 'away' | 'idle' | 'offline' | 'submitted' | 'auto_submitted';
  answered_count: number;
  total_questions: number;
  current_question_index: number | null;
  violations_count: number;
  max_violations: number;
  latest_violation: {
    type: string;
    occurred_at: string;
    duration_ms: number;
  } | null;
  score: number;
  max_score: number;
  remaining_seconds: number;
  started_at: string;
  submitted_at: string | null;
  last_ping_ago_seconds: number | null;
}

interface LiveSummary {
  total: number;
  active: number;
  away: number;
  submitted: number;
  idle: number;
  offline: number;
}

export default function TeacherLiveProctoringPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;

  const [test, setTest] = useState<{
    id: string;
    title: string;
    code: string;
    duration_minutes: number;
    max_violations: number;
    is_published: boolean;
  } | null>(null);

  const [students, setStudents] = useState<LiveStudent[]>([]);
  const [summary, setSummary] = useState<LiveSummary>({
    total: 0,
    active: 0,
    away: 0,
    submitted: 0,
    idle: 0,
    offline: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'away' | 'submitted'>('all');

  // Warning modal state
  const [warningTarget, setWarningTarget] = useState<LiveStudent | null>(null);
  const [warningText, setWarningText] = useState('');
  const [sendingWarning, setSendingWarning] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchLiveData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setRefreshing(true);
      const res = await fetch(`/api/teacher/tests/${testId}/live`);
      if (res.status === 401) {
        router.push('/teacher/login');
        return;
      }
      const data = await res.json();
      if (data.test) setTest(data.test);
      if (data.students) setStudents(data.students);
      if (data.summary) setSummary(data.summary);
    } catch (err) {
      console.error('Failed to load live proctoring data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [testId, router]);

  useEffect(() => {
    fetchLiveData();

    // Auto refresh every 3.5 seconds
    intervalRef.current = setInterval(() => {
      fetchLiveData(true);
    }, 3500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchLiveData]);

  // Force submit student attempt
  const handleForceSubmit = async (student: LiveStudent) => {
    if (!window.confirm(`${student.student_name}ning testini majburiy yakunlab, natijasini yubormoqchimisiz?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teacher/tests/${testId}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_submit',
          attempt_id: student.id,
        }),
      });

      if (res.ok) {
        setToastMessage(`${student.student_name}: ${t.live.forceSubmittedSuccess}`);
        setTimeout(() => setToastMessage(null), 3000);
        fetchLiveData(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Xatolik yuz berdi');
      }
    } catch {
      alert('Server bilan aloqa uzildi');
    }
  };

  // Send warning message to student
  const handleSendWarning = async () => {
    if (!warningTarget || !warningText.trim()) return;
    setSendingWarning(true);

    try {
      const res = await fetch(`/api/teacher/tests/${testId}/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'warn',
          attempt_id: warningTarget.id,
          message: warningText.trim(),
        }),
      });

      if (res.ok) {
        setToastMessage(t.live.warningSent);
        setTimeout(() => setToastMessage(null), 3000);
        setWarningTarget(null);
        setWarningText('');
      } else {
        const data = await res.json();
        alert(data.error || 'Ogohlantirish yuborishda xatolik');
      }
    } catch {
      alert('Server bilan aloqa uzildi');
    } finally {
      setSendingWarning(false);
    }
  };

  const formatSeconds = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.student_name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'active') return s.live_status === 'active';
    if (statusFilter === 'away') return s.live_status === 'away';
    if (statusFilter === 'submitted') return s.live_status === 'submitted' || s.live_status === 'auto_submitted';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 animate-in fade-in slide-in-from-top-3">
          <div className="px-4 py-2.5 rounded-2xl bg-accent text-accent-foreground shadow-2xl font-semibold text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border safe-pt">
        <div className="flex items-center gap-3">
          <Link
            href={`/teacher/tests/${testId}/results`}
            className="touch-target p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center justify-center"
            title="Natijalar jadvaliga qaytish"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl tracking-tight leading-tight flex items-center gap-2">
                <span>{test?.title || t.live.title}</span>
              </h1>
              <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-xs font-mono font-bold">
                {test?.code}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>{t.live.autoRefreshing}</span>
              </span>
              <span>•</span>
              <span>Davomiyligi: {test?.duration_minutes} daqiqa</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLiveData(false)}
            disabled={refreshing}
            className="touch-target px-3.5 py-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all"
            title="Yangilash"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Yangilash</span>
          </button>

          <Link
            href={`/teacher/tests/${testId}/results`}
            className="touch-target px-3.5 py-2 rounded-xl bg-accent-subtle hover:bg-accent/25 text-accent text-xs font-semibold border border-accent/20 transition-all flex items-center gap-1"
          >
            <span>Natijalar jadvali</span>
          </Link>

          <ThemeToggle />
        </div>
      </header>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Now */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{t.live.activeCount}</span>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-400">{summary.active}</div>
        </div>

        {/* Away / Switched Tab */}
        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          summary.away > 0 ? 'bg-danger/10 border-danger/40 animate-pulse' : 'bg-card border-border'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5 text-danger">
              <ShieldAlert className="w-4 h-4" />
              <span>{t.live.awayCount}</span>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-danger">{summary.away}</div>
        </div>

        {/* Finished */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-accent" />
              <span>{t.live.finishedCount}</span>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-accent">{summary.submitted}</div>
        </div>

        {/* Total Joined */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              <span>Jami qatnashchilar</span>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-foreground">{summary.total}</div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O'quvchini qidirish..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-card focus:outline-none focus:ring-2 focus:ring-accent text-xs sm:text-sm font-medium"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'all'
                ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                : 'border-border bg-card hover:bg-muted text-muted-foreground'
            }`}
          >
            Barchasi ({students.length})
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                : 'border-border bg-card hover:bg-muted text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Faol ({summary.active})</span>
          </button>

          <button
            onClick={() => setStatusFilter('away')}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1 ${
              statusFilter === 'away'
                ? 'bg-danger text-white border-danger shadow-sm'
                : 'border-border bg-card hover:bg-muted text-muted-foreground'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-danger" />
            <span>Ekrandan chiqqan ({summary.away})</span>
          </button>

          <button
            onClick={() => setStatusFilter('submitted')}
            className={`touch-target px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              statusFilter === 'submitted'
                ? 'bg-accent text-accent-foreground border-accent shadow-sm'
                : 'border-border bg-card hover:bg-muted text-muted-foreground'
            }`}
          >
            Topshirgan ({summary.submitted})
          </button>
        </div>
      </div>

      {/* Student Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 rounded-3xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-card border border-border rounded-3xl p-12 text-center my-6 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg">{t.live.noStudents}</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            O&apos;quvchilar test kodini ({test?.code}) kiritib testni boshlashlari bilanoq, ularning harakati shu yerda jonli aks etadi.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((st) => {
            const isAway = st.live_status === 'away';
            const isFinished = st.status === 'submitted' || st.status === 'auto_submitted';
            const progressPercent = st.total_questions > 0
              ? Math.round((st.answered_count / st.total_questions) * 100)
              : 0;

            return (
              <div
                key={st.id}
                className={`bg-card rounded-3xl p-5 border shadow-sm transition-all space-y-4 flex flex-col justify-between ${
                  isAway
                    ? 'border-danger ring-2 ring-danger/30 shadow-danger/10 bg-danger/5 animate-pulse'
                    : st.live_status === 'active'
                    ? 'border-emerald-500/40 hover:border-emerald-500'
                    : isFinished
                    ? 'border-border opacity-85'
                    : 'border-border'
                }`}
              >
                {/* Card Header: Student Name & Live Status */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-foreground truncate">
                        {st.student_name}
                      </h3>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isFinished
                            ? 'Topshirildi'
                            : `Qolgan vaqt: ${formatSeconds(st.remaining_seconds)}`}
                        </span>
                      </div>
                    </div>

                    {/* Live Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 flex-shrink-0 ${
                        isAway
                          ? 'bg-danger text-white shadow-sm'
                          : st.live_status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : st.status === 'submitted'
                          ? 'bg-accent/15 text-accent border border-accent/20'
                          : st.status === 'auto_submitted'
                          ? 'bg-danger/15 text-danger border border-danger/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {isAway && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                      {st.live_status === 'active' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                      <span>{t.live.studentStatus[st.live_status]}</span>
                    </span>
                  </div>

                  {/* Progress Indicator */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        Javoblar: <strong className="text-foreground">{st.answered_count} / {st.total_questions}</strong>
                      </span>
                      {st.current_question_index !== null && !isFinished && (
                        <span className="font-semibold text-accent">
                          {st.current_question_index + 1}-savolda
                        </span>
                      )}
                      {isFinished && (
                        <span className="font-bold text-foreground">
                          Ball: {st.score} / {st.max_score}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-1.5 bg-border/60 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isAway ? 'bg-danger' : 'bg-accent'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Violations Tracker & Latest Action */}
                <div className="pt-2 border-t border-border/70 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Qoidabuzarlik:</span>
                    </span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-lg ${
                        st.violations_count > 0
                          ? 'bg-danger/15 text-danger'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {st.violations_count} / {st.max_violations} ta
                    </span>
                  </div>

                  {st.latest_violation && (
                    <div className="p-2 rounded-xl bg-background/80 border border-border text-[11px] text-muted-foreground truncate">
                      So&apos;nggi hodisa: <strong className="text-danger">{t.results.violationTypes[st.latest_violation.type as keyof typeof t.results.violationTypes] || st.latest_violation.type}</strong>
                    </div>
                  )}
                </div>

                {/* Quick Actions Bar */}
                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {!isFinished && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setWarningTarget(st);
                            setWarningText(t.live.quickWarning1);
                          }}
                          className="touch-target p-2 rounded-xl border border-border bg-background hover:bg-amber-500/10 text-amber-400 transition-all"
                          title={t.live.sendWarning}
                        >
                          <Send className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleForceSubmit(st)}
                          className="touch-target p-2 rounded-xl border border-border bg-background hover:bg-danger/15 text-danger transition-all"
                          title={t.live.forceSubmit}
                        >
                          <Slash className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>

                  <Link
                    href={`/teacher/tests/${testId}/results/${st.id}`}
                    className="touch-target px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <span>Batafsil</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Warning Modal */}
      {warningTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base">Ogohlantirish yuborish</h3>
                  <p className="text-[11px] text-muted-foreground">{warningTarget.student_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWarningTarget(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground block">
                Tezkor shablonlar:
              </label>
              <div className="space-y-1.5">
                {[t.live.quickWarning1, t.live.quickWarning2, t.live.quickWarning3].map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setWarningText(tpl)}
                    className="w-full text-left p-2.5 rounded-xl text-xs border border-border bg-background hover:bg-muted transition-colors leading-relaxed"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground block">
                Xabar matni:
              </label>
              <textarea
                rows={3}
                value={warningText}
                onChange={(e) => setWarningText(e.target.value)}
                placeholder="Ogohlantirish matnini yozing..."
                className="w-full p-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setWarningTarget(null)}
                className="px-4 py-2 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                disabled={sendingWarning || !warningText.trim()}
                onClick={handleSendWarning}
                className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground text-xs font-bold shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sendingWarning ? 'Yuborilmoqda...' : 'Yuborish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 border-t border-border safe-pb">
        © {new Date().getFullYear()} {t.app.name}. {t.live.title}.
      </footer>
    </div>
  );
}
