/**
 * ChatMessage - Single message display (user/assistant/system)
 * WP 7.1 - Chat UI & State
 *
 * Renders a single message with appropriate styling based on role.
 * Placeholder for proposal cards (WP 7.5).
 */

import { User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="px-3 py-1.5 bg-athena-surface rounded-full text-xs text-athena-muted">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser
            ? 'bg-athena-surface border border-athena-border'
            : 'bg-athena-accent/20'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-athena-muted" />
        ) : (
          <span className="text-xs font-medium text-athena-accent">AI</span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-athena-surface'
              : 'bg-athena-accent/10 border border-athena-accent/20'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap text-athena-text break-words">
            {message.content}
          </p>

          {/* TODO WP 7.5: Render proposal cards here */}
          {message.proposals && (
            <div className="mt-3 pt-3 border-t border-athena-border">
              <div className="text-xs text-athena-muted flex items-center gap-2">
                <span className="px-2 py-0.5 bg-athena-surface rounded">
                  {message.proposals.nodes.length} node
                  {message.proposals.nodes.length !== 1 ? 's' : ''}
                </span>
                <span className="px-2 py-0.5 bg-athena-surface rounded">
                  {message.proposals.edges.length} edge
                  {message.proposals.edges.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="mt-1 text-xs text-athena-muted">
          {new Date(message.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
    </div>
  );
}
