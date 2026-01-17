import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Avatar,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Paper,
  Chip
} from '@mui/material';
import {
  Close as CloseIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  MonetizationOn as MonetizationOnIcon,
  CalendarToday as CalendarTodayIcon
} from '@mui/icons-material';
import type { Lead } from '../types';

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
  [key: string]: unknown;
}

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

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`lead-tabpanel-${index}`}
    aria-labelledby={`lead-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

const LeadDetailsDialog: React.FC<LeadDetailsDialogProps> = ({ open, onClose, lead }) => {
  const [activeTab, setActiveTab] = useState<number>(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number): void => {
    setActiveTab(newValue);
  };

  const handleClose = (): void => {
    setActiveTab(0);
    onClose();
  };

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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
          borderRadius: 2
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40,
                bgcolor: 'primary.main'
              }}
            >
              {lead.name?.charAt(0)?.toUpperCase() || 'L'}
            </Avatar>
            <Box>
              <Typography variant="h6">{lead.name || 'Unnamed Lead'}</Typography>
              {leadCompany && (
                <Typography variant="body2" color="text.secondary">
                  {leadCompany}
                </Typography>
              )}
            </Box>
          </Box>
          <IconButton 
            edge="end" 
            color="inherit" 
            onClick={handleClose}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="Overview" />
              <Tab label="Activity" />
              <Tab label="Notes" />
            </Tabs>
          </Box>

          <TabPanel value={activeTab} index={0}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                gap: 3,
              }}
            >
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Lead Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {lead.email && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EmailIcon color="action" />
                      <Typography>{lead.email}</Typography>
                    </Box>
                  )}
                  {leadPhone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PhoneIcon color="action" />
                      <Typography>{leadPhone}</Typography>
                    </Box>
                  )}
                  {leadCompany && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BusinessIcon color="action" />
                      <Typography>{leadCompany}</Typography>
                    </Box>
                  )}
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle1" gutterBottom>
                  Pipeline & Deal Information
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MonetizationOnIcon color="primary" />
                    <Typography>{formatCurrency(leadAmount || 0)}</Typography>
                  </Box>
                  {leadCloseDate && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarTodayIcon color="action" />
                      <Box>
                        <Typography>
                          Close Date: {formatDate(leadCloseDate)}
                        </Typography>
                        {getDaysRemaining(leadCloseDate) !== null && getDaysRemaining(leadCloseDate)! < 7 && (
                          <Chip
                            size="small"
                            color="error"
                            label={`${getDaysRemaining(leadCloseDate)} days left`}
                            sx={{ mt: 0.5 }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">Status:</Typography>
                    <Chip
                      label={(lead as { statusLabel?: string }).statusLabel || leadStatus}
                      size="small"
                      sx={{
                        bgcolor: getStatusColor(leadStatus),
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">Priority:</Typography>
                    <Chip
                      label={(lead as { priorityLabel?: string }).priorityLabel || leadPriority}
                      size="small"
                      sx={{
                        bgcolor: getPriorityColor(leadPriority),
                        color: 'white',
                        borderRadius: '4px'
                      }}
                    />
                  </Box>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: 'background.default',
                  gridColumn: { xs: 'auto', md: '1 / -1' },
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {leadDescription || 'No description provided'}
                </Typography>
              </Paper>

              {leadTags.length > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: 'background.default',
                    gridColumn: { xs: 'auto', md: '1 / -1' },
                  }}
                >
                  <Typography variant="subtitle1" gutterBottom>
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {leadTags.map((tag: unknown, index: number) => (
                      <Chip
                        key={index}
                        label={String(tag)}
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: '4px' }}
                      />
                    ))}
                  </Box>
                </Paper>
              )}
            </Box>
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <Typography variant="body1" color="text.secondary">
              Activity timeline will be displayed here.
            </Typography>
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <Typography variant="body1" color="text.secondary">
              Notes and comments will be displayed here.
            </Typography>
          </TabPanel>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDetailsDialog;

