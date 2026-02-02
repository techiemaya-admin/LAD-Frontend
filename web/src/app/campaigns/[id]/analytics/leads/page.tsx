'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Users, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/app-toaster';
import { useCampaignLeads, type CampaignLead, useCampaign } from '@lad/frontend-features/campaigns';
import { apiGet, apiPost } from '@/lib/api';
import { EmployeeCard, ProfileSummaryDialog } from '@/components/campaigns';
import { safeStorage } from '@/utils/storage';
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
}
export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  
  // Fetch campaign to get campaign_type
  const { data: campaign, isLoading: campaignLoading } = useCampaign(campaignId);
  const isInboundCampaign = campaign?.campaign_type === 'inbound';
  
  // Use SDK hook for leads
  const { leads: campaignLeads, loading: leadsLoading, error: leadsError, refetch } = useCampaignLeads(
    campaignId,
    useMemo(() => ({ search: searchQuery || undefined }), [searchQuery])
  );
  
  // Convert to extended type for UI
  const leads = (campaignLeads || []) as ExtendedCampaignLead[];
  const loading = leadsLoading || campaignLoading;
  
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
        description: leadsError || 'Failed to load leads',
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
  // Load summaries for leads (this is UI-specific logic, not SDK)
  useEffect(() => {
    if (leads && leads.length > 0) {
      // Fetch summaries for all leads in parallel
      const summaryPromises = leads.map(async (lead) => {
        try {
          // Use apiGet to ensure correct backend URL
          const data = await apiGet<{ success: boolean; summary: string | null; exists: boolean }>(
            `/api/campaigns/${campaignId}/leads/${lead.id}/summary`
          );
          if (data.success && data.summary) {
            return { leadId: lead.id, summary: data.summary };
          }
        } catch (err) {
          // Silently fail - summary might not exist yet
          }
        return null;
      });
      Promise.all(summaryPromises).then((summaryResults) => {
        const summaryMap = new Map<string, string>();
        summaryResults.forEach((result) => {
          if (result) {
            summaryMap.set(result.leadId, result.summary);
          }
        });
        // Update leads with summaries (this would need state management)
        // For now, this is handled by the component's local state
      });
    }
  }, [leads, campaignId]);
  const handleRevealPhone = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
    try {
      const response = await apiPost<any>('/api/apollo-leads/reveal-phone', {
        person_id: employee.id
      });
      if (response.success && response.phone) {
        // Store the revealed phone value
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: response.phone } }));
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
        push({ title: 'Success', description: 'Phone number revealed' });
      } else {
        push({ title: 'Error', description: 'Failed to reveal phone number' });
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
  const filteredLeads = useMemo(() => {
    if (!searchQuery) return leads;
    const query = searchQuery.toLowerCase();
    return leads.filter(lead =>
      lead.name?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.company?.toLowerCase().includes(query) ||
      lead.title?.toLowerCase().includes(query)
    );
  }, [leads, searchQuery]);
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
                Campaign Leads
              </h4>
              <p className="text-sm text-slate-500">
                {filteredLeads.length} leads
              </p>
            </div>
          </div>
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
                <EmployeeCard
                  key={lead.id}
                  employee={{
                    id: lead.id,
                    name: lead.name,
                    first_name: lead.first_name,
                    last_name: lead.last_name,
                    title: lead.title,
                    email: lead.email,
                    phone: lead.phone,
                    linkedin_url: lead.linkedin_url,
                    enriched_email: lead.enriched_email,
                    enriched_linkedin_url: lead.enriched_linkedin_url,
                    photo_url: lead.photo_url,  // Backend already extracts this from lead_data.photo_url
                    is_inbound: lead.is_inbound, // Pass is_inbound flag from backend
                  }}
                  employeeViewMode="grid"
                  revealedContacts={revealedContacts}
                  revealingContacts={revealingContacts}
                  handleRevealPhone={handleRevealPhone}
                  handleRevealEmail={handleRevealEmail}
                  handleRevealLinkedIn={handleRevealLinkedIn}
                  onViewSummary={handleViewSummary}
                  profileSummary={lead.profile_summary || null}
                  hideUnlockFeatures={isInboundCampaign} // Hide unlock features for inbound campaigns
                />
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
      </div>
    </div>
  );
}
