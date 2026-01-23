import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  DashboardLayout, 
  WidgetLayoutItem, 
  DEFAULT_LAYOUT,
  CalendarEvent,
  WidgetType,
  WIDGET_CATALOG,
  generateWidgetId,
} from '@/types/dashboard';
interface DashboardState {
  // Edit mode
  isEditMode: boolean;
  setEditMode: (mode: boolean) => void;
  toggleEditMode: () => void;
  // Current layout
  layout: WidgetLayoutItem[];
  setLayout: (layout: WidgetLayoutItem[]) => void;
  // Saved layouts
  savedLayouts: DashboardLayout[];
  currentLayoutId: string | null;
  saveCurrentLayout: (name: string) => void;
  loadLayout: (layoutId: string) => void;
  deleteLayout: (layoutId: string) => void;
  resetToDefault: () => void;
  // Widget management
  addWidget: (type: WidgetType) => void;
  removeWidget: (widgetId: string) => void;
  // Calendar events
  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, event: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  // Calendar view mode
  calendarViewMode: 'month' | 'week';
  setCalendarViewMode: (mode: 'month' | 'week') => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  // Widget library drawer
  isWidgetLibraryOpen: boolean;
  setWidgetLibraryOpen: (open: boolean) => void;
}
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      // Edit mode
      isEditMode: false,
      setEditMode: (mode) => set({ isEditMode: mode }),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
      // Current layout
      layout: DEFAULT_LAYOUT,
      setLayout: (layout) => set({ layout }),
      // Saved layouts
      savedLayouts: [],
      currentLayoutId: null,
      saveCurrentLayout: (name) => {
        const { layout, savedLayouts } = get();
        const newLayout: DashboardLayout = {
          id: `layout-${Date.now()}`,
          name,
          widgets: layout,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set({
          savedLayouts: [...savedLayouts, newLayout],
          currentLayoutId: newLayout.id,
        });
      },
      loadLayout: (layoutId) => {
        const { savedLayouts } = get();
        const layout = savedLayouts.find((l) => l.id === layoutId);
        if (layout) {
          set({
            layout: layout.widgets,
            currentLayoutId: layoutId,
          });
        }
      },
      deleteLayout: (layoutId) => {
        const { savedLayouts, currentLayoutId } = get();
        set({
          savedLayouts: savedLayouts.filter((l) => l.id !== layoutId),
          currentLayoutId: currentLayoutId === layoutId ? null : currentLayoutId,
        });
      },
      resetToDefault: () => {
        set({
          layout: DEFAULT_LAYOUT,
          currentLayoutId: null,
        });
      },
      // Widget management
      addWidget: (type) => {
        const { layout } = get();
        const config = WIDGET_CATALOG[type];
        const widgetId = generateWidgetId(type);
        // Find the lowest y position to place the new widget
        const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        const newWidget: WidgetLayoutItem = {
          i: widgetId,
          x: 0,
          y: maxY,
          w: config.defaultSize.w,
          h: config.defaultSize.h,
          minW: config.minSize.w,
          minH: config.minSize.h,
          maxW: config.maxSize?.w,
          maxH: config.maxSize?.h,
        };
        set({ layout: [...layout, newWidget] });
      },
      removeWidget: (widgetId) => {
        const { layout } = get();
        set({ layout: layout.filter((item) => item.i !== widgetId) });
      },
      // Calendar events
      calendarEvents: [
        {
          id: 'demo-1',
          title: 'Follow-up: John Smith',
          type: 'followup',
          date: new Date(),
          startTime: '10:00',
          endTime: '10:30',
          duration: 30,
          description: 'Discuss proposal details',
          leadName: 'John Smith',
        },
        {
          id: 'demo-2',
          title: 'AI Agent: Lead Qualification',
          type: 'ai-task',
          date: new Date(),
          startTime: '14:00',
          endTime: '15:00',
          duration: 60,
          agentName: 'Sales Qualifier',
        },
        {
          id: 'demo-3',
          title: 'Scheduled Call: Sarah Johnson',
          type: 'call',
          date: new Date(Date.now() + 86400000),
          startTime: '11:00',
          endTime: '11:30',
          duration: 30,
          leadName: 'Sarah Johnson',
        },
      ],
      addCalendarEvent: (event) => {
        const { calendarEvents } = get();
        const newEvent: CalendarEvent = {
          ...event,
          id: `event-${Date.now()}`,
        };
        set({ calendarEvents: [...calendarEvents, newEvent] });
      },
      updateCalendarEvent: (id, updates) => {
        const { calendarEvents } = get();
        set({
          calendarEvents: calendarEvents.map((event) =>
            event.id === id ? { ...event, ...updates } : event
          ),
        });
      },
      deleteCalendarEvent: (id) => {
        const { calendarEvents } = get();
        set({ calendarEvents: calendarEvents.filter((e) => e.id !== id) });
      },
      // Calendar view
      calendarViewMode: 'month',
      setCalendarViewMode: (mode) => set({ calendarViewMode: mode }),
      selectedDate: new Date(),
      setSelectedDate: (date) => set({ selectedDate: date }),
      // Widget library
      isWidgetLibraryOpen: false,
      setWidgetLibraryOpen: (open) => set({ isWidgetLibraryOpen: open }),
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        layout: state.layout,
        savedLayouts: state.savedLayouts,
        currentLayoutId: state.currentLayoutId,
        calendarEvents: state.calendarEvents,
      }),
    }
  )
);