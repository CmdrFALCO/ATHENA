// src/modules/synthesis/components/ReportViewer.tsx — WP 8.7

import { useEffect, useRef } from 'react';

interface ReportViewerProps {
  content: string;
  isStreaming?: boolean;
}

export function ReportViewer({ content, isStreaming }: ReportViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll during streaming
  useEffect(() => {
    if (isStreaming && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, isStreaming]);

  if (!content) {
    return (
      <div className="flex items-center justify-center h-full text-athena-muted">
        <p className="text-sm">Select notes and generate a synthesis</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-4 prose prose-invert prose-sm max-w-none">
      {content.split('\n').map((line, i) => {
        // Headers
        if (line.startsWith('### ')) {
          return (
            <h3 key={i} className="text-base font-semibold text-athena-text mt-4 mb-2">
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h2 key={i} className="text-lg font-semibold text-athena-text mt-4 mb-2">
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h1 key={i} className="text-xl font-bold text-athena-text mt-4 mb-2">
              {line.slice(2)}
            </h1>
          );
        }

        // Bullet list items
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return (
            <div key={i} className="flex gap-2 text-athena-text">
              <span className="text-athena-muted">&bull;</span>
              <span>{line.slice(2)}</span>
            </div>
          );
        }

        // Numbered list
        const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2 text-athena-text">
              <span className="text-athena-muted">{numberedMatch[1]}.</span>
              <span>{numberedMatch[2]}</span>
            </div>
          );
        }

        // Empty line
        if (line.trim() === '') {
          return <div key={i} className="h-2" />;
        }

        // Regular paragraph
        return (
          <p key={i} className="text-athena-text mb-2">
            {line}
          </p>
        );
      })}

      {/* Streaming cursor */}
      {isStreaming && <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-1" />}
    </div>
  );
}
