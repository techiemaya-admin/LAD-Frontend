import React from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';

/**
 * Custom edge with a floating label pill — n8n / Make.com style
 * Shows condition labels like "✓ Accepted", "⏳ No Reply 7d", "✗ Rejected"
 */
export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const label = data?.label || '';
  const color = data?.color || '#9ca3af';

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.3,
  });

  return (
    <>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        markerEnd={markerEnd as string}
        style={{ transition: 'stroke 0.2s' }}
      />

      {/* Animated flow dot */}
      <circle r="3" fill={color} opacity={0.7}>
        <animateMotion dur="3s" repeatCount="indefinite" path={edgePath} />
      </circle>

      {/* Label pill */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 20,
              background: '#fff',
              border: `1.5px solid ${color}`,
              boxShadow: `0 2px 8px ${color}25, 0 1px 3px rgba(0,0,0,0.08)`,
              fontSize: 10,
              fontWeight: 700,
              color: color,
              whiteSpace: 'nowrap',
              zIndex: 10,
              letterSpacing: '0.01em',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}

      <style>{`
        path#${CSS.escape(id)}:hover {
          stroke-width: 3.5 !important;
          filter: drop-shadow(0 0 4px ${color}40);
        }
      `}</style>
    </>
  );
}
