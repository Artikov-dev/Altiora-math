'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft,
  Download,
  Search,
  RotateCcw,
  ShieldAlert,
  Users,
  Award,
  ChevronRight,
  Filter,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

interface AttemptRow {
  id: string;
  student_name: string;
  status: 'in_progress' | 'submitted' | 'auto_submitted';
  score: number;
  max_score: number;
  percentage: number;
  duration_seconds: number;
  violations_count: number;
  started_at: string;
  submitted_at: string | null;
}

export default function TeacherTestResultsPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params?.id as string;

  const [test, setTest] = useState<{
    id: string;
    title: string;
    code: string;
    duration_minutes: number;
    max_violations: number;
  } | null>(null);

  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [analytics, setAnalytics] = useState<{
    total_participants: number;
    average_score: number;
    pass_rate: number;
    hardest_question: { id: string; index: number; prompt: string; points: number; accuracy: number } | null;
    questions_analytics: { id: string; index: number; prompt: string; points: number; accuracy: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'auto_submitted' | 'in_progress'>('all');
  const [resettingId, setResettingId] = useState<string | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teacher/tests/${testId}/results`);
      if (res.status === 401) {
        router.push('/teacher/login');
        return;
      }
      const data = await res.json();
      if (data.test) setTest(data.test);
      if (data.attempts) setAttempts(data.attempts);
      if (data.analytics) setAnalytics(data.analytics);
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  }, [testId, router]);

  useEffect(() => {
    if (testId) {
      fetchResults();
    }
  }, [testId, fetchResults]);

  // Reset student attempt
  const handleResetAttempt = async (attemptId: string, studentName: string) => {
    if (!window.confirm(`${studentName}ning natijasini o'chirib, testni qayta topshirishiga ruxsat bermoqchimisiz?`)) {
      return;
    }

    setResettingId(attemptId);
    try {
      const res = await fetch(`/api/teacher/tests/${testId}/results/${attemptId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAttempts((prev) => prev.filter((a) => a.id !== attemptId));
      } else {
        alert('Urinishni tozalashda xatolik yuz berdi');
      }
    } catch {
      alert('Server bilan aloqa uzildi');
    } finally {
      setResettingId(null);
    }
  };

  // Filtered attempts
  const filteredAttempts = useMemo(() => {
    return attempts.filter((att) => {
      const matchesSearch = att.student_name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchesStatus = statusFilter === 'all' || att.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [attempts, searchQuery, statusFilter]);

  // Stats
  const totalSubmissions = attempts.length;
  const avgScore = totalSubmissions > 0
    ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / totalSubmissions)
    : 0;
  const totalViolations = attempts.reduce((acc, a) => acc + a.violations_count, 0);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border mb-6 safe-pt">
        <div className="flex items-center gap-3">
          <Link
            href="/teacher"
            className="touch-target p-2 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all flex items-center justify-center"
            title={t.results.backToDashboard}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-accent/20 text-accent">
                {test?.code}
              </span>
              <h1 className="font-bold text-lg tracking-tight leading-tight">{test?.title || 'Test natijalari'}</h1>
            </div>
            <p className="text-xs text-muted-foreground">{t.results.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href={`/api/teacher/tests/${testId}/export`}
            download
            className="touch-target px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-accent hover:bg-accent-hover text-accent-foreground flex items-center gap-2 shadow-md active:scale-95 transition-all"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{t.results.exportCsv}</span>
            <span className="sm:hidden">CSV</span>
          </a>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Users className="w-4 h-4" />
            <span>Topshirganlar</span>
          </div>
          <div className="text-2xl font-extrabold">{totalSubmissions}</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <Award className="w-4 h-4" />
            <span>O&apos;rtacha natija</span>
          </div>
          <div className="text-2xl font-extrabold text-accent">{avgScore}%</div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>O&apos;tish ko&apos;rsatkichi (≥60%)</span>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            {analytics ? `${analytics.pass_rate}%` : '-'}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-1">
            <ShieldAlert className="w-4 h-4 text-danger" />
            <span>Qoidabuzarliklar</span>
          </div>
          <div className={`text-2xl font-extrabold ${totalViolations > 0 ? 'text-danger' : 'text-emerald-400'}`}>
            {totalViolations}
          </div>
        </div>
      </div>

      {/* Item Difficulty Analysis */}
      {analytics && analytics.questions_analytics && analytics.questions_analytics.length > 0 && totalSubmissions > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" />
              <h3 className="font-bold text-sm">Savollar murakkabligi tahlili</h3>
            </div>
            {analytics.hardest_question && (
              <span className="text-xs px-2.5 py-1 rounded-lg bg-danger/10 text-danger border border-danger/20 font-semibold">
                Eng qiyin savol: #{analytics.hardest_question.index} ({analytics.hardest_question.accuracy}% to&apos;g&apos;ri)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 pt-1">
            {analytics.questions_analytics.map((qa) => {
              const isHardest = analytics.hardest_question?.id === qa.id;
              return (
                <div
                  key={qa.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    isHardest
                      ? 'border-danger/40 bg-danger/5 shadow-sm'
                      : qa.accuracy >= 70
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-background'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{qa.index}-savol</span>
                    <span className={qa.accuracy >= 70 ? 'text-emerald-400' : qa.accuracy <= 40 ? 'text-danger' : 'text-amber-400'}>
                      {qa.accuracy}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-border/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        qa.accuracy >= 70
                          ? 'bg-emerald-500'
                          : qa.accuracy <= 40
                          ? 'bg-danger'
                          : 'bg-amber-400'
                      }`}
                      style={{ width: `${qa.accuracy}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="O'quvchi ismini qidirish..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground ml-1" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'submitted' | 'auto_submitted' | 'in_progress')}
            className="px-3 py-2 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-accent text-sm"
          >
            <option value="all">Barcha statuslar</option>
            <option value="submitted">Topshirdi</option>
            <option value="auto_submitted">Avto-yakunlandi</option>
            <option value="in_progress">Jarayonda</option>
          </select>
        </div>
      </div>

      {/* Results Table / Card List */}
      <main className="flex-1">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredAttempts.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-10 text-center my-6">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <h3 className="text-lg font-bold mb-1">Topshirganlar topilmadi</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Qidiruv parametrlariga mos natijalar mavjud emas'
                : 'Ushbu testga hali hech bir o\'quvchi javob yubormagan'}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">{t.results.table.student}</th>
                    <th className="py-3.5 px-4">{t.results.table.score}</th>
                    <th className="py-3.5 px-4">{t.results.table.timeSpent}</th>
                    <th className="py-3.5 px-4">{t.results.table.violations}</th>
                    <th className="py-3.5 px-4">{t.results.table.status}</th>
                    <th className="py-3.5 px-4 text-right">{t.results.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAttempts.map((att) => {
                    const isPassed = att.percentage >= 60;
                    const hasViolations = att.violations_count > 0;

                    return (
                      <tr key={att.id} className="hover:bg-muted/30 transition-colors">
                        {/* Student Name */}
                        <td className="py-4 px-4 font-semibold text-foreground">
                          <Link
                            href={`/teacher/tests/${testId}/results/${att.id}`}
                            className="hover:text-accent flex items-center gap-2 group"
                          >
                            <span>{att.student_name}</span>
                            <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-accent" />
                          </Link>
                        </td>

                        {/* Score & percentage */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">
                              {att.score} <span className="text-xs text-muted-foreground font-normal">/ {att.max_score}</span>
                            </span>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                isPassed
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-danger/15 text-danger'
                              }`}
                            >
                              {att.percentage}%
                            </span>
                          </div>
                        </td>

                        {/* Time Spent */}
                        <td className="py-4 px-4 font-mono text-xs text-muted-foreground">
                          {formatDuration(att.duration_seconds)}
                        </td>

                        {/* Violations count */}
                        <td className="py-4 px-4">
                          {hasViolations ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-danger/15 text-danger font-mono font-bold text-xs">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {att.violations_count} marta
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">0</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block text-xs px-2.5 py-0.5 rounded-full font-medium ${
                              att.status === 'submitted'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : att.status === 'auto_submitted'
                                ? 'bg-danger/15 text-danger font-bold'
                                : 'bg-amber-500/15 text-amber-400'
                            }`}
                          >
                            {t.results.statuses[att.status]}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/teacher/tests/${testId}/results/${att.id}`}
                              className="touch-target px-3 py-1.5 rounded-xl bg-accent-subtle hover:bg-accent/25 text-accent text-xs font-semibold transition-all inline-flex items-center gap-1"
                            >
                              Batafsil
                            </Link>

                            <button
                              onClick={() => handleResetAttempt(att.id, att.student_name)}
                              disabled={resettingId === att.id}
                              className="touch-target p-2 rounded-xl border border-border bg-background hover:bg-danger/20 text-muted-foreground hover:text-danger transition-all disabled:opacity-40"
                              title={t.results.resetAttempt}
                            >
                              <RotateCcw className={`w-4 h-4 ${resettingId === att.id ? 'animate-spin' : ''}`} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border mt-8 safe-pb">
        © {new Date().getFullYear()} {t.app.name}. Natijalar jurnali.
      </footer>
    </div>
  );
}
