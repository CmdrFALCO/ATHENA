import type { ValidationRule, ValidationContext } from '../types/rules';
import type { Violation } from '../types/violations';

/**
 * Stateless rules engine for validation.
 *
 * Responsibilities:
 * - Register/unregister validation rules
 * - Evaluate rules against a ValidationContext
 * - Return violations (does NOT store them)
 *
 * This is a pure evaluation engine — no side effects, no state management.
 */
export class RulesEngine {
  private rules: Map<string, ValidationRule> = new Map();

  /**
   * Register a validation rule.
   * Replaces existing rule with same ID.
   */
  registerRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Register multiple rules at once.
   */
  registerRules(rules: ValidationRule[]): void {
    for (const rule of rules) {
      this.registerRule(rule);
    }
  }

  /**
   * Unregister a rule by ID.
   */
  unregisterRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all registered rules.
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get a specific rule by ID.
   */
  getRule(ruleId: string): ValidationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get only rules that are enabled by default.
   */
  getEnabledRules(): ValidationRule[] {
    return this.getRules().filter(r => r.enabledByDefault);
  }

  /**
   * Evaluate rules against a context.
   *
   * @param context - The validation context with graph data and indexes
   * @param options - Optional filtering
   * @returns Object containing violations found and rules that were run
   */
  evaluate(
    context: ValidationContext,
    options?: {
      /** Specific rule IDs to run (empty = all enabled) */
      ruleIds?: string[];
      /** Include rules that are disabled by default? */
      includeDisabled?: boolean;
    }
  ): { violations: Violation[]; rulesRun: string[] } {
    const { ruleIds, includeDisabled = false } = options || {};

    // Determine which rules to run
    let rulesToRun: ValidationRule[];

    if (ruleIds && ruleIds.length > 0) {
      // Run specific rules
      rulesToRun = ruleIds
        .map(id => this.rules.get(id))
        .filter((r): r is ValidationRule => r !== undefined);
    } else if (includeDisabled) {
      // Run all rules
      rulesToRun = this.getRules();
    } else {
      // Run only enabled rules
      rulesToRun = this.getEnabledRules();
    }

    // Evaluate each rule
    const violations: Violation[] = [];
    const rulesRun: string[] = [];

    for (const rule of rulesToRun) {
      try {
        const ruleViolations = rule.evaluate(context);
        violations.push(...ruleViolations);
        rulesRun.push(rule.id);
      } catch (error) {
        // Log but don't fail entire validation
        console.error(`Rule "${rule.id}" threw an error:`, error);
        // Rule is still marked as run even if it errored
        rulesRun.push(rule.id);
      }
    }

    return { violations, rulesRun };
  }
}

// Singleton instance for convenience (optional — can also instantiate per-use)
export const rulesEngine = new RulesEngine();
