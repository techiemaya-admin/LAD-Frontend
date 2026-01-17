 import React from 'react';
import { cn } from '@/lib/utils';
import { Handle, Position, NodeProps } from 'reactflow';
import { StepType } from '@/types/campaign';
import { getNodeClasses, getNodeIcon } from './workflowNodeUtils';
import { Trash2, Edit3, Clock } from 'lucide-react';
import { useOnboardingStore } from '@/store/onboardingStore';

// Custom Node Component with Modern Trending Design
export function CustomWorkflowNode({ data, id, selected }: NodeProps) {
  const stepType: StepType = data?.type as StepType || 'linkedin_visit';
  const nodeClasses = getNodeClasses(stepType);
  const { removeWorkflowStep, setSelectedNodeId } = useOnboardingStore();
  
  const getPreviewText = () => {
    if (data?.description) return data.description;
    if (data?.message) return data.message.substring(0, 50) + '...';
    if (data?.subject) return data.subject;
    return stepType;
  };
  
  // Check if this step can be deleted (not start or end nodes)
  const canDelete = stepType !== 'start' && stepType !== 'end';
  
  // Check if this step can be edited (not start or end nodes)
  const canEdit = stepType !== 'start' && stepType !== 'end';
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDelete && id) {
      removeWorkflowStep(id);
    }
  };
  
  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canEdit && id) {
      // Dispatch custom event to open step editor
      window.dispatchEvent(new CustomEvent('openStepEditor', { 
        detail: { stepId: id, stepData: data } 
      }));
    }
  };
  
  return (
    <div
      onClick={canEdit ? handleEdit : undefined}
      className={cn(
        'min-w-[240px] max-w-[300px] rounded-3xl transition-all duration-300 overflow-hidden',
        'border-2 border-white/20 backdrop-blur-xl',
        'shadow-2xl',
        nodeClasses.shadow,
        selected 
          ? 'ring-4 ring-white/50 scale-105' 
          : 'hover:scale-[1.02]',
        nodeClasses.glow,
        canEdit && 'cursor-pointer'
      )}
    >
      <Handle 
        type="target" 
        position={Position.Top} 
        className={cn('w-3 h-3 border-4 border-white shadow-lg', nodeClasses.icon)}
      />
      
      {/* Gradient Header with Icon */}
      <div
        className={cn(
          'px-6 py-5 flex items-center gap-4 bg-gradient-to-br relative',
          nodeClasses.gradient
        )}
      >
        {/* Animated Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-black/20 opacity-50" />
        
        {/* Icon Circle with Modern Design */}
        <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-white/25 backdrop-blur-md flex items-center justify-center text-white shadow-2xl border border-white/30">
          {getNodeIcon(stepType)}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent opacity-60" />
        </div>
        
        {/* Title */}
        <span className="text-base font-bold text-white drop-shadow-lg truncate flex-1 relative z-10">
          {data?.title || stepType}
        </span>
        
        {/* Edit Button - only show for editable steps */}
        {canEdit && (
          <button
            onClick={handleEdit}
            className="relative z-10 flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-blue-500/90 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 hover:scale-110 border border-white/30 group"
            title="Edit step"
          >
            <Edit3 className="w-4 h-4 group-hover:animate-pulse" />
          </button>
        )}
        
        {/* Delete Button - only show for deletable steps */}
        {canDelete && (
          <button
            onClick={handleDelete}
            className="relative z-10 flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-red-500/90 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 hover:scale-110 border border-white/30 group"
            title="Delete step"
          >
            <Trash2 className="w-4 h-4 group-hover:animate-pulse" />
          </button>
        )}
      </div>
      
      {/* Content Body with Glass Effect */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-md">
        {stepType === 'condition' && (
          <div>
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <div className={cn('w-1.5 h-1.5 rounded-full', nodeClasses.icon)} />
              Condition
            </div>
            <div className="text-xs font-semibold text-gray-900 leading-relaxed">
              {data?.conditionType || 'Check status'}
            </div>
          </div>
        )}
        {stepType === 'delay' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                Wait Period
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {data?.description || data?.title || '1 day'}
              </div>
            </div>
          </div>
        )}
        {stepType !== 'delay' && stepType !== 'condition' && stepType !== 'start' && stepType !== 'end' && (
          <div>
            <div className="text-xs text-gray-700 leading-relaxed line-clamp-2 font-medium">
              {getPreviewText()}
            </div>
            {stepType === 'lead_generation' && data?.leadLimit && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs font-semibold text-indigo-600">
                  Leads per day: {data.leadLimit}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {stepType === 'condition' ? (
        <>
          <Handle 
            type="source" 
            position={Position.Left} 
            id="false" 
            className={cn('w-2.5 h-2.5 border-3 border-white shadow-lg bg-red-500')}
          />
          <Handle 
            type="source" 
            position={Position.Right} 
            id="true" 
            className={cn('w-2.5 h-2.5 border-3 border-white shadow-lg bg-emerald-500')}
          />
        </>
      ) : (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className={cn('w-2.5 h-2.5 border-3 border-white shadow-lg', nodeClasses.icon)}
        />
      )}
    </div>
  );
}
