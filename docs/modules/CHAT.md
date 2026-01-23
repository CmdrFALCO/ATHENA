# Chat Module

**Phase:** 7 (AI Chat - Knowledge Capture Interface)
**WP:** 7.1 - Chat UI & State
**Location:** `src/modules/chat/`

## Purpose

The chat module provides a conversational interface for knowledge capture. Users interact with an AI assistant that can:
- Answer questions about their knowledge graph
- Identify concepts and relationships in conversation
- Suggest additions to the graph (propose-validate architecture)

## Architecture

```
src/modules/chat/
├── index.ts                    # Module barrel export
├── types/
│   └── index.ts               # ChatMessage, ChatThread, ChatState types
├── store/
│   ├── chatState.ts           # Legend-State observable
│   └── chatActions.ts         # Actions for threads/messages
├── services/
│   └── ChatPersistence.ts     # IndexedDB persistence
└── components/
    ├── ChatPanel.tsx          # Main slide-over container
    ├── ChatHeader.tsx         # Thread title and controls
    ├── ChatMessages.tsx       # Message list with auto-scroll
    ├── ChatMessage.tsx        # Single message display
    ├── ChatInput.tsx          # Text input with send button
    └── ChatToggleButton.tsx   # Floating toggle button
```

## Data Model

### ChatThread

Represents a conversation thread.

```typescript
interface ChatThread {
  id: string;                   // UUID
  title: string;                // Thread title (auto-generated or user-set)
  contextNodeIds: string[];     // Entity IDs included in context (WP 7.6)
  createdAt: string;            // ISO timestamp
  updatedAt: string;            // ISO timestamp
}
```

### ChatMessage

A single message in a thread.

```typescript
interface ChatMessage {
  id: string;                   // UUID
  threadId: string;             // Parent thread
  role: 'user' | 'assistant' | 'system';
  content: string;              // Message text
  proposals?: KnowledgeProposals;  // AI suggestions (WP 7.4)
  createdAt: string;            // ISO timestamp
}
```

### ChatState

Legend-State observable structure.

```typescript
interface ChatState {
  threads: Record<string, ChatThread>;
  messages: Record<string, ChatMessage[]>;  // threadId → messages
  activeThreadId: string | null;
  isOpen: boolean;
  isLoading: boolean;
  streamingContent: string | null;  // For streaming display (WP 7.3)
}
```

## State Management

### Store

```typescript
import { chatState$ } from '@/modules/chat';

// Read state
const threads = chatState$.threads.get();
const isOpen = chatState$.isOpen.get();

// React hooks
const isOpen = useSelector(() => chatState$.isOpen.get());
```

### Actions

```typescript
import { chatActions } from '@/modules/chat';

// Panel visibility
chatActions.open();
chatActions.close();
chatActions.toggle();

// Thread management
const threadId = await chatActions.createThread('Optional Title');
chatActions.switchThread(threadId);
await chatActions.deleteThread(threadId);

// Messages
await chatActions.sendMessage('Hello!');
await chatActions.addMessage({
  threadId,
  role: 'assistant',
  content: 'Response text',
});

// Initialization
await chatActions.loadThreads();  // Called on app start
```

## Persistence

### IndexedDB Schema

Database: `athena-chat` (version 1)

**threads** store:
- keyPath: `id`
- index: `updatedAt`

**messages** store:
- keyPath: `id`
- index: `threadId`
- index: `createdAt`

### Service API

```typescript
import { chatPersistence } from '@/modules/chat';

await chatPersistence.saveThread(thread);
await chatPersistence.saveMessage(message);
await chatPersistence.loadAllThreads();
await chatPersistence.loadAllMessages();
await chatPersistence.loadMessagesForThread(threadId);
await chatPersistence.deleteThread(threadId);  // Deletes messages too
```

## UI Components

### ChatPanel

Main slide-over container. Fixed position, 384px wide, slides from right.

Props: None (uses store directly)

### ChatHeader

Thread selector dropdown with:
- Current thread title
- "New Chat" button
- Thread list with delete buttons
- Sorted by `updatedAt` (most recent first)

### ChatMessages

Scrollable message list with:
- Auto-scroll to bottom on new messages
- Loading indicator (bouncing dots)
- Streaming content display (WP 7.3)
- Empty state prompt

### ChatMessage

Single message with role-based styling:
- User: Gray background, user icon
- Assistant: Blue tinted background, "AI" badge
- System: Centered pill-style

### ChatInput

Text input with:
- Auto-resize textarea (up to 150px)
- Enter to send, Shift+Enter for new line
- Send button with disabled state
- Loading state disables input

### ChatToggleButton

Floating action button:
- Fixed position (bottom-right)
- Registers Ctrl+Shift+C shortcut
- Color changes when panel is open
- Respects `devSettings.chat.showToggleButton`

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+C | Toggle chat panel |
| Escape | Close chat panel (when open) |
| Enter | Send message |
| Shift+Enter | New line in message |

## DevSettings

```typescript
interface ChatConfig {
  enabled: boolean;           // Master toggle
  position: 'right' | 'left'; // Panel position
  defaultWidth: number;       // Panel width (px)
  persistHistory: boolean;    // Save to IndexedDB
  maxHistoryDays: number;     // Auto-cleanup (0 = unlimited)
  showToggleButton: boolean;  // Show floating button
}

// Access
devSettings$.chat.enabled.get()

// Modify
devSettingsActions.setChatEnabled(true);
devSettingsActions.setChatShowToggleButton(false);
```

## Console Debugging

```javascript
// View state
window.__ATHENA_CHAT_STATE__

// Get threads
__ATHENA_CHAT_STATE__.threads.get()

// Get messages for active thread
const threadId = __ATHENA_CHAT_STATE__.activeThreadId.get()
__ATHENA_CHAT_STATE__.messages[threadId].get()

// Test actions
window.__ATHENA_CHAT__.toggle()
window.__ATHENA_CHAT__.createThread('Test Thread')
window.__ATHENA_CHAT__.sendMessage('Test message')
```

## Integration Points

### AppLayout

```typescript
import { ChatPanel, ChatToggleButton } from '@/modules/chat';

// In AppLayout return:
<>
  {/* existing content */}
  <ChatPanel />
  <ChatToggleButton />
</>
```

### App Initialization

```typescript
import { chatActions } from '@/modules/chat';

// In App.tsx useEffect:
chatActions.loadThreads().catch(console.error);
```

## Future Work

| WP | Feature | Integration Point |
|----|---------|-------------------|
| 7.2 | Context Builder | Uses `contextNodeIds` |
| 7.3 | AI Generation | Replaces `sendMessage` placeholder |
| 7.4 | Extraction Parser | Populates `proposals` field |
| 7.5 | Proposal Cards | Renders in `ChatMessage` |
| 7.6 | Spatial Awareness | @mention autocomplete in `ChatInput` |

## Testing

### Manual Test Checklist

- [ ] Panel toggles with button click
- [ ] Panel toggles with Ctrl+Shift+C
- [ ] Panel closes with Escape
- [ ] Panel closes with X button
- [ ] New thread creates and activates
- [ ] Thread list shows all threads
- [ ] Can switch between threads
- [ ] Can delete threads
- [ ] Messages appear after sending
- [ ] Auto-scroll works on new messages
- [ ] Enter sends message
- [ ] Shift+Enter creates new line
- [ ] Threads persist after reload
- [ ] Messages persist after reload
- [ ] Most recent thread opens on reload
