'use client';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Video, Phone, MessageSquare, Plus } from 'lucide-react';
interface Appointment {
  id: string;
  date: string;
  time: string;
  type: 'online' | 'phone' | 'in-person';
  status: 'scheduled' | 'completed' | 'cancelled';
  counsellor_name?: string;
  notes?: string;
}
interface CounsellorScheduleSlotProps {
  studentId: string;
  appointments?: Appointment[];
  onSchedule?: (appointment: Partial<Appointment>) => void;
  readonly?: boolean;
}
export default function CounsellorScheduleSlot({ 
  studentId, 
  appointments = [], 
  onSchedule, 
  readonly = false 
}: CounsellorScheduleSlotProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const getAppointmentIcon = (type: string) => {
    switch (type) {
      case 'online':
        return <Video className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'in-person':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };
  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      scheduled: 'default',
      completed: 'secondary',
      cancelled: 'destructive',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };
  const sortedAppointments = [...appointments].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const upcomingAppointments = sortedAppointments.filter(
    apt => apt.status === 'scheduled' && new Date(apt.date) >= new Date()
  );
  const pastAppointments = sortedAppointments.filter(
    apt => apt.status === 'completed' || new Date(apt.date) < new Date()
  );
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Counselor Schedule</CardTitle>
        {!readonly && (
          <Button size="sm" onClick={() => onSchedule?.({})}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-auto space-y-6">
        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-primary">Upcoming Sessions</h3>
            {upcomingAppointments.map((apt) => (
              <div
                key={apt.id}
                className="border rounded-lg p-4 space-y-2 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAppointmentIcon(apt.type)}
                    <span className="font-medium capitalize">{apt.type}</span>
                  </div>
                  {getStatusBadge(apt.status)}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(apt.date).toLocaleDateString()}</span>
                  <Clock className="h-3 w-3 ml-2" />
                  <span>{apt.time}</span>
                </div>
                {apt.counsellor_name && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Counselor: </span>
                    <span className="font-medium">{apt.counsellor_name}</span>
                  </div>
                )}
                {apt.notes && (
                  <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                    {apt.notes}
                  </div>
                )}
                {!readonly && (
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline">
                      Reschedule
                    </Button>
                    <Button size="sm" variant="ghost">
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">Past Sessions</h3>
            {pastAppointments.map((apt) => (
              <div
                key={apt.id}
                className="border rounded-lg p-3 space-y-2 opacity-75"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {getAppointmentIcon(apt.type)}
                    <span className="capitalize">{apt.type}</span>
                  </div>
                  {getStatusBadge(apt.status)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{new Date(apt.date).toLocaleDateString()}</span>
                  <Clock className="h-3 w-3 ml-2" />
                  <span>{apt.time}</span>
                </div>
                {apt.counsellor_name && (
                  <div className="text-xs text-muted-foreground">
                    Counselor: {apt.counsellor_name}
                  </div>
                )}
                {apt.notes && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {apt.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {/* Empty State */}
        {appointments.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No appointments scheduled</p>
            {!readonly && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => onSchedule?.({})}
              >
                Schedule First Session
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}