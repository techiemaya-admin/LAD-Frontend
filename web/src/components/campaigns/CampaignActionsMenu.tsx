'use client';
import React from 'react';
import { Edit, Eye, Play, Pause, Square, Trash2, RotateCcw, PlayCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@lad/frontend-features/campaigns';

interface CampaignActionsMenuProps {
  anchorEl: HTMLElement | null;
  selectedCampaign: Campaign | null;
  onClose: () => void;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onResume: (id: string) => void;
  onRestart: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function CampaignActionsMenu({
  anchorEl,
  selectedCampaign,
  onClose,
  onStart,
  onPause,
  onStop,
  onResume,
  onRestart,
  onDelete,
}: CampaignActionsMenuProps) {
  const router = useRouter();
  if (!selectedCampaign) return null;

  const { status } = selectedCampaign;

  return (
    <DropdownMenu open={Boolean(anchorEl)} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DropdownMenuTrigger asChild>
        <div style={{ position: 'absolute', left: anchorEl?.getBoundingClientRect().left, top: anchorEl?.getBoundingClientRect().top }} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Always visible */}
        <DropdownMenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/edit`); onClose(); }}>
          <Edit className="mr-2 h-4 w-4" /> Edit Workflow
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/analytics`); onClose(); }}>
          <Eye className="mr-2 h-4 w-4" /> View Analytics
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* draft → Start */}
        {status === 'draft' && (
          <DropdownMenuItem onClick={() => { onStart(selectedCampaign.id); onClose(); }}>
            <Play className="mr-2 h-4 w-4" /> Start
          </DropdownMenuItem>
        )}

        {/* running → Pause | Stop */}
        {status === 'running' && (
          <DropdownMenuItem onClick={() => { onPause(selectedCampaign.id); onClose(); }}>
            <Pause className="mr-2 h-4 w-4" /> Pause
          </DropdownMenuItem>
        )}
        {status === 'running' && (
          <DropdownMenuItem onClick={() => { onStop(selectedCampaign.id); onClose(); }}>
            <Square className="mr-2 h-4 w-4" /> Stop
          </DropdownMenuItem>
        )}

        {/* paused → Resume from Last Step | Stop | Restart from Beginning */}
        {status === 'paused' && (
          <DropdownMenuItem onClick={() => { onResume(selectedCampaign.id); onClose(); }}>
            <PlayCircle className="mr-2 h-4 w-4" /> Resume from Last Step
          </DropdownMenuItem>
        )}
        {status === 'paused' && (
          <DropdownMenuItem onClick={() => { onStop(selectedCampaign.id); onClose(); }}>
            <Square className="mr-2 h-4 w-4" /> Stop
          </DropdownMenuItem>
        )}

        {/* stopped → Resume from Last Step | Restart from Beginning */}
        {status === 'stopped' && (
          <DropdownMenuItem onClick={() => { onResume(selectedCampaign.id); onClose(); }}>
            <PlayCircle className="mr-2 h-4 w-4" /> Resume from Last Step
          </DropdownMenuItem>
        )}

        {/* stopped / completed / paused / running → Restart from Beginning */}
        {(status === 'stopped' || status === 'completed' || status === 'paused' || status === 'running') && (
          <DropdownMenuItem onClick={() => { onRestart(selectedCampaign.id); onClose(); }}>
            <RotateCcw className="mr-2 h-4 w-4" /> Restart from Beginning
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { onDelete(selectedCampaign.id); onClose(); }}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
