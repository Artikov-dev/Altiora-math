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
    <div className={`rounded-2xl border border-border bg-card/60 backdrop-blur-md p-2.5 shadow-subtle ${className}`}>
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Matematik belgilar
        </span>
        <span className="text-[10px] text-muted-foreground/70">Bir marta bosing</span>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-9">
        {SYMBOLS.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onInsert(s.value)}
            className="touch-target flex-1 min-w-[38px] h-9 sm:h-10 flex items-center justify-center rounded-xl border border-border/70 bg-background/80 hover:bg-accent/10 hover:border-accent/40 active:scale-95 text-foreground font-mono text-sm font-semibold transition-all select-none"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
