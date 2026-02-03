'use client';
import React, { useMemo } from 'react';
import { getPipelineConfig, getSlots } from './config/pipelineConfig';
import LeadDetailsSlot from './slots/LeadDetailsSlot';
import EducationStudentSlot from './slots/EducationStudentSlot';
import CounsellorScheduleSlot from './slots/CounsellorScheduleSlot';
interface SlotBasedPipelineBoardProps {
  vertical?: string;
  leadData: any;
  onUpdate?: (updates: any) => void;
  readonly?: boolean;
}
/**
 * Slot-Based Pipeline Board
 * Dynamically renders slots based on vertical configuration
 */
export default function SlotBasedPipelineBoard({ 
  vertical = 'default', 
  leadData, 
  onUpdate, 
  readonly = false 
}: SlotBasedPipelineBoardProps) {
  const config = useMemo(() => getPipelineConfig(vertical), [vertical]);
  const slots = useMemo(() => getSlots(vertical), [vertical]);
  // Component mapping
  const componentMap: Record<string, React.ComponentType<any>> = {
    LeadDetailsSlot,
    EducationStudentSlot,
    CounsellorScheduleSlot,
    // Add more slot components here as they're created
  };
  const renderSlot = (slotConfig: any) => {
    const Component = componentMap[slotConfig.component];
    if (!Component) {
      return (
        <div key={slotConfig.id} className="border rounded-lg p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            Slot "{slotConfig.component}" not implemented
          </p>
        </div>
      );
    }
    // Map slot props based on component type
    const commonProps = {
      readonly,
      onUpdate,
    };
    // Component-specific props
    const componentProps: Record<string, any> = {
      LeadDetailsSlot: {
        lead: leadData,
        ...commonProps,
      },
      EducationStudentSlot: {
        student: leadData,
        ...commonProps,
      },
      CounsellorScheduleSlot: {
        studentId: leadData?.id,
        appointments: leadData?.appointments || [],
        onSchedule: (apt: any) => {
          // Handle appointment scheduling
        },
        ...commonProps,
      },
    };
    const props = componentProps[slotConfig.component] || commonProps;
    return (
      <div
        key={slotConfig.id}
        style={{ width: slotConfig.width }}
        className="flex-shrink-0"
      >
        <Component {...props} />
      </div>
    );
  };
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="text-2xl font-bold">{config.name} Pipeline</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </div>
      {/* Slot Container */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-4 p-4 h-full">
          {slots.map((slot) => renderSlot(slot))}
        </div>
      </div>
    </div>
  );
}