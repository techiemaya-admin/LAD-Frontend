"use client";
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetWrapper } from '../WidgetWrapper';
import { cn } from '@/lib/utils';
interface CallLog {
  id: string;
  leadName: string;
  agentName: string;
  status: string;
  duration: string;
  date: string;
}
interface LatestCallsWidgetProps {
  id: string;
  calls: CallLog[];
}
const statusStyles: Record<string, string> = {
  ended: 'bg-green-100 text-green-700 border-green-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  answered: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  in_queue: 'bg-amber-100 text-amber-700 border-amber-200',
  ringing: 'bg-blue-100 text-blue-700 border-blue-200',
};
export const LatestCallsWidget: React.FC<LatestCallsWidgetProps> = ({
  id,
  calls,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(calls.length / ITEMS_PER_PAGE);
  const visibleCalls = calls.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  return (
    <WidgetWrapper id={id} title="Latest Calls">
      <div className="space-y-3">
        {visibleCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium">No calls yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Your AI assistants haven't placed any calls.
            </p>
          </div>
        ) : (
          <>
            {visibleCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-4 py-3 transition-all hover:bg-secondary/30 hover:shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-xs font-medium border',
                      statusStyles[call.status] ?? 'bg-muted text-muted-foreground'
                    )}
                  >
                    {call.status.replace('_', ' ')}
                  </Badge>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {call.leadName || 'Unknown Lead'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {call.agentName}
                    </p>
                  </div>
                </div>
                <div className="text-right whitespace-nowrap ml-4">
                  <p className="text-sm font-medium">{call.duration}</p>
                  <p className="text-xs text-muted-foreground">{call.date}</p>
                </div>
              </div>
            ))}
            {calls.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, calls.length)} of {calls.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WidgetWrapper>
  );
};