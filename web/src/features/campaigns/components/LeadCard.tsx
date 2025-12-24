'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Button,
} from '@mui/material';
import {
  Person,
  Phone,
  LocationOn,
  Email,
  LinkedIn as LinkedInIcon,
  Business,
  CheckCircle,
  Language,
} from '@mui/icons-material';

interface LeadCardProps {
  lead: {
    id: string;
    name: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    linkedin_url?: string;
    company?: string;
    title?: string;
    status?: string;
    city?: string;
    state?: string;
    country?: string;
    website?: string;
    photo_url?: string;
    profile_image?: string;
    [key: string]: any;
  };
  index?: number;
  isSelected?: boolean;
  onSelect?: () => void;
  onViewDetails?: (lead: any) => void;
  onViewEmployees?: (lead: any) => void;
}

export default function LeadCard({
  lead,
  index = 0,
  isSelected = false,
  onSelect,
  onViewDetails,
  onViewEmployees,
}: LeadCardProps) {
  if (!lead) return null;

  const leadId = lead.id || index;
  const leadName = lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown Lead';

  const leadPhoto = lead.photo_url || lead.profile_image;

  const locationParts = [
    lead.city,
    lead.state,
    lead.country,
  ].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'success';
      case 'completed': return 'info';
      case 'stopped': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <Card
      onClick={onSelect}
      sx={{
        flex: 1,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease',
        border: isSelected ? '2px solid' : '1px solid',
        borderColor: isSelected ? '#0b1957' : '#e9ecef',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative',
        bgcolor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          borderColor: isSelected ? '#0b1957' : '#dee2e6',
        },
        '&::before': isSelected
          ? {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: '#0b1957',
              zIndex: 1,
            }
          : {},
      }}
    >
      <CardContent
        sx={{ flexGrow: 1, p: 0, position: 'relative', zIndex: 2 }}
      >
        {/* Header */}
        <Box
          sx={{
            bgcolor: '#ffffff',
            p: 2.5,
            position: 'relative',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              position: 'relative',
            }}
          >
            <Box sx={{ position: 'relative', flexShrink: 0 }}>
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  bgcolor: '#0b1957',
                  flexShrink: 0,
                  border: isSelected
                    ? '3px solid #0b1957'
                    : '2px solid #e9ecef',
                }}
                src={leadPhoto}
                alt={leadName}
              >
                {!leadPhoto && <Person />}
              </Avatar>

              {isSelected && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: '#0b1957',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid white',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    zIndex: 3,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 16, color: 'white' }} />
                </Box>
              )}
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDetails) {
                      onViewDetails(lead);
                    }
                  }}
                  sx={{
                    wordBreak: 'break-word',
                    lineHeight: 1.3,
                    fontSize: '1.125rem',
                    color: '#000000',
                    cursor: 'pointer',
                    transition: 'color 0.2s',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    '&:hover': {
                      color: '#0b1957',
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {leadName}
                </Typography>
                {lead.title && (
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748B',
                      fontSize: '0.75rem',
                      mt: 0.5,
                      display: 'block',
                    }}
                  >
                    {lead.title}
                  </Typography>
                )}
              </Box>
              {lead.status && (
                <Chip
                  label={lead.status}
                  color={getStatusColor(lead.status) as any}
                  size="small"
                  sx={{ textTransform: 'capitalize', fontSize: '0.75rem', ml: 1 }}
                />
              )}
            </Box>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ p: 2.5, pt: 2 }}>
          <Box sx={{ mb: 0 }}>
            {/* Company */}
            {lead.company && (
              <Box sx={{ minHeight: '24px', mb: 1 }}>
                <Chip
                  icon={<Business sx={{ fontSize: 16 }} />}
                  label={lead.company}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 'bold', height: 24 }}
                />
              </Box>
            )}

            {/* Contact + location row */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                mb: 1.5,
              }}
            >
              {/* Phone */}
              {lead.phone && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Phone sx={{ fontSize: 18, color: '#0b1957' }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#0b1957',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {lead.phone}
                  </Typography>
                </Box>
              )}

              {/* Email */}
              {lead.email && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Email sx={{ fontSize: 18, color: '#0b1957' }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#0b1957',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    {lead.email}
                  </Typography>
                </Box>
              )}

              {/* Location */}
              {locationLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LocationOn sx={{ fontSize: 18, color: '#0b1957' }} />
                  <Typography
                    variant="body2"
                    sx={{
                      color: locationLabel
                        ? '#0b1957'
                        : 'oklch(0.556 0 0)',
                      fontSize: '0.875rem',
                    }}
                  >
                    {locationLabel}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Links row */}
            {(lead.website || lead.linkedin_url) && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                }}
              >
                {lead.website && (
                  <Chip
                    icon={<Language />}
                    label="Website"
                    component="a"
                    href={lead.website}
                    target="_blank"
                    clickable
                    sx={{
                      bgcolor: 'oklch(0.97 0 0)',
                      color: '#0b1957',
                      border: '1px solid oklch(0.922 0 0)',
                      '&:hover': {
                        bgcolor: 'oklch(0.97 0 0)',
                        borderColor: '#0b1957',
                      },
                    }}
                  />
                )}
                {lead.linkedin_url && (
                  <Chip
                    icon={<LinkedInIcon />}
                    label="LinkedIn"
                    component="a"
                    href={lead.linkedin_url}
                    target="_blank"
                    clickable
                    sx={{
                      bgcolor: 'oklch(0.97 0 0)',
                      color: '#0077b5',
                      border: '1px solid oklch(0.922 0 0)',
                      '&:hover': {
                        bgcolor: 'oklch(0.97 0 0)',
                        borderColor: '#0077b5',
                      },
                    }}
                  />
                )}
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Footer actions */}
      {onViewEmployees && lead.company && (
        <CardActions
          sx={{
            px: 2.5,
            pb: 2.5,
            pt: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Button
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewEmployees) {
                onViewEmployees(lead);
              }
            }}
            sx={{
              background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
              color: 'white',
              fontWeight: 700,
              fontSize: '0.85rem',
              textTransform: 'none',
              px: 4.5,
              py: 1,
              height: '38px',
              minWidth: '160px',
              borderRadius: '50px',
              boxShadow: '0 4px 12px rgba(0, 210, 255, 0.4)',
              transition: 'all 0.3s ease',
              flexShrink: 0,
              '&:hover': {
                background: 'linear-gradient(135deg, #3a7bd5 0%, #2a5db0 100%)',
                transform: 'translateY(-1px)',
              },
            }}
          >
            View Employees
          </Button>
        </CardActions>
      )}
    </Card>
  );
}

