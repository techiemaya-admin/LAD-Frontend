'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Stack,
  CircularProgress, TextField, InputAdornment
} from '@mui/material';
import {
  ArrowBack, People, Search
} from '@mui/icons-material';
import { useToast } from '@/components/ui/app-toaster';
import { useCampaignLeads, type CampaignLead } from '@/features/campaigns';
import { revealEmail, revealPhone } from '@/features/apollo-leads/api';
import { getProfileSummary, generateProfileSummary } from '@/features/campaigns/api';
import EmployeeCard from '../../../../../features/campaigns/components/EmployeeCard';
import ProfileSummaryDialog from '../../../../../features/campaigns/components/ProfileSummaryDialog';
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
}

export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  
  // Use SDK hook for leads
  const { leads: campaignLeads, loading: leadsLoading, error: leadsError, refetch } = useCampaignLeads(
    campaignId,
    useMemo(() => ({ search: searchQuery || undefined }), [searchQuery])
  );
  
  // Convert to extended type for UI
  const leads = (campaignLeads || []) as ExtendedCampaignLead[];
  const loading = leadsLoading;
  
  // Note: Pagination would ideally come from SDK
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Reveal state for employee contacts
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { phone?: boolean; email?: boolean; phoneValue?: string; emailValue?: string }>>({});
  const [revealingContacts, setRevealingContacts] = useState<Record<string, { phone?: boolean; email?: boolean }>>({});
  
  // Store revealed values separately to update leads
  const [revealedValues, setRevealedValues] = useState<Record<string, { phone?: string; email?: string }>>({});
  
  // Type-safe state setters
  const setRevealedContactsSafe = (updater: (prev: Record<string, { phone?: boolean; email?: boolean }>) => Record<string, { phone?: boolean; email?: boolean }>) => {
    setRevealedContacts(updater);
  };
  const setRevealingContactsSafe = (updater: (prev: Record<string, { phone?: boolean; email?: boolean }>) => Record<string, { phone?: boolean; email?: boolean }>) => {
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
          // LAD Architecture: Use SDK API layer instead of direct fetch
          const data = await getProfileSummary(lead.id, campaignId);
          if (data.success && data.summary) {
            return { leadId: lead.id, summary: data.summary };
          }
        } catch (err) {
          // Silently fail - summary might not exist yet
          // LAD Architecture: No console.log in production code
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
      const apolloPersonId = (employee as any).apollo_person_id;
      const employeeName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      
      if (!apolloPersonId) {
        throw new Error('Apollo person ID not available for this lead');
      }
      
      // LAD Architecture: Use SDK API layer instead of direct fetch
      const data = await revealPhone(apolloPersonId, employeeName);
      
      if (data.success && data.phone) {
        // Store the revealed phone value
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: data.phone } }));
        // Mark as revealed
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
        // Show success message
        push({
          variant: 'success',
          title: 'Phone Revealed',
          description: `Phone number revealed${data.from_cache ? ' (from cache)' : ''}`
        });
      } else {
        throw new Error(data.error || 'Failed to reveal phone number');
      }
    } catch (error: any) {
      // LAD Architecture: No console.error in production code
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to reveal phone number'
      });
    } finally {
      setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: false } }));
    }
  };

  const handleRevealEmail = async (employee: ExtendedCampaignLead) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));
    
    try {
      const apolloPersonId = (employee as any).apollo_person_id;
      const employeeName = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
      
      if (!apolloPersonId) {
        throw new Error('Apollo person ID not available for this lead');
      }
      
      // LAD Architecture: Use SDK API layer instead of direct fetch
      const data = await revealEmail(apolloPersonId, employeeName);
      
      if (data.success && data.email) {
        // Store the revealed email value
        setRevealedValues(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: data.email } }));
        // Mark as revealed
        setRevealedContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));
        // Show success message
        push({
          variant: 'success',
          title: 'Email Revealed',
          description: `Email address revealed${data.from_cache ? ' (from cache)' : ''}`
        });
      } else {
        throw new Error(data.error || 'Failed to reveal email address');
      }
    } catch (error: any) {
      // LAD Architecture: No console.error in production code
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to reveal email address'
      });
    } finally {
      setRevealingContactsSafe(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: false } }));
    }
  };

  const handleViewSummary = async (employee: ExtendedCampaignLead) => {
    setSelectedEmployee(employee);
    setSummaryDialogOpen(true);
    setProfileSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);

    try {
<<<<<<< Updated upstream
      // First, try to get existing summary
      try {
        const token = safeStorage.getItem('token');
        const response = await fetch(`/api/campaigns/${campaignId}/leads/${employee.id}/summary`, {
          headers: {
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
        });
        const existingSummary = await response.json() as { success: boolean; summary: string | null; exists: boolean };
=======
        // LAD Architecture: Use SDK API layer instead of direct fetch
        // First, try to get existing summary
        try {
          const existingSummary = await getProfileSummary(employee.id, campaignId);
>>>>>>> Stashed changes
        
        if (existingSummary.success && existingSummary.summary) {
          setProfileSummary(existingSummary.summary);
          setSummaryLoading(false);
          return;
        }
      } catch (getError) {
        // If getting existing summary fails, proceed to generate new one
        // LAD Architecture: No console.log in production code
      }

      // LAD Architecture: Use SDK API layer instead of direct fetch
      // Generate new summary
<<<<<<< Updated upstream
      const token = safeStorage.getItem('token');
      const generateResponse = await fetch(`/api/campaigns/${campaignId}/leads/${employee.id}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
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
        }),
=======
      const response = await generateProfileSummary(employee.id, campaignId, {
        name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        title: employee.title,
        company: employee.company,
        email: employee.email,
        phone: employee.phone,
        linkedin_url: employee.linkedin_url,
        ...employee,
>>>>>>> Stashed changes
      });

      if (response.success && response.summary) {
        setProfileSummary(response.summary);
      } else {
        throw new Error('Failed to generate summary');
      }
    } catch (error: any) {
      // LAD Architecture: No console.error in production code
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
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8F9FE' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>Loading leads...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#F8F9FE', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push(`/campaigns/${campaignId}/analytics`)}
            sx={{ minWidth: 'auto' }}
          >
            Back to Analytics
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
              Campaign Leads
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              {filteredLeads.length} leads
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search leads by name, email, company, or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#64748B' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            bgcolor: 'white',
            borderRadius: '12px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            }
          }}
        />
      </Box>

      {/* Employee Cards Grid */}
      {filteredLeads.length === 0 ? (
        <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <People sx={{ fontSize: 64, color: '#CBD5E1', mb: 2 }} />
            <Typography variant="h6" sx={{ color: '#64748B', mb: 1 }}>
              {searchQuery ? 'No leads match your search' : 'No leads found'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
              {searchQuery ? 'Try adjusting your search terms' : 'Leads will appear here once the campaign starts generating them'}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: 'repeat(1, 1fr)', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)', 
              lg: 'repeat(4, 1fr)' 
            }, 
            gap: 2 
          }}>
            {filteredLeads.map((lead: CampaignLead, index: number) => {
              const idKey = lead.id || lead.name || '';
              const revealedPhone = revealedValues[idKey]?.phone;
              const revealedEmail = revealedValues[idKey]?.email;
              
              return (
                <EmployeeCard
                  key={lead.id}
                  employee={{
                    id: lead.id,
                    name: lead.name,
                    first_name: lead.first_name,
                    last_name: lead.last_name,
                    title: lead.title,
                    email: revealedEmail || lead.email,
                    phone: revealedPhone || lead.phone,
                    linkedin_url: lead.linkedin_url,
                    photo_url: lead.photo_url,  // Backend already extracts this from lead_data.photo_url
                  }}
                  employeeViewMode="grid"
                  revealedContacts={revealedContacts}
                  revealingContacts={revealingContacts}
                  handleRevealPhone={handleRevealPhone}
                  handleRevealEmail={handleRevealEmail}
                  onViewSummary={handleViewSummary}
                  profileSummary={lead.profile_summary || null}
                />
              );
            })}
          </Box>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 4 }}>
              <Button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                variant="outlined"
              >
                Previous
              </Button>
              <Typography sx={{ display: 'flex', alignItems: 'center', color: '#64748B' }}>
                Page {page} of {totalPages}
              </Typography>
              <Button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                variant="outlined"
              >
                Next
              </Button>
            </Box>
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
    </Box>
  );
}

