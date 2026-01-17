# Canvas Module

**Location:** `src/modules/canvas/`
**Status:** Implemented in WP 2.1-2.5, WP 3.5-3.6, WP 5.1.1

## Purpose

React Flow based graph visualization for displaying entities as nodes and connections as edges with interactive editing.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Module barrel export |
| `components/index.ts` | Component exports |
| `components/GraphCanvas.tsx` | React Flow canvas component |
| `components/EntityNode.tsx` | Custom node component (WP 2.2) |
| `components/ConnectionEdge.tsx` | Custom edge component (WP 2.4, WP 3.5) |
| `components/ConnectionInspector.tsx` | Connection detail panel (WP 2.5) |
| `components/SuggestionPopover.tsx` | Accept/dismiss popover (WP 3.6) |
| `hooks/index.ts` | Hook exports |
| `hooks/useNotesAsNodes.ts` | Converts notes to nodes (WP 2.2) |
| `hooks/useNodePositionSync.ts` | Persists node positions (WP 2.3) |
| `hooks/useConnectionsAsEdges.ts` | Converts connections to edges (WP 2.4) |
| `hooks/useConnectionHandlers.ts` | Connection creation/deletion (WP 2.4) |
| `hooks/useSelectedConnection.ts` | Edge selection state (WP 2.5) |
| `hooks/useSuggestedEdges.ts` | Converts suggestions to green edges (WP 3.5) |

---

## Public API

### Components

```typescript
export { GraphCanvas, EntityNode, ConnectionEdge, ConnectionInspector } from './components';
```

### Hooks

```typescript
export {
  useNotesAsNodes,
  useNodePositionSync,
  useConnectionsAsEdges,
  useConnectionHandlers,
  useSelectedConnection,
  useSuggestedEdges,  // WP 3.5
} from './hooks';
```

---

## Usage Examples

### Basic Usage

```typescript
import { GraphCanvas } from '@/modules/canvas';

// In SophiaPage - side by side with EntityDetail
<div className="flex h-full">
  <div className="flex-1 min-w-0">
    <GraphCanvas />
  </div>
  <div className="w-[400px] border-l">
    <EntityDetail />
  </div>
</div>
```

### Using Individual Hooks

```typescript
import { useNotesAsNodes, useConnectionsAsEdges } from '@/modules/canvas';

function CustomCanvas() {
  const nodes = useNotesAsNodes();
  const edges = useConnectionsAsEdges();

  return (
    <ReactFlow nodes={nodes} edges={edges}>
      <Background />
      <Controls />
    </ReactFlow>
  );
}
```

---

## Features

### Visual Features
- Dark themed canvas (`#1a1a1a` background)
- Dot grid background pattern
- Pan and zoom controls
- MiniMap for navigation with color-coded nodes

### Node Features (WP 2.2)
- Entity nodes with type badges
- Selection sync with store
- Custom styling per entity type

### Position Features (WP 2.3)
- Drag-to-reposition nodes
- Persistent storage to SQLite
- Snap-to-grid (20px) for cleaner layouts

### Connection Features (WP 2.4)
- Blue connections via drag between handles
- Color-coded edge styling
- Connection deletion with backspace/delete

### Inspector Features (WP 2.5)
- Connection inspector panel on edge click
- Editable connection labels with auto-save
- Connection metadata display

### Green Suggestions (WP 3.5-3.6, WP 5.1.1)
- AI-suggested connections displayed as green dashed edges
- Generated when a note is selected
- Updated when note content/title changes
- Similarity score displayed as label (e.g., "87%")
- Click opens accept/dismiss popover (WP 3.6)
  - Accept → Creates blue persisted connection
  - Dismiss → Removes suggestion from state
- Persistent visibility (WP 5.1.1):
  - Canvas config `showAiSuggestions: 'always' | 'on-select'` controls behavior
  - In `'always'` mode, suggestions accumulate as you select different notes
  - In `'on-select'` mode, suggestions are replaced when selecting a new note
  - Click canvas background to deselect nodes (clears in 'on-select' mode only)

---

## Data Flow

### Node Rendering
```
Store (notes) → useNotesAsNodes() → GraphCanvas → EntityNode
     ↑                                              ↓
uiActions.selectEntity() ←────── onNodeClick ──────┘
```

### Position Persistence
```
Drag → onNodeDragStop → useNodePositionSync.saveNodePosition
    → noteAdapter.update() + entityActions.updateNote()
```

### Connection Creation
```
Connect → onConnect → connectionAdapter.create() → connectionActions.addConnection()
    → useConnectionsAsEdges() → GraphCanvas renders ConnectionEdge
```

### Connection Editing
```
EdgeClick → selectConnection → ConnectionInspector renders
    → label edit → connectionAdapter.update() + connectionActions.updateConnection()
```

### Suggestion Rendering (WP 3.5, WP 5.1.1)
```
Note Selection → useSuggestions.generateForNote() → SuggestionService
    → AIService.findSimilarNotes() → suggestions stored in Legend-State
    │
    ├─ showAiSuggestions === 'always' → suggestionActions.appendSuggestions()
    │     → merges with existing, avoids duplicates
    │
    └─ showAiSuggestions === 'on-select' → suggestionActions.setSuggestions()
          → replaces all suggestions

    → useSuggestedEdges() → green dashed edges rendered

Note Content Change → IndexerService.embedNote() → indexerActions.noteIndexed()
    → GraphCanvas subscribes via useLastIndexedNoteId()
    → regenerates suggestions if selected note was indexed
```

### Accept/Dismiss (WP 3.6)
```
Click green edge label → SuggestionPopover appears
  ├─ Accept → useSuggestionActions.acceptSuggestion()
  │     → connectionAdapter.create() → connectionActions.addConnection()
  │     → suggestionActions.removeSuggestion() → green edge becomes blue
  │
  └─ Dismiss → useSuggestionActions.dismissSuggestion()
        → suggestionActions.removeSuggestion() → green edge removed
```

---

## Component Details

### GraphCanvas

Main canvas component with React Flow integration.

```typescript
// Features included:
- ReactFlow with custom node/edge types
- Background (dot pattern)
- Controls (zoom buttons)
- MiniMap (navigation overview)
- Snap-to-grid (20px)
```

### EntityNode

Custom node renderer for entities.

```typescript
interface EntityNodeData {
  label: string;
  type: 'note' | 'plan' | 'document';
  selected: boolean;
}
```

Visual elements:
- Type badge with icon
- Title text
- Selection highlight
- Color-coded by entity type

### ConnectionEdge

Custom edge renderer with styling, suggestion support, and accept/dismiss popover.

```typescript
interface ConnectionEdgeData {
  connectionId: string;
  label?: string | null;
  color: ConnectionColor;       // 'blue' | 'green' | 'red' | 'amber'
  isSuggested?: boolean;        // WP 3.5 - true for green suggestions
  similarity?: number;          // WP 3.5 - 0-1 for suggestions
  sourceId?: string;            // WP 3.6 - for accept flow
  targetId?: string;            // WP 3.6 - for accept flow
}

// Styling differences
// - Blue edges: solid, 2px stroke
// - Green suggestions: dashed (8,4), 75% opacity, similarity label
// - Click green label → shows SuggestionPopover (WP 3.6)
```

### SuggestionPopover (WP 3.6)

Popover for accepting or dismissing green suggestions.

```typescript
interface SuggestionPopoverProps {
  similarity: number;
  isAccepting: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}
```

Features:
- Similarity badge showing percentage
- Accept button (green) with loading state
- Dismiss button (gray)
- Uses `nodrag nopan` classes for React Flow click handling

### ConnectionInspector

Panel for viewing/editing connection details.

```typescript
interface ConnectionInspectorProps {
  connection: Connection;
  onClose: () => void;
}
```

Features:
- Connection label editing
- Type display
- Source/target info
- Delete action

---

## Hook Details

### useNotesAsNodes

Converts store notes to React Flow node format.

```typescript
const nodes = useNotesAsNodes();
// Returns: Node[] with position, data, type
```

### useNodePositionSync

Handles node position persistence.

```typescript
const { saveNodePosition } = useNodePositionSync();
// Called on onNodeDragStop
```

### useConnectionsAsEdges

Converts store connections to React Flow edge format.

```typescript
const edges = useConnectionsAsEdges();
// Returns: Edge[] with source, target, data, type
```

### useConnectionHandlers

Provides handlers for connection creation/deletion.

```typescript
const { onConnect, onEdgeDelete } = useConnectionHandlers();
```

### useSelectedConnection

Manages edge selection state.

```typescript
const { selectedConnection, selectConnection, clearSelection } = useSelectedConnection();
```

### useSuggestedEdges (WP 3.5)

Converts suggestions from store to React Flow edges.

```typescript
const { edges } = useSuggestedEdges();
// Returns: Edge<ConnectionEdgeData>[] with green styling

// Used in GraphCanvas to combine with explicit edges
const allEdges = useMemo(() => {
  return [...storeEdges, ...suggestedEdges];
}, [storeEdges, suggestedEdges]);
```

---

## Styling Constants

From `@/shared/theme`:

```typescript
// Canvas background
ATHENA_COLORS.surface.canvas     // '#1a1a1a'

// Node colors
ATHENA_COLORS.node.note         // '#3b82f6' - Blue
ATHENA_COLORS.node.plan         // '#f59e0b' - Amber
ATHENA_COLORS.node.document     // '#8b5cf6' - Purple

// Node surfaces
ATHENA_COLORS.surface.node       // '#252525'
ATHENA_COLORS.surface.nodeBorder // '#3a3a3a'

// Connection colors
ATHENA_COLORS.connection.explicit  // '#3b82f6' - Blue
ATHENA_COLORS.connection.semantic  // '#22c55e' - Green
```

---

## Related Patterns

- **React Flow Integration** - Custom node/edge types
- **Position Sync** - Bidirectional sync with store/SQLite
- **Selection Sync** - Unified selection across canvas and list

---

## Related Documentation

- [Sophia Module](SOPHIA.md) - Side-by-side entity detail view
- [Store Module](STORE.md) - Entity and connection state
- [Theme Constants](APP.md#theme) - Color definitions
