'use client';
import React, { useEffect, useState } from 'react';
import { Edit, Eye, Play, Pause, Square, Trash2, RotateCcw, PlayCircle, UploadCloud, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@lad/frontend-features/campaigns';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

const ZOHO_API = '/api/social-integration/zoho';

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

  // Zoho "Push to Zoho" - only shown when Zoho CRM is connected for this tenant.
  const [zohoConnected, setZohoConnected] = useState(false);
  const [pushingZoho, setPushingZoho] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTenant(`${ZOHO_API}/status`);
        if (!cancelled && res.ok) {
          const data = await res.json();
          setZohoConnected(!!data?.data?.connected);
        }
      } catch { /* fail-closed: hide the action */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const handlePushToZoho = async (campaignId: string) => {
    setPushingZoho(true);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'Leads', campaign_id: campaignId }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const d = data.data;
        alert(`Pushed campaign leads to Zoho: ${d.inserted} inserted, ${d.updated} updated${d.failed ? `, ${d.failed} failed` : ''}${d.skipped_no_email ? ` (${d.skipped_no_email} skipped - no email)` : ''}.`);
      } else {
        alert(`Push to Zoho failed: ${data?.error || 'unknown error'}`);
      }
    } catch {
      alert('Push to Zoho failed.');
    } finally {
      setPushingZoho(false);
    }
  };

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
        <DropdownMenuItem onClick={() => { router.push(`/onboarding/advanced-search-ai?campaignId=${selectedCampaign.id}`); onClose(); }}>
          <Edit className="mr-2 h-4 w-4" /> Edit Accelerator
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/analytics`); onClose(); }}>
          <Eye className="mr-2 h-4 w-4" /> View Analytics
        </DropdownMenuItem>

        {zohoConnected && (
          <DropdownMenuItem
            disabled={pushingZoho}
            onSelect={(e) => { e.preventDefault(); handlePushToZoho(selectedCampaign.id); }}
          >
            {pushingZoho
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <UploadCloud className="mr-2 h-4 w-4" />}
            Push Leads to Zoho
          </DropdownMenuItem>
        )}

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
