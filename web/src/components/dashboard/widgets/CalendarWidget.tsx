"use client";
import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Phone, 
  Bot, 
  UserCheck,
  Calendar as CalendarIcon,
  Loader2
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
import { useDashboardUsers, useBookings } from '@sdk/features/dashboard/hooks';

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
    calendarViewMode, 
    setCalendarViewMode,
    selectedDate,
    setSelectedDate,
  } = useDashboardStore();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  // Fetch users and bookings using SDK hooks
  const { data: users = [], isLoading: isLoadingUsers } = useDashboardUsers();
  const { data: bookings = [], isLoading: isLoadingBookings } = useBookings(selectedUserId || undefined);

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
    return bookings.filter((booking: any) => 
      isSameDay(new Date(booking.scheduled_at), date)
    );
  };
  const handlePrevMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const handleNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const handlePrevWeek = () => setSelectedDate(addDays(selectedDate, -7));
  const handleNextWeek = () => setSelectedDate(addDays(selectedDate, 7));

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
          {/* User Selector */}
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[180px] h-7 text-xs">
              <SelectValue placeholder="Select user..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user: any) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
                      isSelected && 'border-accent bg-accent/5',
                      isTodayDate && !isSelected && 'border-primary/50 bg-primary/5',
                      !isSelected && !isTodayDate && 'border-transparent hover:border-border hover:bg-secondary/50'
                    )}
                  >
                    <span className={cn(
                      'text-xs font-medium',
                      isTodayDate && 'text-primary',
                      isSelected && 'text-accent'
                    )}>
                      {format(day, 'd')}
                    </span>
                    {events.length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {events.slice(0, 2).map((booking: any) => {
                          const type = booking.booking_type === 'auto_followup' ? 'followup' : 'call';
                          const config = eventTypeConfig[type];
                          return (
                            <div
                              key={booking.id}
                              className={cn(
                                'text-[10px] px-1 py-0.5 rounded border transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                                config.className
                              )}
                              title={`Type: ${booking.booking_type}\nSource: ${booking.booking_source}`}
                            >
                              <div className="text-[9px] opacity-75 truncate">{booking.booking_type} · {booking.booking_source}</div>
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
                      const dayEvents = getEventsForDate(day).filter((e: any) => {
                        const eventHour = parseInt(e.scheduled_at.split('T')[1].split(':')[0]);
                        return eventHour === hour;
                      });
                      return (
                        <div
                          key={day.toISOString()}
                          className="min-h-[50px] border-l border-border/50 p-1 relative"
                        >
                          {dayEvents.map((booking: any) => {
                            const type = booking.booking_type === 'auto_followup' ? 'followup' : 'call';
                            const config = eventTypeConfig[type];
                            const Icon = config.icon;
                            return (
                              <div
                                key={booking.id}
                                className={cn(
                                  'text-xs p-1.5 rounded border mb-1 flex items-center gap-1 transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                                  config.className
                                )}
                                title={`Type: ${booking.booking_type}\nSource: ${booking.booking_source}\nStatus: ${booking.status}`}
                              >
                                <Icon className="h-3 w-3 shrink-0" />
                                <span className="truncate text-[9px]">{booking.booking_type} · {booking.booking_source}</span>
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
              {getEventsForDate(selectedDate).length} bookings
            </span>
          </div>
          <div className="space-y-2 max-h-[120px] overflow-auto custom-scrollbar">
            {getEventsForDate(selectedDate).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No bookings scheduled
              </p>
            ) : (
              getEventsForDate(selectedDate).map((booking: any) => {
                const type = booking.booking_type === 'auto_followup' ? 'followup' : 'call';
                const config = eventTypeConfig[type];
                const Icon = config.icon;
                return (
                  <div
                    key={booking.id}
                    className={cn(
                      'flex items-start gap-3 p-2 rounded-lg border transition-all duration-200 ease-out will-change-transform hover:-translate-y-0.5 hover:scale-[1.01]',
                      config.className
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs opacity-75">
                        {format(new Date(booking.scheduled_at), 'HH:mm')}
                        {booking.timezone && ` · ${booking.timezone}`}
                        {booking.status && ` · ${booking.status}`}
                      </p>
                      <p className="text-xs opacity-70 mt-1">
                        <span className="inline-block bg-opacity-20 px-2 py-0.5 rounded text-[10px] mr-1">
                          {booking.booking_type}
                        </span>
                        <span className="inline-block bg-opacity-20 px-2 py-0.5 rounded text-[10px]">
                          {booking.booking_source}
                        </span>
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
