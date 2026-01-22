/**
 * Pipeline Configuration
 * Slot-based composition for different verticals
 */
export interface SlotConfig {
  id: string;
  component: string;
  label: string;
  position: 'left' | 'center' | 'right';
  width?: string;
  order: number;
}
export interface VerticalConfig {
  id: string;
  name: string;
  description: string;
  slots: SlotConfig[];
}
export const PIPELINE_CONFIG: Record<string, VerticalConfig> = {
  // Education vertical (Counselor + Student)
  education: {
    id: 'education',
    name: 'Education',
    description: 'Student admissions and counselor management',
    slots: [
      {
        id: 'lead-details',
        component: 'LeadDetailsSlot',
        label: 'Student Details',
        position: 'left',
        width: '350px',
        order: 1,
      },
      {
        id: 'education-student',
        component: 'EducationStudentSlot',
        label: 'Academic Info',
        position: 'center',
        width: 'flex-1',
        order: 2,
      },
      {
        id: 'counsellor-schedule',
        component: 'CounsellorScheduleSlot',
        label: 'Counselor Schedule',
        position: 'right',
        width: '400px',
        order: 3,
      },
    ],
  },
  // SaaS B2B vertical
  saas: {
    id: 'saas',
    name: 'SaaS B2B',
    description: 'Enterprise sales pipeline',
    slots: [
      {
        id: 'lead-details',
        component: 'LeadDetailsSlot',
        label: 'Lead Details',
        position: 'left',
        width: '350px',
        order: 1,
      },
      {
        id: 'company-info',
        component: 'CompanyInfoSlot',
        label: 'Company Info',
        position: 'center',
        width: '400px',
        order: 2,
      },
      {
        id: 'engagement-history',
        component: 'EngagementHistorySlot',
        label: 'Engagement',
        position: 'right',
        width: 'flex-1',
        order: 3,
      },
    ],
  },
  // Real Estate vertical
  realestate: {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Property sales and rentals',
    slots: [
      {
        id: 'lead-details',
        component: 'LeadDetailsSlot',
        label: 'Client Details',
        position: 'left',
        width: '350px',
        order: 1,
      },
      {
        id: 'property-preferences',
        component: 'PropertyPreferencesSlot',
        label: 'Property Preferences',
        position: 'center',
        width: '400px',
        order: 2,
      },
      {
        id: 'viewing-schedule',
        component: 'ViewingScheduleSlot',
        label: 'Viewings',
        position: 'right',
        width: 'flex-1',
        order: 3,
      },
    ],
  },
  // Generic/Default vertical
  default: {
    id: 'default',
    name: 'Default',
    description: 'Generic sales pipeline',
    slots: [
      {
        id: 'lead-details',
        component: 'LeadDetailsSlot',
        label: 'Lead Details',
        position: 'left',
        width: '350px',
        order: 1,
      },
      {
        id: 'activity-timeline',
        component: 'ActivityTimelineSlot',
        label: 'Activity Timeline',
        position: 'center',
        width: 'flex-1',
        order: 2,
      },
    ],
  },
};
/**
 * Get pipeline configuration for a specific vertical
 */
export function getPipelineConfig(vertical: string = 'default'): VerticalConfig {
  return PIPELINE_CONFIG[vertical] || PIPELINE_CONFIG.default;
}
/**
 * Get slots for a specific vertical
 */
export function getSlots(vertical: string = 'default'): SlotConfig[] {
  const config = getPipelineConfig(vertical);
  return config.slots.sort((a, b) => a.order - b.order);
}