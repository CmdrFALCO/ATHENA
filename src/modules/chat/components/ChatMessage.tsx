/**
 * ChatMessage - Single message display (user/assistant/system)
 * WP 7.1 - Chat UI & State
 * WP 7.4 - Proposal indicator display
 *
 * Renders a single message with appropriate styling based on role.
 * Shows proposal counts when AI suggests knowledge additions.
 * Full proposal cards UI will be added in WP 7.5.
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

          {/* Proposal indicator (WP 7.4) - Full cards UI in WP 7.5 */}
          {message.proposals &&
            (message.proposals.nodes.length > 0 ||
              message.proposals.edges.length > 0) && (
              <div className="mt-3 pt-3 border-t border-athena-border">
                <div className="text-xs text-athena-muted flex items-center gap-2">
                  <span className="text-amber-500">💡</span>
                  <span>
                    {message.proposals.nodes.length} node
                    {message.proposals.nodes.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-athena-border">•</span>
                  <span>
                    {message.proposals.edges.length} edge
                    {message.proposals.edges.length !== 1 ? 's' : ''} proposed
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
