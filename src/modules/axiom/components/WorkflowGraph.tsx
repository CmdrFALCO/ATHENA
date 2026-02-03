/**
 * WorkflowGraph — React Flow CPN visualization
 * WP 9A.3: AXIOM Visualization
 *
 * Visual representation of the CPN places and transitions in the
 * validation workflow (with WP 9B.1 critique path). Places are rounded
 * rectangles with token counts, transitions are thin bars showing enabled state.
 */

import { useMemo, useCallback } from 'react';
import { useSelector } from '@legendapp/state/react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { axiomState$ } from '../store/axiomState';
import { axiomActions } from '../store/axiomActions';
import type { PlaceId } from '../workflows/types';
import { PLACE_IDS, TRANSITION_IDS } from '../workflows/types';

// --- Custom Node Data Types ---

interface PlaceNodeData {
  placeId: PlaceId;
  label: string;
  tokenCount: number;
  isActive: boolean;
  isSink: boolean;
  isSource: boolean;
  description: string;
  [key: string]: unknown;
}

interface TransitionNodeData {
  transitionId: string;
  label: string;
  priority: number;
  isEnabled: boolean;
  [key: string]: unknown;
}

// --- Custom Node Components ---

function PlaceNode({ data }: { data: PlaceNodeData }) {
  const isSelected = useSelector(() => axiomState$.selectedPlaceId.get()) === data.placeId;

  const bgColor = data.isSink
    ? data.placeId === PLACE_IDS.P_committed
      ? 'bg-emerald-900/40 border-emerald-500/50'
      : data.placeId === PLACE_IDS.P_escalated
        ? 'bg-amber-900/40 border-amber-500/50'
        : 'bg-red-900/40 border-red-500/50'
    : data.isActive
      ? data.placeId === PLACE_IDS.P_critiqued
        ? 'bg-amber-900/40 border-amber-500/50'
        : 'bg-blue-900/40 border-blue-500/50'
      : 'bg-athena-surface border-athena-border';

  const handleClick = () => {
    axiomActions.selectPlace(
      isSelected ? null : data.placeId as PlaceId,
    );
    if (!isSelected) {
      axiomActions.selectTab('tokens');
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative cursor-pointer rounded-lg border-2 px-4 py-3 min-w-[120px] transition-all
        ${bgColor} ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 ring-offset-transparent' : ''}
        hover:brightness-110`}
    >
      <Handle type="target" position={Position.Left} className="!bg-athena-muted !w-2 !h-2" />

      {/* Place name */}
      <div className="text-xs font-medium text-athena-text text-center">
        {data.label}
      </div>

      {/* Place ID */}
      <div className="text-[10px] text-athena-muted text-center mt-0.5">
        {data.placeId}
      </div>

      {/* Token count badge */}
      {data.tokenCount > 0 && (
        <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold shadow">
          {data.tokenCount}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-athena-muted !w-2 !h-2" />
    </div>
  );
}

function TransitionNode({ data }: { data: TransitionNodeData }) {
  return (
    <div
      className={`relative rounded px-3 py-1.5 border transition-all min-w-[80px]
        ${data.isEnabled
          ? 'bg-amber-500/20 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
          : 'bg-athena-surface/80 border-athena-border'
        }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-athena-muted !w-1.5 !h-3 !rounded-sm" />

      <div className="text-[10px] font-medium text-athena-text text-center">
        {data.label}
      </div>
      <div className="text-[9px] text-athena-muted text-center">
        P:{data.priority}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-athena-muted !w-1.5 !h-3 !rounded-sm" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  place: PlaceNode,
  transition: TransitionNode,
};

// --- Layout Constants ---
// Left-to-right flow with the feedback loop going down and back
// WP 9B.1: Extended with critique path between P_verified and P_committed

const COL_PLACE_1 = 0;       // P_proposals
const COL_T_1 = 160;         // T_validate
const COL_PLACE_2 = 320;     // P_deciding
const COL_T_2 = 480;         // T_accept / T_prepare_retry / T_reject
const COL_PLACE_3 = 640;     // P_verified / P_feedback / P_rejected
const COL_T_3 = 800;         // T_critique / T_skip_critique / T_regenerate
const COL_PLACE_4 = 960;     // P_critiqued
const COL_T_4 = 1120;        // T_critique_accept / T_critique_escalate / T_critique_reject
const COL_PLACE_5 = 1280;    // P_committed / P_escalated

const ROW_MAIN = 100;
const ROW_ESCALATED = 220;
const ROW_FEEDBACK = 340;
const ROW_REJECT = 460;

// --- Graph Definition ---

function buildNodes(
  tokensByPlace: Record<string, string[]>,
  enabledTransitions: Set<string>,
): Node[] {
  const getCount = (pid: string) => (tokensByPlace[pid] ?? []).length;

  const placeNodes: Node<PlaceNodeData>[] = [
    {
      id: PLACE_IDS.P_proposals,
      type: 'place',
      position: { x: COL_PLACE_1, y: ROW_MAIN },
      data: {
        placeId: PLACE_IDS.P_proposals,
        label: 'Proposals',
        tokenCount: getCount(PLACE_IDS.P_proposals),
        isActive: getCount(PLACE_IDS.P_proposals) > 0,
        isSink: false,
        isSource: true,
        description: 'Incoming proposals from AI Chat',
      },
    },
    {
      id: PLACE_IDS.P_deciding,
      type: 'place',
      position: { x: COL_PLACE_2, y: ROW_MAIN },
      data: {
        placeId: PLACE_IDS.P_deciding,
        label: 'Deciding',
        tokenCount: getCount(PLACE_IDS.P_deciding),
        isActive: getCount(PLACE_IDS.P_deciding) > 0,
        isSink: false,
        isSource: false,
        description: 'Decision point: accept, retry, or reject',
      },
    },
    {
      id: PLACE_IDS.P_verified,
      type: 'place',
      position: { x: COL_PLACE_3, y: ROW_MAIN },
      data: {
        placeId: PLACE_IDS.P_verified,
        label: 'Verified',
        tokenCount: getCount(PLACE_IDS.P_verified),
        isActive: getCount(PLACE_IDS.P_verified) > 0,
        isSink: false,
        isSource: false,
        description: 'Passed all validation',
      },
    },
    // WP 9B.1: Critique path places
    {
      id: PLACE_IDS.P_critiqued,
      type: 'place',
      position: { x: COL_PLACE_4, y: ROW_MAIN },
      data: {
        placeId: PLACE_IDS.P_critiqued,
        label: 'Critiqued',
        tokenCount: getCount(PLACE_IDS.P_critiqued),
        isActive: getCount(PLACE_IDS.P_critiqued) > 0,
        isSink: false,
        isSource: false,
        description: 'Post-critique decision point',
      },
    },
    {
      id: PLACE_IDS.P_committed,
      type: 'place',
      position: { x: COL_PLACE_5, y: ROW_MAIN },
      data: {
        placeId: PLACE_IDS.P_committed,
        label: 'Committed',
        tokenCount: getCount(PLACE_IDS.P_committed),
        isActive: getCount(PLACE_IDS.P_committed) > 0,
        isSink: true,
        isSource: false,
        description: 'Written to knowledge graph (SUCCESS)',
      },
    },
    {
      id: PLACE_IDS.P_escalated,
      type: 'place',
      position: { x: COL_PLACE_5, y: ROW_ESCALATED },
      data: {
        placeId: PLACE_IDS.P_escalated,
        label: 'Escalated',
        tokenCount: getCount(PLACE_IDS.P_escalated),
        isActive: getCount(PLACE_IDS.P_escalated) > 0,
        isSink: true,
        isSource: false,
        description: 'Flagged for human review (WP 9B.1)',
      },
    },
    {
      id: PLACE_IDS.P_feedback,
      type: 'place',
      position: { x: COL_PLACE_3, y: ROW_FEEDBACK },
      data: {
        placeId: PLACE_IDS.P_feedback,
        label: 'Feedback',
        tokenCount: getCount(PLACE_IDS.P_feedback),
        isActive: getCount(PLACE_IDS.P_feedback) > 0,
        isSink: false,
        isSource: false,
        description: 'Awaiting regeneration with corrective feedback',
      },
    },
    {
      id: PLACE_IDS.P_rejected,
      type: 'place',
      position: { x: COL_PLACE_3, y: ROW_REJECT },
      data: {
        placeId: PLACE_IDS.P_rejected,
        label: 'Rejected',
        tokenCount: getCount(PLACE_IDS.P_rejected),
        isActive: getCount(PLACE_IDS.P_rejected) > 0,
        isSink: true,
        isSource: false,
        description: 'Exceeded max retries (FAILURE)',
      },
    },
  ];

  const transitionNodes: Node<TransitionNodeData>[] = [
    {
      id: TRANSITION_IDS.T_validate,
      type: 'transition',
      position: { x: COL_T_1, y: ROW_MAIN + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_validate,
        label: 'Validate',
        priority: 10,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_validate),
      },
    },
    {
      id: TRANSITION_IDS.T_accept,
      type: 'transition',
      position: { x: COL_T_2, y: ROW_MAIN + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_accept,
        label: 'Accept',
        priority: 20,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_accept),
      },
    },
    {
      id: TRANSITION_IDS.T_prepare_retry,
      type: 'transition',
      position: { x: COL_T_2, y: ROW_FEEDBACK + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_prepare_retry,
        label: 'Prep Retry',
        priority: 15,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_prepare_retry),
      },
    },
    {
      id: TRANSITION_IDS.T_regenerate,
      type: 'transition',
      position: { x: COL_T_3, y: ROW_FEEDBACK + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_regenerate,
        label: 'Regenerate',
        priority: 10,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_regenerate),
      },
    },
    {
      id: TRANSITION_IDS.T_reject,
      type: 'transition',
      position: { x: COL_T_2, y: ROW_REJECT + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_reject,
        label: 'Reject',
        priority: 10,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_reject),
      },
    },
    // WP 9B.1: Critique transitions
    {
      id: TRANSITION_IDS.T_critique,
      type: 'transition',
      position: { x: COL_T_3, y: ROW_MAIN + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_critique,
        label: 'Critique',
        priority: 20,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_critique),
      },
    },
    {
      id: TRANSITION_IDS.T_skip_critique,
      type: 'transition',
      position: { x: COL_T_3, y: ROW_MAIN + 60 },
      data: {
        transitionId: TRANSITION_IDS.T_skip_critique,
        label: 'Skip Critique',
        priority: 15,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_skip_critique),
      },
    },
    {
      id: TRANSITION_IDS.T_critique_accept,
      type: 'transition',
      position: { x: COL_T_4, y: ROW_MAIN + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_critique_accept,
        label: 'Crit. Accept',
        priority: 20,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_critique_accept),
      },
    },
    {
      id: TRANSITION_IDS.T_critique_escalate,
      type: 'transition',
      position: { x: COL_T_4, y: ROW_ESCALATED + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_critique_escalate,
        label: 'Escalate',
        priority: 15,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_critique_escalate),
      },
    },
    {
      id: TRANSITION_IDS.T_critique_reject,
      type: 'transition',
      position: { x: COL_T_4, y: ROW_REJECT + 10 },
      data: {
        transitionId: TRANSITION_IDS.T_critique_reject,
        label: 'Crit. Reject',
        priority: 10,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_critique_reject),
      },
    },
    // T_commit is kept for when critique is disabled (skip path goes directly to P_committed)
    {
      id: TRANSITION_IDS.T_commit,
      type: 'transition',
      position: { x: COL_T_3, y: ROW_MAIN - 50 },
      data: {
        transitionId: TRANSITION_IDS.T_commit,
        label: 'Commit',
        priority: 10,
        isEnabled: enabledTransitions.has(TRANSITION_IDS.T_commit),
      },
    },
  ];

  return [...placeNodes, ...transitionNodes];
}

const EDGES: Edge[] = [
  // Main flow: P_proposals → T_validate → P_deciding → T_accept → P_verified
  { id: 'e-proposals-validate', source: PLACE_IDS.P_proposals, target: TRANSITION_IDS.T_validate, type: 'smoothstep' },
  { id: 'e-validate-deciding', source: TRANSITION_IDS.T_validate, target: PLACE_IDS.P_deciding, type: 'smoothstep' },
  { id: 'e-deciding-accept', source: PLACE_IDS.P_deciding, target: TRANSITION_IDS.T_accept, type: 'smoothstep' },
  { id: 'e-accept-verified', source: TRANSITION_IDS.T_accept, target: PLACE_IDS.P_verified, type: 'smoothstep' },

  // WP 9B.1: Critique path — P_verified → T_critique → P_critiqued → T_critique_accept → P_committed
  { id: 'e-verified-critique', source: PLACE_IDS.P_verified, target: TRANSITION_IDS.T_critique, type: 'smoothstep' },
  { id: 'e-critique-critiqued', source: TRANSITION_IDS.T_critique, target: PLACE_IDS.P_critiqued, type: 'smoothstep' },
  { id: 'e-critiqued-accept', source: PLACE_IDS.P_critiqued, target: TRANSITION_IDS.T_critique_accept, type: 'smoothstep' },
  { id: 'e-critique-accept-committed', source: TRANSITION_IDS.T_critique_accept, target: PLACE_IDS.P_committed, type: 'smoothstep' },

  // WP 9B.1: Skip critique (bypass) — P_verified → T_skip_critique → P_committed
  { id: 'e-verified-skip', source: PLACE_IDS.P_verified, target: TRANSITION_IDS.T_skip_critique, type: 'smoothstep' },
  { id: 'e-skip-committed', source: TRANSITION_IDS.T_skip_critique, target: PLACE_IDS.P_committed, type: 'smoothstep' },

  // WP 9B.1: Critique escalate — P_critiqued → T_critique_escalate → P_escalated
  { id: 'e-critiqued-escalate', source: PLACE_IDS.P_critiqued, target: TRANSITION_IDS.T_critique_escalate, type: 'smoothstep' },
  { id: 'e-escalate-escalated', source: TRANSITION_IDS.T_critique_escalate, target: PLACE_IDS.P_escalated, type: 'smoothstep' },

  // WP 9B.1: Critique reject — P_critiqued → T_critique_reject → P_rejected
  { id: 'e-critiqued-reject', source: PLACE_IDS.P_critiqued, target: TRANSITION_IDS.T_critique_reject, type: 'smoothstep' },
  { id: 'e-critique-reject-rejected', source: TRANSITION_IDS.T_critique_reject, target: PLACE_IDS.P_rejected, type: 'smoothstep' },

  // Legacy T_commit (when critique disabled) — P_verified → T_commit → P_committed
  { id: 'e-verified-commit', source: PLACE_IDS.P_verified, target: TRANSITION_IDS.T_commit, type: 'smoothstep' },
  { id: 'e-commit-committed', source: TRANSITION_IDS.T_commit, target: PLACE_IDS.P_committed, type: 'smoothstep' },

  // Retry loop: P_deciding → T_prepare_retry → P_feedback → T_regenerate → P_proposals
  { id: 'e-deciding-retry', source: PLACE_IDS.P_deciding, target: TRANSITION_IDS.T_prepare_retry, type: 'smoothstep' },
  { id: 'e-retry-feedback', source: TRANSITION_IDS.T_prepare_retry, target: PLACE_IDS.P_feedback, type: 'smoothstep' },
  { id: 'e-feedback-regen', source: PLACE_IDS.P_feedback, target: TRANSITION_IDS.T_regenerate, type: 'smoothstep' },
  { id: 'e-regen-proposals', source: TRANSITION_IDS.T_regenerate, target: PLACE_IDS.P_proposals, type: 'smoothstep' },

  // Reject: P_deciding → T_reject → P_rejected
  { id: 'e-deciding-reject', source: PLACE_IDS.P_deciding, target: TRANSITION_IDS.T_reject, type: 'smoothstep' },
  { id: 'e-reject-rejected', source: TRANSITION_IDS.T_reject, target: PLACE_IDS.P_rejected, type: 'smoothstep' },
];

// Style all edges
const styledEdges: Edge[] = EDGES.map((e) => ({
  ...e,
  style: { stroke: '#6b7280', strokeWidth: 1.5 },
  animated: false,
}));

export function WorkflowGraph() {
  const tokensByPlace = useSelector(() => axiomState$.tokensByPlace.get());

  // Derive enabled transitions from token placement
  // (approximate — real enabled check requires guard evaluation)
  const enabledTransitions = useMemo(() => {
    const enabled = new Set<string>();
    const has = (pid: string) => (tokensByPlace[pid] ?? []).length > 0;

    if (has(PLACE_IDS.P_proposals)) enabled.add(TRANSITION_IDS.T_validate);
    if (has(PLACE_IDS.P_deciding)) {
      enabled.add(TRANSITION_IDS.T_accept);
      enabled.add(TRANSITION_IDS.T_prepare_retry);
      enabled.add(TRANSITION_IDS.T_reject);
    }
    if (has(PLACE_IDS.P_verified)) {
      enabled.add(TRANSITION_IDS.T_critique);
      enabled.add(TRANSITION_IDS.T_skip_critique);
      enabled.add(TRANSITION_IDS.T_commit);
    }
    // WP 9B.1: Critique routing
    if (has(PLACE_IDS.P_critiqued)) {
      enabled.add(TRANSITION_IDS.T_critique_accept);
      enabled.add(TRANSITION_IDS.T_critique_escalate);
      enabled.add(TRANSITION_IDS.T_critique_reject);
    }
    if (has(PLACE_IDS.P_feedback)) enabled.add(TRANSITION_IDS.T_regenerate);

    return enabled;
  }, [tokensByPlace]);

  const nodes = useMemo(
    () => buildNodes(tokensByPlace, enabledTransitions),
    [tokensByPlace, enabledTransitions],
  );

  // Animate edges that have tokens flowing through them
  const edges = useMemo(() => {
    return styledEdges.map((edge) => ({
      ...edge,
      animated: enabledTransitions.has(edge.source) || enabledTransitions.has(edge.target),
      style: {
        ...edge.style,
        stroke: enabledTransitions.has(edge.source) || enabledTransitions.has(edge.target)
          ? '#3b82f6'
          : '#6b7280',
      },
    }));
  }, [enabledTransitions]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.type === 'place') {
      const data = node.data as PlaceNodeData;
      axiomActions.selectPlace(data.placeId as PlaceId);
      axiomActions.selectTab('tokens');
    }
  }, []);

  return (
    <div className="w-full h-full min-h-[450px]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background color="#374151" gap={20} size={1} />
      </ReactFlow>
    </div>
  );
}
