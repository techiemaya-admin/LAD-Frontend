// Widget types and configuration
export type WidgetType = 
  | 'calls-today'
  | 'answer-rate'
  | 'calls-monthly'
  | 'calls-chart'
  | 'credits-overview'
  | 'latest-calls'
  | 'calendar'
  | 'ai-insights'
  | 'voice-agents'
  | 'quick-actions';

export type WidgetCategory = 
  | 'analytics'
  | 'voice-agent'
  | 'credits'
  | 'calendar'
  | 'ai-insights';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  description: string;
  category: WidgetCategory;
  icon: string;
  defaultSize: { w: number; h: number };
  minSize: { w: number; h: number };
  maxSize?: { w: number; h: number };
}

export interface WidgetLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetLayoutItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'call' | 'ai-task' | 'followup' | 'meeting';
  date: Date;
  startTime: string;
  endTime: string;
  duration: number; // in minutes
  description?: string;
  agentId?: string;
  agentName?: string;
  leadName?: string;
  color?: string;
}

// Widget catalog with all available widgets
export const WIDGET_CATALOG: Record<WidgetType, WidgetConfig> = {
  'calls-today': {
    id: 'calls-today',
    type: 'calls-today',
    title: 'Calls Today',
    description: 'Track daily call volume with comparison to yesterday',
    category: 'analytics',
    icon: 'Phone',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
  },
  'answer-rate': {
    id: 'answer-rate',
    type: 'answer-rate',
    title: 'Answer Rate',
    description: 'Weekly answer rate with trend indicator',
    category: 'analytics',
    icon: 'CheckCircle',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
  },
  'calls-monthly': {
    id: 'calls-monthly',
    type: 'calls-monthly',
    title: 'Monthly Calls',
    description: 'Total calls this month vs previous period',
    category: 'analytics',
    icon: 'TrendingUp',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
  },
  'calls-chart': {
    id: 'calls-chart',
    type: 'calls-chart',
    title: 'Calls Chart',
    description: 'Visual call analytics over time',
    category: 'analytics',
    icon: 'BarChart3',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 6 },
  },
  'credits-overview': {
    id: 'credits-overview',
    type: 'credits-overview',
    title: 'Credits Overview',
    description: 'Monitor your credit balance and usage',
    category: 'credits',
    icon: 'CreditCard',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  'latest-calls': {
    id: 'latest-calls',
    type: 'latest-calls',
    title: 'Latest Calls',
    description: 'Recent AI-handled calls with status',
    category: 'voice-agent',
    icon: 'PhoneCall',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    maxSize: { w: 12, h: 8 },
  },
  'calendar': {
    id: 'calendar',
    type: 'calendar',
    title: 'Calendar & Scheduler',
    description: 'Schedule calls, follow-ups, and AI tasks',
    category: 'calendar',
    icon: 'Calendar',
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 4 },
    maxSize: { w: 12, h: 8 },
  },
  'ai-insights': {
    id: 'ai-insights',
    type: 'ai-insights',
    title: 'AI Insights',
    description: 'Smart recommendations from your AI agents',
    category: 'ai-insights',
    icon: 'Brain',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
  },
  'voice-agents': {
    id: 'voice-agents',
    type: 'voice-agents',
    title: 'Voice Agents',
    description: 'Overview of your active voice agents',
    category: 'voice-agent',
    icon: 'Bot',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  'quick-actions': {
    id: 'quick-actions',
    type: 'quick-actions',
    title: 'Quick Actions',
    description: 'Common actions at your fingertips',
    category: 'voice-agent',
    icon: 'Zap',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
  },
};

// Widget categories for the library
export const WIDGET_CATEGORIES: { id: WidgetCategory; label: string; icon: string }[] = [
  { id: 'analytics', label: 'Analytics', icon: 'BarChart3' },
  { id: 'voice-agent', label: 'Voice Agent', icon: 'Phone' },
  { id: 'credits', label: 'Credits & Usage', icon: 'CreditCard' },
  { id: 'calendar', label: 'Calendar & Scheduling', icon: 'Calendar' },
  { id: 'ai-insights', label: 'AI Insights', icon: 'Brain' },
];

// Default dashboard layout
export const DEFAULT_LAYOUT: WidgetLayoutItem[] = [
  { i: 'calls-today-1', x: 0, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: 'answer-rate-1', x: 4, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: 'calls-monthly-1', x: 8, y: 0, w: 4, h: 2, minW: 3, minH: 2 },
  { i: 'calls-chart-1', x: 0, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'voice-agents-1', x: 6, y: 2, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'credits-overview-1', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'latest-calls-1', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'calendar-1', x: 0, y: 10, w: 12, h: 5, minW: 4, minH: 4 },
];

// Helper to extract widget type from layout item id
export const getWidgetTypeFromId = (id: string): WidgetType | null => {
  const match = id.match(/^([a-z-]+)-\d+$/);
  if (match && match[1] in WIDGET_CATALOG) {
    return match[1] as WidgetType;
  }
  return null;
};

// Generate unique widget id
export const generateWidgetId = (type: WidgetType): string => {
  return `${type}-${Date.now()}`;
};
