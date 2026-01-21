"use client";
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Phone, 
  Bot, 
  UserCheck,
  Calendar as CalendarIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addDays, isToday } from 'date-fns';
import { WidgetWrapper } from '../WidgetWrapper';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDashboardStore } from '@/store/dashboardStore';
import { CalendarEvent } from '@/types/dashboard';
import { cn } from '@/lib/utils';

interface CalendarWidgetProps {
  id: string;
}

const eventTypeConfig = {
  call: { 
    icon: Phone, 
    className: 'event-call',
    label: 'Scheduled Call'
  },
  'ai-task': { 
    icon: Bot, 
    className: 'event-ai',
    label: 'AI Task'
  },
  followup: { 
    icon: UserCheck, 
    className: 'event-followup',
    label: 'Follow-up'
  },
  meeting: { 
    icon: CalendarIcon, 
    className: 'event-meeting',
    label: 'Meeting'
  },
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ id }) => {
  const { 
    calendarEvents, 
    calendarViewMode, 
    setCalendarViewMode,
    selectedDate,
    setSelectedDate,
    addCalendarEvent,
  } = useDashboardStore();
  
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    type: 'call' as CalendarEvent['type'],
    startTime: '09:00',
    endTime: '09:30',
    description: '',
    agentName: '',
    leadName: '',
  });

  // Calendar calculations
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Week view calculations
  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event => 
      isSameDay(new Date(event.date), date)
    );
  };

  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const handlePrevWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const handleNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

  const handleAddEvent = () => {
    const duration = calculateDuration(newEvent.startTime, newEvent.endTime);
    addCalendarEvent({
      title: newEvent.title || `${eventTypeConfig[newEvent.type].label}`,
      type: newEvent.type,
      date: selectedDate,
      startTime: newEvent.startTime,
      endTime: newEvent.endTime,
      duration,
      description: newEvent.description,
      agentName: newEvent.agentName,
      leadName: newEvent.leadName,
    });
    setIsAddEventOpen(false);
    setNewEvent({
      title: '',
      type: 'call',
      startTime: '09:00',
      endTime: '09:30',
      description: '',
      agentName: '',
      leadName: '',
    });
  };

  const calculateDuration = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  return (
    <WidgetWrapper
      id={id}
      title="Calendar & Scheduler"
      headerActions={
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={calendarViewMode === 'month' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setCalendarViewMode('month')}
            >
              Month
            </Button>
            <Button
              size="sm"
              variant={calendarViewMode === 'week' ? 'default' : 'ghost'}
              className="h-7 px-3 text-xs"
              onClick={() => setCalendarViewMode('week')}
            >
              Week
            </Button>
          </div>
          
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 px-3 text-xs gap-1">
                <Plus className="h-3 w-3" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add Event</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title..."
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label>Event Type</Label>
                  <Select
                    value={newEvent.type}
                    onValueChange={(value: CalendarEvent['type']) => 
                      setNewEvent({ ...newEvent, type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">📞 Scheduled Call</SelectItem>
                      <SelectItem value="ai-task">🤖 AI Task</SelectItem>
                      <SelectItem value="followup">✅ Follow-up</SelectItem>
                      <SelectItem value="meeting">📅 Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Start Time</Label>
                    <Input
                      type="time"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    />
                  </div>
                </div>
                
                {(newEvent.type === 'call' || newEvent.type === 'followup') && (
                  <div className="grid gap-2">
                    <Label>Lead Name</Label>
                    <Input
                      value={newEvent.leadName}
                      onChange={(e) => setNewEvent({ ...newEvent, leadName: e.target.value })}
                      placeholder="Contact name..."
                    />
                  </div>
                )}
                
                {newEvent.type === 'ai-task' && (
                  <div className="grid gap-2">
                    <Label>AI Agent</Label>
                    <Select
                      value={newEvent.agentName}
                      onValueChange={(value) => setNewEvent({ ...newEvent, agentName: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select agent..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sales Qualifier">Sales Qualifier</SelectItem>
                        <SelectItem value="Appointment Setter">Appointment Setter</SelectItem>
                        <SelectItem value="Follow-up Agent">Follow-up Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <div className="grid gap-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Add notes..."
                    rows={2}
                  />
                </div>
                
                <Button onClick={handleAddEvent} className="mt-2">
                  Add Event
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="h-full flex flex-col">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={calendarViewMode === 'month' ? handlePrevMonth : handlePrevWeek}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="font-semibold text-sm">
            {calendarViewMode === 'month' 
              ? format(selectedDate, 'MMMM yyyy')
              : `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
            }
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={calendarViewMode === 'month' ? handleNextMonth : handleNextWeek}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Month View */}
        {calendarViewMode === 'month' && (
          <div className="flex-1">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const events = getEventsForDate(day);
                const isCurrentMonth = isSameMonth(day, selectedDate);
                const isSelected = isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                
                return (
                  <motion.div
                    key={day.toISOString()}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'relative p-1 min-h-[60px] rounded-lg border cursor-pointer transition-colors',
                      !isCurrentMonth && 'opacity-40',
                      isSelected && 'border-primary bg-primary text-white',
                      isTodayDate && !isSelected && 'border-primary/50 bg-primary/5',
                      !isSelected && !isTodayDate && 'border-transparent hover:border-border hover:bg-secondary/50'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isTodayDate && !isSelected && 'text-primary',
                      isSelected && 'text-white'
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {events.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 2).map((event) => {
                          const config = eventTypeConfig[event.type];
                          return (
                            <div
                              key={event.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded truncate border transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                                config.className
                              )}
                            >
                              {event.title}
                            </div>
                          );
                        })}
                        {events.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{events.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {calendarViewMode === 'week' && (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <div className="min-w-[600px]">
              {/* Day headers */}
              <div className="grid grid-cols-8 border-b border-border">
                <div className="p-2" /> {/* Time column spacer */}
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'p-2 text-center border-l border-border',
                      isToday(day) && 'bg-primary/5'
                    )}
                  >
                    <p className="text-xs text-muted-foreground">{format(day, 'EEE')}</p>
                    <p className={cn(
                      'text-lg font-semibold',
                      isToday(day) && 'text-primary'
                    )}>
                      {format(day, 'd')}
                    </p>
                  </div>
                ))}
              </div>
              
              {/* Time slots */}
              <div className="relative">
                {hours.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b border-border/50">
                    <div className="p-2 text-xs text-muted-foreground text-right pr-3">
                      {hour}:00
                    </div>
                    {weekDays.map((day) => {
                      const dayEvents = getEventsForDate(day).filter(e => {
                        const eventHour = parseInt(e.startTime.split(':')[0]);
                        return eventHour === hour;
                      });
                      
                      return (
                        <div
                          key={day.toISOString()}
                          className="min-h-[50px] border-l border-border/50 p-1 relative"
                        >
                          {dayEvents.map((event) => {
                            const config = eventTypeConfig[event.type];
                            const Icon = config.icon;
                            return (
                              <div
                                key={event.id}
                                className={cn(
                                  'text-xs p-1.5 rounded border mb-1 flex items-center gap-1 transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                                  config.className
                                )}
                              >
                                <Icon className="h-3 w-3 shrink-0" />
                                <span className="truncate">{event.title}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Selected Date Events */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            <span className="text-xs text-muted-foreground">
              {getEventsForDate(selectedDate).length} events
            </span>
          </div>
          <div className="space-y-2 max-h-[120px] overflow-auto custom-scrollbar">
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No events scheduled
              </p>
            ) : (
              getEventsForDate(selectedDate).map((event) => {
                const config = eventTypeConfig[event.type];
                const Icon = config.icon;
                return (
                  <div
                    key={event.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg border transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                      config.className
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs opacity-75">
                        {event.startTime} - {event.endTime}
                        {event.leadName && ` · ${event.leadName}`}
                        {event.agentName && ` · ${event.agentName}`}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
};
