// src/modules/synthesis/components/FormatSelector.tsx — WP 8.7

import { FileText, List, BookOpen } from 'lucide-react';
import type { SynthesisFormat } from '../types';
import { FORMAT_INFO } from '../types';

interface FormatSelectorProps {
  value: SynthesisFormat;
  onChange: (format: SynthesisFormat) => void;
  disabled?: boolean;
}

const ICONS = {
  summary: FileText,
  outline: List,
  report: BookOpen,
};

export function FormatSelector({ value, onChange, disabled }: FormatSelectorProps) {
  const formats: SynthesisFormat[] = ['summary', 'outline', 'report'];

  return (
    <div>
      <label className="block text-sm font-medium text-athena-text mb-2">Output Format</label>
      <div className="grid grid-cols-3 gap-2">
        {formats.map((format) => {
          const Icon = ICONS[format];
          const info = FORMAT_INFO[format];
          const isSelected = value === format;

          return (
            <button
              key={format}
              onClick={() => onChange(format)}
              disabled={disabled}
              className={`
                p-3 rounded-lg border text-left transition-colors
                ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-athena-border bg-athena-surface hover:bg-athena-border'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Icon className={`w-5 h-5 mb-1 ${isSelected ? 'text-blue-400' : 'text-athena-muted'}`} />
              <div className={`text-sm font-medium ${isSelected ? 'text-blue-400' : 'text-athena-text'}`}>
                {info.label}
              </div>
              <div className="text-xs text-athena-muted mt-0.5">{info.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
