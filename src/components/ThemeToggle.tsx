'use client';

import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { t } from '@/lib/i18n';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`touch-target inline-flex items-center justify-center p-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent ${className}`}
      title={t.theme.toggle}
      aria-label={t.theme.toggle}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-5 h-5 text-violet-500 transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
