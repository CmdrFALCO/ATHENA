/**
 * AgentCard — Collapsible card for a single council agent
 * WP 9B.8
 *
 * Three states: pending (gray), running (pulsing border), complete (colored border).
 * Colors: Generator=blue, Critic=amber, Synthesizer=green.
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, Shield, Sparkles } from 'lucide-react';
import type { AgentRole } from '../../council/types';

export type AgentCardStatus = 'pending' | 'running' | 'complete';

export interface AgentCardProps {
  role: AgentRole;
  status: AgentCardStatus;
  summary?: string;
  durationMs?: number;
  rawResponse?: string;
}

const AGENT_META: Record<AgentRole, {
  label: string;
  Icon: typeof Cpu;
  borderColor: string;
  headerBg: string;
  textColor: string;
}> = {
  generator: {
    label: 'Generator',
    Icon: Cpu,
    borderColor: 'border-blue-500',
    headerBg: 'bg-blue-500/10',
    textColor: 'text-blue-400',
  },
  critic: {
    label: 'Critic',
    Icon: Shield,
    borderColor: 'border-amber-500',
    headerBg: 'bg-amber-500/10',
    textColor: 'text-amber-400',
  },
  synthesizer: {
    label: 'Synthesizer',
    Icon: Sparkles,
    borderColor: 'border-green-500',
    headerBg: 'bg-green-500/10',
    textColor: 'text-green-400',
  },
};

export function AgentCard({ role, status, summary, durationMs, rawResponse }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const meta = AGENT_META[role];
  const { Icon } = meta;

  const borderClass =
    status === 'running'
      ? `${meta.borderColor} animate-pulse`
      : status === 'complete'
        ? meta.borderColor
        : 'border-athena-border';

  return (
    <div className={`rounded-lg border ${borderClass} overflow-hidden transition-colors`}>
      {/* Header — always visible */}
      <button
        onClick={() => status === 'complete' && setExpanded(!expanded)}
        disabled={status !== 'complete'}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left ${meta.headerBg}
                    ${status === 'complete' ? 'cursor-pointer hover:brightness-110' : 'cursor-default'}`}
      >
        <Icon className={`w-3.5 h-3.5 ${meta.textColor}`} />
        <span className={`text-xs font-medium ${meta.textColor}`}>{meta.label}</span>

        {status === 'pending' && (
          <span className="ml-auto text-[10px] text-athena-muted">Waiting</span>
        )}
        {status === 'running' && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-athena-muted">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            Running
          </span>
        )}
        {status === 'complete' && (
          <>
            <span className="flex-1 text-[10px] text-athena-muted truncate ml-1">
              {summary}
            </span>
            {durationMs != null && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] rounded bg-athena-surface text-athena-muted shrink-0">
                {(durationMs / 1000).toFixed(1)}s
              </span>
            )}
            {expanded ? (
              <ChevronDown className="w-3 h-3 text-athena-muted shrink-0" />
            ) : (
              <ChevronRight className="w-3 h-3 text-athena-muted shrink-0" />
            )}
          </>
        )}
      </button>

      {/* Expanded body */}
      {expanded && rawResponse && (
        <div className="px-3 py-2 max-h-[200px] overflow-y-auto border-t border-athena-border/50">
          <pre className="text-[11px] text-athena-text whitespace-pre-wrap font-mono leading-relaxed">
            {rawResponse}
          </pre>
        </div>
      )}
    </div>
  );
}
