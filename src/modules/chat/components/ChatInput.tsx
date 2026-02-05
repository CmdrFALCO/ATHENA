/**
 * ChatInput - Text input with send button
 * WP 7.1 - Chat UI & State
 * WP 7.3 - Integrated with ChatService for AI streaming
 * WP 9B.8 - Council button + suggestion banner
 *
 * Handles message input with Enter to send, Shift+Enter for new line.
 * Creates thread automatically if none exists.
 */

import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react';
import { useSelector } from '@legendapp/state/react';
import { Send, Users, X } from 'lucide-react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import { getChatService, isChatServiceReady } from '../services/ChatService';
import { devSettings$ } from '@/config/devSettings';
import { councilState$ } from '@/modules/axiom/council/councilState';
import { shouldSuggestCouncil } from '@/modules/axiom/council/CouncilSuggestion';
import { appState$ } from '@/store/state';
import { communityState$ } from '@/modules/community/hooks/useCommunities';

export function ChatInput() {
  const [input, setInput] = useState('');
  const [suggestionDismissed, setSuggestionDismissed] = useState(false);
  const isLoading = useSelector(() => chatState$.isLoading.get());
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // WP 9B.8: Council state
  const councilEnabled = useSelector(() => devSettings$.axiom.council?.enabled?.get() ?? false);
  const councilRunning = useSelector(() => councilState$.activeSession.running.get());

  // Context for suggestion heuristic
  const contextNodeIds = useSelector(() => {
    const tid = chatState$.activeThreadId.get();
    if (!tid) return [];
    return chatState$.threads[tid]?.contextNodeIds?.get() ?? [];
  });
  const selectedResourceIds = useSelector(() => appState$.ui.selectedResourceIds.get());

  // Community IDs for context nodes (for cross-community detection)
  const communityIds = useMemo(() => {
    const hierarchy = communityState$.hierarchy.peek();
    if (!hierarchy?.entityToCommunities) return undefined;
    const ids: string[] = [];
    for (const nodeId of contextNodeIds) {
      const comms = hierarchy.entityToCommunities.get(nodeId);
      if (comms) ids.push(...comms);
    }
    return ids.length > 0 ? ids : undefined;
  }, [contextNodeIds]);

  // Reset dismiss when context changes
  const contextKey = contextNodeIds.join(',') + '|' + selectedResourceIds.join(',');
  useEffect(() => {
    setSuggestionDismissed(false);
  }, [contextKey]);

  // Debounced suggestion check (keyword detection on input)
  const [debouncedInput, setDebouncedInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedInput(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const showSuggestion =
    councilEnabled &&
    !councilRunning &&
    !isLoading &&
    !suggestionDismissed &&
    shouldSuggestCouncil(debouncedInput, contextNodeIds, communityIds);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  // Focus input when panel opens
  useEffect(() => {
    if (activeThreadId !== null) {
      textareaRef.current?.focus();
    }
  }, [activeThreadId]);

  const handleSend = async (useCouncil = false) => {
    if (!input.trim() || isLoading) return;

    const content = input;
    setInput('');
    setSuggestionDismissed(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create thread if none exists
    if (!activeThreadId) {
      await chatActions.createThread();
    }

    // Use ChatService if initialized (WP 7.3), otherwise fallback to placeholder
    if (isChatServiceReady()) {
      try {
        const chatService = getChatService();
        if (useCouncil) {
          await chatService.sendMessageWithCouncil(content);
        } else {
          await chatService.sendMessage(content);
        }
      } catch (error) {
        console.error('[ChatInput] Failed to send message:', error);
      }
    } else {
      // Fallback to placeholder response (pre-WP 7.3 behavior)
      await chatActions.sendMessage(content);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-athena-border flex-shrink-0">
      {/* WP 9B.8: Council suggestion banner */}
      {showSuggestion && (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-purple-500/30
                        bg-purple-500/10 px-3 py-1.5 text-xs text-purple-300">
          <Users className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1">
            This query may benefit from multi-agent council deliberation.
          </span>
          <button
            onClick={() => handleSend(true)}
            disabled={!input.trim()}
            className="px-2 py-0.5 rounded bg-purple-600 text-white text-[10px] font-medium
                       hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Use Council
          </button>
          <button
            onClick={() => setSuggestionDismissed(true)}
            className="text-purple-400 hover:text-purple-200"
            aria-label="Dismiss suggestion"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your knowledge graph..."
          className="flex-1 resize-none rounded-lg border border-athena-border bg-athena-surface
                     px-3 py-2 text-sm text-athena-text placeholder:text-athena-muted
                     focus:outline-none focus:ring-2 focus:ring-athena-accent/50 focus:border-athena-accent
                     min-h-[40px] max-h-[150px]"
          rows={1}
          disabled={isLoading}
        />
        {/* WP 9B.8: Council button */}
        {councilEnabled && (
          <button
            onClick={() => handleSend(true)}
            disabled={!input.trim() || isLoading || councilRunning}
            className="self-end px-3 py-2 bg-purple-600 text-white rounded-lg
                       hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed
                       flex items-center gap-1.5 transition-colors h-10"
            aria-label="Consult Council"
            title="Consult Council"
          >
            <Users className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="self-end px-4 py-2 bg-athena-accent text-white rounded-lg
                     hover:bg-athena-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 transition-colors h-10"
          aria-label="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-1.5 text-xs text-athena-muted">
        Press{' '}
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded text-[10px]">
          Enter
        </kbd>{' '}
        to send,{' '}
        <kbd className="px-1 py-0.5 bg-athena-surface border border-athena-border rounded text-[10px]">
          Shift+Enter
        </kbd>{' '}
        for new line
      </div>
    </div>
  );
}
