/**
 * TokenInspector — Raw token data display (Principle 1: Minimal Abstraction)
 * WP 9A.3: AXIOM Visualization
 *
 * Displays raw _meta data for selected tokens.
 * No hiding, no simplification — users see exactly what the engine sees.
 */

import { useState, useMemo, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import type { AetherToken } from '../types/token';
import type { AXIOMEvent, TransitionFiredEventData } from '../events/types';
import { FeedbackDisplay } from './FeedbackDisplay';

/** Truncate a UUID for display */
function truncateId(id: string, len = 8): string {
  return id.length > len ? id.slice(0, len) + '...' : id;
}

/** Token color → badge styles */
function colorBadgeClass(color: string): string {
  const map: Record<string, string> = {
    proposal: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    validating: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    deciding: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    verified: 'bg-green-500/20 text-green-400 border-green-500/30',
    feedback: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    committed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
  };
  return map[color] ?? 'bg-athena-surface text-athena-muted border-athena-border';
}

/** Collapsible JSON tree */
function JsonTree({ data, label }: { data: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);
  const json = JSON.stringify(data, null, 2);
  const isComplex = typeof data === 'object' && data !== null;

  if (!isComplex) {
    return (
      <div className="text-[11px] font-mono text-athena-text">
        {label && <span className="text-athena-muted">{label}: </span>}
        {String(data)}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-[11px] text-athena-muted hover:text-athena-text transition-colors"
      >
        {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label && <span className="font-medium">{label}</span>}
        <span className="text-athena-muted">
          {Array.isArray(data) ? `[${data.length}]` : `{${Object.keys(data as object).length}}`}
        </span>
      </button>
      {expanded && (
        <pre className="mt-1 ml-4 px-2 py-1.5 rounded bg-athena-bg text-[10px] font-mono text-athena-text overflow-x-auto max-h-48 overflow-y-auto border border-athena-border">
          {json}
        </pre>
      )}
    </div>
  );
}

/** Reconstruct token-like objects from recent events */
function useTokensFromEvents(): AetherToken[] {
  const recentEvents = useSelector(() => axiomState$.recentEvents.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());

  return useMemo(() => {
    // Build a map of token IDs we know about
    const knownTokenIds = new Set<string>();
    for (const ids of Object.values(tokensByPlace)) {
      for (const id of ids) {
        knownTokenIds.add(id);
      }
    }

    // Build minimal token representations from events
    const tokenMap = new Map<string, AetherToken>();
    for (const event of recentEvents) {
      if (event.type === 'token:created') {
        const data = event.data as { tokenId: string; correlationId: string; color: string; placeId: string };
        tokenMap.set(data.tokenId, {
          payload: {},
          color: data.color as AetherToken['color'],
          retryCount: 0,
          maxRetries: 3,
          feedbackHistory: [],
          _meta: {
            id: data.tokenId,
            correlationId: data.correlationId,
            createdAt: event.timestamp,
            currentPlace: data.placeId,
            transitionHistory: [],
            validationTrace: [],
            constraintsChecked: [],
            constraintsPassed: [],
            constraintsFailed: [],
          },
        });
      }
      if (event.type === 'token:moved') {
        const data = event.data as { tokenId: string; toPlace: string; transitionId: string };
        const existing = tokenMap.get(data.tokenId);
        if (existing) {
          existing._meta.currentPlace = data.toPlace;
          existing._meta.transitionHistory.push({
            transitionId: data.transitionId,
            firedAt: event.timestamp,
            fromPlace: existing._meta.previousPlace ?? '',
            toPlace: data.toPlace,
            durationMs: 0,
            guardResults: {},
            reason: '',
          });
        }
      }
      if (event.type === 'transition:fired') {
        const data = event.data as TransitionFiredEventData;
        // Attach reason to tokens that moved
        for (const [, token] of tokenMap) {
          const last = token._meta.transitionHistory[token._meta.transitionHistory.length - 1];
          if (last && last.transitionId === data.transitionId && !last.reason) {
            last.reason = data.reason;
            last.durationMs = data.durationMs;
          }
        }
      }
    }

    return Array.from(tokenMap.values());
  }, [recentEvents, tokensByPlace]);
}

export function TokenInspector() {
  const selectedTokenId = useSelector(() => axiomState$.selectedTokenId.get());
  const selectedPlaceId = useSelector(() => axiomState$.selectedPlaceId.get());
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());
  const tokens = useTokensFromEvents();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filter tokens by selected place if applicable
  const filteredTokens = useMemo(() => {
    if (!selectedPlaceId) return tokens;
    const tokenIdsInPlace = tokensByPlace[selectedPlaceId] ?? [];
    const tokenIdSet = new Set(tokenIdsInPlace);
    return tokens.filter((t) => tokenIdSet.has(t._meta.id));
  }, [tokens, selectedPlaceId, tokensByPlace]);

  const handleCopyJson = useCallback(async (token: AetherToken) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(token, null, 2));
      setCopiedId(token._meta.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard may not be available
    }
  }, []);

  if (filteredTokens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-athena-muted text-xs">
        <p>No tokens to display.</p>
        {selectedPlaceId && (
          <p className="mt-1">Place "{selectedPlaceId}" is empty.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      {selectedPlaceId && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-athena-text">
            Tokens in {selectedPlaceId}
          </span>
          <button
            onClick={() => axiomActions.selectPlace(null)}
            className="text-[10px] text-athena-muted hover:text-athena-text"
          >
            Show all
          </button>
        </div>
      )}

      {filteredTokens.map((token) => (
        <TokenCard
          key={token._meta.id}
          token={token}
          isSelected={selectedTokenId === token._meta.id}
          onSelect={() =>
            axiomActions.selectToken(
              selectedTokenId === token._meta.id ? null : token._meta.id,
            )
          }
          onCopy={() => handleCopyJson(token)}
          isCopied={copiedId === token._meta.id}
        />
      ))}
    </div>
  );
}

function TokenCard({
  token,
  isSelected,
  onSelect,
  onCopy,
  isCopied,
}: {
  token: AetherToken;
  isSelected: boolean;
  onSelect: () => void;
  onCopy: () => void;
  isCopied: boolean;
}) {
  return (
    <div
      className={`rounded border transition-colors ${
        isSelected
          ? 'border-blue-500/50 bg-blue-500/5'
          : 'border-athena-border bg-athena-surface/50 hover:border-athena-muted'
      }`}
    >
      {/* Header */}
      <button
        onClick={onSelect}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded border ${colorBadgeClass(token.color)}`}>
          {token.color}
        </span>
        <code className="text-[11px] text-athena-text font-mono">
          {truncateId(token._meta.id)}
        </code>
        <span className="ml-auto text-[10px] text-athena-muted tabular-nums">
          {token.retryCount}/{token.maxRetries}
        </span>
        <span className="text-[10px] text-athena-muted">
          {new Date(token._meta.createdAt).toLocaleTimeString()}
        </span>
      </button>

      {/* Expanded detail */}
      {isSelected && (
        <div className="px-2.5 pb-2.5 space-y-2 border-t border-athena-border pt-2">
          {/* Copy button */}
          <button
            onClick={onCopy}
            className="flex items-center gap-1 text-[10px] text-athena-muted hover:text-athena-text"
          >
            {isCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {isCopied ? 'Copied!' : 'Copy JSON'}
          </button>

          {/* Payload */}
          <JsonTree data={token.payload} label="payload" />

          {/* Full _meta (Principle 1: show everything) */}
          <JsonTree data={token._meta} label="_meta" />

          {/* Feedback history */}
          {token.feedbackHistory.length > 0 && (
            <div>
              <div className="text-[11px] text-athena-muted font-medium mb-1">
                feedbackHistory ({token.feedbackHistory.length})
              </div>
              <FeedbackDisplay feedback={token.feedbackHistory} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
