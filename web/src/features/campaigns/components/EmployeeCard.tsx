'use client';
import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Person,
  Email,
  Phone,
  Lock,
  CheckCircle,
  Description,
  ExpandMore,
  ExpandLess,
  LinkedIn,
} from '@mui/icons-material';
import { Button, Collapse } from '@mui/material';
interface EmployeeCardProps {
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    enriched_email?: string | null;
    enriched_linkedin_url?: string | null;
    photo_url?: string;
    profile_image?: string;
    is_inbound?: boolean; // Flag to identify inbound leads
    [key: string]: any;
  };
  employeeViewMode?: 'grid' | 'list';
  revealedContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>;
  revealingContacts?: Record<string, { phone?: boolean; email?: boolean; linkedin?: boolean }>;
  handleRevealPhone?: (employee: any) => void;
  handleRevealEmail?: (employee: any) => void;
  handleRevealLinkedIn?: (employee: any) => void;
  onViewSummary?: (employee: any) => void;
  profileSummary?: string | null;
  hideUnlockFeatures?: boolean; // New prop to hide unlock buttons for inbound campaigns
}
export default function EmployeeCard({
  employee,
  employeeViewMode = 'grid',
  revealedContacts = {},
  revealingContacts = {},
  handleRevealPhone,
  handleRevealEmail,
  handleRevealLinkedIn,
  onViewSummary,
  profileSummary,
  hideUnlockFeatures = false, // Default to false
}: EmployeeCardProps) {
  const [summaryExpanded, setSummaryExpanded] = React.useState(false);
  if (!employee) return null;
  const idKey = employee.id || employee.name || '';
  const employeeName = employee.name || 
    `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || 
    'Unknown';
  const phoneRevealed = revealedContacts[idKey]?.phone;
  const emailRevealed = revealedContacts[idKey]?.email || Boolean(employee.enriched_email);
  const linkedinRevealed = revealedContacts[idKey]?.linkedin || Boolean(employee.enriched_linkedin_url || employee.linkedin_url);
  const phoneLoading = revealingContacts[idKey]?.phone;
  const emailLoading = revealingContacts[idKey]?.email;
  const linkedinLoading = revealingContacts[idKey]?.linkedin;
  
  // Get actual values to display (prioritize enriched data)
  const displayEmail = employee.enriched_email || employee.email;
  const displayLinkedIn = employee.enriched_linkedin_url || employee.linkedin_url;
  
  // Determine if unlock features should be shown
  // Hide if: hideUnlockFeatures is true OR employee is marked as inbound
  const shouldHideUnlock = hideUnlockFeatures || employee.is_inbound === true;
  return (
    <Card
      sx={{
        flex: 1,
        minHeight: '100%',
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid oklch(0.922 0 0)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform:
            employeeViewMode === 'grid'
              ? 'translateY(-4px)'
              : 'translateY(-2px)',
          boxShadow: '0 4px 12px rgba(11, 25, 87, 0.15)',
          borderColor: '#0b1957',
        },
      }}
    >
      <CardContent sx={{ p: employeeViewMode === 'grid' ? 3 : 2.5 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection:
              employeeViewMode === 'grid' ? 'column' : 'row',
            alignItems: 'center',
            gap: employeeViewMode === 'grid' ? 1.5 : 4,
            justifyContent:
              employeeViewMode === 'list'
                ? 'space-between'
                : 'center',
            width: '100%',
          }}
        >
          {/* Avatar - Top (for grid view) */}
          {employeeViewMode === 'grid' && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2, width: '100%' }}>
              <Avatar
                src={employee.photo_url}
                alt={employeeName}
                sx={{
                  width: 90,
                  height: 90,
                  border: '4px solid',
                  borderColor: '#0b1957',
                  boxShadow: 2,
                  flexShrink: 0,
                }}
              >
                <Person sx={{ fontSize: 50 }} />
              </Avatar>
            </Box>
          )}
          {/* Name & Title - Center aligned for grid */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 0.8,
              width: '100%',
              alignItems: employeeViewMode === 'grid' ? 'center' : 'flex-start',
              textAlign: employeeViewMode === 'grid' ? 'center' : 'left',
            }}
          >
            {/* Avatar for list view */}
            {employeeViewMode === 'list' && (
              <Avatar
                src={employee.photo_url}
                alt={employeeName}
                sx={{
                  width: 80,
                  height: 80,
                  border: '3px solid',
                  borderColor: '#0b1957',
                  boxShadow: 3,
                  flexShrink: 0,
                  mb: 1,
                }}
              >
                <Person sx={{ fontSize: 40 }} />
              </Avatar>
            )}
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '1.05rem',
                color: '#0b1957',
                whiteSpace:
                  employeeViewMode === 'grid'
                    ? 'normal'
                    : 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                width: '100%',
              }}
            >
              {employeeName}
            </Typography>
            {employee.title && (
              <Chip
                label={employee.title}
                size="small"
                color="primary"
                sx={{
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  maxWidth: 'fit-content',
                  height: 26,
                  alignSelf: employeeViewMode === 'grid' ? 'center' : 'flex-start',
                  '& .MuiChip-label': {
                    px: 1.5,
                  },
                }}
              />
            )}
          </Box>
          {/* Contact info - Below name/title for grid */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.2,
              width: '100%',
              alignItems: employeeViewMode === 'grid' ? 'flex-start' : 'flex-start',
              mt: employeeViewMode === 'grid' ? 1 : 0,
            }}
          >
            {/* Phone */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#0b1957',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Phone sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: shouldHideUnlock || phoneRevealed
                    ? '#0b1957'
                    : 'oklch(0.556 0 0)',
                  fontSize: '0.8rem',
                  letterSpacing: shouldHideUnlock || phoneRevealed
                    ? 'normal'
                    : '1px',
                  filter: shouldHideUnlock || phoneRevealed ? 'none' : 'blur(4px)',
                  userSelect: shouldHideUnlock || phoneRevealed ? 'text' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: shouldHideUnlock || phoneRevealed ? 600 : 400,
                }}
              >
                {shouldHideUnlock ? (employee.phone || 'Not provided') : (phoneRevealed ? (employee.phone || '+971 50 123 4567') : '+971 50 123 4567')}
              </Typography>
              {!shouldHideUnlock && handleRevealPhone && (
                <Tooltip
                  title={
                    phoneRevealed
                      ? 'Phone number revealed'
                      : 'Click to reveal phone number'
                  }
                  arrow
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleRevealPhone) {
                          handleRevealPhone(employee);
                        }
                      }}
                      disabled={phoneLoading || phoneRevealed}
                      sx={{
                        bgcolor: 'oklch(0.97 0 0)',
                        border: '1px solid oklch(0.922 0 0)',
                        '&:hover': {
                          bgcolor: 'oklch(0.97 0 0)',
                          borderColor: '#0b1957',
                        },
                        p: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {phoneLoading ? (
                        <CircularProgress
                          size={20}
                          sx={{ color: '#0b1957' }}
                        />
                      ) : phoneRevealed ? (
                        <CheckCircle
                          sx={{
                            fontSize: 20,
                            color: '#0b1957',
                          }}
                        />
                      ) : (
                        <Lock
                          sx={{ fontSize: 20, color: '#0b1957' }}
                        />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
            {/* Email */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#0b1957',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Email sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: shouldHideUnlock || emailRevealed
                    ? '#0b1957'
                    : 'oklch(0.556 0 0)',
                  fontSize: '0.8rem',
                  letterSpacing: shouldHideUnlock || emailRevealed
                    ? 'normal'
                    : '1px',
                  filter: shouldHideUnlock || emailRevealed ? 'none' : 'blur(4px)',
                  userSelect: shouldHideUnlock || emailRevealed ? 'text' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: shouldHideUnlock || emailRevealed ? 600 : 400,
                }}
              >
                {shouldHideUnlock ? (displayEmail || 'Not provided') : (emailRevealed ? (displayEmail || 'name@company.com') : 'name@company.com')}
              </Typography>
              {!shouldHideUnlock && handleRevealEmail && (
                <Tooltip
                  title={
                    emailRevealed
                      ? 'Email address revealed'
                      : 'Click to reveal email address'
                  }
                  arrow
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleRevealEmail) {
                          handleRevealEmail(employee);
                        }
                      }}
                      disabled={emailLoading || emailRevealed}
                      sx={{
                        bgcolor: 'oklch(0.97 0 0)',
                        border: '1px solid oklch(0.922 0 0)',
                        '&:hover': {
                          bgcolor: 'oklch(0.97 0 0)',
                          borderColor: '#0b1957',
                        },
                        p: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {emailLoading ? (
                        <CircularProgress
                          size={20}
                          sx={{ color: '#0b1957' }}
                        />
                      ) : emailRevealed ? (
                        <CheckCircle
                          sx={{
                            fontSize: 20,
                            color: '#0b1957',
                          }}
                        />
                      ) : (
                        <Lock
                          sx={{ fontSize: 20, color: '#0b1957' }}
                        />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>

            {/* LinkedIn */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                width: '100%',
              }}
            >
              <Box
                sx={{
                  bgcolor: '#0077b5',
                  borderRadius: '50%',
                  p: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <LinkedIn sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Typography
                variant="caption"
                component={shouldHideUnlock || linkedinRevealed ? 'a' : 'span'}
                href={
                  shouldHideUnlock || linkedinRevealed
                    ? ((displayLinkedIn || '').startsWith('http')
                        ? displayLinkedIn
                        : `https://${displayLinkedIn}`)
                    : undefined
                }
                target={shouldHideUnlock || linkedinRevealed ? '_blank' : undefined}
                rel={shouldHideUnlock || linkedinRevealed ? 'noopener noreferrer' : undefined}
                sx={{
                  color: shouldHideUnlock || linkedinRevealed
                    ? '#0077b5'
                    : 'oklch(0.556 0 0)',
                  fontSize: '0.8rem',
                  letterSpacing: shouldHideUnlock || linkedinRevealed
                    ? 'normal'
                    : '1px',
                  filter: shouldHideUnlock || linkedinRevealed ? 'none' : 'blur(4px)',
                  userSelect: shouldHideUnlock || linkedinRevealed ? 'text' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: shouldHideUnlock || linkedinRevealed ? 600 : 400,
                  textDecoration: shouldHideUnlock || linkedinRevealed ? 'none' : 'none',
                  cursor: shouldHideUnlock || linkedinRevealed ? 'pointer' : 'default',
                  '&:hover': {
                    textDecoration: shouldHideUnlock || linkedinRevealed ? 'underline' : 'none',
                  },
                }}
              >
                {shouldHideUnlock 
                  ? (displayLinkedIn ? 'LinkedIn Profile' : 'Not provided')
                  : (linkedinRevealed 
                      ? 'LinkedIn Profile'
                      : 'linkedin.com/in/...')}
              </Typography>
              {!shouldHideUnlock && handleRevealLinkedIn && (
                <Tooltip
                  title={
                    linkedinRevealed
                      ? 'LinkedIn profile revealed'
                      : 'Click to reveal LinkedIn profile'
                  }
                  arrow
                >
                  <span>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleRevealLinkedIn) {
                          handleRevealLinkedIn(employee);
                        }
                      }}
                      disabled={linkedinLoading || linkedinRevealed}
                      sx={{
                        bgcolor: 'oklch(0.97 0 0)',
                        border: '1px solid oklch(0.922 0 0)',
                        '&:hover': {
                          bgcolor: 'oklch(0.97 0 0)',
                          borderColor: '#0077b5',
                        },
                        p: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {linkedinLoading ? (
                        <CircularProgress
                          size={20}
                          sx={{ color: '#0077b5' }}
                        />
                      ) : linkedinRevealed ? (
                        <CheckCircle
                          sx={{
                            fontSize: 20,
                            color: '#0077b5',
                          }}
                        />
                      ) : (
                        <Lock
                          sx={{ fontSize: 20, color: '#0077b5' }}
                        />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Box>
          </Box>
          {/* Profile Summary Section */}
          {profileSummary && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Description />}
                endIcon={summaryExpanded ? <ExpandLess /> : <ExpandMore />}
                onClick={(e) => {
                  e.stopPropagation();
                  setSummaryExpanded(!summaryExpanded);
                }}
                sx={{
                  borderColor: '#0b1957',
                  color: '#0b1957',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  py: 1,
                  mb: summaryExpanded ? 1 : 0,
                  '&:hover': {
                    borderColor: '#0b1957',
                    bgcolor: 'rgba(11, 25, 87, 0.04)',
                  },
                }}
              >
                {summaryExpanded ? 'Hide Summary' : 'View Summary'}
              </Button>
              <Collapse in={summaryExpanded}>
                <Box
                  sx={{
                    mt: 1,
                    p: 2,
                    bgcolor: '#F8F9FE',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#475569',
                      lineHeight: 1.7,
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                    }}
                  >
                    {profileSummary}
                  </Typography>
                </Box>
              </Collapse>
            </Box>
          )}
          {/* View Summary Button (if no summary available yet) */}
          {!profileSummary && onViewSummary && (
            <Box sx={{ width: '100%', mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Description />}
                onClick={(e) => {
                  e.stopPropagation();
                  onViewSummary(employee);
                }}
                sx={{
                  borderColor: '#0b1957',
                  color: '#0b1957',
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  py: 1,
                  '&:hover': {
                    borderColor: '#0b1957',
                    bgcolor: 'rgba(11, 25, 87, 0.04)',
                  },
                }}
              >
                Generate Summary
              </Button>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
