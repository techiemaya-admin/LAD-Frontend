'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <Dialog open={open} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <Input
            placeholder="e.g., Q1 Outreach Campaign"
            value={campaignName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onNameChange(e.target.value)}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.key === 'Enter' && campaignName.trim()) {
                handleCreate();
              }
            }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleCreate}
            className="bg-gradient-to-br from-[#00eaff] to-[#7c3aed] hover:from-[#7c3aed] hover:to-[#ff00e0]"
          >
            Create & Build
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
