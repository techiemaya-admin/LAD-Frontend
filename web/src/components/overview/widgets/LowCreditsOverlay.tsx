"use client";
import React, { useState } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface LowCreditsOverlayProps {
  show: boolean;
  onClose?: () => void;
}

export const LowCreditsOverlay: React.FC<LowCreditsOverlayProps> = ({ show, onClose }) => {
  const router = useRouter();

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col rounded-xl">
      <div className="flex justify-end p-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-red-600 animate-pulse" />
          </div>
          <div>
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              Running Out of Credits!
            </p>

            <p className="text-sm text-muted-foreground mt-2">
              Your credits are critically low. Upgrade now to continue uninterrupted service.
            </p>
          </div>
          <Button
            size="sm"
            className="bg-red-600 hover:bg-red-700 text-white gap-1"
            onClick={() => router.push("/settings?tab=credits")}
          >
            <Plus className="h-4 w-4" />
            Upgrade Credits
          </Button>
        </div>
      </div>
    </div>
  );
};
