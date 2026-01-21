'use client';

import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { format } from 'date-fns';
import { useCampaignActivityFeed } from '@sdk/features/campaigns/hooks/useCampaignActivityFeed';

interface LiveActivityTableProps {
  campaignId: string;
  maxHeight?: number;
  pageSize?: number;
}

export const LiveActivityTable: React.FC<LiveActivityTableProps> = ({
  campaignId,
  maxHeight = 500,
  pageSize = 50
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  
  const { activities, isLoading, isConnected, error, refresh } = useCampaignActivityFeed(
    campaignId,
    {
      limit: pageSize,
      platform: platformFilter !== 'all' ? platformFilter : undefined,
      actionType: actionFilter !== 'all' ? actionFilter : undefined
    }
  );

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      linkedin: '🔗',
      email: '📧',
      whatsapp: '💬',
      call: '📞',
      sms: '💬'
    };
    return icons[platform?.toLowerCase()] || '📊';
  };

  const formatActionType = (actionType: string) => {
    return actionType
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || '';
  };

  if (error) {
    return (
      <Box p={3} textAlign="center">
        <Typography color="error">Failed to load activity data</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with filters */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} gap={2}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Live Activity Feed
          </Typography>
          <Chip
            size="small"
            label={isConnected ? 'Live' : 'Offline'}
            color={isConnected ? 'success' : 'default'}
            sx={{
              fontWeight: 600,
              animation: isConnected ? 'pulse 2s infinite' : 'none',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 1 },
                '50%': { opacity: 0.6 }
              }
            }}
          />
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Platform</InputLabel>
            <Select
              value={platformFilter}
              label="Platform"
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <MenuItem value="all">All Platforms</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="whatsapp">WhatsApp</MenuItem>
              <MenuItem value="call">Call</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Action</InputLabel>
            <Select
              value={actionFilter}
              label="Action"
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="connection_request">Connection Request</MenuItem>
              <MenuItem value="message">Message</MenuItem>
              <MenuItem value="call">Call</MenuItem>
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="reply">Reply</MenuItem>
            </Select>
          </FormControl>

          <Tooltip title="Refresh">
            <IconButton onClick={refresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Activity Table */}
      <TableContainer 
        component={Paper} 
        sx={{ 
          maxHeight, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          borderRadius: 2
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Timestamp
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Lead
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Action
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Platform
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Status
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8F9FE' }}>
                Details
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">
                    No activity data available
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity, index) => (
                <TableRow 
                  key={activity.id || index}
                  sx={{
                    '&:hover': { backgroundColor: '#F8F9FE' },
                    transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {format(new Date(activity.created_at), 'MMM dd, HH:mm:ss')}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight={500}>
                        {activity.lead_name || 'Unknown'}
                      </Typography>
                      {activity.lead_phone && (
                        <Typography variant="caption" color="textSecondary">
                          {activity.lead_phone}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {formatActionType(activity.action_type)}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <span>{getPlatformIcon(activity.platform)}</span>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {activity.platform}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      label={activity.status || 'Unknown'}
                      color={getStatusColor(activity.status)}
                      size="small"
                      sx={{ fontWeight: 500 }}
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Tooltip title={activity.message_content || activity.error_message || ''}>
                      <Typography 
                        variant="body2" 
                        color="textSecondary"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {activity.message_content || activity.error_message || '-'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
