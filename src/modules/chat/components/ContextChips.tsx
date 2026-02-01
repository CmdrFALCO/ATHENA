/**
 * ContextChips - Shows notes and resources in current thread's context
 * WP 7.6 - Spatial Awareness
 * WP 8.7.2 - Resource context chips
 *
 * Displays chips for each note in the thread's context and each
 * selected resource on the canvas, with options to remove them
 * or add the currently selected canvas node.
 */

import { X, Plus, FileText, File } from 'lucide-react';
import { useSelector } from '@legendapp/state/react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import { useNotes, useSelectedResourceIds, useResources, useSelectedResourceId, uiActions } from '@/store/hooks';
import { selectResource } from '@/store/resourceActions';
import { useCanvasSelection } from '../hooks/useCanvasSelection';

export function ContextChips() {
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const threads = useSelector(() => chatState$.threads.get());
  const notes = useNotes();
  const { selectedEntityId, selectedEntityTitle } = useCanvasSelection();

  // WP 8.7.2: Resource context — merge multi-selection + single-selection
  const multiSelectedResourceIds = useSelectedResourceIds();
  const singleSelectedResourceId = useSelectedResourceId();
  const allResources = useResources();

  // Combine both selection types, deduplicating
  const selectedResourceIds = singleSelectedResourceId && !multiSelectedResourceIds.includes(singleSelectedResourceId)
    ? [...multiSelectedResourceIds, singleSelectedResourceId]
    : multiSelectedResourceIds;

  // Get current thread's context
  const thread = activeThreadId ? threads[activeThreadId] : null;
  const contextNodeIds = thread?.contextNodeIds || [];

  // Map context IDs to note objects (filter out any that no longer exist)
  const contextNotes = contextNodeIds
    .map((id) => notes.find((n) => n.id === id))
    .filter((n): n is NonNullable<typeof n> => n !== undefined);

  // Map resource IDs to resource objects
  const contextResources = selectedResourceIds
    .map((id) => allResources.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r !== undefined);

  // Check if selected entity can be added (not already in context)
  const canAddSelected =
    selectedEntityId !== null && !contextNodeIds.includes(selectedEntityId);

  const handleRemove = (nodeId: string) => {
    chatActions.removeFromContext(nodeId);
  };

  const handleRemoveResource = (resourceId: string) => {
    // Clear from multi-selection if present
    if (multiSelectedResourceIds.includes(resourceId)) {
      uiActions.toggleResourceSelection(resourceId);
    }
    // Clear single-selection if it matches
    if (singleSelectedResourceId === resourceId) {
      selectResource(null);
    }
  };

  const handleAddSelected = () => {
    if (selectedEntityId) {
      chatActions.addToContext(selectedEntityId);
    }
  };

  // Don't render if no context and nothing to add
  if (contextNotes.length === 0 && contextResources.length === 0 && !canAddSelected) {
    return (
      <div className="px-3 py-2 border-b border-athena-border">
        <div className="flex items-center gap-1 text-xs text-athena-muted">
          <span>Context:</span>
          <span className="italic">No notes or resources selected. Use @ or select on canvas.</span>
        </div>
      </div>
    );
  }

  const totalCount = contextNotes.length + contextResources.length;

  return (
    <div className="px-3 py-2 border-b border-athena-border">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-athena-muted mr-1">Context:</span>

        {/* Note chips (blue) */}
        {contextNotes.map((note) => (
          <span
            key={note.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full
                       bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200
                       text-xs group"
            title={note.title}
          >
            <FileText className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{note.title}</span>
            <button
              onClick={() => handleRemove(note.id)}
              className="p-0.5 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800
                         transition-colors"
              title="Remove from context"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Resource chips (purple) — WP 8.7.2 */}
        {contextResources.map((resource) => (
          <span
            key={resource.id}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-full
                       bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200
                       text-xs group"
            title={resource.name}
          >
            <File className="w-3 h-3 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{resource.name}</span>
            <button
              onClick={() => handleRemoveResource(resource.id)}
              className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800
                         transition-colors"
              title="Remove from context"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add selected button */}
        {canAddSelected && (
          <button
            onClick={handleAddSelected}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                       border border-dashed border-athena-border
                       text-athena-muted text-xs
                       hover:border-athena-accent hover:text-athena-accent
                       transition-colors"
            title={`Add "${selectedEntityTitle}" to context`}
          >
            <Plus className="w-3 h-3" />
            <span className="truncate max-w-[100px]">
              {selectedEntityTitle || 'Add selected'}
            </span>
          </button>
        )}

        {/* Context count indicator */}
        {totalCount > 0 && (
          <span className="text-xs text-athena-muted ml-auto">
            {contextNotes.length > 0 &&
              `${contextNotes.length} note${contextNotes.length !== 1 ? 's' : ''}`}
            {contextNotes.length > 0 && contextResources.length > 0 && ', '}
            {contextResources.length > 0 &&
              `${contextResources.length} resource${contextResources.length !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </div>
  );
}
