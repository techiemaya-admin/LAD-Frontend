"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { AgentPlaygroundModal } from "@/components/voice-agent/AgentPlaygroundModal";

export default function TestPlaygroundPage() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white p-4">
      <div className="text-center max-w-xl">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">Isolated Playground Test</h1>
        <p className="text-slate-500 mb-8">
            Since you do not have the Node authentication backend running locally, the main Make A Call page is locked. 
            However, this page is completely standalone. You can use this button to test the new Playground Modal component connecting natively to your Python worker!
        </p>
      </div>

      <Button onClick={() => setIsOpen(true)} className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-6 text-lg rounded-xl">
        <Sparkles className="w-5 h-5" />
        Launch VOAG- Playground
      </Button>
      
      <AgentPlaygroundModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}
