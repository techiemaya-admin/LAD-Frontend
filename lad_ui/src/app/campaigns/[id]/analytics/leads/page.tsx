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
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';
import EmployeeCard from '@/components/campaigns/EmployeeCard';
import ProfileSummaryDialog from '@/components/campaigns/ProfileSummaryDialog';

interface CampaignLead {
  id: string;
  campaign_id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company?: string;
  title?: string;
  status: string;
  created_at: string;
  updated_at?: string;
  lead_data?: any;
  custom_fields?: any;
  profile_summary?: string;
}

export default function CampaignLeadsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Reveal state for employee contacts
  const [revealedContacts, setRevealedContacts] = useState<Record<string, { phone?: boolean; email?: boolean }>>({});
  const [revealingContacts, setRevealingContacts] = useState<Record<string, { phone?: boolean; email?: boolean }>>({});
  
  // Profile summary dialog state
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [profileSummary, setProfileSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadLeads();
    }
  }, [campaignId, page]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await apiGet(
        `/api/campaigns/${campaignId}/leads?page=${page}&limit=50`
      ) as { success?: boolean; data?: CampaignLead[]; pagination?: { total: number; total_pages: number; page?: number; limit?: number } };
      
      console.log('[Campaign Leads] API Response:', response);
      
      // Handle response structure - backend returns { success, data, pagination }
      let leadsData = response.data || [];
      
      // Fetch summaries for all leads in parallel
      const summaryPromises = leadsData.map(async (lead) => {
        try {
          const summaryResponse = await apiGet<{ success: boolean; summary: string | null; exists: boolean }>(
            `/api/profile-summary/${lead.id}?campaignId=${campaignId}`
          );
          if (summaryResponse.success && summaryResponse.summary) {
            return { leadId: lead.id, summary: summaryResponse.summary };
          }
        } catch (err) {
          // Silently fail - summary might not exist yet
          console.log(`[Campaign Leads] No summary for lead ${lead.id}`);
        }
        return null;
      });
      
      const summaryResults = await Promise.all(summaryPromises);
      const summaryMap = new Map<string, string>();
      summaryResults.forEach((result) => {
        if (result) {
          summaryMap.set(result.leadId, result.summary);
        }
      });
      
      // Attach summaries to leads
      leadsData = leadsData.map((lead) => ({
        ...lead,
        profile_summary: summaryMap.get(lead.id) || null,
      }));
      
      const paginationData = response.pagination || { total: 0, total_pages: 1 };
      
      console.log('[Campaign Leads] Parsed data:', { 
        leadsCount: leadsData.length, 
        total: paginationData.total,
        pagination: paginationData
      });
      
      setLeads(leadsData);
      setTotal(paginationData.total || 0);
      setTotalPages(paginationData.total_pages || 1);
    } catch (error: any) {
      console.error('Failed to load leads:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to load leads',
      });
    } finally {
      setLoading(false);
    }
  };


  const handleRevealPhone = async (employee: any) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
    
    // Simulate API call - replace with actual API call
    setTimeout(() => {
      setRevealedContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: true } }));
      setRevealingContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], phone: false } }));
    }, 1000);
  };

  const handleRevealEmail = async (employee: any) => {
    const idKey = employee.id || employee.name || '';
    setRevealingContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));
    
    // Simulate API call - replace with actual API call
    setTimeout(() => {
      setRevealedContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: true } }));
      setRevealingContacts(prev => ({ ...prev, [idKey]: { ...prev[idKey], email: false } }));
    }, 1000);
  };

  const handleViewSummary = async (employee: any) => {
    setSelectedEmployee(employee);
    setSummaryDialogOpen(true);
    setProfileSummary(null);
    setSummaryError(null);
    setSummaryLoading(true);

    try {
      // First, try to get existing summary
      try {
        const existingSummary = await apiGet<{ success: boolean; summary: string | null; exists: boolean }>(
          `/api/profile-summary/${employee.id}?campaignId=${campaignId}`
        );
        
        if (existingSummary.success && existingSummary.summary) {
          setProfileSummary(existingSummary.summary);
          setSummaryLoading(false);
          return;
        }
      } catch (getError) {
        // If getting existing summary fails, proceed to generate new one
        console.log('[Profile Summary] No existing summary found, generating new one...');
      }

      // Generate new summary
      const response = await apiPost<{ success: boolean; summary: string; generated_at?: string }>(
        '/api/profile-summary/generate',
        {
          leadId: employee.id,
          campaignId: campaignId,
          profileData: {
            name: employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
            title: employee.title,
            company: employee.company,
            email: employee.email,
            phone: employee.phone,
            linkedin_url: employee.linkedin_url,
            ...employee,
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

