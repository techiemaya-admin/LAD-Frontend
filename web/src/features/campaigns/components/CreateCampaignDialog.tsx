'use client';

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/app-toaster';

interface CreateCampaignDialogProps {
  open: boolean;
  campaignName: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
}

export default function CreateCampaignDialog({
  open,
  campaignName,
  onClose,
  onNameChange,
}: CreateCampaignDialogProps) {
  const router = useRouter();
  const { push } = useToast();

  const handleCreate = () => {
    if (campaignName.trim()) {
      router.push(`/campaigns/new?name=${encodeURIComponent(campaignName)}`);
      onClose();
    } else {
      push({ variant: 'error', title: 'Error', description: 'Campaign name is required' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create New Campaign</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Campaign Name"
          value={campaignName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
          placeholder="e.g., Q1 Outreach Campaign"
          sx={{ mt: 2 }}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'Enter' && campaignName.trim()) {
              handleCreate();
            }
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #ff00e0)',
            },
          }}
        >
          Create & Build
        </Button>
      </DialogActions>
    </Dialog>
  );
}

