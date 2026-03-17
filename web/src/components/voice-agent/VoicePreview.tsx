import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';

interface VoicePreviewProps {
  language: string;
  gender: string;
  disabled?: boolean;
  voice_sample_url?: string;
}

export function VoicePreview({ language, gender, disabled = false, voice_sample_url }: VoicePreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const userData = await getCurrentUser();
        if (userData) {
          const { success, user } = userData;
          if (success) {
            setIsAuth(true)
          } else {
            setIsAuth(false);
          }
        } else {
          setIsAuth(false);
        }
      } catch {
        setIsAuth(false);
      }
    })();
  }, []);

  // Get the playable audio URL
  const getAudioUrl = (): string | null => {
    if (!voice_sample_url) return null;
    if (!voice_sample_url.startsWith('gs://')) return voice_sample_url;

    return `/api/recording-proxy?url=${encodeURIComponent(
      voice_sample_url
    )}&token=${encodeURIComponent(token ?? '')}`;
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

    return () => { a.pause(); };
  }, [voice_sample_url, token]);

  const handlePreview = async () => {
    try {
      if (isPlaying) {
        setIsPlaying(false);
        window.speechSynthesis?.cancel();
        if (audioRef.current) {
          audioRef.current.pause();
        }
      } else {
        const audioUrl = getAudioUrl();
        if (audioUrl && audioRef.current) {
          try {
            await audioRef.current.play();
            setIsPlaying(true);
          } catch (e) {
            useFallbackPreview();
          }
        } else {
          useFallbackPreview();
        }
      }
    } catch (e) {
      // handled silently
    }
  };

  const useFallbackPreview = () => {
    setIsPlaying(true);
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
      <div className={cn("relative", isPlaying && "animate-pulse")}>
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
      <Volume2 className={cn("h-4 w-4 ml-1 transition-opacity", isPlaying ? "opacity-100" : "opacity-50")} />
    </Button>
  );
}