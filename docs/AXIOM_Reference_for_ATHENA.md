# AXIOM Architecture Reference for ATHENA Integration

**Source:** Cristian Leu's CFMAC Master's Thesis (2026)  
**Purpose:** Reference document for applying AXIOM patterns to ATHENA Phase 9A  
**Date:** February 2026

---

## 1. Executive Summary

AXIOM (Automated eXpert for Industrial Output Management) is a three-layer neuro-symbolic architecture for supervising LLM-generated outputs. The key innovation is the **corrective feedback loop** — structured error messages flow back to the LLM to guide regeneration, not just rejection.

> "The corrective feedback loop is the primary contribution of the architecture."  
> — CFMAC Thesis, Chapter 3

---

## 2. The Three Layers

### Layer 1: Der Generator (The Generator)
- **Role:** LLM transforms requests into structured specifications
- **Input:** Natural language request + [Feedback from previous attempt]
- **Output:** Structured data (YAML in CellCAD, NodeProposal/EdgeProposal in ATHENA)
- **Backends:** Claude API, Ollama (Qwen 2.5 Coder), or any LLM

### Layer 2: Der Validator (The Validator)
- **Role:** Multi-level verification against constraints
- **Three Levels:**
  1. **Schema Validation** — Structure correctness (valid types, required fields)
  2. **Constraint Checking** — Domain rules (14 physics constraints in CellCAD)
  3. **Semantic/Simulation** — Deep validation (PyBaMM in CellCAD, embedding similarity in ATHENA)

### Layer 3: Der Supervisor (The Supervisor)
- **Role:** CPN orchestrates workflow, manages retry logic, enforces termination
- **Decisions:** ACCEPT / RETRY / REJECT
- **Termination Conditions:**
  - Success: All constraints pass
  - Max Retries: `retry_count >= MAX_RETRY` (default: 3)
  - Fatal Error: Unrecoverable (empty LLM response, etc.)

---

## 3. Three Design Principles

These MUST carry over to any AXIOM implementation:

### Principle 1: Minimal Abstraction
> "The system exposes the underlying data structures and decision logic rather than hiding them behind opaque interfaces. Design tokens carry complete state information that can be examined at any point."

**For ATHENA:** Users should see raw token data, not opaque wrappers. Every proposal, every validation result, every feedback message should be inspectable.

### Principle 2: Transparency
> "Every decision, whether to accept, reject, or retry, is logged with explicit justification. Validation failures produce specific error messages identifying which constraints were violated."

**For ATHENA:** No silent failures. Every ACCEPT/RETRY/REJECT must log the specific rule that passed or failed.

### Principle 3: Auditability
> "The formal CPN model provides a mathematical specification against which the implementation can be verified."

**For ATHENA:** The CPN definition IS the specification. Implementation should be verifiable against it.

---

## 4. Formal CPN Definition (Definition 3.1)

Following Jensen's notation, the AXIOM supervision workflow is a Colored Petri Net:

```
CPN = (P, T, A, Σ, V, C, G, E, I)
```

### 4.1 Color Sets (Σ)

```typescript
Σ = { REQUEST, DESIGN, VALIDATION_RESULT, FEEDBACK, STATUS }

// REQUEST — incoming request
interface REQUEST {
  id: string;
  prompt: string;
  timestamp: DateTime;
}

// DESIGN — generated specification
interface DESIGN {
  request_id: string;
  parameters: YAML | object;      // The actual spec
  retry_count: number;
  feedback_history: FEEDBACK[];   // Accumulated feedback
}

// VALIDATION_RESULT — output from Validator
interface VALIDATION_RESULT {
  valid: boolean;
  violations: Constraint[];       // Which rules failed
  sim_data?: object;              // Optional simulation results
}

// FEEDBACK — structured corrective information (THE KEY INNOVATION)
interface FEEDBACK {
  constraint_id: string;          // Which rule failed
  actual: number | string | any;  // What the LLM generated
  expected: Range | Value;        // What was required
  message: string;                // Human-readable explanation
}
```

### 4.2 Places (P)

```typescript
P = { P_request, P_generating, P_draft, P_validating, P_deciding, P_valid, P_retry, P_rejected }
```

| Place | Color Set | Description |
|-------|-----------|-------------|
| P_request | REQUEST | Incoming request (SOURCE) |
| P_draft | DESIGN | Generated spec awaiting validation |
| P_deciding | DESIGN × RESULT | Decision point: accept, retry, or reject |
| P_valid | DESIGN | Successfully validated (SINK - success) |
| P_retry | DESIGN × FEEDBACK | Design with feedback, awaiting regeneration |
| P_rejected | DESIGN × FEEDBACK | Rejected design with failure reason (SINK - failure) |

### 4.3 Transitions (T)

```typescript
T = { T_generate, T_validate, T_accept, T_retry, T_reject_retry, T_reject_fatal }
```

| Transition | From | To | Guard | Action |
|------------|------|-----|-------|--------|
| T_generate | P_request ∪ P_retry | P_draft | — | Call LLM with request + feedback |
| T_validate | P_draft | P_deciding | — | Run all validators |
| T_accept | P_deciding | P_valid | G_valid(d,r) | Move to success sink |
| T_retry | P_deciding | P_retry | ¬G_valid ∧ (retry < MAX) | Build feedback, increment retry |
| T_reject_retry | P_deciding | P_rejected | ¬G_valid ∧ (retry ≥ MAX) | Exceed max retries |
| T_reject_fatal | P_deciding | P_rejected | G_fatal(r) | Unrecoverable error |

### 4.4 Guard Functions (G)

The combined validation guard:

```
G_valid(d, sim) = G_schema(d) ∧ ⋀ᵢ G_Cᵢ(d) ∧ G_sim(d, sim)
```

Example guards from CellCAD (adapt for ATHENA):

```typescript
// Range constraint
G_C1(d) = 50 ≤ d.cathode_thickness ≤ 250  // μm

// Consistency constraint (cross-parameter)
G_C8(d) = 1.05 ≤ (d.anode_loading / d.cathode_loading) ≤ 1.20  // N/P ratio

// Calculation constraint
G_C9(d) = |d.energy - (d.voltage × d.capacity)| / d.energy ≤ 0.05

// Simulation constraint
G_C14(d, sim) = max(sim.temperature) ≤ 45  // °C
```

**For ATHENA, guards would be:**
```typescript
// Schema compliance
G_schema(p) = isValidNodeType(p.nodeType) ∧ hasRequiredFields(p)

// Structural constraint
G_noSelfLoop(e) = e.sourceId !== e.targetId

// Uniqueness constraint
G_noDuplicate(e) = !existsConnection(e.sourceId, e.targetId, e.type)

// Semantic constraint
G_similarity(e) = cosineSimilarity(e.source.embedding, e.target.embedding) >= 0.7
```

---

## 5. The Corrective Feedback Loop

This is the PRIMARY CONTRIBUTION. Without it, you just have "validation that rejects."

### 5.1 Feedback Structure

```typescript
interface CorrectionFeedback {
  // What failed
  ruleId: string;                 // e.g., "unique-connection"
  constraint: string;             // e.g., "No duplicate edges between nodes"
  
  // What happened
  severity: 'error' | 'warning';
  actual: unknown;                // What the LLM produced
  expected: unknown;              // What was required
  
  // How to fix
  message: string;                // Human-readable: "Connection already exists"
  suggestion?: {
    action: 'modify' | 'remove' | 'merge' | 'rephrase';
    details: string;              // "Change edge type or remove duplicate"
  };
  
  // Retry tracking
  attemptNumber: number;
  maxAttempts: number;
}
```

### 5.2 Feedback Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  LLM generates proposal                                         │
│         ↓                                                       │
│  Validator checks constraints                                   │
│         ↓                                                       │
│  IF fails:                                                      │
│    Build FEEDBACK with:                                         │
│      - constraint_id (which rule)                               │
│      - actual (what LLM said)                                   │
│      - expected (what was required)                             │
│      - message (explain why)                                    │
│      - suggestion (how to fix)                                  │
│         ↓                                                       │
│  Inject feedback into next LLM prompt:                          │
│    "Previous attempt failed: {message}. {suggestion}"           │
│         ↓                                                       │
│  LLM regenerates with corrective context                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Why This Matters

Without structured feedback:
1. AI proposes
2. Validation rejects
3. AI retries blindly (same mistakes)

With AXIOM feedback:
1. AI proposes
2. Validation identifies SPECIFIC failure
3. Feedback explains WHY and HOW to fix
4. AI regenerates with corrective guidance
5. Convergence toward valid output

---

## 6. Hallucination Taxonomy

AXIOM addresses five types of LLM failures in engineering contexts:

| Type | Name | Root Cause | Example | Detection Strategy |
|------|------|------------|---------|-------------------|
| **Type 1** | Structural | Output format | Invalid YAML, missing fields | Schema validation |
| **Type 2** | Mathematical | Tokenization | 3.7V × 5Ah = 100Wh | Symbolic calculation |
| **Type 3** | Physical | No "world model" | Porosity = 150% | Range/bounds checks |
| **Type 4** | Consistency | Independent generation | N/P ratio mismatch | Cross-parameter validation |
| **Type 5** | Fabrication | Pattern extrapolation | Material "NMC-999" | Database validation |

### Mapping to ATHENA

| AXIOM Type | ATHENA Equivalent | Example |
|------------|-------------------|---------|
| Type 1 (Structural) | Invalid node/edge schema | Missing `nodeType` field |
| Type 2 (Mathematical) | N/A (not applicable) | — |
| Type 3 (Physical) | Semantic impossibility | Linking unrelated concepts |
| Type 4 (Consistency) | Graph structure violation | Self-loop, duplicate edge |
| Type 5 (Fabrication) | Non-existent reference | Linking to deleted node |

---

## 7. Mapping AXIOM to ATHENA

### 7.1 Layer Mapping

| AXIOM (CellCAD) | ATHENA Phase | Component |
|-----------------|--------------|-----------|
| Der Generator | Phase 7 | AI Chat generates NodeProposal[], EdgeProposal[] |
| Der Validator | Phase 5A | Rules Engine validates graph structure |
| Der Supervisor | Phase 9A | CPN Engine orchestrates validation + feedback |

### 7.2 Place Mapping

| AXIOM Place | ATHENA Equivalent | Description |
|-------------|-------------------|-------------|
| P_request | `proposals` | AI-generated proposals enter here |
| P_draft | `validating` | Under Rules Engine check |
| P_deciding | `deciding` | Pass/fail determination |
| P_valid | `verified` | Ready for commit |
| P_valid (after commit) | `committed` | Written to graph |
| P_retry | `feedback` | With structured feedback for regeneration |
| P_rejected | `rejected` | Max retries or human rejection |

### 7.3 Transition Mapping

```typescript
const athenaTransitions = {
  validate: {
    from: 'proposals',
    to: ['verified', 'feedback'],  // Fork based on result
    action: async (tokens) => {
      const results = await rulesEngine.validate(tokens);
      return results.map(r => ({
        ...r.token,
        color: r.valid ? 'verified' : 'feedback',
        metadata: r.valid ? {} : { feedback: r.feedback }
      }));
    }
  },
  
  retry: {
    from: 'feedback',
    to: 'proposals',
    guard: (token) => token.metadata.attemptNumber < MAX_RETRY,
    action: async (token) => {
      // THE CORRECTIVE FEEDBACK LOOP
      const revised = await aiChat.regenerate(
        token.payload,
        token.metadata.feedback  // Structured feedback guides regeneration
      );
      return { 
        ...revised, 
        metadata: { attemptNumber: token.metadata.attemptNumber + 1 }
      };
    }
  },
  
  escalate: {
    from: 'feedback',
    to: 'rejected',
    guard: (token) => token.metadata.attemptNumber >= MAX_RETRY,
    action: (token) => ({ ...token, color: 'escalated' })  // Human decision
  },
  
  commit: {
    from: 'verified',
    to: 'committed',
    action: async (tokens) => {
      await graphAdapter.create(tokens.map(t => t.payload));
      return tokens.map(t => ({ ...t, color: 'committed' }));
    }
  }
};
```

---

## 8. Enhanced Token Structure (FlowOS-inspired)

For maximum auditability, tokens should carry complete metadata:

```typescript
interface TokenMetadata {
  id: string;                      // Unique token ID
  correlationId: string;           // Groups related tokens across retries
  createdAt: DateTime;
  emittedAt?: DateTime;
  
  // Place tracking
  currentPlace: string;
  previousPlace?: string;
  transitionHistory: string[];     // Full audit trail
  
  // Generation tracking
  generationModel?: string;        // "claude-3-sonnet" or "qwen-32b"
  generationLatencyMs?: number;
  
  // Validation tracking
  validationTrace: ValidationRecord[];
  constraintsChecked: string[];
  constraintsFailed: string[];
}

interface ValidationRecord {
  constraintId: string;
  passed: boolean;
  timestamp: DateTime;
  details?: object;
}

interface AetherToken<T> {
  // Core payload
  payload: T;                      // NodeProposal or EdgeProposal
  color: string;                   // Current place/state
  
  // Retry state
  retryCount: number;
  maxRetries: number;
  feedbackHistory: CorrectionFeedback[];
  
  // Metadata for auditability
  _meta: TokenMetadata;
}
```

---

## 9. Visibility as Trust Mechanism

From Cristian's requirement:

> "I want to see what the agent is doing and what it is reasoning, I can understand and even step in when I see that it takes a wrong turn."

This maps to Der Supervisor made visible:

| User Need | AXIOM Component | Implementation |
|-----------|-----------------|----------------|
| "What it's doing" | Token flow through places | CPN visualization showing current tokens |
| "What it's reasoning" | Transition guards | Display which guards enabled/blocked |
| "Why it's retrying" | Feedback tokens | Show the structured feedback |
| "Step in when wrong" | Human intervention | Pause/Step/Override at any transition |

**Visibility IS the trust mechanism** — not a debug feature.

---

## 10. Module Structure Recommendation

```
src/modules/axiom/
├── index.ts
├── types/
│   ├── token.ts              # AetherToken with full metadata
│   ├── place.ts              # CPN Place definitions
│   ├── transition.ts         # Transition with guards and actions
│   ├── feedback.ts           # CorrectionFeedback types
│   └── colorsets.ts          # PROPOSAL, RESULT, FEEDBACK color sets
├── engine/
│   ├── Place.ts
│   ├── Transition.ts
│   ├── AXIOMEngine.ts        # The Supervisor (core CPN executor)
│   └── FeedbackBuilder.ts    # Constructs structured feedback for LLM
├── stores/
│   ├── ITokenStore.ts
│   ├── InMemoryTokenStore.ts
│   └── IndexedDBTokenStore.ts
├── guards/
│   ├── schema.ts             # Level 1: Structure validation
│   ├── constraints.ts        # Level 2: Graph rules (no self-loop, etc.)
│   ├── semantic.ts           # Level 3: Embedding similarity
│   └── termination.ts        # Retry/fatal guards
├── components/
│   ├── AXIOMIndicator.tsx    # Minimal: "AXIOM working..." in status bar
│   ├── AXIOMPanel.tsx        # Full workflow view in sidebar
│   ├── WorkflowGraph.tsx     # React Flow visualization of CPN
│   ├── TokenInspector.tsx    # See token contents (Principle 1)
│   ├── ReasoningTrail.tsx    # Post-completion explanation
│   ├── FeedbackDisplay.tsx   # Show corrective feedback being sent
│   └── InterventionModal.tsx # Human decision required
└── events/
    ├── AXIOMEventBridge.ts   # Connect to existing event system
    └── types.ts
```

---

## 11. Key Reminders

1. **AXIOM is the architecture, not just the CPN engine.** The module should be named `axiom/`, with `cpn/` as a subdirectory if needed.

2. **The feedback loop is the innovation.** Without structured feedback that guides regeneration, you just have "validation that rejects."

3. **Three design principles are non-negotiable:** Minimal Abstraction, Transparency, Auditability.

4. **Termination must be enforced:** Success, Max Retries (default 3), or Fatal Error.

5. **Visibility enables trust:** Users must see token state, transition guards, and feedback at all times.

6. **Color sets carry meaning:** Tokens aren't generic — they have explicit types (REQUEST, DESIGN, FEEDBACK, etc.).

7. **Guards are TypeScript predicates:** Simple functions that return boolean, not complex rule engines.

---

## 12. Questions Answered

### Q1: Module naming?
**Answer:** Use `src/modules/axiom/` — AXIOM is the architecture, CPN is just Der Supervisor.

### Q2: Feedback loop scope?
**Answer:** Start with validation-only in 9A. Design the `CorrectionFeedback` interface to be reusable for Phase 7 integration later.

### Q3: Specific patterns to carry over?
**Answer:** Yes — Color Sets, Place Definitions, Three Principles, Termination Conditions, Guard Functions as TypeScript predicates. All detailed in this document.

### Q4: Does the framing capture AXIOM's meaning?
**Answer:** Yes — "LLM proposes → CPN routes → Validator checks → Failure feedback guides regeneration" is exactly right. The corrective feedback loop IS the innovation.

---

*Document prepared from CFMAC Thesis Chapter 3 and supporting research materials.*
