// components/EmployeeCompanyCard.jsx
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
} from '@mui/icons-material';

export default function EmployeeCompanyCard({
  employee,
  employeeViewMode = 'grid',
  revealedContacts = {},
  revealingContacts = {},
  handleRevealPhone,
  handleRevealEmail,
}) {
  if (!employee) return null;

  const idKey = employee.id || employee.name;

  const phoneRevealed = revealedContacts[idKey]?.phone;
  const emailRevealed = revealedContacts[idKey]?.email;
  const phoneLoading = revealingContacts[idKey]?.phone;
  const emailLoading = revealingContacts[idKey]?.email;

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
                : 'flex-start',
          }}
        >
          {/* Left: photo + name/title */}
          <Box
            sx={{
              display: 'flex',
              flexDirection:
                employeeViewMode === 'grid' ? 'column' : 'row',
              alignItems: 'center',
              gap: employeeViewMode === 'grid' ? 2 : 3,
              flex: employeeViewMode === 'list' ? '0 0 auto' : 'none',
            }}
          >
            <Avatar
              src={employee.photo_url}
              alt={employee.name}
              sx={{
                width: employeeViewMode === 'grid' ? 90 : 80,
                height: employeeViewMode === 'grid' ? 90 : 80,
                border:
                  employeeViewMode === 'grid'
                    ? '4px solid'
                    : '3px solid',
                borderColor: '#0b1957',
                boxShadow: employeeViewMode === 'grid' ? 2 : 3,
                flexShrink: 0,
              }}
            >
              <Person
                sx={{
                  fontSize:
                    employeeViewMode === 'grid' ? 50 : 40,
                }}
              />
            </Avatar>

            {/* Name & Title */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0.8,
                minWidth:
                  employeeViewMode === 'grid' ? 'auto' : 200,
                maxWidth:
                  employeeViewMode === 'grid' ? '100%' : 300,
              }}
            >
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
                }}
              >
                {employee.name || 'Unknown'}
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
                    '& .MuiChip-label': {
                      px: 1.5,
                    },
                  }}
                />
              )}
              {employee.linkedin_url && (
                <Typography
                  variant="caption"
                  sx={{
                    color: 'oklch(0.556 0 0)',
                    maxWidth: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {employee.linkedin_url}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Right: contact info */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1.2,
              flex: 1,
            }}
          >
            {/* Phone */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
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
                }}
              >
                <Phone sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: phoneRevealed
                    ? '#0b1957'
                    : 'oklch(0.556 0 0)',
                  fontSize: '0.8rem',
                  letterSpacing: phoneRevealed
                    ? 'normal'
                    : '1px',
                  filter: phoneRevealed ? 'none' : 'blur(4px)',
                  userSelect: phoneRevealed ? 'text' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: phoneRevealed ? 600 : 400,
                }}
              >
                {phoneRevealed ||
                  '+971 50 123 4567'}
              </Typography>
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
            </Box>

            {/* Email */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
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
                }}
              >
                <Email sx={{ fontSize: 16, color: 'white' }} />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  color: emailRevealed
                    ? '#0b1957'
                    : 'oklch(0.556 0 0)',
                  fontSize: '0.8rem',
                  letterSpacing: emailRevealed
                    ? 'normal'
                    : '1px',
                  filter: emailRevealed ? 'none' : 'blur(4px)',
                  userSelect: emailRevealed ? 'text' : 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  fontWeight: emailRevealed ? 600 : 400,
                }}
              >
                {emailRevealed || 'name@company.com'}
              </Typography>
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
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
