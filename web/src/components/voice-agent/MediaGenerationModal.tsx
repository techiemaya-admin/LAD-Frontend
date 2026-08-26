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
  /**
   * Raise the studio above a host overlay. The dialog portals to <body>, so a
   * caller rendered inside a high-z-index container (the Custom Workflow
   * Builder sits at z-index 10000) would otherwise open it *behind* itself  - 
   * invisible, and dismissed by the next stray click.
   */
  className?: string;
  overlayClassName?: string;
}

export function MediaGenerationModal({
                                       isOpen,
                                       onClose,
                                       className,
                                       overlayClassName,
                                     }: MediaGenerationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={`max-w-fit w-fit sm:max-w-fit sm:w-fit p-0 border-0 overflow-hidden bg-white dark:bg-[#000724] shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 outline-none ${className || ''}`}
        overlayClassName={overlayClassName}
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