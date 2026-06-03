"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import MediaBuilder from "./playground/MediaBuilder";

interface MediaGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MediaGenerationModal({
  isOpen,
  onClose,
}: MediaGenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-fit w-fit sm:max-w-fit sm:w-fit p-0 border-0 overflow-hidden bg-transparent shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none" 
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">AI Media Generation Wizard</DialogTitle>
        <DialogDescription className="sr-only">
          An interactive assistant for generating high-converting campaign visuals and personalized outbound media.
        </DialogDescription>
        
        <MediaBuilder onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
