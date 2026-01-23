/**
 * ChatHeader - Thread title and controls
 * WP 7.1 - Chat UI & State
 *
 * Displays current thread title with dropdown for thread switching.
 * Includes "New Chat" button for creating new threads.
 */

import { useSelector } from '@legendapp/state/react';
import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronDown, Trash2 } from 'lucide-react';
import { chatState$ } from '../store/chatState';
import { chatActions } from '../store/chatActions';
import type { ChatThread } from '../types';

export function ChatHeader() {
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const threads = useSelector(() => chatState$.threads.get());
  const [showThreadList, setShowThreadList] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThread = activeThreadId ? threads[activeThreadId] : null;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showThreadList) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowThreadList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThreadList]);

  const handleNewThread = async () => {
    await chatActions.createThread();
    setShowThreadList(false);
  };

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    await chatActions.deleteThread(threadId);
  };

  const threadArray: ChatThread[] = Object.values(threads).sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return (
    <div className="p-3 pr-10 border-b border-athena-border flex-shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex-1 relative" ref={dropdownRef}>
          <button
            onClick={() => setShowThreadList(!showThreadList)}
            className="flex items-center gap-2 text-sm font-medium text-athena-text
                       hover:text-athena-accent transition-colors max-w-[calc(100%-40px)]"
          >
            <span className="truncate">
              {activeThread?.title || 'No thread'}
            </span>
            <ChevronDown
              className={`w-4 h-4 flex-shrink-0 transition-transform ${
                showThreadList ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Thread dropdown */}
          {showThreadList && (
            <div
              className="absolute top-full left-0 mt-1 w-64 bg-athena-bg border border-athena-border
                         rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto"
            >
              <div className="p-2 border-b border-athena-border">
                <button
                  onClick={handleNewThread}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded
                             hover:bg-athena-surface text-left text-athena-text transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </button>
              </div>
              <div className="py-1">
                {threadArray.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-athena-muted">
                    No chat history
                  </div>
                ) : (
                  threadArray.map((thread) => (
                    <button
                      key={thread.id}
                      onClick={() => {
                        chatActions.switchThread(thread.id);
                        setShowThreadList(false);
                      }}
                      className={`w-full px-3 py-2 text-sm text-left hover:bg-athena-surface
                                  flex items-center justify-between group transition-colors ${
                                    thread.id === activeThreadId
                                      ? 'bg-athena-accent/10 text-athena-accent'
                                      : 'text-athena-text'
                                  }`}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="truncate font-medium">
                          {thread.title}
                        </div>
                        <div className="text-xs text-athena-muted">
                          {new Date(thread.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteThread(e, thread.id)}
                        className="p-1 text-athena-muted hover:text-red-500
                                   opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleNewThread}
          className="p-1.5 rounded hover:bg-athena-surface text-athena-muted
                     hover:text-athena-text transition-colors"
          aria-label="New thread"
          title="New thread"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
