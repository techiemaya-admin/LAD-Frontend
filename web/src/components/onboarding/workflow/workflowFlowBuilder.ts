import { Node, Edge, MarkerType } from 'reactflow';

export interface WorkflowPreviewStep {
  id: string;
  channel?: string;
  type: string;
  title: string;
  description?: string;
  message?: string;
  leadLimit?: number;
}

export type WorkflowLayout = 'horizontal' | 'vertical';

/* ═══════════════════════════════════════════════════════════════════
   HORIZONTAL "SNAKE" LAYOUT - the sequence flows left→right and wraps to
   the next row (boustrophedon), so a long multi-channel pipeline stays
   compact and fully visible in the portrait preview panel instead of
   running off the bottom as one tall column. Still a faithful 1:1 mirror
   of workflowPreview: Start → one node per step → End.

   Edges attach to the circle's side handles within a row (l-s/r-s ↔
   l-t/r-t) and to top/bottom at the row turns, so connectors stay short
   and readable. Nodes remain draggable for manual adjustment.
   ═══════════════════════════════════════════════════════════════════ */

const X_STRIDE = 200;   // horizontal gap between node centers
const Y_STRIDE = 156;   // vertical gap between rows (circle + label + turn slack)
const X0 = 40;          // left margin
const Y0 = 20;          // top margin

/** Columns per row - adaptive so the flow stays roughly square (best fit for fitView). */
function snakeCols(n: number): number {
  return Math.min(4, Math.max(2, Math.ceil(Math.sqrt(n))));
}

interface SeqNode { id: string; type: string; title: string; description: string }

function toSequence(steps: WorkflowPreviewStep[]): SeqNode[] {
  return [
    { id: 'start', type: 'start', title: 'Start', description: 'Campaign begins' },
    ...steps.map((s) => ({ id: s.id, type: s.type, title: s.title, description: s.description || '' })),
    { id: 'end', type: 'end', title: 'End', description: 'Campaign ends' },
  ];
}

/** Grid cell (row, col) for the i-th node in a downward snake. */
function cellFor(i: number, cols: number): { row: number; col: number } {
  const row = Math.floor(i / cols);
  const posInRow = i % cols;
  // Even rows run left→right, odd rows right→left, so consecutive rows meet vertically.
  const col = row % 2 === 0 ? posInRow : cols - 1 - posInRow;
  return { row, col };
}

function makeEdge(src: string, tgt: string, sourceHandle: string, targetHandle: string): Edge {
  const c = '#c4c9d4';
  return {
    id: `e-${src}-${tgt}`,
    source: src, sourceHandle,
    target: tgt, targetHandle,
    type: 'smoothstep',
    animated: true,
    data: { label: '', color: c },
    style: { stroke: c, strokeWidth: 2, strokeDasharray: '6,6' },
    markerEnd: { type: MarkerType.ArrowClosed, color: c, width: 10, height: 10 },
  };
}

export function createReactFlowNodes(
  workflowPreview: WorkflowPreviewStep[] | null,
  _layout: WorkflowLayout = 'horizontal',
): Node[] {
  const seq = toSequence(workflowPreview || []);
  const cols = snakeCols(seq.length);
  return seq.map((n, i) => {
    const { row, col } = cellFor(i, cols);
    return {
      id: n.id,
      type: 'custom',
      position: { x: X0 + col * X_STRIDE, y: Y0 + row * Y_STRIDE },
      draggable: true,
      data: { title: n.title, type: n.type, description: n.description, _layout: 'snake' },
    };
  });
}

export function createReactFlowEdges(
  workflowPreview: WorkflowPreviewStep[] | null,
  _layout: WorkflowLayout = 'horizontal',
): Edge[] {
  const seq = toSequence(workflowPreview || []);
  const cols = snakeCols(seq.length);
  const edges: Edge[] = [];
  for (let i = 0; i < seq.length - 1; i++) {
    const a = cellFor(i, cols);
    const b = cellFor(i + 1, cols);
    let sourceHandle: string, targetHandle: string;
    if (a.row !== b.row) {
      // Row turn - drop straight down to the node below.
      sourceHandle = 'bottom'; targetHandle = 'top';
    } else if (a.row % 2 === 0) {
      // Even row: flowing left → right.
      sourceHandle = 'r-s'; targetHandle = 'l-t';
    } else {
      // Odd row: flowing right → left.
      sourceHandle = 'l-s'; targetHandle = 'r-t';
    }
    edges.push(makeEdge(seq[i].id, seq[i + 1].id, sourceHandle, targetHandle));
  }
  return edges;
}
