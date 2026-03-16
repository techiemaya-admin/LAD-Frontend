'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { X, User, Loader2 } from 'lucide-react';
interface ProfileSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    photo_url?: string;
    [key: string]: any;
  } | null;
  summary: string | null;
  loading: boolean;
  error: string | null;
}
export default function ProfileSummaryDialog({
  open,
  onClose,
  employee,
  summary,
  loading,
  error,
}: ProfileSummaryDialogProps) {
  const employeeName = employee
    ? employee.name ||
      `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
      'Unknown'
    : '';
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
        <DialogHeader className="border-b pb-4 shrink-0">
          <div className="flex flex-row items-center gap-4 w-full">
            <Avatar className="w-14 h-14 border-[3px] border-[#0b1957] shrink-0">
              <AvatarImage src={employee?.photo_url || ''} alt={employeeName} />
              <AvatarFallback className="bg-[#0b1957] text-white">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 pr-8 overflow-hidden">
              <DialogTitle className="font-bold text-[#1E293B] m-0 text-lg break-words whitespace-normal leading-snug">
                {employeeName}
              </DialogTitle>
              {employee?.title && (
                <div className="mt-1">
                  <Badge className="font-semibold text-xs py-0.5 px-2 bg-[#e0eaf5] text-[#172560] hover:bg-[#c2d6eb] whitespace-normal break-words max-w-full inline-block">
                    {employee.title}
                  </Badge>
                </div>
              )}
            </div>
            <DialogTitle className="hidden">Summary</DialogTitle>
          </div>
        </DialogHeader>
        <div className="pt-6 pb-4 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0b1957] mb-4" />
              <p className="text-sm text-[#64748B]">
                Generating profile summary...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-base text-[#EF4444] font-semibold mb-2">
                Error
              </p>
              <p className="text-sm text-[#64748B]">
                {error}
              </p>
            </div>
          ) : summary ? (
            <div>
              <h6 className="font-semibold text-[#1E293B] mb-4 text-lg">
                Profile Summary
              </h6>
              <p className="text-[#475569] leading-relaxed whitespace-pre-wrap text-[15px]">
                {summary}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-[#64748B]">
                No summary available
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 pt-4">
          <Button
            onClick={onClose}
            className="bg-[#0b1957] hover:bg-[#0a1440] font-semibold px-6"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
