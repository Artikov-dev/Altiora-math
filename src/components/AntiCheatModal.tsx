'use client';

import React from 'react';
import { t } from '@/lib/i18n';
import { ShieldAlert, Maximize2, ArrowRight, Layers } from 'lucide-react';

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
  if (!isOpen && !isFullscreenBlocked && !isMultiTabBlocked) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="anticheat-title"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200"
    >
      <div className="bg-card border border-border/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-6">
        {/* Fullscreen Blocked State */}
        {isFullscreenBlocked ? (
          <>
            <div className="w-14 h-14 rounded-2xl bg-accent-subtle text-accent flex items-center justify-center mx-auto border border-accent/20">
              <Maximize2 className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 id="anticheat-title" className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                {t.antiCheat.fullscreenRequiredTitle}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.fullscreenRequiredDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={onRequestFullscreen}
              className="touch-target w-full py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              <span>{t.antiCheat.enterFullscreen}</span>
            </button>
          </>
        ) : isMultiTabBlocked ? (
          /* Multi Tab Blocked State */
          <>
            <div className="w-14 h-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto border border-danger/20">
              <Layers className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 id="anticheat-title" className="text-xl sm:text-2xl font-bold text-danger tracking-tight">
                Ko&apos;p oynali faoliyat aniqlandi
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.multiTabWarning}
              </p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="touch-target w-full py-3.5 px-4 rounded-2xl bg-danger hover:bg-danger/90 text-white font-semibold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-all text-sm"
            >
              <span>Ushbu oynada davom etish</span>
            </button>
          </>
        ) : (
          /* Standard Violation Warning State */
          <>
            <div className="w-14 h-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center mx-auto border border-danger/20">
              <ShieldAlert className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 text-danger text-[11px] font-bold uppercase tracking-wider">
                <span>{t.antiCheat.warningTitle}</span>
              </div>
              <h2 id="anticheat-title" className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {violationsCount} / {maxViolations}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {t.antiCheat.warningBody}
              </p>
            </div>

            {/* Violation progress dots */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {Array.from({ length: maxViolations }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i < violationsCount
                      ? 'bg-danger scale-110 shadow-sm'
                      : 'bg-muted border border-border'
                  }`}
                />
              ))}
            </div>

            <div className="p-3.5 rounded-2xl bg-background/50 border border-border text-xs text-muted-foreground text-left space-y-1">
              <p className="font-semibold text-danger">
                {t.antiCheat.limitNotice.replace('{max}', String(maxViolations))}
              </p>
              <p className="text-[11px] text-muted-foreground/80">
                Chiqib ketilgan vaqt server jurnali orqali o&apos;qituvchiga ma&apos;lum qilinadi.
              </p>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="touch-target w-full py-3.5 px-4 rounded-2xl bg-accent hover:bg-accent-hover text-accent-foreground font-semibold flex items-center justify-center gap-2 shadow-glow active:scale-[0.98] transition-all text-sm"
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
