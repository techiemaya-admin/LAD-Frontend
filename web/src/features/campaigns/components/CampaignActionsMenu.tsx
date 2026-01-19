'use client';

import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import { Edit, Visibility, PlayArrow, Pause, Stop, Delete } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/features/campaigns';

interface CampaignActionsMenuProps {
  anchorEl: HTMLElement | null;
  selectedCampaign: Campaign | null;
  onClose: () => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function CampaignActionsMenu({
  anchorEl,
  selectedCampaign,
  onClose,
  onStart,
  onPause,
  onStop,
  onDelete,
}: CampaignActionsMenuProps) {
  const router = useRouter();

  if (!selectedCampaign) return null;

  return (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={onClose}
    >
      <MenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/edit`); onClose(); }}>
        <Edit sx={{ mr: 1 }} /> Edit Workflow
      </MenuItem>
      <MenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/analytics`); onClose(); }}>
        <Visibility sx={{ mr: 1 }} /> View Analytics
      </MenuItem>
      {selectedCampaign.status === 'draft' && (
        <MenuItem onClick={() => { onStart(selectedCampaign.id); }}>
          <PlayArrow sx={{ mr: 1 }} /> Start
        </MenuItem>
      )}
      {selectedCampaign.status === 'running' && (
        <MenuItem onClick={() => { onPause(selectedCampaign.id); }}>
          <Pause sx={{ mr: 1 }} /> Pause
        </MenuItem>
      )}
      {selectedCampaign.status === 'paused' && (
        <MenuItem onClick={() => { onStart(selectedCampaign.id); }}>
          <PlayArrow sx={{ mr: 1 }} /> Resume
        </MenuItem>
      )}
      {(selectedCampaign.status === 'running' || selectedCampaign.status === 'paused') && (
        <MenuItem onClick={() => { onStop(selectedCampaign.id); }}>
          <Stop sx={{ mr: 1 }} /> Stop
        </MenuItem>
      )}
      <MenuItem onClick={() => { onDelete(selectedCampaign.id); }} sx={{ color: 'error.main' }}>
        <Delete sx={{ mr: 1 }} /> Delete
      </MenuItem>
    </Menu>
  );
}

