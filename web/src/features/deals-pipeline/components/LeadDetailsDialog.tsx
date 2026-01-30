import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Mail,
  Phone,
  Building2,
  DollarSign,
  Calendar
} from 'lucide-react';
import type { Lead } from '../types';
interface LeadDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  lead: Lead | null;
}
const getStatusColor = (status?: string | null): string => {
  switch (status?.toLowerCase()) {
    case 'new': return '#2196F3';
    case 'contacted': return '#FF9800';
    case 'qualified': return '#4CAF50';
    case 'proposal': return '#9C27B0';
    case 'won': return '#4CAF50';
    case 'lost': return '#F44336';
    default: return '#757575';
  }
};
const getPriorityColor = (priority?: string | null): string => {
  switch (priority?.toLowerCase()) {
    case 'high': return '#F44336';
    case 'medium': return '#FF9800';
    case 'low': return '#4CAF50';
    default: return '#757575';
  }
};
const formatCurrency = (amount?: number | string | null): string => {
  if (!amount) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(Number(amount));
};
const formatDate = (dateString?: string | Date | number | null): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return '-';
  }
};
const getDaysRemaining = (closeDate?: string | null): number | null => {
  if (!closeDate) return null;
  const now = new Date();
  const close = new Date(closeDate);
  const diffTime = close.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
const LeadDetailsDialog: React.FC<LeadDetailsDialogProps> = ({ open, onClose, lead }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  if (!lead) return null;
  const leadTags = Array.isArray(lead.tags) ? lead.tags : [];
  const leadPhone = lead.phone || lead.phoneNumber;
  const leadCompany = lead.company || (lead as { organization?: string }).organization;
  const leadDescription = lead.description || lead.bio;
  const leadStatus = lead.status || 'New';
  const leadPriority = (lead as { priority?: string }).priority || 'Medium';
  const leadAmount = (lead as { amount?: number | string }).amount;
  const leadCloseDate = (lead as { closeDate?: string }).closeDate;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl min-h-[80vh] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {lead.name?.charAt(0)?.toUpperCase() || 'L'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{lead.name || 'Unnamed Lead'}</DialogTitle>
                {leadCompany && (
                  <p className="text-sm text-muted-foreground">
                    {leadCompany}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="flex-1 overflow-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-base font-semibold mb-4">
                  Lead Information
                </h3>
                <div className="flex flex-col gap-4">
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {leadPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{leadPhone}</span>
                    </div>
                  )}
                  {leadCompany && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span>{leadCompany}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="text-base font-semibold mb-4">
                  Pipeline & Deal Information
                </h3>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span>{formatCurrency(leadAmount || 0)}</span>
                  </div>
                  {leadCloseDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <span>
                          Close Date: {formatDate(leadCloseDate)}
                        </span>
                        {getDaysRemaining(leadCloseDate) !== null && getDaysRemaining(leadCloseDate)! < 7 && (
                          <Badge
                            variant="destructive"
                            className="mt-1 ml-2"
                          >
                            {getDaysRemaining(leadCloseDate)} days left
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge
                      style={{
                        backgroundColor: getStatusColor(leadStatus),
                        color: 'white'
                      }}
                    >
                      {(lead as { statusLabel?: string }).statusLabel || leadStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Priority:</span>
                    <Badge
                      style={{
                        backgroundColor: getPriorityColor(leadPriority),
                        color: 'white'
                      }}
                    >
                      {(lead as { priorityLabel?: string }).priorityLabel || leadPriority}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-muted rounded-lg md:col-span-2">
                <h3 className="text-base font-semibold mb-2">
                  Description
                </h3>
                <p className="text-sm text-muted-foreground">
                  {leadDescription || 'No description provided'}
                </p>
              </div>
              {leadTags.length > 0 && (
                <div className="p-4 bg-muted rounded-lg md:col-span-2">
                  <h3 className="text-base font-semibold mb-2">
                    Tags
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    {leadTags.map((tag: unknown, index: number) => (
                      <Badge
                        key={index}
                        variant="outline"
                      >
                        {String(tag)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="activity" className="flex-1 overflow-auto p-6">
            <p className="text-muted-foreground">
              Activity timeline will be displayed here.
            </p>
          </TabsContent>
          <TabsContent value="notes" className="flex-1 overflow-auto p-6">
            <p className="text-muted-foreground">
              Notes and comments will be displayed here.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
export default LeadDetailsDialog;
