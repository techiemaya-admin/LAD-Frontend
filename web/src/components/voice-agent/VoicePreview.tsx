import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoicePreviewProps {
  language: string;
  gender: string;
  disabled?: boolean;
  voice_sample_url?: string;
}

export function VoicePreview({ language, gender, disabled = false, voice_sample_url }: VoicePreviewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to get auth token
  const getAuthToken = () => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  };

  // Get the playable audio URL
  const getAudioUrl = (): string | null => {
    if (!voice_sample_url) return null;

    // Fallback for non-gs URLs
    if (!voice_sample_url.startsWith('gs://')) return voice_sample_url;

    // Use proxy for gs:// URLs
    const token = getAuthToken();
    return `/api/recording-proxy?url=${encodeURIComponent(
      voice_sample_url
    )}&token=${encodeURIComponent(token)}`;
  };

  // Setup audio element when URL changes
  useEffect(() => {
    setIsPlaying(false);
    const existingAudio = audioRef.current;
    if (existingAudio) {
      existingAudio.pause();
      audioRef.current = null;
    }

    const audioUrl = getAudioUrl();
    if (!audioUrl) return;

    const a = new Audio(audioUrl);
    a.onended = () => setIsPlaying(false);
    audioRef.current = a;

    return () => {
      a.pause();
    };
  }, [voice_sample_url]);

  const handlePreview = async () => {
    try {
      if (isPlaying) {
        setIsPlaying(false);
        // Stop speech synthesis if in use
        window.speechSynthesis?.cancel();
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        const audioUrl = getAudioUrl();
        
        // If we have a voice sample URL, play it
        if (audioUrl && audioRef.current) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            console.error("Audio play error:", e);
            // Fallback to Web Speech API
            useFallbackPreview();
          }
        } else {
          // Fallback to Web Speech API when no sample URL
          useFallbackPreview();
        }
      }
    } catch (e) {
      console.error("Preview error:", e);
    }
  };

  const useFallbackPreview = () => {
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
