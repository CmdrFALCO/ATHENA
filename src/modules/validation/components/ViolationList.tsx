/**
 * ViolationList - Grouped list of violations
 * WP 5.6: Validation Panel UI
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ViolationCard } from './ViolationCard';
import type { Violation } from '../types';

interface ViolationListProps {
  violations: Violation[];
  getEntityTitle: (focusType: string, focusId: string) => string | undefined;
  onShow: (violation: Violation) => void;
  onFix: (violationId: string) => void;
  onDismiss: (violationId: string) => void;
}

export function ViolationList({
  violations,
  getEntityTitle,
  onShow,
  onFix,
  onDismiss,
}: ViolationListProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['errors', 'warnings'])
  );

  // Group by severity
  const errors = violations.filter((v) => v.severity === 'error');
  const warnings = violations.filter((v) => v.severity === 'warning');

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  if (violations.length === 0) {
    return (
      <div className="p-8 text-center text-athena-muted">
        <p className="text-sm">No violations found</p>
        <p className="text-xs mt-1">
          Run validation to check your knowledge graph
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Errors section */}
      {errors.length > 0 && (
        <div className="border-b border-athena-border">
          <button
            onClick={() => toggleSection('errors')}
            className="w-full flex items-center gap-2 px-4 py-2
                       text-sm font-medium text-red-400
                       hover:bg-athena-surface/50 transition-colors"
          >
            {expandedSections.has('errors') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Errors ({errors.length})
          </button>

          {expandedSections.has('errors') && (
            <div className="px-4 pb-3 space-y-2">
              {errors.map((violation) => (
                <ViolationCard
                  key={violation.id}
                  violation={violation}
                  entityTitle={getEntityTitle(
                    violation.focusType,
                    violation.focusId
                  )}
                  onShow={() => onShow(violation)}
                  onFix={() => onFix(violation.id)}
                  onDismiss={() => onDismiss(violation.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warnings section */}
      {warnings.length > 0 && (
        <div className="border-b border-athena-border">
          <button
            onClick={() => toggleSection('warnings')}
            className="w-full flex items-center gap-2 px-4 py-2
                       text-sm font-medium text-amber-400
                       hover:bg-athena-surface/50 transition-colors"
          >
            {expandedSections.has('warnings') ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Warnings ({warnings.length})
          </button>

          {expandedSections.has('warnings') && (
            <div className="px-4 pb-3 space-y-2">
              {warnings.map((violation) => (
                <ViolationCard
                  key={violation.id}
                  violation={violation}
                  entityTitle={getEntityTitle(
                    violation.focusType,
                    violation.focusId
                  )}
                  onShow={() => onShow(violation)}
                  onFix={() => onFix(violation.id)}
                  onDismiss={() => onDismiss(violation.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
