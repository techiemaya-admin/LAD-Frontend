'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Users, Search, Loader2, Send, Linkedin, Mail, MessageCircle, Sparkles, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/app-toaster';
import { useCampaignLeads, useLeadsSummaries, type CampaignLead, useCampaign } from '@lad/frontend-features/campaigns';
import { apiGet, apiPost, proxyPost } from '@/lib/api';
import { EmployeeCard, ProfileSummaryDialog } from '@/components/campaigns';
import { safeStorage } from '@lad/shared/storage';  
// Extended CampaignLead interface for UI needs
interface ExtendedCampaignLead extends CampaignLead {
  lead_data?: any;
  custom_fields?: any;
  profile_summary?: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  photo_url?: string;
  is_inbound?: boolean;
  apollo_person_id?: string;
  enriched_email?: string | null;
  enriched_linkedin_url?: string | null;
  has_sent?: boolean;
  has_connected?: boolean;
  has_replied?: boolean;
}
export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterParams = searchParams.get('filter') || 'all';
  const campaignId = params.id as string;
  const { push } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Fetch campaign to get campaign_type
  const { campaign, loading: campaignLoading } = useCampaign(campaignId);
  const isInboundCampaign = campaign?.campaign_type === 'inbound';

  // Use SDK hook for leads
  const { leads: campaignLeads, loading: leadsLoading, error: leadsError, refetch } = useCampaignLeads(
    campaignId,
    useMemo(() => ({ search: searchQuery || undefined }), [searchQuery])
  );

  // Convert to extended type for UI
  const leads = (campaignLeads || []) as ExtendedCampaignLead[];
  const loading = leadsLoading || campaignLoading;

  // Get all lead IDs for batch summary fetching
  const leadIds = useMemo(() => leads.map(lead => lead.id), [leads]);

  // Fetch summaries for all leads using the SDK hook
  const { summaries, loading: summariesLoading } = useLeadsSummaries(campaignId, leadIds);

  // Debug: Log first lead to check photo_url
  useEffect(() => {
    if (leads.length > 0) {
      console.log('First lead data:', leads[0]);
      console.log('Photo URL:', leads[0].photo_url);
    }
  }, [leads]);
  // Note: Pagination would ideally come from SDK
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  // Reveal state for employee contacts
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>>({});
  const [revealingContacts, setRevealingContacts] = useState<Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>>({});
  const [revealedValues, setRevealedValues] = useState<Record<string, { phone?: string; email?: string; linkedin_url?: string }>>({});
  // Type-safe state setters
  const setRevealedContactsSafe = (updater: (prev: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>) => Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>) => {
    setRevealedContacts(updater);
  };
  const setRevealingContactsSafe = (updater: (prev: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>) => Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>) => {
    setRevealingContacts(updater);
  };
  // Profile summary dialog state
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<ExtendedCampaignLead | null>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  useEffect(() => {
    if (leadsError) {
      push({
        variant: 'error',
        title: 'Error',
        description: typeof leadsError === 'string' ? leadsError : leadsError?.message || 'Failed to load leads',
      });
    }
  }, [leadsError, push]);
  // Update total when leads change (this would ideally come from SDK)
  useEffect(() => {
    if (leads) {
      setTotal(leads.length);
      setTotalPages(Math.ceil(leads.length / 50));
    }
  }, [leads]);

  const handleRevealPhone = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
    try {
      const response = await apiPost<any>('/api/apollo-leads/reveal-phone', {
        person_id: employee.id
      });

      if (response.success && response.phone) {
        // Phone returned immediately (DB cache or direct Apollo API)
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: response.phone } }));
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
        push({
          title: 'Success',
          description: response.from_cache
            ? 'Phone retrieved from database (no credits used)'
            : `Phone revealed (${response.credits_used} credit${response.credits_used !== 1 ? 's' : ''} used)`
        });
        refetch();
      } else if (response.success && response.status === 'pending') {
        // Async path — request submitted to Apollo phone service, webhook delivers within 2-5 min
        push({
          title: 'Request Submitted',
          description: response.message || 'Phone reveal submitted. The number will appear within 2–5 minutes — refresh to check.'
        });
      } else {
        push({ title: 'Error', description: response.error || 'Failed to reveal phone number' });
      }
    } catch (error) {
      push({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to reveal phone' });
    } finally {
      setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: false } }));
    }
  };
  const handleRevealEmail = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));
    try {
      const response = await apiPost<any>(`/api/campaigns/${campaignId}/leads/${employee.id}/reveal-email`, {
        apollo_person_id: employee.apollo_person_id || employee.id
      });
      if (response.success && response.email) {
        // Store the revealed email value
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: response.email } }));
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));

        // Update the employee object with enriched email
        employee.enriched_email = response.email;
        employee.email = response.email;

        push({
          title: 'Success',
          description: response.from_database
            ? 'Email retrieved (no credits used)'
            : `Email revealed (${response.credits_used} credit${response.credits_used !== 1 ? 's' : ''} used)`
        });

        // Trigger re-render
        refetch();
      } else {
        push({ title: 'Error', description: response.error || 'Failed to reveal email' });
      }
    } catch (error) {
      push({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to reveal email' });
    } finally {
      setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: false } }));
    }
  };

  const handleRevealLinkedIn = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], linkedin: true } }));
    try {
      const response = await apiPost<any>(`/api/campaigns/${campaignId}/leads/${employee.id}/reveal-linkedin`, {});
      if (response.success && response.linkedin_url) {
        // Store the revealed LinkedIn URL value
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], linkedin_url: response.linkedin_url } }));
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], linkedin: true } }));

        // Update the employee object with the revealed LinkedIn URL
        const updatedEmployee = { ...employee, linkedin_url: response.linkedin_url, enriched_linkedin_url: response.linkedin_url };

        push({
          title: 'Success',
          description: response.from_database ? 'LinkedIn profile retrieved (no credits used)' : 'LinkedIn profile revealed'
        });
      } else {
        push({ title: 'Info', description: response.error || 'LinkedIn URL not available for this lead' });
      }
    } catch (error) {
      push({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to reveal LinkedIn' });
    } finally {
      setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], linkedin: false } }));
    }
  };

  const handleViewSummary = async (employee: ExtendedCampaignLead) => {
    setSelectedEmployee(employee);
    setSummaryDialogOpen(true);
    setProfileSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);
    try {
      // First, try to get existing summary
      try {
        const existingSummary = await apiGet<{ success: boolean; summary: string | null; exists: boolean }>(
          `/api/campaigns/${campaignId}/leads/${employee.id}/summary`
        );
        if (existingSummary.success && existingSummary.summary) {
          setProfileSummary(existingSummary.summary);
          setSummaryLoading(false);
          return;
        }
      } catch (getError) {
        // If getting existing summary fails, proceed to generate new one
      }
      // Generate new summary using apiPost
      const response = await apiPost<{ success: boolean; summary: string; generated_at?: string }>(
        `/api/campaigns/${campaignId}/leads/${employee.id}/summary`,
        {
          leadId: employee.id,
          campaignId: campaignId,
          profileData: {
            ...employee,
            name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            title: employee.title,
            company: employee.company,
            email: employee.email,
            phone: employee.phone,
            linkedin_url: employee.linkedin_url,
          },
        }
      );
      if (response.success && response.summary) {
        setProfileSummary(response.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error: any) {
      console.error('[Profile Summary] Error:', error);
      setSummaryError(error.message || 'Failed to load profile summary');
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to load profile summary',
      });
    } finally {
      setSummaryLoading(false);
    }
  };
  const handleCloseSummaryDialog = () => {
    setSummaryDialogOpen(false);
    setSelectedEmployee(null);
    setProfileSummary(null);
    setSummaryError(null);
  };

  // ── Manual Follow-up Modal ─────────────────────────────────────────────────
  type FollowupChannel = 'linkedin' | 'email' | 'whatsapp';
  interface FollowupContext {
    leadName: string;
    company: string;
    title: string;
    connectionMessage: string;
    pastMessages: Array<{ channel: string; type: string; content: string; subject?: string; sentAt: string }>;
    pastMessageCount: number;
    hasWebPresence: boolean;
    postsUsed: number;
    linkedin_url?: string;
    email?: string;
    phone?: string;
  }

  const [followupDialogOpen, setFollowupDialogOpen]         = useState(false);
  const [followupLead, setFollowupLead]                     = useState<ExtendedCampaignLead | null>(null);
  const [followupChannel, setFollowupChannel]               = useState<FollowupChannel>('linkedin');
  const [followupMessage, setFollowupMessage]               = useState('');
  const [followupSubject, setFollowupSubject]               = useState('');
  const [followupContext, setFollowupContext]               = useState<FollowupContext | null>(null);
  const [followupPreviewing, setFollowupPreviewing]         = useState(false);
  const [followupSending, setFollowupSending]               = useState(false);
  const [followupHistoryOpen, setFollowupHistoryOpen]       = useState(false);

  const openFollowupDialog = useCallback(async (lead: ExtendedCampaignLead, channel: FollowupChannel = 'linkedin') => {
    setFollowupLead(lead);
    setFollowupChannel(channel);
    setFollowupMessage('');
    setFollowupSubject('');
    setFollowupContext(null);
    setFollowupHistoryOpen(false);
    setFollowupDialogOpen(true);
    // Immediately kick off preview
    setFollowupPreviewing(true);
    try {
      const resp = await proxyPost<{ success: boolean; message: string | null; context: FollowupContext }>(
        `/api/campaigns/${campaignId}/leads/${lead.id}/preview-followup`,
        { channel }
      );
      if (resp.success) {
        setFollowupMessage(resp.message || '');
        setFollowupContext(resp.context);
      } else {
        push({ variant: 'error', title: 'Preview failed', description: (resp as any).error || 'Could not generate message' });
      }
    } catch (e: any) {
      push({ variant: 'error', title: 'Preview failed', description: e.message });
    } finally {
      setFollowupPreviewing(false);
    }
  }, [campaignId, push]);

  const regenerateFollowup = useCallback(async () => {
    if (!followupLead) return;
    setFollowupPreviewing(true);
    try {
      const resp = await proxyPost<{ success: boolean; message: string | null; context: FollowupContext }>(
        `/api/campaigns/${campaignId}/leads/${followupLead.id}/preview-followup`,
        { channel: followupChannel }
      );
      if (resp.success) {
        setFollowupMessage(resp.message || '');
        setFollowupContext(resp.context);
      }
    } catch (e: any) {
      push({ variant: 'error', title: 'Regenerate failed', description: e.message });
    } finally {
      setFollowupPreviewing(false);
    }
  }, [followupLead, followupChannel, campaignId, push]);

  const sendFollowup = useCallback(async () => {
    if (!followupLead || !followupMessage.trim()) return;
    setFollowupSending(true);
    try {
      const resp = await proxyPost<{ success: boolean; channel: string; messageId?: string }>(
        `/api/campaigns/${campaignId}/leads/${followupLead.id}/send-followup`,
        { channel: followupChannel, message: followupMessage, subject: followupSubject || undefined }
      );
      if (resp.success) {
        push({ title: 'Sent!', description: `Follow-up sent via ${followupChannel} to ${followupContext?.leadName || followupLead.name}` });
        setFollowupDialogOpen(false);
        refetch();
      } else {
        push({ variant: 'error', title: 'Send failed', description: (resp as any).error || 'Could not send message' });
      }
    } catch (e: any) {
      push({ variant: 'error', title: 'Send failed', description: e.message });
    } finally {
      setFollowupSending(false);
    }
  }, [followupLead, followupChannel, followupMessage, followupSubject, followupContext, campaignId, push, refetch]);
  const filteredLeads = useMemo(() => {
    // Cast to any[] so we can access backend-provided fields (has_sent, has_connected, has_replied)
    // that are not in the SDK type definition
    let result = leads as any[];

    if (filterParams !== 'all') {
      result = result.filter((lead: any) => {
        const status = lead.status?.toLowerCase() || '';
        if (filterParams === 'sent') {
          return lead.has_sent === true || status.includes('sent') || status.includes('invit') || status.includes('connection');
        }
        if (filterParams === 'connected') {
          return lead.has_connected === true || status.includes('connect') || status.includes('accept') || status.includes('contacted');
        }
        if (filterParams === 'replied') {
          return lead.has_replied === true || status.includes('repli') || status.includes('respond') || status.includes('reply');
        }
        return true;
      });
    }

    if (!searchQuery) return result;
    const query = searchQuery.toLowerCase();
    return result.filter((lead: any) =>
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query) ||
      lead.title?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery, filterParams]);
  if (loading && leads.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col gap-4 items-center">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p>Loading leads...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-screen overflow-auto bg-slate-50">
      <div className="p-6 pb-12">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => router.push(`/campaigns/${campaignId}/analytics`)}
              className="min-w-auto"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analytics
            </Button>
            <div>
              <h4 className="text-2xl font-bold text-slate-800 mb-1">
                {campaign?.name || 'Campaign Leads'}
              </h4>
              <p className="text-sm text-slate-500">
                {filteredLeads.length} {filterParams !== 'all' ? filterParams : ''} leads
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-4 flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'All Leads' },
            { key: 'sent', label: 'Connections Sent' },
            { key: 'connected', label: 'Connected' },
            { key: 'replied', label: 'Lead Contact Back' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads?filter=${tab.key}`)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${filterParams === tab.key
                  ? 'bg-[#0b1957] text-white border-[#0b1957] shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-[#0b1957] hover:text-[#0b1957]'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              className="pl-10 bg-white rounded-xl"
              placeholder="Search leads by name, email, company, or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        {/* Employee Cards Grid */}
        {filteredLeads.length === 0 ? (
          <Card className="rounded-2xl border border-slate-200 shadow-sm">
            <CardContent className="text-center py-12">
              <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h6 className="text-lg font-semibold text-slate-500 mb-2">
                {searchQuery ? 'No leads match your search' : 'No leads found'}
              </h6>
              <p className="text-sm text-slate-400">
                {searchQuery ? 'Try adjusting your search terms' : 'Leads will appear here once the campaign starts generating them'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredLeads.map((lead: CampaignLead, index: number) => {
                return (
                  <div key={lead.id} className="flex flex-col">
                    <EmployeeCard
                      employee={{
                        id: lead.id,
                        name: lead.name,
                        first_name: lead.first_name,
                        last_name: lead.last_name,
                        title: lead.title,
                        company: lead.company || lead.lead_data?.company_name || lead.lead_data?._full_data?.company_name,
                        email: revealedValues[lead.id]?.email || lead.email,
                        phone: revealedValues[lead.id]?.phone || lead.phone,
                        linkedin_url: revealedValues[lead.id]?.linkedin_url || lead.linkedin_url,
                        enriched_email: lead.enriched_email,
                        enriched_linkedin_url: lead.enriched_linkedin_url,
                        photo_url: lead.photo_url,
                        is_inbound: lead.is_inbound,
                      }}
                      employeeViewMode="grid"
                      revealedContacts={revealedContacts}
                      revealingContacts={revealingContacts}
                      handleRevealPhone={handleRevealPhone}
                      handleRevealEmail={handleRevealEmail}
                      handleRevealLinkedIn={handleRevealLinkedIn}
                      onViewSummary={handleViewSummary}
                      profileSummary={summaries?.get(lead.id) || lead.profile_summary || null}
                      hideUnlockFeatures={isInboundCampaign}
                    />
                    {/* Follow-up count pill — shows how many follow-ups have been sent */}
                    {(lead as any).manual_followup_count > 0 && (
                      <div className="flex justify-center mt-1.5">
                        <span className="text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" />
                          {(lead as any).manual_followup_count} follow-up{(lead as any).manual_followup_count !== 1 ? 's' : ''} sent
                        </span>
                      </div>
                    )}
                    {/* Manual Follow-up — always visible below each card */}
                    <div className="flex gap-1.5 mt-2 px-1">
                      <button
                        onClick={() => openFollowupDialog(lead as ExtendedCampaignLead, 'linkedin')}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0b1957] text-white text-xs font-semibold hover:bg-[#1a2d8f] active:scale-95 transition-all shadow-sm"
                      >
                        <Linkedin className="w-3.5 h-3.5" />
                        Follow-up
                      </button>
                      <button
                        onClick={() => openFollowupDialog(lead as ExtendedCampaignLead, 'email')}
                        title="Email follow-up"
                        className="flex items-center justify-center w-9 rounded-xl bg-slate-200 text-slate-600 hover:bg-slate-300 active:scale-95 transition-all shadow-sm"
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openFollowupDialog(lead as ExtendedCampaignLead, 'whatsapp')}
                        title="WhatsApp follow-up"
                        className="flex items-center justify-center w-9 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 active:scale-95 transition-all shadow-sm"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-4 mt-8">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  variant="outline"
                >
                  Previous
                </Button>
                <p className="flex items-center text-slate-500">
                  Page {page} of {totalPages}
                </p>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
        {/* Profile Summary Dialog */}
        <ProfileSummaryDialog
          open={summaryDialogOpen}
          onClose={handleCloseSummaryDialog}
          employee={selectedEmployee}
          summary={profileSummary}
          loading={summaryLoading}
          error={summaryError}
        />

        {/* ── Manual Follow-up Dialog ─────────────────────────────────── */}
        <Dialog open={followupDialogOpen} onOpenChange={setFollowupDialogOpen}>
          <DialogContent className="max-w-2xl w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-[#0b1957]">
                <Send className="w-5 h-5" />
                Manual Follow-up
                {followupContext?.leadName && (
                  <span className="text-slate-500 font-normal text-base ml-1">
                    → {followupContext.leadName}
                    {followupContext.company ? `, ${followupContext.company}` : ''}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            {/* Channel Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-3">
              {([
                { key: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: 'bg-[#0b1957] text-white' },
                { key: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4" />,     color: 'bg-slate-700 text-white'  },
                { key: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, color: 'bg-green-600 text-white' },
              ] as const).map(ch => (
                <button
                  key={ch.key}
                  onClick={() => {
                    if (ch.key !== followupChannel) {
                      setFollowupChannel(ch.key);
                      if (followupLead) openFollowupDialog(followupLead, ch.key);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    followupChannel === ch.key ? ch.color : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ch.icon}
                  {ch.label}
                </button>
              ))}
            </div>

            {/* Email subject */}
            {followupChannel === 'email' && (
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Subject</label>
                <Input
                  placeholder="e.g. Quick follow-up from our conversation"
                  value={followupSubject}
                  onChange={e => setFollowupSubject(e.target.value)}
                  className="text-sm"
                />
              </div>
            )}

            {/* Message area */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Message
                </label>
                <button
                  onClick={regenerateFollowup}
                  disabled={followupPreviewing}
                  className="flex items-center gap-1 text-xs text-[#0b1957] hover:underline disabled:opacity-50"
                >
                  {followupPreviewing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Regenerate
                </button>
              </div>

              {followupPreviewing ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2 text-[#0b1957]">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span className="text-sm font-medium">Generating personalised message…</span>
                  </div>
                  <p className="text-xs text-slate-400">Reading web presence, recent posts &amp; past conversation</p>
                </div>
              ) : (
                <Textarea
                  value={followupMessage}
                  onChange={e => setFollowupMessage(e.target.value)}
                  rows={7}
                  placeholder="Your follow-up message will appear here…"
                  className="resize-none text-sm leading-relaxed"
                />
              )}

              {followupChannel === 'linkedin' && followupMessage.length > 0 && (
                <p className={`text-right text-xs mt-1 ${followupMessage.length > 2000 ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>
                  {followupMessage.length} / 2000
                </p>
              )}
            </div>

            {/* Past conversation history (collapsible) */}
            {followupContext && followupContext.pastMessageCount > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFollowupHistoryOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-600 transition-colors"
                >
                  <span>Conversation history ({followupContext.pastMessageCount} messages)</span>
                  {followupHistoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {followupHistoryOpen && (
                  <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                    {followupContext.pastMessages.map((msg, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            msg.channel === 'linkedin' ? 'bg-blue-50 text-blue-700'
                            : msg.channel === 'email'  ? 'bg-amber-50 text-amber-700'
                            : 'bg-green-50 text-green-700'
                          }`}>
                            {msg.channel}
                          </span>
                          <span className="text-xs text-slate-400">{msg.type}</span>
                          <span className="text-xs text-slate-300 ml-auto">{new Date(msg.sentAt).toLocaleDateString()}</span>
                        </div>
                        {msg.subject && <p className="text-xs font-medium text-slate-700 mb-0.5">📧 {msg.subject}</p>}
                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Context pills */}
            {followupContext && (
              <div className="flex flex-wrap gap-2">
                {followupContext.hasWebPresence && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium">
                    ✓ Web presence used
                  </span>
                )}
                {followupContext.postsUsed > 0 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                    ✓ {followupContext.postsUsed} recent post{followupContext.postsUsed !== 1 ? 's' : ''} analysed
                  </span>
                )}
                {followupContext.connectionMessage && (
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                    ✓ Connection message context
                  </span>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setFollowupDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={sendFollowup}
                disabled={followupSending || followupPreviewing || !followupMessage.trim()}
                className="bg-[#0b1957] hover:bg-[#1a2d8f] text-white gap-2"
              >
                {followupSending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="w-4 h-4" /> Send via {followupChannel}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
