/**
 * ChatPanel - Main slide-over container for the chat interface
 * WP 7.1 - Chat UI & State
 * WP 7.6 - Spatial Awareness (ContextChips, MentionInput)
 *
 * Slides in from the right side, adjacent to the graph canvas.
 * Composes ChatHeader, ContextChips, ChatMessages, and MentionInput.
 */

import { useSelector } from '@legendapp/state/react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import { ChatHeader } from './ChatHeader';
import { ChatMessages } from './ChatMessages';
import { ContextChips } from './ContextChips';
import { MentionInput } from './MentionInput';
import { devSettings$ } from '@/config/devSettings';

export function ChatPanel() {
  const isOpen = useSelector(() => chatState$.isOpen.get());
  const isEnabled = useSelector(() => devSettings$.chat.enabled.get());

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        chatActions.close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isEnabled || !isOpen) return null;

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 bg-athena-bg border-l border-athena-border
                 shadow-2xl flex flex-col z-50 transition-transform duration-200"
      role="dialog"
      aria-label="Chat panel"
    >
      {/* Close button */}
      <button
        onClick={chatActions.close}
        className="absolute top-3 right-3 p-1.5 text-athena-muted hover:text-athena-text
                   hover:bg-athena-surface rounded transition-colors z-10"
        aria-label="Close chat"
      >
        <X className="w-4 h-4" />
      </button>

      <ChatHeader />
      <ContextChips />
      <ChatMessages />
      <MentionInput />
    </div>
  );
}
