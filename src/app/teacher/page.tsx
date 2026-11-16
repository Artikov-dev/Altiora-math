'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { t } from '@/lib/i18n';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Test } from '@/types';
import {
  GraduationCap,
  Plus,
  Copy,
  Check,
  BarChart3,
  Edit,
  Trash2,
  Clock,
  Users,
  LogOut,
  FolderOpen,
  Share2,
  Layers,
  Power,
} from 'lucide-react';

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');

  const fetchTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/teacher/tests');
      if (res.status === 401) {
        router.push('/teacher/login');
        return;
      }
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      }
    } catch (err) {
      console.error('Failed to fetch tests', err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });
    fetchTests();
  }, [fetchTests]);

  const handleCopyLink = (code: string) => {
    const origin = window.location.origin;
    const shareUrl = `${origin}/t/${code}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleDelete = async (testId: string) => {
    if (!window.confirm(t.teacher.confirmDelete)) {
      return;
    }
    try {
      const res = await fetch(`/api/teacher/tests/${testId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== testId));
      }
    } catch (err) {
      console.error('Failed to delete test', err);
    }
  };

  const handleToggleStatus = async (testId: string, currentStatus: boolean) => {
    try {
      const nextStatus = !currentStatus;
      const res = await fetch(`/api/teacher/tests/${testId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: nextStatus }),
      });
      if (res.ok) {
        setTests((prev) =>
          prev.map((item) =>
            item.id === testId ? { ...item, is_published: nextStatus } : item
          )
        );
      }
    } catch (err) {
      console.error('Failed to toggle test status', err);
    }
  };

  const handleClone = async (testId: string) => {
    try {
      setCloningId(testId);
      const res = await fetch(`/api/teacher/tests/${testId}/clone`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.test) {
        setTests((prev) => [data.test, ...prev]);
      } else {
        alert(data.error || 'Nusxa olishda xatolik yuz berdi');
      }
    } catch {
      alert('Server bilan aloqa uzildi');
    } finally {
      setCloningId(null);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/teacher/login');
    router.refresh();
  };

  const totalSubmissions = tests.reduce((acc, curr) => acc + (curr.submissions_count || 0), 0);

  return (
    <div className="min-h-screen flex flex-col p-4 sm:p-6 max-w-6xl mx-auto">
      {/* Top Navigation */}
      <header className="flex flex-wrap items-center justify-between gap-4 py-3 border-b border-border mb-6 safe-pt">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight leading-tight">{t.teacher.dashboardTitle}</h1>
            <p className="text-xs text-muted-foreground">{userEmail || t.app.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="touch-target px-3.5 py-2 rounded-xl text-sm font-medium border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
            title={t.auth.logout}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">{t.auth.logout}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 space-y-6">
        {/* Action Header & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{t.teacher.dashboardTitle}</h2>
            <p className="text-sm text-muted-foreground">{t.teacher.dashboardSubtitle}</p>
          </div>
          <Link
            href="/teacher/tests/new"
            className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold shadow-md active:scale-95 transition-all self-start sm:self-auto"
          >
            <Plus className="w-5 h-5" />
            <span>{t.teacher.newTest}</span>
          </Link>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs font-medium">
              <FolderOpen className="w-4 h-4" />
              <span>{t.teacher.stats.totalTests}</span>
            </div>
            <div className="text-2xl font-extrabold">{tests.length}</div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs font-medium">
              <Users className="w-4 h-4" />
              <span>{t.teacher.stats.totalSubmissions}</span>
            </div>
            <div className="text-2xl font-extrabold">{totalSubmissions}</div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-card border border-border rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-xs font-medium">
              <Share2 className="w-4 h-4" />
              <span>Status</span>
            </div>
            <div className="text-sm font-semibold text-accent flex items-center gap-1.5 pt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Tizim faol</span>
            </div>
          </div>
        </div>

        {/* Test List Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-card border border-border animate-pulse" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-8 sm:p-12 text-center my-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center">
              <FolderOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t.teacher.emptyTestsTitle}</h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
              {t.teacher.emptyTestsDesc}
            </p>
            <Link
              href="/teacher/tests/new"
              className="touch-target inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span>{t.teacher.createFirstTest}</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-accent/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-accent/15 text-accent text-xs font-mono font-bold">
                      {test.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(test.id, test.is_published)}
                      className={`touch-target px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 border ${
                        test.is_published
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-zinc-500/15 border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/25'
                      }`}
                      title={t.teacher.toggleStatus}
                    >
                      <Power className={`w-3 h-3 ${test.is_published ? 'text-emerald-400' : 'text-zinc-400'}`} />
                      <span>{test.is_published ? t.teacher.statusActive : t.teacher.statusInactive}</span>
                    </button>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-foreground">
                    {test.title}
                  </h3>

                  {test.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {test.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {test.duration_minutes} {t.teacher.minutes}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {test.submissions_count || 0} {t.teacher.submissions.toLowerCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border">
                  <button
                    onClick={() => handleCopyLink(test.code)}
                    className="touch-target px-3.5 py-2 rounded-xl text-xs font-medium border border-border bg-background hover:bg-muted text-foreground transition-all flex items-center gap-1.5"
                    title={t.teacher.copyLink}
                  >
                    {copiedCode === test.code ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">{t.teacher.linkCopied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>{t.teacher.copyLink}</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/teacher/tests/${test.id}/results`}
                    className="touch-target px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-subtle hover:bg-accent/25 text-accent transition-all flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{t.teacher.viewResults}</span>
                  </Link>

                  <button
                    type="button"
                    disabled={cloningId === test.id}
                    onClick={() => handleClone(test.id)}
                    className="touch-target p-2 rounded-xl text-xs border border-border bg-background hover:bg-muted text-foreground transition-all flex items-center justify-center disabled:opacity-50"
                    title={t.teacher.cloneTest}
                  >
                    <Layers className={`w-4 h-4 ${cloningId === test.id ? 'animate-spin' : ''}`} />
                  </button>

                  <Link
                    href={`/teacher/tests/${test.id}/edit`}
                    className="touch-target p-2 rounded-xl text-xs border border-border bg-background hover:bg-muted text-foreground transition-all flex items-center justify-center"
                    title={t.teacher.editTest}
                  >
                    <Edit className="w-4 h-4" />
                  </Link>

                  <button
                    onClick={() => handleDelete(test.id)}
                    className="touch-target p-2 rounded-xl text-xs border border-border bg-background hover:bg-danger/20 text-danger transition-all flex items-center justify-center"
                    title={t.teacher.deleteTest}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-6 border-t border-border mt-8 safe-pb">
        © {new Date().getFullYear()} {t.app.name}. O&apos;qituvchi boshqaruv paneli.
      </footer>
    </div>
  );
}
