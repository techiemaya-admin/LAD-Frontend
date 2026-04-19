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
        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg"
      />
    </>
  );
}