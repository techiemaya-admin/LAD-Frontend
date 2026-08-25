import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StepType } from '@/types/campaign';
import { getNodeIcon } from './workflowNodeUtils';
import { Trash2, Settings, Tag, Plus } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

/**
 * Brand color config - matches the generated mockup palette
 */
function getBrandConfig(type: string) {
  if (type === 'start')            return { bg: '#22c55e', border: '#16a34a', glow: 'rgba(34,197,94,0.25)' };
  if (type === 'end')              return { bg: '#ef4444', border: '#dc2626', glow: 'rgba(239,68,68,0.25)' };
  if (type === 'lead_generation')  return { bg: '#f59e0b', border: '#d97706', glow: 'rgba(245,158,11,0.25)' };
  if (type === 'media_generation') return { bg: '#d946ef', border: '#c026d3', glow: 'rgba(217,70,239,0.25)' };
  if (type === 'linkedin_connect') return { bg: '#3b82f6', border: '#2563eb', glow: 'rgba(59,130,246,0.25)' };
  if (type === 'linkedin_message') return { bg: '#8b5cf6', border: '#7c3aed', glow: 'rgba(139,92,246,0.25)' };
  if (type === 'linkedin_inmail')  return { bg: '#7C3AED', border: '#6d28d9', glow: 'rgba(124,58,237,0.25)' };
  if (type === 'linkedin_visit')   return { bg: '#0ea5e9', border: '#0284c7', glow: 'rgba(14,165,233,0.25)' };
  if (type.includes('linkedin'))   return { bg: '#0a66c2', border: '#004182', glow: 'rgba(10,102,194,0.25)' };
  if (type.includes('email'))      return { bg: '#ea4335', border: '#c5221f', glow: 'rgba(234,67,53,0.25)' };
  if (type.includes('whatsapp'))   return { bg: '#25d366', border: '#128c7e', glow: 'rgba(37,211,102,0.25)' };
  if (type.includes('voice'))      return { bg: '#8b5cf6', border: '#7c3aed', glow: 'rgba(139,92,246,0.25)' };
  if (type === 'delay')            return { bg: '#6b7280', border: '#4b5563', glow: 'rgba(107,114,128,0.25)' };
  if (type === 'tag')              return { bg: '#9ca3af', border: '#6b7280', glow: 'rgba(156,163,175,0.25)' };
  if (type === 'condition')        return { bg: '#8b5cf6', border: '#7c3aed', glow: 'rgba(139,92,246,0.25)' };
  if (type === 'followup_sequence') return { bg: '#6366f1', border: '#4f46e5', glow: 'rgba(99,102,241,0.25)' };
  if (type === 'analytics_report') return { bg: '#06b6d4', border: '#0891b2', glow: 'rgba(6,182,212,0.25)' };
  if (type === 'export_results')   return { bg: '#0891b2', border: '#0e7490', glow: 'rgba(8,145,178,0.25)' };
  if (type === 'landing_page')     return { bg: '#10b981', border: '#059669', glow: 'rgba(16,185,129,0.25)' };
  if (type === 'linkedin_content') return { bg: '#7c3aed', border: '#6d28d9', glow: 'rgba(124,58,237,0.25)' };
  if (type === 'post_approval')    return { bg: '#16a34a', border: '#15803d', glow: 'rgba(22,163,74,0.25)' };
  if (type === 'linkedin_post')    return { bg: '#0a66c2', border: '#004182', glow: 'rgba(10,102,194,0.25)' };
  if (type === 'instagram_post')   return { bg: '#c13584', border: '#a02c6d', glow: 'rgba(193,53,132,0.25)' };
  if (type === 'human_task')       return { bg: '#f59e0b', border: '#d97706', glow: 'rgba(245,158,11,0.25)' };
  if (type === 'lead_report')      return { bg: '#0f766e', border: '#115e59', glow: 'rgba(15,118,110,0.25)' };
  if (type === 'web_scrape')       return { bg: '#0284c7', border: '#0369a1', glow: 'rgba(2,132,199,0.25)' };
  if (type === 'web_research')     return { bg: '#4f46e5', border: '#4338ca', glow: 'rgba(79,70,229,0.25)' };
  if (type === 'lead_score')       return { bg: '#ca8a04', border: '#a16207', glow: 'rgba(202,138,4,0.25)' };
  if (type === 'split_test')       return { bg: '#db2777', border: '#be185d', glow: 'rgba(219,39,119,0.25)' };
  if (type === 'set_field')        return { bg: '#65a30d', border: '#4d7c0f', glow: 'rgba(101,163,13,0.25)' };
  if (type === 'http_request')     return { bg: '#475569', border: '#334155', glow: 'rgba(71,85,105,0.25)' };
  if (type === 'zoho_update') return { bg: '#dc2626', border: '#b91c1c', glow: 'rgba(220,38,38,0.25)' };
  if (type === 'switch') return { bg: '#d97706', border: '#b45309', glow: 'rgba(217,119,6,0.25)' };
  if (type === 'ai_parse') return { bg: '#7c3aed', border: '#6d28d9', glow: 'rgba(124,58,237,0.25)' };
  if (type === 'data_enrich') return { bg: '#0d9488', border: '#0f766e', glow: 'rgba(13,148,136,0.25)' };
  return                                  { bg: '#6366f1', border: '#4f46e5', glow: 'rgba(99,102,241,0.25)' };
}

/**
 * Clean circular workflow node - matches the generated mockup
 * Light style, soft shadows, clean typography
 */
export function CustomWorkflowNode({ data, id, selected }: NodeProps) {
  const stepType = (data?.type as string) || 'linkedin_visit';
  const brand = getBrandConfig(stepType);
  const { removeWorkflowStep } = useOnboardingStore();

  const canDelete = stepType !== 'start' && stepType !== 'end' && stepType !== 'tag';
  const canEdit = stepType !== 'start' && stepType !== 'end' && stepType !== 'tag';

  // Insert affordances ("+" on each side of the circle). The fanned-out branch
  // children of a Multi-condition node are drawn from its config, not from the
  // step list, so there is no slot to insert around them. Nothing may be
  // inserted ahead of the lead source (or of 'start') - leads have to exist
  // before any step can act on them.
  const isBranchNode = !!data?._branch;
  const isEntry = stepType === 'start' || stepType === 'lead_generation';
  const canInsertBefore = !isBranchNode && !isEntry;
  const canInsertAfter = !isBranchNode && stepType !== 'start' && stepType !== 'end';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDelete && id) removeWorkflowStep(id);
  };

  /** Ask the host canvas to open its step picker for this slot. It owns the
   *  palette (and any per-node launch config it seeds), so the node only
   *  reports WHERE the new step goes. */
  const requestInsert = (position: 'before' | 'after') => (e: React.MouseEvent) => {
    e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    window.dispatchEvent(new CustomEvent('addWorkflowStepAt', {
      detail: { anchorId: id, position, x: r.left + r.width / 2, y: r.bottom },
    }));
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit && id) {
      window.dispatchEvent(new CustomEvent('openStepEditor', { detail: { stepId: id, stepData: data } }));
    }
  };

  const getSubtext = () => {
    if (stepType === 'start') return 'Campaign begins';
    if (stepType === 'end') return '';
    if (stepType === 'lead_generation' && data?.leadLimit) return `${data.leadLimit} leads/day`;
    if (data?.description && data.description !== data?.title) return data.description;
    if (data?.message) return data.message.substring(0, 35) + '…';
    return '';
  };

  const subtext = getSubtext();
  const isSmall = stepType === 'start' || stepType === 'end' || stepType === 'tag';
  const nodeSize = isSmall ? 56 : 72;

  // Custom icon for "tag" type nodes
  const renderIcon = () => {
    if (stepType === 'tag') {
      return <Tag className="w-5 h-5" style={{ color: '#fff' }} />;
    }
    return getNodeIcon(stepType as StepType, isSmall ? 'w-6 h-6' : 'w-7 h-7');
  };

  return (
    <div
      onClick={canEdit ? handleEdit : undefined}
      className={`mk-node-wrap${selected ? ' mk-node-active' : ''}`}
      style={{ cursor: canEdit ? 'pointer' : 'default' }}
    >
      {/* Handles */}
      {stepType !== 'start' && (
        <Handle type="target" position={Position.Top} id="top"
          style={{ width: 8, height: 8, background: '#d1d5db', border: '2px solid #fff', top: -4 }} />
      )}
      {stepType !== 'end' && (
        <Handle type="source" position={Position.Bottom} id="bottom"
          style={{ width: 8, height: 8, background: '#d1d5db', border: '2px solid #fff', bottom: -4 }} />
      )}
      {/* Side connection points on the circle's left/right edges - used by the
          horizontal "snake" layout. Invisible; edges simply attach here. */}
      <Handle type="target" position={Position.Left}  id="l-t" style={{ left: `calc(50% - ${nodeSize / 2}px)`, top: nodeSize / 2, width: 6, height: 6, opacity: 0, border: 'none', background: 'transparent' }} />
      <Handle type="source" position={Position.Left}  id="l-s" style={{ left: `calc(50% - ${nodeSize / 2}px)`, top: nodeSize / 2, width: 6, height: 6, opacity: 0, border: 'none', background: 'transparent' }} />
      <Handle type="target" position={Position.Right} id="r-t" style={{ right: `calc(50% - ${nodeSize / 2}px)`, top: nodeSize / 2, width: 6, height: 6, opacity: 0, border: 'none', background: 'transparent' }} />
      <Handle type="source" position={Position.Right} id="r-s" style={{ right: `calc(50% - ${nodeSize / 2}px)`, top: nodeSize / 2, width: 6, height: 6, opacity: 0, border: 'none', background: 'transparent' }} />

      {/* Hover action buttons */}
      {(canEdit || canDelete) && (
        <div className="mk-actions">
          {canEdit && (
            <button onClick={handleEdit} className="mk-act-btn mk-act-edit" title="Edit">
              <Settings className="w-3 h-3" />
            </button>
          )}
          {canDelete && (
            <button onClick={handleDelete} className="mk-act-btn mk-act-del" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Add-a-step affordances - left = input (runs before), right = output
          (runs after). Revealed on hover, and kept visible while selected. */}
      {canInsertBefore && (
        <button
          onClick={requestInsert('before')}
          className="mk-io mk-io-in"
          style={{ left: `calc(50% - ${nodeSize / 2 + 28}px)`, top: nodeSize / 2 - 11 }}
          title="Add input: a step that runs before this one"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
      {canInsertAfter && (
        <button
          onClick={requestInsert('after')}
          className="mk-io mk-io-out"
          style={{ right: `calc(50% - ${nodeSize / 2 + 28}px)`, top: nodeSize / 2 - 11 }}
          title="Add output: a step that runs after this one"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}

      {/* Selected ring */}
      {selected && (
        <div style={{
          width: nodeSize + 16, height: nodeSize + 16,
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, calc(-50% - 12px))',
          borderRadius: '50%',
          border: `3px solid ${brand.bg}`,
          opacity: 0.3,
          animation: 'mk-pulse 2s ease-in-out infinite',
        }} />
      )}

      {/* Main circle - clean soft shadow, no excessive glow */}
      <div
        className="mk-circle"
        style={{
          width: nodeSize,
          height: nodeSize,
          background: brand.bg,
          boxShadow: `0 4px 14px ${brand.glow}, 0 2px 6px rgba(0,0,0,0.08)`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: `3px solid rgba(255,255,255,0.25)`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        {/* Glossy highlight */}
        <div style={{
          position: 'absolute', top: 4, left: '18%', right: '18%', height: '30%',
          borderRadius: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        {/* Icon */}
        <div style={{ position: 'relative', zIndex: 2, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {renderIcon()}
        </div>

        {/* Platform mini badge (LinkedIn / Email / WhatsApp) */}
        {!isSmall && stepType !== 'delay' && stepType !== 'condition' && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff', border: '2px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
            zIndex: 10,
          }}>
            {(stepType.includes('linkedin') || stepType === 'lead_generation') ? (
              <svg viewBox="0 0 24 24" width={11} height={11} fill="#0a66c2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            ) : stepType.includes('email') ? (
              <svg viewBox="0 0 24 24" width={11} height={11} fill="#ea4335">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            ) : stepType.includes('whatsapp') ? (
              <svg viewBox="0 0 24 24" width={11} height={11} fill="#25d366">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              </svg>
            ) : null}
          </div>
        )}
      </div>

      {/* Label below the node */}
      <div style={{ marginTop: 10, textAlign: 'center', maxWidth: 160 }}>
        <div style={{
          fontSize: 13, fontWeight: 700, color: '#1f2937',
          lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {data?.title || stepType}
        </div>
        {subtext && (
          <div style={{
            fontSize: 11, color: '#9ca3af', marginTop: 2,
            lineHeight: 1.3, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
          }}>
            {subtext}
          </div>
        )}
      </div>

      <style>{`
        .mk-node-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          min-width: 110px;
        }
        .mk-node-wrap:hover .mk-circle {
          transform: scale(1.08) !important;
          box-shadow: 0 6px 20px ${brand.glow}, 0 3px 10px rgba(0,0,0,0.12) !important;
        }
        .mk-node-wrap:hover .mk-actions,
        .mk-node-active .mk-actions {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .mk-node-wrap:hover .mk-io,
        .mk-node-active .mk-io {
          opacity: 1;
          transform: scale(1);
          pointer-events: auto;
        }

        /* Input / output "+" buttons flanking the circle */
        .mk-io {
          position: absolute;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          color: #6b7280;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transform: scale(0.7);
          pointer-events: none;
          transition: all 0.18s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,0.12);
          z-index: 31;
        }
        .mk-io:hover {
          background: ${brand.bg};
          border-color: ${brand.bg};
          color: #fff;
          transform: scale(1.15);
        }

        .mk-actions {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%) translateY(4px);
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: all 0.2s ease;
          z-index: 30;
        }
        .mk-act-btn {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px solid #e5e7eb;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .mk-act-edit { color: #6366f1; }
        .mk-act-edit:hover { background: #6366f1; color: #fff; border-color: #6366f1; }
        .mk-act-del { color: #ef4444; }
        .mk-act-del:hover { background: #ef4444; color: #fff; border-color: #ef4444; }

        @keyframes mk-pulse {
          0%, 100% { opacity: 0.3; transform: translate(-50%, calc(-50% - 12px)) scale(1); }
          50% { opacity: 0.6; transform: translate(-50%, calc(-50% - 12px)) scale(1.05); }
        }
      `}</style>
    </div>
  );
}
