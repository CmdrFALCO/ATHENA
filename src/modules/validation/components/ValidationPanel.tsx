/**
 * ValidationPanel - Main panel component for managing violations
 * WP 5.6: Validation Panel UI
 *
 * Floating panel that can be toggled with Ctrl+Shift+V.
 * Composes ValidationSummary, ViolationFilters, and ViolationList.
 */

import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useViolations } from '../hooks';
import { useNotes, uiActions } from '@/store';
import { useConnections } from '@/store';
import { ValidationSummary } from './ValidationSummary';
import { ViolationFilters } from './ViolationFilters';
import { ViolationList } from './ViolationList';
import { rulesEngine } from '../engine';
import type { Violation } from '../types';

interface ValidationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ValidationPanel({ isOpen, onClose }: ValidationPanelProps) {
  // Filters state
  const [severityFilter, setSeverityFilter] = useState<
    'all' | 'error' | 'warning'
  >('all');
  const [ruleFilter, setRuleFilter] = useState<string>('all');

  // Get violations and actions
  const { violations, dismissViolation, applyFix } = useViolations({
    severity: severityFilter === 'all' ? undefined : severityFilter,
    ruleId: ruleFilter === 'all' ? undefined : ruleFilter,
  });

  // Get entity data for titles
  const notes = useNotes();
  const connections = useConnections();

  // Get available rules for filter dropdown
  const availableRules = useMemo(() => {
    return rulesEngine.getRules().map((rule) => ({
      id: rule.id,
      name: rule.name,
    }));
  }, []);

  // Get entity title from ID
  const getEntityTitle = useCallback(
    (focusType: string, focusId: string): string | undefined => {
      if (focusType === 'entity') {
        const note = notes.find((n) => n.id === focusId);
        return note?.title;
      }
      if (focusType === 'connection') {
        // For connections, show source->target
        const conn = connections.find((c) => c.id === focusId);
        if (conn) {
          const source = notes.find((n) => n.id === conn.source_id);
          const target = notes.find((n) => n.id === conn.target_id);
          if (source && target) {
            return `${source.title} → ${target.title}`;
          }
        }
      }
      return undefined;
    },
    [notes, connections]
  );

  // Navigate to entity on canvas
  const handleShow = useCallback(
    (violation: Violation) => {
      if (violation.focusType === 'entity') {
        // Select the entity - this will center on it
        uiActions.selectEntity(violation.focusId);
      } else if (violation.focusType === 'connection') {
        // For connections, select the source entity
        const conn = connections.find((c) => c.id === violation.focusId);
        if (conn) {
          uiActions.selectEntity(conn.source_id);
        }
      }
      // Optionally close the panel after showing
      // onClose();
    },
    [connections]
  );

  // Handle fix
  const handleFix = useCallback(
    async (violationId: string) => {
      const success = await applyFix(violationId);
      if (success) {
        console.log('Fix applied successfully');
      }
    },
    [applyFix]
  );

  // Handle dismiss
  const handleDismiss = useCallback(
    (violationId: string) => {
      dismissViolation(violationId);
    },
    [dismissViolation]
  );

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-end pt-16 pr-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop - semi-transparent */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        className="relative w-[380px] max-h-[80vh] bg-athena-bg border border-athena-border
                      rounded-lg shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-athena-muted hover:text-athena-text
                     transition-colors z-10"
          aria-label="Close panel"
        >
          <X className="w-4 h-4" />
        </button>

        <ValidationSummary />

        <ViolationFilters
          severityFilter={severityFilter}
          onSeverityChange={setSeverityFilter}
          ruleFilter={ruleFilter}
          onRuleChange={setRuleFilter}
          availableRules={availableRules}
        />

        <ViolationList
          violations={violations}
          getEntityTitle={getEntityTitle}
          onShow={handleShow}
          onFix={handleFix}
          onDismiss={handleDismiss}
        />

        {/* Footer with keyboard hint */}
        <div className="px-4 py-2 border-t border-athena-border text-xs text-athena-muted flex-shrink-0">
          <kbd className="px-1.5 py-0.5 bg-athena-surface border border-athena-border rounded">
            Ctrl
          </kbd>
          +
          <kbd className="px-1.5 py-0.5 bg-athena-surface border border-athena-border rounded">
            Shift
          </kbd>
          +
          <kbd className="px-1.5 py-0.5 bg-athena-surface border border-athena-border rounded">
            V
          </kbd>{' '}
          to toggle
        </div>
      </div>
    </div>,
    document.body
  );
}
