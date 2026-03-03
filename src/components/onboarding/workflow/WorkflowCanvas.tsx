import React from 'react';
import { Background, Controls, BackgroundVariant, Node, Edge, useReactFlow } from 'reactflow';
// Inner component that uses useReactFlow hook
export function WorkflowCanvas({ 
  flowNodes, 
  flowEdges, 
  onNodesChange, 
  onEdgesChange, 
  nodeTypes,
  workflowLength 
}: { 
  flowNodes: Node[], 
  flowEdges: Edge[], 
  onNodesChange: any, 
  onEdgesChange: any, 
  nodeTypes: any,
  workflowLength: number 
}) {
  const { fitView } = useReactFlow();
  // Auto-fit view when workflow changes
  React.useEffect(() => {
    if (workflowLength > 0) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(() => {
        fitView({ 
          padding: 0.2,
          duration: 400,
          minZoom: 0.5,
          maxZoom: 1.0
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [workflowLength, fitView]);
  return (
    <>
      <Background 
        color="#6366F1" 
        gap={24} 
        size={2}
        variant={BackgroundVariant.Dots}
        className="opacity-20"
      />
      <Controls showInteractive={false} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-lg" />
    </>
  );
}