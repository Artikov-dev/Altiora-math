'use client';

import React from 'react';

interface MathKeyboardProps {
  onInsert: (symbol: string) => void;
  className?: string;
}

const SYMBOLS = [
  { label: 'x', value: 'x' },
  { label: 'y', value: 'y' },
  { label: '+', value: '+' },
  { label: '−', value: '-' },
  { label: '×', value: '*' },
  { label: '/', value: '/' },
  { label: '=', value: '=' },
  { label: '^', value: '^' },
  { label: 'x²', value: '^2' },
  { label: '√', value: '√' },
  { label: 'π', value: 'π' },
  { label: '(', value: '(' },
  { label: ')', value: ')' },
  { label: ',', value: ',' },
  { label: '.', value: '.' },
  { label: '≤', value: '<=' },
  { label: '≥', value: '>=' },
  { label: '≠', value: '!=' },
];

export function MathKeyboard({ onInsert, className = '' }: MathKeyboardProps) {
  return (
    <div className={`p-2.5 rounded-xl border border-border bg-card/80 backdrop-blur-sm ${className}`}>
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Matematik klaviatura
        </span>
        <span className="text-[11px] text-muted-foreground">Tezkor kiritish</span>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5">
        {SYMBOLS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(s.value)}
            className="touch-target h-10 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent/15 hover:border-accent/40 active:scale-95 text-foreground font-mono text-base font-medium transition-all select-none"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
