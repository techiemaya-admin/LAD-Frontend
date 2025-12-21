// components/CompanyCard.jsx
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
  CircularProgress,
} from '@mui/material';

import {
  Business,
  Phone,
  LocationOn,
  People,
  Language,
  LinkedIn as LinkedInIcon,
  Facebook,
  Instagram,
  Public,
  Home,
  Tag,
  ShowChart,
  TrendingUp,
  TrendingDown,
  Straighten,
  Group,
  CalendarToday,
  AttachMoney,
  Article,
  RssFeed,
  Settings,
  CheckCircle,
} from '@mui/icons-material';

function getCompanySizeLabel(employeeCount) {
  const count = parseInt(employeeCount || 0, 10);
  if (!count) return 'Unknown';

  if (count >= 200) return 'Enterprise (200+ employees)';
  if (count >= 50) return 'Large (50–199 employees)';
  if (count >= 10) return 'Medium (10–49 employees)';
  return 'Small (1–9 employees)';
}

function getCompanySizeColor(sizeLabel) {
  if (!sizeLabel) return '#757575';
  if (sizeLabel.includes('Enterprise')) return '#d32f2f';
  if (sizeLabel.includes('Large')) return '#4caf50';
  if (sizeLabel.includes('Medium')) return '#ba68c8';
  if (sizeLabel.includes('Small')) return '#2196f3';
  return '#757575';
}

export default function CompanyCard({
  company,
  index,
  isSelected,
  onSelect,
  handleViewDetails,
  handleGetContact,
  handleGetEmployees,
  phoneData,
  phoneLoading,
  phoneError,
}) {
  if (!company) return null;

  const companyId = company.id ?? index;
  const companyName =
    company.companyName || company.username || company.name || 'Unknown Company';

  const companyLogo =
    company.logoUrl ||
    company.logo ||
    company.profileImage ||
    company.companyLogo;

  const hasEmployees =
    company.employeeCount && parseInt(company.employeeCount, 10) > 0;

  const sizeLabel = getCompanySizeLabel(company.employeeCount);
  const sizeColor = getCompanySizeColor(sizeLabel);

  const locationParts = [
    company.city,
    company.state,
    company.country,
  ].filter(Boolean);
  const locationLabel = locationParts.join(', ');

  const hasPhoneBlock = Boolean(phoneData?.[companyId]);
  const phoneInfo = phoneData?.[companyId];

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
                  bgcolor: 'primary.main',
                  flexShrink: 0,
                  border: isSelected
                    ? '3px solid #0b1957'
                    : '2px solid #e9ecef',
                }}
                src={companyLogo}
                alt={`${companyName} logo`}
              >
                {!companyLogo && <Business />}
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
              }}
            >
              <Typography
                variant="h6"
                fontWeight="bold"
                onClick={(e) => {
                  e.stopPropagation();
                  if (handleViewDetails) {
                    handleViewDetails(company);
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
                {companyName}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ p: 2.5, pt: 2 }}>
          <Box sx={{ mb: 0 }}>
            {/* Industry */}
            <Box sx={{ minHeight: '24px', mb: 0.5 }}>
              {company.industry && (
                <Chip
                  label={company.industry}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 'bold', height: 24 }}
                />
              )}
            </Box>

            {/* Decision Maker Contact */}
            <Box sx={{ minHeight: '60px', mb: 0 }}>
              {hasPhoneBlock && (
                <Box
                  sx={{
                    mb: 1,
                    p: 1.5,
                    bgcolor: '#f0fff4',
                    borderRadius: 1,
                    border: '1px solid #28a745',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#28a745',
                      textTransform: 'uppercase',
                      fontWeight: 700,
                      letterSpacing: '0.5px',
                      fontSize: '0.7rem',
                      mb: 1,
                      display: 'block',
                    }}
                  >
                    ✓ DECISION MAKER CONTACT
                  </Typography>

                  {/* Phone */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: phoneInfo?.name ? 0.5 : 0,
                    }}
                  >
                    <Phone sx={{ fontSize: 16, color: '#28a745' }} />
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#212529',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                      }}
                    >
                      {phoneInfo?.phone}
                    </Typography>
                    {phoneInfo?.confidence && (
                      <Chip
                        label={phoneInfo.confidence}
                        size="small"
                        sx={{
                          bgcolor: '#28a745',
                          color: 'white',
                          fontSize: '0.65rem',
                          height: '18px',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      />
                    )}
                  </Box>

                  {/* Contact person */}
                  {phoneInfo?.name && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#2e7d32',
                        fontSize: '0.75rem',
                      }}
                    >
                      {phoneInfo.name}
                      {phoneInfo.title ? ` • ${phoneInfo.title}` : ''}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>

            {/* Contact + location row */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                mb: 1.5,
              }}
            >
              {/* Phone (company-level / button) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Phone sx={{ fontSize: 18, color: '#0b1957' }} />
                <Typography
                  variant="body2"
                  sx={{
                    color: company.phone ? '#0b1957' : 'oklch(0.556 0 0)',
                    fontSize: '0.875rem',
                    fontWeight: company.phone ? 600 : 400,
                  }}
                >
                  {company.phone || 'Phone number not available'}
                </Typography>
                {handleGetContact && (
                  <Tooltip
                    title={
                      phoneLoading?.[companyId]
                        ? 'Finding decision maker phone…'
                        : 'Get decision maker phone'
                    }
                    arrow
                  >
                    <span>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGetContact(company);
                        }}
                        disabled={phoneLoading?.[companyId]}
                        sx={{
                          p: 0.5,
                          bgcolor: 'oklch(0.97 0 0)',
                          border: '1px solid oklch(0.922 0 0)',
                          '&:hover': {
                            bgcolor: 'oklch(0.97 0 0)',
                            borderColor: '#0b1957',
                          },
                        }}
                      >
                        {phoneLoading?.[companyId] ? (
                          <CircularProgress size={18} sx={{ color: '#0b1957' }} />
                        ) : (
                          <Settings
                            sx={{ fontSize: 18, color: '#0b1957' }}
                          />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                )}
              </Box>

              {/* Location */}
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
                  {locationLabel || 'Location not available'}
                </Typography>
              </Box>
            </Box>

            {/* Company size / scale */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                mb: 1.5,
              }}
            >
              <Group sx={{ fontSize: 18, color: sizeColor }} />
              <Typography
                variant="body2"
                sx={{
                  color: '#0b1957',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}
              >
                {sizeLabel}
              </Typography>
            </Box>

            {/* Links row */}
            {(company.website ||
              company.linkedinProfile ||
              company.twitterUrl ||
              company.facebookUrl ||
              company.instagramUrl ||
              company.blogUrl) && (
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                }}
              >
                {company.website && (
                  <Chip
                    icon={<Language />}
                    label="Website"
                    component="a"
                    href={company.website}
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
                {company.linkedinProfile && (
                  <Chip
                    icon={<LinkedInIcon />}
                    label="LinkedIn"
                    component="a"
                    href={company.linkedinProfile}
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
                {company.facebookUrl && (
                  <Chip
                    icon={<Facebook />}
                    label="Facebook"
                    component="a"
                    href={company.facebookUrl}
                    target="_blank"
                    clickable
                    sx={{
                      bgcolor: 'oklch(0.97 0 0)',
                      color: '#1877F2',
                      border: '1px solid oklch(0.922 0 0)',
                      '&:hover': {
                        bgcolor: 'oklch(0.97 0 0)',
                        borderColor: '#1877F2',
                      },
                    }}
                  />
                )}
                {company.instagramUrl && (
                  <Chip
                    icon={<Instagram />}
                    label="Instagram"
                    component="a"
                    href={company.instagramUrl}
                    target="_blank"
                    clickable
                    sx={{
                      bgcolor: 'oklch(0.97 0 0)',
                      color: '#C13584',
                      border: '1px solid oklch(0.922 0 0)',
                      '&:hover': {
                        bgcolor: 'oklch(0.97 0 0)',
                        borderColor: '#C13584',
                      },
                    }}
                  />
                )}
                {company.blogUrl && (
                  <Chip
                    icon={<RssFeed />}
                    label="Blog"
                    component="a"
                    href={company.blogUrl}
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
              </Box>
            )}
          </Box>
        </Box>
      </CardContent>

      {/* Footer actions */}
      <CardActions
        sx={{
          px: 2.5,
          pb: 2.5,
          pt: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        {/* Employee count & CTA */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Box
              sx={{
                width: 65,
                height: 65,
                borderRadius: '50%',
                background: hasEmployees
                  ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
                  : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: hasEmployees
                  ? '0 4px 12px rgba(0, 210, 255, 0.4)'
                  : '0 4px 12px rgba(0, 0, 0, 0.25)',
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  width: 55,
                  height: 55,
                  borderRadius: '50%',
                  bgcolor: '#e0e0e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 0.3,
                }}
              >
                <People
                  sx={{
                    color: hasEmployees ? '#3a7bd5' : '#757575',
                    fontSize: hasEmployees ? 22 : 18,
                    mb: hasEmployees ? 0.2 : 0,
                  }}
                />
                {hasEmployees && (
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    sx={{
                      color: '#3a7bd5',
                      fontSize: '0.95rem',
                      lineHeight: 1,
                    }}
                  >
                    {company.employeeCount}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>

          <Button
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              if (handleGetEmployees) {
                handleGetEmployees(company);
              }
            }}
            disabled={!hasEmployees}
            sx={{
              background: hasEmployees
                ? 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)'
                : 'linear-gradient(135deg, #bdbdbd 0%, #9e9e9e 100%)',
              color: hasEmployees ? 'white' : '#757575',
              fontWeight: 700,
              fontSize: '0.85rem',
              textTransform: 'none',
              px: 4.5,
              py: 1,
              height: '38px',
              minWidth: '160px',
              borderRadius: '50px',
              boxShadow: hasEmployees
                ? '0 4px 12px rgba(0, 210, 255, 0.4)'
                : '0 4px 12px rgba(0, 0, 0, 0.25)',
              transition: 'all 0.3s ease',
              flexShrink: 0,
              '&:hover': {
                background: hasEmployees
                  ? 'linear-gradient(135deg, #3a7bd5 0%, #2a5db0 100%)'
                  : 'linear-gradient(135deg, #9e9e9e 0%, #757575 100%)',
                transform: hasEmployees ? 'translateY(-1px)' : 'none',
              },
            }}
          >
            {hasEmployees ? 'View Employees' : 'No Employees Data'}
          </Button>
        </Box>
      </CardActions>
    </Card>
  );
}
