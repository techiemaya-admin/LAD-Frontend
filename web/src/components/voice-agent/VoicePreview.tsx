import React, { useState } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoicePreviewProps {
  language: string;
  gender: string;
  disabled?: boolean;
}

export function VoicePreview({ language, gender, disabled = false }: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePreview = () => {
    if (isPlaying) {
      setIsPlaying(false);
      // Stop audio playback
      window.speechSynthesis?.cancel();
    } else {
      setIsPlaying(true);
      
      // Use Web Speech API for demo preview
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
          `Hello! I'm your AI voice agent. I'm configured to speak in ${language.replace('-', ' ')} with a ${gender} voice. How can I help you today?`
        );
        
        utterance.lang = language;
        utterance.rate = 1;
        utterance.pitch = gender === 'male' ? 0.9 : gender === 'female' ? 1.1 : 1;
        
        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);
        
        window.speechSynthesis.speak(utterance);
      } else {
        // Fallback: simulate preview
        setTimeout(() => setIsPlaying(false), 3000);
      }
    }
  };

  const isDisabled = disabled || !language || !gender;

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handlePreview}
      disabled={isDisabled}
      className={cn(
        "gap-2 transition-all duration-300",
        isPlaying && "bg-primary/10 border-primary text-primary"
      )}
    >
      <div className={cn(
        "relative",
        isPlaying && "animate-pulse"
      )}>
        {isPlaying ? (
          <>
            <Square className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full animate-pulse-glow" />
          </>
        ) : (
          <Play className="h-4 w-4" />
        )}
      </div>
      <span>{isPlaying ? 'Stop Preview' : 'Preview Voice'}</span>
      <Volume2 className={cn(
        "h-4 w-4 ml-1 transition-opacity",
        isPlaying ? "opacity-100" : "opacity-50"
      )} />
    </Button>
  );
}
