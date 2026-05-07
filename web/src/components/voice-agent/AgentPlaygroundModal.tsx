"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import Playground from "./playground/Playground";

interface AgentPlaygroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAgentId?: string | number;
  userId?: string;
  tenantId?: string;
}

export function AgentPlaygroundModal({
  isOpen,
  onClose,
  initialAgentId,
  userId,
  tenantId,
}: AgentPlaygroundModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[800px] p-0 border-0 overflow-hidden bg-transparent shadow-none" showCloseButton={false}>
        <DialogTitle className="sr-only">Voice Agent Playground</DialogTitle>
        <DialogDescription className="sr-only">
          An isolated sandbox environment for testing the AI voice agent capabilities.
        </DialogDescription>
        
        {/* The actual Playground component dictates the card styling */}
        <Playground onClose={onClose} initialAgentId={initialAgentId} userId={userId} tenantId={tenantId} />
      </DialogContent>
    </Dialog>
  );
}
