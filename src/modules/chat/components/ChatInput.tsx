/**
 * ChatInput - Text input with send button
 * WP 7.1 - Chat UI & State
 *
 * Handles message input with Enter to send, Shift+Enter for new line.
 * Creates thread automatically if none exists.
 */

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { useSelector } from '@legendapp/state/react';
import { Send } from 'lucide-react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';

export function ChatInput() {
  const [input, setInput] = useState('');
  const isLoading = useSelector(() => chatState$.isLoading.get());
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const content = input;
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    // Create thread if none exists
    if (!activeThreadId) {
      await chatActions.createThread();
    }

    await chatActions.sendMessage(content);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-3 border-t border-athena-border flex-shrink-0">
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
          Shift+Enter
        </kbd>{' '}
        for new line
      </div>
    </div>
  );
}
