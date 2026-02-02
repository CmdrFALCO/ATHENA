/**
 * CorrectionFeedback — The key innovation of AXIOM
 *
 * Structured error messages that guide LLM regeneration.
 * Instead of simply rejecting invalid proposals, we tell the LLM
 * exactly what went wrong and suggest how to fix it.
 *
 * @module axiom/types/feedback
 */

/**
 * CorrectionFeedback — A single structured correction
 */
export interface CorrectionFeedback {
  /** Which validation rule flagged this (e.g., "duplicate-connection") */
  ruleId: string;

  /** Human-readable constraint description (e.g., "No duplicate edges") */
  constraint: string;

  /** Which validation level caught this */
  level: 1 | 2 | 3;

  /** How severe the issue is */
  severity: 'error' | 'warning';

  /** What the LLM actually produced */
  actual: unknown;

  /** What was expected/required */
  expected: unknown;

  /** Human-readable error message */
  message: string;

  /** Optional structured suggestion for how to fix */
  suggestion?: {
    action: 'modify' | 'remove' | 'merge' | 'rephrase';
    details: string;
  };

  /** Which attempt this feedback is from */
  attemptNumber: number;

  /** Maximum attempts allowed */
  maxAttempts: number;
}

/**
 * Format feedback for injection into LLM prompt.
 *
 * Produces a structured text block that the LLM can parse to understand
 * what went wrong in the previous attempt and how to fix it.
 */
export function formatFeedbackForLLM(feedback: CorrectionFeedback[]): string {
  if (feedback.length === 0) {
    return '';
  }

  const errors = feedback.filter((f) => f.severity === 'error');
  const warnings = feedback.filter((f) => f.severity === 'warning');

  const lines: string[] = [
    '## Validation Feedback from Previous Attempt',
    '',
  ];

  if (errors.length > 0) {
    lines.push(`### Errors (${errors.length}) — Must Fix`);
    lines.push('');
    for (const err of errors) {
      lines.push(`- **[${err.ruleId}]** ${err.message}`);
      lines.push(`  Constraint: ${err.constraint}`);
      if (err.suggestion) {
        lines.push(`  Suggestion: ${err.suggestion.action} — ${err.suggestion.details}`);
      }
    }
    lines.push('');
  }

  if (warnings.length > 0) {
    lines.push(`### Warnings (${warnings.length}) — Should Fix`);
    lines.push('');
    for (const warn of warnings) {
      lines.push(`- **[${warn.ruleId}]** ${warn.message}`);
      if (warn.suggestion) {
        lines.push(`  Suggestion: ${warn.suggestion.action} — ${warn.suggestion.details}`);
      }
    }
    lines.push('');
  }

  const lastAttempt = feedback[0];
  if (lastAttempt) {
    lines.push(
      `Attempt ${lastAttempt.attemptNumber} of ${lastAttempt.maxAttempts}. Please correct the issues above and regenerate.`,
    );
  }

  return lines.join('\n');
}
