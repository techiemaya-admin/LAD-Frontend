import React from 'react';
import { Background, Controls, BackgroundVariant, Node, Edge, useReactFlow } from 'reactflow';

/**
 * Light-themed workflow canvas with subtle dot grid,
 * auto-fit on workflow change, and styled controls
 */
export function WorkflowCanvas({
  flowNodes,
  flowEdges,
  onNodesChange,
  onEdgesChange,
  nodeTypes,
  workflowLength,
}: {
  flowNodes: Node[];
  flowEdges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  nodeTypes: any;
  workflowLength: number;
}) {
  const { fitView } = useReactFlow();

  // Auto-fit view when workflow changes
  React.useEffect(() => {
    if (workflowLength > 0) {
      const timer = setTimeout(() => {
        fitView({
          padding: 0.35,
          duration: 500,
          minZoom: 0.4,
          maxZoom: 1.0,
        });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [workflowLength, fitView]);

  return (
    <>
      <Background
        color="#c2d6eb"
        gap={20}
        size={1.5}
        variant={BackgroundVariant.Dots}
        className="opacity-50"
      />
      <Controls
        showInteractive={false}
        className="bg-white/90 dark:bg-[#071131]/90 backdrop-blur-sm border border-gray-200 dark:border-blue-950/40 rounded-xl shadow-lg overflow-hidden [&_.react-flow\_\_controls-button]:bg-transparent [&_.react-flow\_\_controls-button]:border-b [&_.react-flow\_\_controls-button]:border-gray-100 dark:[&_.react-flow\_\_controls-button]:border-blue-950/40 [&_.react-flow\_\_controls-button:last-child]:border-b-0 [&_.react-flow\_\_controls-button]:text-gray-700 dark:[&_.react-flow\_\_controls-button]:text-slate-200 [&_.react-flow\_\_controls-button]:fill-current dark:[&_.react-flow\_\_controls-button]:fill-slate-200 hover:[&_.react-flow\_\_controls-button]:bg-gray-100 dark:hover:[&_.react-flow\_\_controls-button]:bg-blue-900/40 transition-colors"
      />
    </>
  );
}