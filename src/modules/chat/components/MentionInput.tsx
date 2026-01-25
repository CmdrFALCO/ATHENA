/**
 * MentionInput - Enhanced chat input with @mention autocomplete
 * WP 7.6 - Spatial Awareness
 *
 * Replaces ChatInput with @mention support. When the user types @,
 * shows an autocomplete dropdown of matching notes. Selecting a note
 * adds it to the thread context.
 */

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from 'react';
import { useSelector } from '@legendapp/state/react';
import { Send } from 'lucide-react';
import { MentionSuggestions } from './MentionSuggestions';
import { useMentions, type MentionSuggestion } from '../hooks/useMentions';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import { getChatService, isChatServiceReady } from '../services/ChatService';

export function MentionInput() {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const isLoading = useSelector(() => chatState$.isLoading.get());
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { suggestions, addToContext } = useMentions(mentionQuery);

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

  // Detect @mention trigger
  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInput(newValue);

    const cursorPos = e.target.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursorPos);

    // Match @ followed by word characters (or empty for just @)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
      setShowSuggestions(true);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
    }
  }, []);

  // Handle mention selection
  const handleSelectMention = useCallback(
    (suggestion: MentionSuggestion) => {
      const cursorPos = textareaRef.current?.selectionStart ?? input.length;
      const textBeforeCursor = input.slice(0, cursorPos);
      const textAfterCursor = input.slice(cursorPos);

      // Replace @query with @[title]
      const newTextBefore = textBeforeCursor.replace(/@\w*$/, `@[${suggestion.title}] `);
      const newValue = newTextBefore + textAfterCursor;

      setInput(newValue);
      setShowSuggestions(false);
      setMentionQuery('');

      // Add to thread context
      addToContext(suggestion.id);

      // Restore focus and cursor position
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = newTextBefore.length;
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      });
    },
    [input, addToContext]
  );

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const content = input;
    setInput('');
    setShowSuggestions(false);

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
        await chatService.sendMessage(content);
      } catch (error) {
        console.error('[MentionInput] Failed to send message:', error);
      }
    } else {
      // Fallback to placeholder response (pre-WP 7.3 behavior)
      await chatActions.sendMessage(content);
    }
  }, [input, isLoading, activeThreadId]);

  // Keyboard navigation for suggestions
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle suggestion navigation when dropdown is open
      if (showSuggestions && suggestions.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % suggestions.length);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          handleSelectMention(suggestions[selectedIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowSuggestions(false);
          return;
        }
      }

      // Normal input handling
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [showSuggestions, suggestions, selectedIndex, handleSelectMention, handleSend]
  );

  return (
    <div className="p-3 border-t border-athena-border flex-shrink-0 relative">
      {/* Suggestion dropdown - positioned above input */}
      {showSuggestions && (
        <MentionSuggestions
          suggestions={suggestions}
          selectedIndex={selectedIndex}
          onSelect={handleSelectMention}
          onClose={() => setShowSuggestions(false)}
        />
      )}

      <div className="flex gap-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask about your knowledge... (@ to mention notes)"
          className="flex-1 resize-none rounded-lg border border-athena-border bg-athena-surface
                     px-3 py-2 text-sm text-athena-text placeholder:text-athena-muted
                     focus:outline-none focus:ring-2 focus:ring-athena-accent/50 focus:border-athena-accent
                     min-h-[40px] max-h-[150px]"
          rows={1}
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
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
          @
        </kbd>{' '}
        to mention notes
      </div>
    </div>
  );
}
