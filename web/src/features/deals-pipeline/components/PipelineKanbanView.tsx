// PipelineKanbanView.tsx
import React, { useMemo, useCallback } from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import PipelineStageColumn from './PipelineStageColumn';
import PipelineLeadCard from './PipelineLeadCard';
import { Stage } from '../store/slices/pipelineSlice';
import type { Lead } from '@/features/deals-pipeline/types';
import { User } from '@/store/slices/usersSlice';

interface LeadsByStage {
  [stageKey: string]: {
    stage: Stage & { name?: string; label?: string; order?: number; display_order?: number; totalStages?: number };
    leads: Lead[];
  };
}

interface PipelineKanbanViewHandlers {
  onStageUpdate?: () => void;
  onStageDelete?: () => void;
  onEdit?: (lead: Lead) => void;
  onDelete?: (leadId: string | number) => void;
  onStatusChange?: (leadId: string | number, newStatus: string) => void;
  onUpdateStage?: (stageKey: string, updates: Record<string, unknown>) => Promise<void>;
  onDeleteStageAction?: (stageKey: string) => Promise<void>;
}

interface PipelineKanbanViewProps {
  stages: Array<Stage & { name?: string; label?: string; order?: number; display_order?: number; totalStages?: number; key?: string; id?: string }>;
  leadsByStage: LeadsByStage;
  activeCard?: Lead | null;
  zoom?: number;
  teamMembers?: User[];
  onDragStart?: (event: unknown) => void;
  onDragEnd?: (event: unknown) => void;
  onDragCancel?: () => void;
  handlers?: PipelineKanbanViewHandlers;
  enableDragAndDrop?: boolean;
  compactView?: boolean;
  showCardCount?: boolean;
  showTotalValue?: boolean;
}

const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  stages,
  leadsByStage,
  activeCard,
  zoom = 1,
  teamMembers = [],
  handlers,
  enableDragAndDrop = true,
  compactView = false,
  showCardCount = true,
  showTotalValue = true
}) => {
  // Debug log to check props
  console.log('[PipelineKanbanView] Received props:', { compactView, showCardCount, showTotalValue, enableDragAndDrop });
  
  // Memoize sortable stage IDs array
  const sortableStageIds = useMemo(
    () => stages.map(s => s.key || String(s.id)),
    [stages]
  );

  // Memoize individual handler callbacks to prevent reference changes
  const onStageUpdate = useCallback(() => {
    handlers?.onStageUpdate?.();
  }, [handlers?.onStageUpdate]);

  const onStageDelete = useCallback(() => {
    handlers?.onStageDelete?.();
  }, [handlers?.onStageDelete]);

  const onEdit = useCallback((lead: Lead) => {
    handlers?.onEdit?.(lead);
  }, [handlers?.onEdit]);

  const onDelete = useCallback((leadId: string | number) => {
    handlers?.onDelete?.(leadId);
  }, [handlers?.onDelete]);

  const onStatusChange = useCallback((leadId: string | number, newStatus: string) => {
    handlers?.onStatusChange?.(leadId, newStatus);
  }, [handlers?.onStatusChange]);

  const onUpdateStage = useCallback(async (stageKey: string, updates: Record<string, unknown>) => {
    await handlers?.onUpdateStage?.(stageKey, updates);
  }, [handlers?.onUpdateStage]);

  const onDeleteStageAction = useCallback(async (stageKey: string) => {
    await handlers?.onDeleteStageAction?.(stageKey);
  }, [handlers?.onDeleteStageAction]);

  return (
    <>
      <div
        className="flex gap-2 min-h-[calc(100vh-200px)] pb-4 px-2 pr-2"
      >
        <SortableContext items={sortableStageIds} strategy={horizontalListSortingStrategy}>
          {stages.map((stage, index) => {
            // Use a combination of key, id, and index to ensure uniqueness
            const stageKey = stage.key || stage.id || `stage-${index}`;
            const uniqueKey = `${stageKey}-${index}`;
            const stageData = leadsByStage[stageKey] || { stage, leads: [] };
            const { leads = [] } = stageData;

            return (
              <div
                key={uniqueKey}
                className="min-w-[280px] sm:min-w-[320px] md:min-w-[350px] max-w-[280px] sm:max-w-[320px] md:max-w-[350px] transition-transform duration-200 ease-in-out"
                style={{
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <PipelineStageColumn
                  stage={stage}
                  leads={leads || []}
                  teamMembers={teamMembers}
                  droppableId={stageKey}
                  activeCardId={activeCard ? activeCard.id : null}
                  onStageUpdate={onStageUpdate}
                  onStageDelete={onStageDelete}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  allStages={stages}
                  handlers={{
                    onUpdateStage,
                    onDeleteStageAction
                  }}
                  compactView={compactView}
                  showCardCount={showCardCount}
                  showTotalValue={showTotalValue}
                />
              </div>
            );
          })}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCard ? (
          <PipelineLeadCard lead={activeCard} isPreview={true} />
        ) : null}
      </DragOverlay>
    </>
  );
};

// Wrap in React.memo to prevent unnecessary re-renders
export default React.memo(PipelineKanbanView, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.stages.length === nextProps.stages.length &&
    prevProps.activeCard?.id === nextProps.activeCard?.id &&
    prevProps.zoom === nextProps.zoom &&
    (prevProps.teamMembers?.length || 0) === (nextProps.teamMembers?.length || 0) &&
    prevProps.compactView === nextProps.compactView &&
    prevProps.showCardCount === nextProps.showCardCount &&
    prevProps.showTotalValue === nextProps.showTotalValue &&
    prevProps.enableDragAndDrop === nextProps.enableDragAndDrop &&
    // Check if leadsByStage keys changed (stages added/removed)
    Object.keys(prevProps.leadsByStage).length === Object.keys(nextProps.leadsByStage).length &&
    // Check if leads in each stage changed
    Object.keys(prevProps.leadsByStage).every(key => 
      prevProps.leadsByStage[key]?.leads?.length === nextProps.leadsByStage[key]?.leads?.length
    )
  );
});

