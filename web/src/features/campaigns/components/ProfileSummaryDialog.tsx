'use client';
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Avatar,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Close, Person } from '@mui/icons-material';
interface ProfileSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    photo_url?: string;
    [key: string]: any;
  } | null;
  summary: string | null;
  loading: boolean;
  error: string | null;
}
export default function ProfileSummaryDialog({
  open,
  onClose,
  employee,
  summary,
  loading,
  error,
}: ProfileSummaryDialogProps) {
  const employeeName = employee
    ? employee.name ||
      `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
      'Unknown'
    : '';
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          pb: 2,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <Avatar
          src={employee?.photo_url}
          alt={employeeName}
          sx={{
            width: 56,
            height: 56,
            border: '3px solid #0b1957',
            bgcolor: '#0b1957',
          }}
        >
          <Person sx={{ fontSize: 32 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
            {employeeName}
          </Typography>
          {employee?.title && (
            <Chip
              label={employee.title}
              size="small"
              color="primary"
              sx={{
                mt: 0.5,
                fontWeight: 600,
                fontSize: '0.75rem',
                height: 24,
              }}
            />
          )}
        </Box>
        <Button
          onClick={onClose}
          sx={{
            minWidth: 'auto',
            p: 1,
            color: '#64748B',
            '&:hover': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
            },
          }}
        >
          <Close />
        </Button>
      </DialogTitle>
      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 6,
            }}
          >
            <CircularProgress sx={{ color: '#0b1957', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              Generating profile summary...
            </Typography>
          </Box>
        ) : error ? (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
            }}
          >
            <Typography
              variant="body1"
              sx={{ color: '#EF4444', fontWeight: 600, mb: 1 }}
            >
              Error
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              {error}
            </Typography>
          </Box>
        ) : summary ? (
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: '#1E293B',
                mb: 2,
                fontSize: '1.1rem',
              }}
            >
              Profile Summary
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#475569',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                fontSize: '0.95rem',
              }}
            >
              {summary}
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              textAlign: 'center',
              py: 4,
            }}
          >
            <Typography variant="body2" sx={{ color: '#64748B' }}>
              No summary available
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            bgcolor: '#0b1957',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              bgcolor: '#0a1440',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}