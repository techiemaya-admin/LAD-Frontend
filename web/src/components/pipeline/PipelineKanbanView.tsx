// PipelineKanbanView.tsx
import React, { useMemo } from 'react';
import { DragOverlay } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import PipelineStageColumn from './PipelineStageColumn';
import PipelineLeadCard from './PipelineLeadCard';
import { Stage } from '../../store/slices/pipelineSlice';
import { Lead } from '../leads/types';
import { User } from '../../store/slices/usersSlice';

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
}

const PipelineKanbanView: React.FC<PipelineKanbanViewProps> = ({
  stages,
  leadsByStage,
  activeCard,
  zoom = 1,
  teamMembers = [],
  handlers,
  enableDragAndDrop = true
}) => {
  // Memoize stage columns
  const stageColumns = useMemo(() => {
    return stages.map((stage) => {
      const stageKey = stage.key || String(stage.id);
      const stageData = leadsByStage[stageKey] || { stage, leads: [] };
      const { leads = [] } = stageData;

      return (
        <div
          key={stageKey}
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
            onStageUpdate={handlers?.onStageUpdate}
            onStageDelete={handlers?.onStageDelete}
            onEdit={handlers?.onEdit}
            onDelete={handlers?.onDelete}
            onStatusChange={handlers?.onStatusChange}
            zoom={zoom}
            allStages={stages}
            handlers={{
              onUpdateStage: handlers?.onUpdateStage,
              onDeleteStageAction: handlers?.onDeleteStageAction
            }}
          />
        </div>
      );
    });
  }, [stages, leadsByStage, activeCard, zoom, handlers, teamMembers]);

  return (
    <>
      <div
        className="flex gap-2 min-h-[calc(100vh-200px)] pb-4 px-2 pr-2"
      >
        <SortableContext items={stages.map(s => s.key || String(s.id))} strategy={horizontalListSortingStrategy}>
          {stageColumns}
        </SortableContext>
      </div>

      <DragOverlay>
        {activeCard ? (
          <PipelineLeadCard lead={activeCard} isPreview={true} zoom={zoom} />
        ) : null}
      </DragOverlay>
    </>
  );
};

export default PipelineKanbanView;

