# Validation Module

**Location:** `src/modules/validation/`
**Status:** Implemented in WP 5.1-5.4

## Purpose

SHACL-inspired validation engine for knowledge graph integrity. Detects structural issues (orphan notes, self-loops, duplicates) and quality issues (weak connections, stale suggestions) in the note graph.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Module barrel export |
| **Types** | |
| `types/rules.ts` | ValidationRule, ValidationContext, ValidationSeverity |
| `types/violations.ts` | Violation, ViolationSuggestion, ViolationFocusType |
| `types/reports.ts` | ValidationReport, ValidationSummary, ValidationOptions |
| `types/index.ts` | Type barrel export |
| **Interfaces** | |
| `interfaces/IValidationService.ts` | Bridge interface for Phase 5A/5B swap |
| **Engine** | |
| `engine/RulesEngine.ts` | Stateless rule registry and evaluation |
| `engine/ContextBuilder.ts` | Build ValidationContext with O(1) indexes |
| `engine/ReportBuilder.ts` | Generate ValidationReport from violations |
| `engine/index.ts` | Engine barrel export |
| **Rules** | |
| `rules/structural/orphanNote.ts` | Detect notes with no connections |
| `rules/structural/selfLoop.ts` | Detect connections to same entity |
| `rules/structural/duplicateConnection.ts` | Detect duplicate connections |
| `rules/structural/bidirectionalConnection.ts` | Detect A→B + B→A pairs |
| `rules/quality/weaklyConnected.ts` | Detect notes with only 1 connection |
| `rules/quality/staleSuggestion.ts` | Detect old AI suggestions |
| `rules/index.ts` | MVP rules export + registration helper |
| **Store** | |
| `store/validationState.ts` | Legend-State slice for validation |
| `store/validationActions.ts` | runValidation, dismissViolation, applyViolationFix |
| `store/index.ts` | Store barrel export |
| **Services** | |
| `services/SimpleValidationService.ts` | IValidationService implementation |
| `services/index.ts` | Service barrel export |
| **Hooks** | |
| `hooks/useValidation.ts` | Main validation hook (counts, runValidation) |
| `hooks/useViolations.ts` | Filter/dismiss/fix violations |
| `hooks/useViolationsFor.ts` | Get violations for specific entity |
| `hooks/index.ts` | Hooks barrel export |

---

## Public API

```typescript
// src/modules/validation/index.ts

// Types
export type {
  ValidationSeverity,      // 'error' | 'warning' | 'info'
  ValidationTarget,        // 'node' | 'edge' | 'graph'
  ValidationContext,       // Graph snapshot with indexes
  ValidationRule,          // Rule definition with evaluate function
  Violation,               // Validation result
  ViolationSuggestion,     // Fix suggestion
  ValidationReport,        // Complete validation run results
  ValidationOptions,       // Validation options (scope, filter)
} from './types';

// Interface
export type { IValidationService } from './interfaces/IValidationService';

// Engine
export {
  RulesEngine,             // Stateless rule registry
  rulesEngine,             // Default singleton instance
  buildValidationContext,  // Create context from graph data
  buildValidationReport,   // Create report from violations
} from './engine';

// Rules
export {
  orphanNoteRule,
  selfLoopRule,
  duplicateConnectionRule,
  bidirectionalConnectionRule,
  weaklyConnectedRule,
  staleSuggestionRule,
  mvpRules,                // Array of all MVP rules
  registerMvpRules,        // Helper to register all MVP rules
} from './rules';

// Store
export { validationState$ } from './store';
export {
  runValidation,           // Run validation and update store
  dismissViolation,        // Mark violation as dismissed
  applyViolationFix,       // Apply auto-fix (delete connection)
  clearViolations,         // Clear all violations
} from './store';

// Hooks
export { useValidation, useViolations, useViolationsFor } from './hooks';

// Service
export { SimpleValidationService, validationService } from './services';
```

---

## Core Types

### ValidationRule

```typescript
interface ValidationRule<T extends ValidationTarget = ValidationTarget> {
  id: string;                    // Unique rule ID (e.g., 'structural/orphan-note')
  name: string;                  // Human-readable name
  description: string;           // What the rule checks
  severity: ValidationSeverity;  // 'error' | 'warning' | 'info'
  target: T;                     // 'node' | 'edge' | 'graph'
  tags?: string[];               // Categorization tags

  evaluate: (context: ValidationContext) => Violation[];
}
```

### ValidationContext

```typescript
interface ValidationContext {
  notes: Note[];
  connections: Connection[];
  clusters: Cluster[];
  clusterMembers: ClusterMemberWithClusterId[];
  now: Date;

  // Pre-built indexes for O(1) lookups
  noteById: Map<string, Note>;
  connectionById: Map<string, Connection>;
  connectionsBySource: Map<string, Connection[]>;
  connectionsByTarget: Map<string, Connection[]>;
  connectionPairs: Set<string>;  // 'sourceId:targetId' pairs
}
```

### Violation

```typescript
interface Violation {
  id: string;
  ruleId: string;
  severity: ValidationSeverity;
  focusType: ViolationFocusType;  // 'note' | 'connection' | 'cluster'
  focusId: string;
  message: string;
  suggestion?: ViolationSuggestion;
  createdAt: string;
}
```

### ViolationSuggestion

```typescript
interface ViolationSuggestion {
  type: ViolationFixType;      // 'delete-connection' | 'create-connection' | 'merge-notes' | etc.
  label: string;               // UI label for fix button
  description?: string;
  data?: Record<string, unknown>;  // Fix-specific data (e.g., connectionId to delete)
}
```

---

## Architecture

### Phase 5A (Current)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React Hooks    │────▶│ ValidationStore  │────▶│  RulesEngine    │
│  (useValidation)│     │ (Legend-State)   │     │ (stateless)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │                        │
                               ▼                        ▼
                        ┌──────────────────┐     ┌─────────────────┐
                        │ SimpleValidation │     │  MVP Rules      │
                        │    Service       │     │  (6 rules)      │
                        └──────────────────┘     └─────────────────┘
```

### Bridge Interface Pattern

`IValidationService` allows swapping implementations:

```typescript
interface IValidationService {
  validate(options?: ValidationOptions): Promise<ValidationReport>;
  getViolations(): Violation[];
  getViolationsForEntity(entityId: string): Violation[];
  dismissViolation(violationId: string): void;
  applyFix(violationId: string): Promise<boolean>;
  onViolationsChanged(callback: (violations: Violation[]) => void): () => void;
}
```

- **Phase 5A:** `SimpleValidationService` (store-backed, manual trigger)
- **Phase 5B:** Full CPN engine (reactive, incremental)

---

## MVP Rules

| Rule | Target | Severity | Description |
|------|--------|----------|-------------|
| `orphanNote` | node | warning | Notes with no connections |
| `selfLoop` | edge | error | Connections to same entity |
| `duplicateConnection` | edge | error | Multiple connections between same pair |
| `bidirectionalConnection` | edge | info | Both A→B and B→A exist |
| `weaklyConnected` | node | info | Notes with only 1 connection |
| `staleSuggestion` | edge | warning | AI suggestions older than 7 days |

---

## Usage

### Running Validation

```typescript
import { useValidation } from '@/modules/validation';

function ValidationPanel() {
  const {
    errorCount,
    warningCount,
    totalCount,
    isValidating,
    lastValidatedAt,
    runValidation,
  } = useValidation();

  return (
    <div>
      <span>{errorCount} errors, {warningCount} warnings</span>
      <button onClick={runValidation} disabled={isValidating}>
        {isValidating ? 'Validating...' : 'Run Validation'}
      </button>
    </div>
  );
}
```

### Filtering Violations

```typescript
import { useViolations } from '@/modules/validation';

function ViolationList() {
  const {
    violations,
    dismissViolation,
    applyFix,
  } = useViolations({
    severity: 'error',  // Only errors
    ruleId: 'structural/self-loop',  // Optional: filter by rule
  });

  return (
    <ul>
      {violations.map(v => (
        <li key={v.id}>
          {v.message}
          <button onClick={() => dismissViolation(v.id)}>Dismiss</button>
          {v.suggestion && (
            <button onClick={() => applyFix(v.id)}>
              {v.suggestion.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
```

### Violations for Canvas Node/Edge

```typescript
import { useViolationsFor } from '@/modules/validation';

function EntityNode({ entityId }: { entityId: string }) {
  const { violations, highestSeverity, hasErrors } = useViolationsFor(entityId);

  return (
    <div className={hasErrors ? 'border-red-500' : ''}>
      {violations.length > 0 && (
        <Badge severity={highestSeverity}>{violations.length}</Badge>
      )}
    </div>
  );
}
```

### Custom Rules

```typescript
import { RulesEngine } from '@/modules/validation';

const myRule: ValidationRule<'node'> = {
  id: 'custom/my-rule',
  name: 'My Custom Rule',
  description: 'Checks for something',
  severity: 'warning',
  target: 'node',
  tags: ['custom'],

  evaluate: (context) => {
    const violations: Violation[] = [];
    for (const note of context.notes) {
      if (/* some condition */) {
        violations.push({
          id: `${myRule.id}:${note.id}`,
          ruleId: myRule.id,
          severity: 'warning',
          focusType: 'note',
          focusId: note.id,
          message: `Note "${note.title}" has an issue`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return violations;
  },
};

// Register the rule
const engine = new RulesEngine();
engine.registerRule(myRule);
```

---

## Console Debugging

```javascript
window.__ATHENA_VALIDATION_STATE__           // Current validation state
window.__ATHENA_VALIDATION_STATE__.violations.get()  // All violations
window.__ATHENA_VALIDATION_STATE__.lastReport.get()  // Last validation report
```

---

## Implementation Notes

1. **Context Indexes**: `ContextBuilder` pre-computes lookup maps for O(1) access during rule evaluation
2. **Stateless Rules**: Rules are pure functions with no side effects
3. **Auto-fix**: Some violations include `suggestion` with fix data (e.g., `delete-connection`)
4. **Dismissed Violations**: Tracked in store, filtered from `getActiveViolations()`
5. **Bridge Interface**: `IValidationService` enables Phase 5B swap without UI changes
