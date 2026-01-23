'use client';
import React from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, Table, TableHead, TableRow, TableCell, TableBody,
  IconButton, LinearProgress, Tooltip
} from '@mui/material';
import { Add, PlayArrow, Pause, Stop, CheckCircle, MoreVert } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignStatus } from '@/features/campaigns';
import { getStatusColor, renderChannelIcons, renderActionChips, getChannelsUsed, PLATFORM_CONFIG, renderPlatformMetrics } from './campaignUtils';
interface CampaignsTableProps {
  campaigns: Campaign[];
  loading: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => void;
}
export default function CampaignsTable({ campaigns, loading, onMenuOpen }: CampaignsTableProps) {
  const router = useRouter();
  // 🔍 DEBUG: Log campaigns data
  React.useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      } else {
      }
  }, [campaigns]);
  const getStatusIconComponent = (status: CampaignStatus) => {
    switch (status) {
      case 'running': return <PlayArrow fontSize="small" />;
      case 'paused': return <Pause fontSize="small" />;
      case 'stopped': return <Stop fontSize="small" />;
      case 'completed': return <CheckCircle fontSize="small" />;
      default: return null;
    }
  };
  const filteredCampaigns = campaigns;
  return (
    <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ p: 3 }}>
            <LinearProgress />
          </Box>
        ) : filteredCampaigns.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: '#64748B', mb: 2 }}>
              No campaigns found
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => router.push('/onboarding')}
              fullWidth
              sx={{ maxWidth: 280 }}
            >
              Create Your First Campaign
            </Button>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Campaign Name</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Channels</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Actions</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B', whiteSpace: 'nowrap' }}>Leads</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Sent</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Connected</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Replied</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#1E293B' }} align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCampaigns.map((campaign: Campaign) => (
                <TableRow key={campaign.id} hover>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 600, 
                        color: '#6366F1',
                        cursor: 'pointer',
                        '&:hover': {
                          textDecoration: 'underline',
                        }
                      }}
                      onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
                    >
                      {campaign.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={getStatusIconComponent(campaign.status) || undefined}
                      label={campaign.status}
                      color={getStatusColor(campaign.status)}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {renderChannelIcons(campaign)}
                  </TableCell>
                  <TableCell>
                    {renderActionChips(campaign)}
                  </TableCell>
                  <TableCell>{campaign.leads_count}</TableCell>
                  <TableCell>{campaign.sent_count}</TableCell>
                  <TableCell>
                    {renderPlatformMetrics(campaign, 'connected')}
                  </TableCell>
                  <TableCell>
                    {renderPlatformMetrics(campaign, 'replied')}
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => onMenuOpen(e, campaign)}
                    >
                      <MoreVert />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}