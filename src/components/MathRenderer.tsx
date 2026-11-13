'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface MathRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

export function MathRenderer({ content, className = '', inline = false }: MathRendererProps) {
  const renderedContent = useMemo(() => {
    if (!content) return null;

    // Pattern to match $$display math$$ and $inline math$
    // Handles multi-line math formulas inside $$ and single-line inside $
    const parts: { type: 'text' | 'inline-math' | 'display-math'; value: string }[] = [];
    const regex = /(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push({
          type: 'text',
          value: content.substring(lastIndex, matchIndex),
        });
      }

      const raw = match[0];
      if (raw.startsWith('$$') && raw.endsWith('$$')) {
        parts.push({
          type: 'display-math',
          value: raw.slice(2, -2),
        });
      } else if (raw.startsWith('$') && raw.endsWith('$')) {
        parts.push({
          type: 'inline-math',
          value: raw.slice(1, -1),
        });
      }

      lastIndex = matchIndex + raw.length;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        value: content.substring(lastIndex),
      });
    }

    return parts.map((part, index) => {
      if (part.type === 'text') {
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.value}
          </span>
        );
      }

      const isDisplay = part.type === 'display-math' && !inline;
      try {
        const html = katex.renderToString(part.value, {
          displayMode: isDisplay,
          throwOnError: false,
          output: 'htmlAndMathml',
        });

        return (
          <span
            key={index}
            className={isDisplay ? 'block my-2 overflow-x-auto py-1 text-center' : 'inline-block mx-0.5'}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch (err) {
        console.error('KaTeX rendering error:', err);
        return (
          <span key={index} className="text-red-400 font-mono text-sm">
            {part.value}
          </span>
        );
      }
    });
  }, [content, inline]);

  return <div className={`math-content ${className}`}>{renderedContent}</div>;
}
