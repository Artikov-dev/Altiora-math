'use client';

import React from 'react';
import { t } from '@/lib/i18n';
import { ShieldAlert, Maximize2, AlertTriangle, ArrowRight, Layers } from 'lucide-react';

interface AntiCheatModalProps {
  isOpen: boolean;
  violationsCount: number;
  maxViolations: number;
  onDismiss: () => void;
  isFullscreenBlocked?: boolean;
  onRequestFullscreen?: () => void;
  isMultiTabBlocked?: boolean;
}

export function AntiCheatModal({
  isOpen,
  violationsCount,
  maxViolations,
  onDismiss,
  isFullscreenBlocked = false,
  onRequestFullscreen,
  isMultiTabBlocked = false,
}: AntiCheatModalProps) {
  // If not open and not blocked, do not render
  if (!isOpen && !isFullscreenBlocked && !isMultiTabBlocked) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anticheat-title"
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-card border-2 border-danger/60 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-6">
        {/* Fullscreen Blocked State */}
        {isFullscreenBlocked ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 text-violet-400 flex items-center justify-center mx-auto animate-pulse">
              <Maximize2 className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 id="anticheat-title" className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {t.antiCheat.fullscreenRequiredTitle}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.fullscreenRequiredDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={onRequestFullscreen}
              className="touch-target w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm"
            >
              <Maximize2 className="w-5 h-5" />
              <span>{t.antiCheat.enterFullscreen}</span>
            </button>
          </>
        ) : isMultiTabBlocked ? (
          /* Multi Tab Blocked State */
          <>
            <div className="w-16 h-16 rounded-2xl bg-danger/15 text-danger flex items-center justify-center mx-auto">
              <Layers className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 id="anticheat-title" className="text-xl sm:text-2xl font-black text-danger tracking-tight">
                DIQQAT: KO&apos;P OYNALI FAOLIYAT
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.multiTabWarning}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="touch-target w-full py-3.5 px-4 rounded-xl bg-danger hover:bg-danger/90 text-white font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all text-sm"
            >
              <span>Ushbu oynada davom etish</span>
            </button>
          </>
        ) : (
          /* Standard Violation Warning State */
          <>
            <div className="w-16 h-16 rounded-2xl bg-danger/15 text-danger flex items-center justify-center mx-auto animate-bounce">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/15 text-danger text-xs font-black uppercase tracking-widest">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.antiCheat.warningTitle}</span>
              </div>
              <h2 id="anticheat-title" className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                {t.antiCheat.violationCount} {violationsCount} / {maxViolations}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.warningBody}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-background/80 border border-border text-xs text-muted-foreground text-left space-y-1">
              <p className="font-semibold text-danger">
                {t.antiCheat.limitNotice.replace('{max}', String(maxViolations))}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Har bir chiqish vaqt davomiyligi serverda saqlanmoqda va o&apos;qituvchiga taqdim etiladi.
              </p>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="touch-target w-full py-3.5 px-4 rounded-xl bg-accent hover:bg-accent-hover text-accent-foreground font-bold flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all text-sm"
            >
              <span>{t.antiCheat.returnButton}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
