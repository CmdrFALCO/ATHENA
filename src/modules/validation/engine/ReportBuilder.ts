import type { Violation } from '../types/violations';
import type { ValidationReport, ValidationSummary } from '../types/reports';
import type { ValidationContext } from '../types/rules';

export interface ReportBuilderInput {
  violations: Violation[];
  rulesRun: string[];
  context: ValidationContext;
  startTime: number;
}

/**
 * Builds a ValidationReport from evaluation results.
 */
export function buildValidationReport(input: ReportBuilderInput): ValidationReport {
  const { violations, rulesRun, context, startTime } = input;

  const errors = violations.filter(v => v.severity === 'error').length;
  const warnings = violations.filter(v => v.severity === 'warning').length;

  const summary: ValidationSummary = {
    errors,
    warnings,
    rulesEvaluated: rulesRun.length,
    entitiesChecked: context.entities.length,
    connectionsChecked: context.connections.length,
    clustersChecked: context.clusters.length,
  };

  return {
    timestamp: new Date().toISOString(),
    conforms: errors === 0, // Conforms if no errors (warnings OK)
    summary,
    violations,
    rulesRun,
    durationMs: Date.now() - startTime,
  };
}
