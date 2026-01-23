/**
 * ChatMessages - Scrollable message list with auto-scroll
 * WP 7.1 - Chat UI & State
 *
 * Displays messages for the active thread.
 * Auto-scrolls to bottom when new messages arrive.
 */

import { useSelector } from '@legendapp/state/react';
import { useEffect, useRef } from 'react';
import { chatState$ } from '../store/chatState';
import { ChatMessage } from './ChatMessage';

export function ChatMessages() {
  const activeThreadId = useSelector(() => chatState$.activeThreadId.get());
  const allMessages = useSelector(() => chatState$.messages.get());
  const isLoading = useSelector(() => chatState$.isLoading.get());
  const streamingContent = useSelector(() => chatState$.streamingContent.get());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeThreadId ? allMessages[activeThreadId] || [] : [];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-4">
      {messages.length === 0 && !isLoading && (
        <div className="text-center text-athena-muted mt-8">
          <p className="text-sm">Start a conversation</p>
          <p className="text-xs mt-1">
            Ask questions about your knowledge graph
          </p>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* Streaming message (WP 7.3) */}
      {streamingContent && (
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full bg-athena-accent/20 flex items-center
                       justify-center flex-shrink-0"
          >
            <span className="text-xs font-medium text-athena-accent">AI</span>
          </div>
          <div className="flex-1 bg-athena-surface rounded-lg p-3">
            <p className="text-sm whitespace-pre-wrap text-athena-text">
              {streamingContent}
            </p>
          </div>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && !streamingContent && (
        <div className="flex gap-3">
          <div
            className="w-8 h-8 rounded-full bg-athena-accent/20 flex items-center
                       justify-center flex-shrink-0"
          >
            <span className="text-xs font-medium text-athena-accent">AI</span>
          </div>
          <div className="flex-1 bg-athena-surface rounded-lg p-3">
            <div className="flex gap-1">
              <div
                className="w-2 h-2 rounded-full bg-athena-muted animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-athena-muted animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <div
                className="w-2 h-2 rounded-full bg-athena-muted animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
