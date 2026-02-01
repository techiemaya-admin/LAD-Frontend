'use client';
import React from 'react';
import { Edit, Eye, Play, Pause, Square, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
    <DropdownMenu open={Boolean(anchorEl)} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DropdownMenuTrigger asChild>
        <div style={{ position: 'absolute', left: anchorEl?.getBoundingClientRect().left, top: anchorEl?.getBoundingClientRect().top }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/edit`); onClose(); }}>
          <Edit className="mr-2 h-4 w-4" /> Edit Workflow
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/analytics`); onClose(); }}>
          <Eye className="mr-2 h-4 w-4" /> View Analytics
        </DropdownMenuItem>
        {selectedCampaign.status === 'draft' && (
          <DropdownMenuItem onClick={() => { onStart(selectedCampaign.id); onClose(); }}>
            <Play className="mr-2 h-4 w-4" /> Start
          </DropdownMenuItem>
        )}
        {selectedCampaign.status === 'running' && (
          <DropdownMenuItem onClick={() => { onPause(selectedCampaign.id); onClose(); }}>
            <Pause className="mr-2 h-4 w-4" /> Pause
          </DropdownMenuItem>
        )}
        {selectedCampaign.status === 'paused' && (
          <DropdownMenuItem onClick={() => { onStart(selectedCampaign.id); onClose(); }}>
            <Play className="mr-2 h-4 w-4" /> Resume
          </DropdownMenuItem>
        )}
        {(selectedCampaign.status === 'running' || selectedCampaign.status === 'paused') && (
          <DropdownMenuItem onClick={() => { onStop(selectedCampaign.id); onClose(); }}>
            <Square className="mr-2 h-4 w-4" /> Stop
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => { onDelete(selectedCampaign.id); onClose(); }} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
