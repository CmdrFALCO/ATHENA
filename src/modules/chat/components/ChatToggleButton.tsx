/**
 * ChatToggleButton - Persistent floating button to toggle chat panel
 * WP 7.1 - Chat UI & State
 *
 * Fixed position button in bottom-right corner.
 * Keyboard shortcut: Ctrl+Shift+C
 */

import { useSelector } from '@legendapp/state/react';
import { useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import { devSettings$ } from '@/config/devSettings';

export function ChatToggleButton() {
  const isOpen = useSelector(() => chatState$.isOpen.get());
  const isEnabled = useSelector(() => devSettings$.chat.enabled.get());
  const showToggleButton = useSelector(() => devSettings$.chat.showToggleButton.get());

  // Keyboard shortcut: Ctrl+Shift+C
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        chatActions.toggle();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEnabled]);

  if (!isEnabled || !showToggleButton) return null;

  return (
    <button
      onClick={chatActions.toggle}
      className={`fixed bottom-6 right-6 p-4 rounded-full shadow-lg transition-all z-40
                  ${
                    isOpen
                      ? 'bg-athena-surface border border-athena-border hover:bg-athena-border'
                      : 'bg-athena-accent hover:bg-athena-accent/90 hover:scale-105'
                  }
                  ${isOpen ? 'text-athena-muted' : 'text-white'}`}
      aria-label="Toggle chat"
      title="Chat (Ctrl+Shift+C)"
    >
      <MessageSquare className="w-6 h-6" />
    </button>
  );
}
