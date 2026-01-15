# Sophia Module

**Location:** `src/modules/sophia/`
**Status:** Implemented in WP 1.2-1.5, WP 3.4-3.5

## Purpose

Knowledge workspace module providing note list, detail view, rich text editing, and similar notes discovery.

---

## File Listing

| File | Description |
|------|-------------|
| `index.ts` | Module barrel export |
| `components/index.ts` | Component exports |
| `components/EntityList.tsx` | Note list container with loading/empty states |
| `components/EntityListItem.tsx` | Single note item with title, icon, timestamp |
| `components/EntityDetail.tsx` | Note detail view with similar notes panel (WP 1.3, 3.4) |
| `components/EntityDetailEmpty.tsx` | Empty state when no note selected |
| `components/EntityDetailHeader.tsx` | Header with title/meta/actions (WP 1.5, 3.4) |
| `components/EntityDetailContent.tsx` | Content display (uses EditorContainer) |
| `components/EditorContainer.tsx` | Editor wrapper with auto-save (WP 1.4) |
| `components/NoteEditor.tsx` | Tiptap editor instance (WP 1.4) |
| `components/EditorToolbar.tsx` | Formatting toolbar (WP 1.4) |
| `components/SimilarNotesPanel.tsx` | Similar notes discovery panel (WP 3.4) |
| `components/SimilarNotesButton.tsx` | Toggle button for similar notes (WP 3.4) |

---

## Public API

```typescript
// src/modules/sophia/index.ts
export {
  EntityList,
  EntityListItem,
  EntityDetail,
  EditorContainer,
  NoteEditor,
  EditorToolbar,
  SimilarNotesPanel,
  SimilarNotesButton
} from './components';
```

---

## Usage Examples

### Basic Layout

```typescript
import { EntityList, EntityDetail } from '@/modules/sophia';

// In Sidebar
<EntityList />  // Displays all notes with selection support

// In SophiaPage
<EntityDetail />  // Shows selected note with Tiptap editor
```

### Editor Integration

```typescript
import { EditorContainer, NoteEditor, EditorToolbar } from '@/modules/sophia';

function NoteEditorView({ noteId, content }) {
  return (
    <EditorContainer noteId={noteId} initialContent={content}>
      <EditorToolbar />
      <NoteEditor />
    </EditorContainer>
  );
}
```

### Similar Notes

```typescript
import { SimilarNotesPanel, SimilarNotesButton } from '@/modules/sophia';

function DetailWithSimilar({ noteId }) {
  const [showSimilar, setShowSimilar] = useState(false);

  return (
    <div className="flex">
      <div className="flex-1">
        <EntityDetail />
        <SimilarNotesButton onClick={() => setShowSimilar(!showSimilar)} />
      </div>
      {showSimilar && <SimilarNotesPanel noteId={noteId} />}
    </div>
  );
}
```

---

## Features

### Entity List
- Displays notes sorted by `updated_at` descending
- Loading state while store initializes
- Empty state when no notes exist
- Single selection with visual highlight
- Relative time display (e.g., "5 minutes ago")

### Entity Detail
- Note detail view with title, type badge, timestamps
- Integration with EditorContainer for rich text editing
- Collapsible similar notes sidebar (WP 3.4)
- Actions slot in header for extensibility

### Editor (WP 1.4)
- Rich text editing with Tiptap
- Auto-save with 500ms debounce
- Formatting toolbar (bold, italic, headings, lists, code, undo/redo)

### CRUD Operations (WP 1.5)
| Operation | UI Element | Description |
|-----------|------------|-------------|
| Create | Plus button in sidebar header | Creates new note |
| Rename | Editable title in header | Saves on blur/Enter |
| Delete | Trash button | With confirmation dialog |

### Similar Notes (WP 3.4)
- Sidebar panel showing semantically similar notes
- Similarity scores with color-coded percentages
  - 90%+ = Green
  - 70-89% = Yellow
  - Below 70% = Default
- Configurable threshold and max results from aiSettings

---

## Component Details

### EntityDetail

Main container that orchestrates:
- Header with title editing and actions
- Content area with Tiptap editor
- Optional similar notes sidebar

```typescript
interface EntityDetailProps {
  // Uses selected entity from store
}
```

### EntityDetailHeader (WP 3.4, 3.5)

Header component with:
- Editable title (inline editing)
- Entity type badge
- Timestamp display
- Actions slot for extensibility
- Delete button with confirmation
- **Triggers re-indexing on title change (WP 3.5)**

```typescript
interface EntityDetailHeaderProps {
  entity: Note;
  actions?: ReactNode;  // Slot for additional buttons
}

// On title save, triggers indexer to update embedding
const handleTitleSave = async () => {
  // ... save to DB and store
  if (indexer) {
    const textContent = extractTextFromBlocks(note.content || [], trimmedTitle);
    indexer.onNoteSaved(note.id, textContent);
  }
};
```

### SimilarNotesPanel (WP 3.4)

Displays semantically similar notes using AI embeddings.

```typescript
interface SimilarNotesPanelProps {
  noteId: string;
  limit?: number;      // Default: from aiSettings
  threshold?: number;  // Default: from aiSettings
}
```

### EditorContainer

Manages editor state and auto-save logic.

```typescript
interface EditorContainerProps {
  noteId: string;
  initialContent: Block[];
  children: ReactNode;
}
```

---

## Data Flow

```
Store (notes) → EntityList → EntityListItem
     ↑                            ↓
uiActions.selectEntity() ←── onClick

Store (selectedEntity) → EntityDetail → EntityDetailHeader
                                      → EditorContainer → NoteEditor
                                      → SimilarNotesPanel (optional)

Editor changes → debounce(500ms) → noteAdapter.update() → entityActions.updateNote()
    → indexer.onNoteSaved() → debounce(2000ms) → embedNote() → indexerActions.noteIndexed()

Title changes → noteAdapter.update() → entityActions.updateNote()
    → indexer.onNoteSaved() → triggers re-indexing for suggestion updates (WP 3.5)
```

---

## Related Patterns

- **Auto-save** - Debounced save on content change
- **Selection Sync** - Store-driven entity selection
- **Actions Slot** - Extensible header with actions prop

---

## Related Documentation

- [Canvas Module](CANVAS.md) - Side-by-side graph view
- [AI Module](AI.md) - Powers similar notes feature
- [Store Module](STORE.md) - Entity state management
