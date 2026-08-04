import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2, Upload, Plus, Loader2, Mic, StopCircle, Scissors, Settings2, Sparkles, AudioLines } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '../../hooks/use-toast';
import { Voice } from '@/types/agent';
import { cn } from '@/lib/utils';
import { safeStorage } from '@lad/shared/storage';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';

interface VoiceLibraryProps {
  voices: Voice[];
  setVoices: React.Dispatch<React.SetStateAction<Voice[]>>;
}

function encodeWAV(buffer: AudioBuffer, startSec: number, endSec: number): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const startOffset = Math.max(0, Math.floor(startSec * sampleRate));
  const endOffset = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const length = endOffset - startOffset;
  
  const interleaved = new Float32Array(length * numChannels);
  
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      interleaved[i * numChannels + channel] = channelData[startOffset + i];
    }
  }
  
  const dataView = new DataView(new ArrayBuffer(44 + interleaved.length * 2));
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(dataView, 0, 'RIFF');
  dataView.setUint32(4, 36 + interleaved.length * 2, true);
  writeString(dataView, 8, 'WAVE');
  writeString(dataView, 12, 'fmt ');
  dataView.setUint32(16, 16, true);
  dataView.setUint16(20, 1, true); // PCM
  dataView.setUint16(22, numChannels, true);
  dataView.setUint32(24, sampleRate, true);
  dataView.setUint32(28, sampleRate * numChannels * 2, true);
  dataView.setUint16(32, numChannels * 2, true);
  dataView.setUint16(34, 16, true); // 16 bit
  writeString(dataView, 36, 'data');
  dataView.setUint32(40, interleaved.length * 2, true);
  
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, interleaved[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([dataView], { type: 'audio/wav' });
}

const READING_SCRIPTS = [
  {
    title: "Security & Consent",
    type: "Privacy",
    description: "Verifies identity and authorized voice profile usage. Recommended for secure and formal assistants.",
    text: "I authorize this system to create a secure digital clone of my voice. I understand this voice profile will be used to generate clear and natural speech for my assistant, and I will maintain control over its use."
  },
  {
    title: "Phonetic Narrative",
    type: "Phonetic",
    description: "Highest similarity and pronunciation precision. Acoustically rich in phonemes. Recommended for premium results.",
    text: "The gentle morning sun broke through the soft fog, warming the ancient stone path. A small blue bird chirped happily from a branch of the giant oak tree, while the quiet stream below flowed steadily towards the distant lake. Every sound seemed perfectly clear in the peaceful valley."
  },
  {
    title: "Conversational Pitch",
    type: "Conversational",
    description: "Natural cadence and active flow. Captured in a friendly tone. Recommended for customer-facing sales agents.",
    text: "Hello, and thank you for reaching out to us today. We've been working hard to make our automated assistance experience incredibly smooth, fast, and natural. Please let me know how I can help you find what you're looking for."
  }
];

const CLONE_LANGUAGES = [
  { value: "en-US", label: "English (US Accent)" },
  { value: "en-GB", label: "English (UK Accent)" },
  { value: "en-IN", label: "English (Indian Accent)" },
  { value: "en-AU", label: "English (Australian Accent)" },
  { value: "ar", label: "English (with Arabic Accent) / Arabic" },
  { value: "ml", label: "English (with Malayalam Accent) / Malayalam" },
  { value: "ta", label: "English (with Tamil Accent) / Tamil" },
  { value: "hi", label: "English (with Hindi Accent) / Hindi" },
  { value: "gu", label: "English (with Gujarati Accent) / Gujarati" },
  { value: "te", label: "English (with Telugu Accent) / Telugu" },
  { value: "kn", label: "English (with Kannada Accent) / Kannada" },
  { value: "mr", label: "English (with Marathi Accent) / Marathi" },
  { value: "bn", label: "English (with Bengali Accent) / Bengali" },
  { value: "pa", label: "English (with Punjabi Accent) / Punjabi" },
  { value: "es", label: "Spanish (Español)" },
  { value: "fr", label: "French (Français)" },
  { value: "de", label: "German (Deutsch)" },
  { value: "ja", label: "Japanese (日本語)" },
  { value: "pt", label: "Portuguese (Português)" },
  { value: "zh", label: "Chinese (中文)" },
];

export function VoiceLibrary({ voices, setVoices }: VoiceLibraryProps) {
  const { toast } = useToast();
  
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [testText, setTestText] = useState(
    `Hello... there!
This is... a comprehensive, real-world test... of my cloned voice!
Does it sound... natural?
Let's see... how it handles commas, exclamation marks! And... most importantly... pauses.

By breaking the text... like this... we can truly hear the cadence.
So... what do you think?
Is the timing... correct? Or does it need... a bit more... tuning? Let's find out!`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioCache, setAudioCache] = useState<Record<string, { url: string; text: string }>>({});

  const isCached = !!(
    selectedVoice &&
    audioCache[selectedVoice.id] &&
    audioCache[selectedVoice.id].text.trim() === testText.trim()
  );

  // Cloning states
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDesc, setCloneDesc] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneMode, setCloneMode] = useState<"instant" | "pro">("instant");
  const [cloneEnhance, setCloneEnhance] = useState(false);
  const [cloneLanguage, setCloneLanguage] = useState("en-US");

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStep, setRecordingStep] = useState<"idle" | "script_select" | "recording">("idle");
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedScriptIndex, setSelectedScriptIndex] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isRecordingCancelledRef = useRef(false);
  const dialogScrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Real-time voice visualizer levels
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(32).fill(0));
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Wavesurfer states
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<any>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isWsPlaying, setIsWsPlaying] = useState(false);
  const [cloneGender, setCloneGender] = useState("neutral");

  const initWaveSurfer = () => {
    if (waveformRef.current && !wavesurferRef.current) {
      const ws = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#93C5FD',      // AgentAudioPlayer unplayedColor
        progressColor: '#1E40AF',  // AgentAudioPlayer playedColor
        cursorColor: '#EF4444',    // AgentAudioPlayer playheadColor
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 50,
        normalize: true,
      });

      const wsRegions = ws.registerPlugin(RegionsPlugin.create());
      
      ws.on('play', () => setIsWsPlaying(true));
      ws.on('pause', () => setIsWsPlaying(false));
      ws.on('finish', () => setIsWsPlaying(false));
      
      ws.on('ready', () => {
        const duration = ws.getDuration();
        setAudioDuration(duration);
        
        wsRegions.clearRegions();
        
        // Default region: 15s or full length
        const end = Math.min(duration, 15);
        wsRegions.addRegion({
          start: 0,
          end: end,
          color: 'rgba(59, 130, 246, 0.2)',
          drag: true,
          resize: true,
          minLength: 5.5,
          maxLength: 15.5,
        });
        setTrimStart(0);
        setTrimEnd(end);
      });

      wsRegions.on('region-updated', (region: any) => {
        setTrimStart(region.start);
        setTrimEnd(region.end);
      });

      wavesurferRef.current = ws;
      regionsRef.current = wsRegions;
    }
  };

  useEffect(() => {
    if (!isCloneDialogOpen) {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        regionsRef.current = null;
      }
      setCloneFile(null);
      setTrimStart(0);
      setTrimEnd(0);
      setAudioDuration(0);
      setRecordingStep("idle");
      setCloneLanguage("en-US");
      if (isRecording) stopRecording();
    }
  }, [isCloneDialogOpen]);

  useEffect(() => {
    if (recordingStep !== "idle") {
      setTimeout(() => {
        dialogScrollContainerRef.current?.scrollTo({
          top: dialogScrollContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  }, [recordingStep]);

  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      setRecordingSeconds(0);
      interval = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 24) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
              mediaRecorderRef.current.stop();
              setIsRecording(false);
              setRecordingStep("idle");
            }
            return 25;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  useEffect(() => {
    if (cloneFile) {
      // Timeout ensures the DOM node (waveformRef) is fully mounted before initialization
      setTimeout(() => {
        if (!wavesurferRef.current) {
          initWaveSurfer();
        }
        if (wavesurferRef.current) {
          const url = URL.createObjectURL(cloneFile);
          wavesurferRef.current.load(url);
        }
      }, 50);
    } else if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
      regionsRef.current = null;
    }
  }, [cloneFile]);

  // Adjust default region when mode changes
  useEffect(() => {
    if (regionsRef.current && audioDuration > 0) {
      const regions = regionsRef.current.getRegions();
      if (regions.length > 0) {
        const region = regions[0];
        const defaultLength = 15;
        const newEnd = Math.min(audioDuration, region.start + defaultLength);
        region.onResize(newEnd - region.end, 'right');
      }
    }
  }, [cloneMode]);

  const checkMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Permission granted! Release the stream immediately
      stream.getTracks().forEach(track => track.stop());
      setRecordingStep("script_select");
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive"
      });
    }
  };

  const cancelScriptSelect = () => {
    setRecordingStep("idle");
  };

  const stopAudioAnalyzer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevels(new Array(32).fill(0));
  };

  const startRecording = async () => {
    try {
      isRecordingCancelledRef.current = false;
      setRecordingSeconds(0);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      // Web Audio Analyzer Setup
      let audioCtx: AudioContext | null = null;
      let analyser: AnalyserNode | null = null;
      let animationFrameId: number;

      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
        const source = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // 32 frequency bins
        source.connect(analyser);

        audioContextRef.current = audioCtx;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateAnalyser = () => {
          if (analyser && stream.active) {
            analyser.getByteFrequencyData(dataArray);
            // Convert byte data (0-255) to a scale (0 to 1)
            const levels = Array.from(dataArray).map(val => val / 255);
            setAudioLevels(levels);
            animationFrameId = requestAnimationFrame(updateAnalyser);
            animationFrameRef.current = animationFrameId;
          }
        };

        updateAnalyser();
      } catch (audioErr) {
        console.warn("Web Audio API not supported or blocked in this browser:", audioErr);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        stopAudioAnalyzer();
        if (isRecordingCancelledRef.current) {
          audioChunksRef.current = [];
          setCloneFile(null);
        } else {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
          setCloneFile(file);
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingStep("recording");
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive"
      });
      setRecordingStep("idle");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingStep("idle");
      stopAudioAnalyzer();
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingCancelledRef.current = true;
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingSeconds(0);
      stopAudioAnalyzer();
    }
    setRecordingStep("idle");
  };

  const handleTestVoice = async () => {
    if (!selectedVoice) return;
    
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    const voiceId = selectedVoice.id;
    const cached = audioCache[voiceId];
    
    // Check if the current test text matches the cached audio clip exactly
    if (cached && cached.text.trim() === testText.trim()) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(cached.url);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
      
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error: any) {
        toast({
          title: "Playback Failed",
          description: "Could not play cached audio. Please regenerate.",
          variant: "destructive"
        });
      }
      return;
    }

    setIsGenerating(true);
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      const token = safeStorage.getItem("token");
      
      const response = await fetch(`${baseUrl}/voices/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          voice_id: selectedVoice.provider_voice_id || selectedVoice.id,
          text: testText,
          language: selectedVoice.accent || "en-US"
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to generate audio");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      // Store in browser cache for this voice
      setAudioCache(prev => ({
        ...prev,
        [voiceId]: { url, text: testText }
      }));

      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      audioRef.current = audio;
      
      await audio.play();
      setIsPlaying(true);

    } catch (error: any) {
      toast({
        title: "Test Failed",
        description: error.message || "Failed to generate speech.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloneSubmit = async () => {
    if (!cloneName || !cloneFile || !wavesurferRef.current) {
      toast({
        title: "Missing Fields",
        description: "Please provide a name and an audio file.",
        variant: "destructive"
      });
      return;
    }

    if (cloneMode === "instant" && (trimEnd - trimStart) > 15.5) {
      toast({
        title: "Audio Too Long",
        description: "Instant Voice Cloning requires a maximum of 15 seconds of audio. Please trim your clip.",
        variant: "destructive"
      });
      return;
    }

    if ((trimEnd - trimStart) < 5.5) {
      toast({
        title: "Audio Too Short",
        description: "Please provide at least 6 seconds of audio for a high-quality clone.",
        variant: "destructive"
      });
      return;
    }

    setIsCloning(true);
    try {
      const token = safeStorage.getItem("token");

      // Slice audio using AudioBuffer
      const decodedBuffer = wavesurferRef.current.getDecodedData();
      if (!decodedBuffer) throw new Error("Audio buffer not ready");
      
      const wavBlob = encodeWAV(decodedBuffer, trimStart, trimEnd);
      const trimmedFile = new File([wavBlob], 'trimmed_audio.wav', { type: 'audio/wav' });

      const baseUrl = process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';
      
      const formData = new FormData();
      formData.append("clip", trimmedFile);
      formData.append("name", cloneName);
      formData.append("description", cloneDesc);
      formData.append("language", cloneLanguage);
      formData.append("mode", cloneMode);
      formData.append("enhance", cloneEnhance ? "true" : "false");
      formData.append("gender", cloneGender);
      const response = await fetch(`${baseUrl}/voices/clone`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 402 || response.status === 403 || response.status === 429) {
          throw new Error("You've exhausted your Cartesia voice cloning quota. Please upgrade your Cartesia account.");
        }
        const errText = await response.text();
        throw new Error(errText || "Failed to clone voice");
      }

      const newVoiceData = await response.json();
      
      // Add to local state
      const newVoice: Voice = {
        id: newVoiceData.id,
        description: newVoiceData.description,
        gender: cloneGender,
        accent: newVoiceData.language || cloneLanguage,
        provider: "cartesia",
        provider_voice_id: newVoiceData.provider_voice_id
      };
      
      setVoices((prev) => [...prev, newVoice]);
      setSelectedVoice(newVoice);
      setIsCloneDialogOpen(false);
      
      // Reset form
      setCloneName("");
      setCloneDesc("");
      setCloneGender("neutral");
      setCloneFile(null);
      
      toast({
        title: "Voice Cloned!",
        description: `Successfully cloned and added to your library.`,
      });

    } catch (error: any) {
      toast({
        title: "Cloning Failed",
        description: error.message || "An error occurred while cloning.",
        variant: "destructive"
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Cleanup audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 animate-fade-in dark:text-slate-100">
      {/* Sidebar - Voice List */}
      <aside className="w-full lg:w-[320px]">
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm h-[calc(100vh-10rem)] flex flex-col p-4 dark:bg-[#071131] dark:border-blue-900/40 dark:rounded-2xl dark:shadow-lg">
          
          {/* Header Inside Container (Unified Structure for Light & Dark) */}
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50 dark:border-blue-900/40">
            <h2 className="text-lg font-bold font-display text-foreground dark:text-white">Voices</h2>

            <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Clone Voice
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[560px] p-6 rounded-3xl bg-background text-foreground dark:bg-[#071131] dark:text-white dark:border-blue-900/40">
                <DialogHeader className="flex-col items-start gap-1.5 pb-4 border-none">
                  <DialogTitle>Clone a New Voice</DialogTitle>
                  <DialogDescription className="text-muted-foreground dark:text-slate-400">
                    Upload or record a clean audio clip. Use the handles to trim it to the required length.
                  </DialogDescription>
                </DialogHeader>
                <div ref={dialogScrollContainerRef} className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Voice Name</Label>
                    <Input 
                      id="name" 
                      value={cloneName} 
                      onChange={(e) => setCloneName(e.target.value)} 
                      placeholder="e.g. Sales Alex" 
                      className="bg-background border-input dark:bg-slate-900/50 dark:border-blue-900/50 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="desc">Description (Optional)</Label>
                      <Input 
                        id="desc" 
                        value={cloneDesc} 
                        onChange={(e) => setCloneDesc(e.target.value)} 
                        placeholder="e.g. Energetic" 
                        className="bg-background border-input dark:bg-slate-900/50 dark:border-blue-900/50 dark:text-white"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="gender">Gender</Label>
                      <div className="flex bg-muted/50 rounded-lg p-1 border border-border dark:bg-slate-900/80 dark:border-blue-900/40">
                        {(["male", "female", "neutral"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setCloneGender(g)}
                            className={cn(
                              "flex-1 text-xs font-medium py-1.5 rounded-md capitalize transition-all",
                              cloneGender === g 
                                ? "bg-background shadow-sm text-foreground dark:bg-blue-600 dark:text-white dark:shadow-sm" 
                                : "text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cloneLanguage">Accent / Dialect</Label>
                    <Select value={cloneLanguage} onValueChange={setCloneLanguage}>
                      <SelectTrigger id="cloneLanguage" className="h-10 rounded-lg border-input focus:ring-2 focus:ring-primary w-full bg-background text-sm dark:border-blue-900/50 dark:focus:ring-blue-500 dark:bg-slate-900/50 dark:text-white">
                        <SelectValue placeholder="Select accent / dialect" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover text-popover-foreground dark:bg-[#071131] dark:border-blue-900/50 dark:text-white">
                        {CLONE_LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-lg border border-border dark:bg-slate-900/40 dark:border-blue-900/40">
                    {/* Clone Mode */}
                    <div className="space-y-3">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">Clone Mode</Label>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant={cloneMode === "instant" ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setCloneMode("instant")}
                          className="w-full h-auto py-2 flex flex-col items-center justify-center gap-1 dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white"
                        >
                          <span className="font-semibold text-xs">Instant Clone</span>
                          <span className="text-[10px] font-normal opacity-80 whitespace-normal text-center leading-tight">
                            6-15s audio • 1 credit / char
                          </span>
                        </Button>
                        <Button 
                          variant={cloneMode === "pro" ? "default" : "outline"} 
                          size="sm" 
                          onClick={() => setCloneMode("pro")}
                          disabled
                          className="w-full h-auto py-2 flex flex-col items-center justify-center gap-1 opacity-60 dark:border-blue-900/50 dark:text-slate-400"
                        >
                          <span className="font-semibold text-xs">Pro Voice Clone</span>
                          <span className="text-[10px] font-normal opacity-80 whitespace-normal text-center leading-tight">
                            30m audio • Coming Soon
                          </span>
                        </Button>
                      </div>
                    </div>

                    <div className="w-full h-px bg-border/50 dark:bg-blue-900/40" />

                    {/* Enhance Audio */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <Label htmlFor="enhance" className="text-sm font-semibold flex items-center gap-2 cursor-pointer dark:text-white">
                          <Settings2 className="w-4 h-4 text-primary dark:text-blue-400" /> Enhance Audio
                        </Label>
                        <p className="text-xs text-muted-foreground leading-tight dark:text-slate-400">
                          Applies AI noise reduction. Leads to cleaner speech but may slightly reduce similarity.
                        </p>
                      </div>
                      <Switch id="enhance" checked={cloneEnhance} onCheckedChange={setCloneEnhance} className="mt-1" />
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label className="flex justify-between items-center dark:text-white">
                      <span>Audio Clip</span>
                      {cloneFile && (
                        <span className="text-xs font-normal text-muted-foreground dark:text-slate-400">
                          Selected: {(trimEnd - trimStart).toFixed(1)}s
                        </span>
                      )}
                    </Label>

                    {recordingStep === "script_select" ? (
                      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card/50 shadow-sm animate-fade-in dark:border-blue-900/40 dark:bg-slate-900/40">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                            1. Select a script to speak aloud
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {READING_SCRIPTS.map((script, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedScriptIndex(idx)}
                                className={cn(
                                  "flex flex-col items-start text-left p-3 rounded-lg border transition-all duration-200",
                                  selectedScriptIndex === idx
                                    ? "border-primary bg-primary/5 shadow-sm dark:border-blue-500 dark:bg-blue-500/10"
                                    : "border-border hover:bg-muted/50 dark:border-blue-900/40 dark:hover:bg-slate-800/40"
                                )}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-semibold text-sm text-foreground dark:text-white">{script.title}</span>
                                  <span className={cn(
                                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                    script.type === "Privacy" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" :
                                    script.type === "Phonetic" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" :
                                    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  )}>
                                    {script.type}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 leading-normal dark:text-slate-400">
                                  {script.description}
                                </p>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 mt-1">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                            Script Preview
                          </span>
                          <div className="p-3.5 rounded-lg bg-muted/40 border text-sm text-foreground leading-relaxed font-medium min-h-[5rem] flex items-center dark:bg-slate-900/60 dark:border-blue-900/40 dark:text-white">
                            &quot;{READING_SCRIPTS[selectedScriptIndex].text}&quot;
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-2 border-t pt-3 border-border dark:border-blue-900/40">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={cancelScriptSelect}
                            className="h-9 px-4 text-xs border-input dark:border-blue-900/50 dark:text-slate-300"
                          >
                            Back
                          </Button>
                          <Button
                            size="sm"
                            onClick={startRecording}
                            className="h-9 px-4 font-semibold gradient-primary dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white"
                          >
                            <Mic className="w-4 h-4 mr-1.5" /> Start Recording
                          </Button>
                        </div>
                      </div>
                    ) : recordingStep === "recording" ? (
                      <div className="flex flex-col gap-4 p-4 rounded-xl border bg-card/50 shadow-sm animate-fade-in dark:border-blue-900/40 dark:bg-slate-900/40">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-400">
                            Reading Script ({READING_SCRIPTS[selectedScriptIndex].type})
                          </span>
                          <span className="text-xs font-semibold text-primary dark:text-blue-400">
                            {READING_SCRIPTS[selectedScriptIndex].title}
                          </span>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/40 border text-sm sm:text-base text-foreground leading-relaxed font-medium min-h-[5.5rem] flex items-center shadow-inner dark:bg-slate-900/60 dark:border-blue-900/40 dark:text-white">
                          &quot;{READING_SCRIPTS[selectedScriptIndex].text}&quot;
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
                            <div className="flex items-center gap-1.5 font-semibold text-red-600 dark:text-red-500">
                              <span className="h-2.5 w-2.5 rounded-full bg-red-600 dark:bg-red-500 animate-pulse" />
                              Recording...
                            </div>
                            <span>
                              0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds} / 0:25
                            </span>
                          </div>
                          
                          {/* Real-time Voice Responsive Wave Progress Visualizer */}
                          <div className="relative">
                            <div className="flex items-center justify-between gap-1 h-14 w-full px-3 bg-muted/20 rounded-xl border border-muted/50 overflow-hidden dark:bg-slate-900/40 dark:border-blue-900/40">
                              {Array.from({ length: 32 }).map((_, idx) => {
                                const barProgress = (idx / 31) * 100;
                                const progress = Math.min(100, (recordingSeconds / 25) * 100);
                                const isActive = progress >= barProgress;
                                const level = audioLevels[idx] || 0;
                                const baseHeight = idx % 4 === 0 ? 32 : idx % 3 === 0 ? 24 : idx % 2 === 0 ? 16 : 40;
                                const visualHeight = Math.max(6, baseHeight * (0.15 + level * 0.85));

                                return (
                                  <div
                                    key={idx}
                                    className={cn(
                                      "w-1.5 rounded-full transition-all duration-75 shadow-sm",
                                      isActive 
                                        ? "bg-red-600 dark:bg-red-500 shadow-red-500/10" 
                                        : "bg-muted-foreground/35 dark:bg-slate-700/50"
                                    )}
                                    style={{ height: `${visualHeight}px` }}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 mt-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelRecording}
                            className="text-xs text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={stopRecording}
                            className="h-9 px-4 font-semibold bg-red-600 hover:bg-red-700 text-white border border-red-700 hover:text-white shadow-sm transition-colors dark:border-transparent"
                          >
                            <StopCircle className="w-4 h-4 mr-1.5" /> Stop & Save
                          </Button>
                        </div>
                      </div>
                    ) : !cloneFile ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 border-border hover:bg-muted/50 transition-colors dark:border-blue-900/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-6 h-6 mb-2 text-muted-foreground dark:text-slate-400" />
                            <p className="text-xs font-semibold text-foreground dark:text-slate-300">Upload Audio</p>
                          </div>
                          <input 
                            id="dropzone-file" 
                            type="file" 
                            className="hidden" 
                            accept="audio/*"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setCloneFile(e.target.files[0]);
                              }
                            }}
                          />
                        </label>
                        
                        <button 
                          type="button"
                          onClick={checkMicPermission}
                          className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/50 border-border transition-colors dark:border-blue-900/50 dark:bg-slate-900/30 dark:hover:bg-slate-900/60"
                        >
                          <Mic className="w-6 h-6 mb-2 text-muted-foreground dark:text-slate-400" />
                          <p className="text-xs font-semibold text-foreground dark:text-slate-300">Record Mic</p>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20 transition-all duration-300 hover:shadow-sm font-[Segoe UI] dark:bg-blue-950/40 dark:border-blue-800/40">
                          <button
                            type="button"
                            onClick={() => {
                              if (wavesurferRef.current) {
                                wavesurferRef.current.playPause();
                              }
                            }}
                            className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-200 shadow-md dark:bg-blue-600 dark:text-white"
                          >
                            {isWsPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                          </button>
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2 dark:text-white">
                              <span className="flex items-center gap-1 text-primary dark:text-blue-400"><Scissors className="w-4 h-4" /> Trim Audio</span>
                              <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white" onClick={() => setCloneFile(null)}>
                                Clear
                              </Button>
                            </div>
                            <div ref={waveformRef} className="w-full bg-background rounded border border-border overflow-hidden h-[60px] dark:bg-slate-950 dark:border-blue-900/40" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {!isRecording && recordingStep === "idle" && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)} disabled={isCloning} className="border-input dark:border-blue-900/50 dark:text-slate-300">
                      Cancel
                    </Button>
                    <Button onClick={handleCloneSubmit} disabled={isCloning || !cloneName || !cloneFile} className="gradient-primary dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white">
                      {isCloning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cloning...</> : 'Clone Selected Region'}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Voice List Content */}
          <div className="flex-1 overflow-y-auto p-1 space-y-1 custom-scrollbar">
            {voices.length > 0 ? (
              voices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border border-transparent",
                    selectedVoice?.id === voice.id
                      ? "bg-primary/10 border-primary/20 text-foreground shadow-sm dark:bg-blue-600/15 dark:border-blue-500/40 dark:text-white"
                      : "hover:bg-muted text-foreground/80 dark:text-slate-300 dark:hover:bg-slate-800/40"
                  )}
                >
                  <div className="font-medium text-sm flex items-center justify-between">
                    <span>{voice.description || "Unnamed Voice"}</span>
                    {selectedVoice?.id === voice.id && (
                      <div className="h-2 w-2 rounded-full bg-primary dark:bg-blue-500" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 dark:text-slate-400">
                    <span className="capitalize">{voice.gender}</span>
                    <span>•</span>
                    <span>{voice.provider}</span>
                  </div>
                </button>
              ))
            ) : (
              /* Empty State for Sidebar (Updated with AudioLines icon for both modes) */
              <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
                <div className="relative mb-3 flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 dark:bg-blue-950/40 dark:border-blue-900/30">
                  <AudioLines className="w-8 h-8 text-primary/80 dark:text-blue-400/80" />
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1 dark:text-white">No voices found.</h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-[200px] dark:text-slate-400">
                  Create your first voice or clone an existing one to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content - Voice Tester */}
      <main>
        <Card className="form-section h-full bg-card border rounded-xl shadow-sm dark:bg-[#071131] dark:border-blue-900/40 dark:rounded-2xl dark:shadow-lg dark:flex dark:flex-col dark:justify-between">
          <CardHeader>
            <div className="flex items-center gap-3">
              {/* Enhanced Icon Container for both Light & Dark modes */}
              <div className="icon-container p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary dark:bg-blue-950/80 dark:border-blue-800/40 dark:text-blue-400">
                <Volume2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-foreground dark:text-white">Test Voice</CardTitle>
                <CardDescription className="text-muted-foreground text-xs dark:text-slate-400">Select a voice from the library to test it with custom text</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 dark:flex-1 dark:flex dark:flex-col dark:justify-center">
            {selectedVoice ? (
              <div className="space-y-4 animate-fade-in dark:w-full">
                <div className="p-4 bg-muted/30 rounded-lg border border-border dark:bg-slate-900/50 dark:rounded-xl dark:border-blue-900/40">
                  <h3 className="font-medium text-foreground dark:text-white">{selectedVoice.description || "Unnamed Voice"}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2 text-sm text-muted-foreground dark:text-slate-400">
                    <div><span className="font-medium text-foreground dark:text-slate-300">Provider ID:</span> {selectedVoice.provider_voice_id || 'N/A'}</div>
                    <div><span className="font-medium text-foreground dark:text-slate-300">Provider:</span> {selectedVoice.provider}</div>
                    <div><span className="font-medium text-foreground dark:text-slate-300">Dialect / Accent:</span> {CLONE_LANGUAGES.find(l => l.value === selectedVoice.accent)?.label || selectedVoice.accent || 'Default (US Accent)'}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="test-text" className="text-foreground dark:text-white">Text to Speak</Label>
                    <span className={cn(
                      "text-xs transition-colors duration-200",
                      testText.length >= 450 
                        ? "text-amber-600 dark:text-amber-400 font-semibold" 
                        : "text-muted-foreground dark:text-slate-400"
                    )}>
                      {testText.length} / 500 characters
                    </span>
                  </div>
                  <Textarea 
                    id="test-text"
                    rows={6}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value.slice(0, 500))}
                    maxLength={500}
                    placeholder="Enter the text you want the voice to say..."
                    className="resize-none bg-background border-input dark:bg-slate-900/50 dark:border-blue-900/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs">
                    {isCached && !isGenerating && !isPlaying && (
                      <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                        Audio cached browser-side
                      </span>
                    )}
                  </div>
                  <Button 
                    onClick={handleTestVoice} 
                    disabled={isGenerating || !testText}
                    className={cn(
                      "min-w-36 transition-all duration-300 shadow-sm dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white",
                      isPlaying && "bg-primary/10 border-primary text-primary hover:bg-primary/20 dark:bg-blue-950/80 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-900/60",
                      isCached && !isPlaying && !isGenerating && "bg-emerald-600 hover:bg-emerald-700 hover:text-white text-white border-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                    )}
                    variant={isPlaying ? "outline" : "default"}
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : isPlaying ? (
                      <><Square className="h-4 w-4 mr-2" /> Stop Playback</>
                    ) : isCached ? (
                      <><Play className="h-4 w-4 mr-2" /> Play Again</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Generate & Play</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              /* Main Empty State (Updated with Sparkles & Glowing Circle for both Light and Dark Modes) */
              <div className="flex flex-col items-center justify-center my-auto py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20 dark:border-blue-900/40 dark:bg-slate-950/20">
                <div className="relative mb-5 flex items-center justify-center">
                  <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-primary animate-pulse dark:text-blue-400" />
                  <Sparkles className="absolute -bottom-1 -left-1 w-3.5 h-3.5 text-primary/70 dark:text-blue-400/70" />
                  <div className="w-20 h-20 rounded-full bg-gradient-to-b from-primary/10 to-primary/20 border border-primary/30 flex items-center justify-center shadow-md dark:from-blue-600/20 dark:to-blue-900/40 dark:border-blue-500/30 dark:shadow-blue-900/20">
                    <Volume2 className="h-10 w-10 text-primary dark:text-blue-400" />
                  </div>
                </div>
                <h3 className="font-semibold text-foreground text-xl mb-2 dark:text-white">No Voice Selected</h3>
                <p className="text-muted-foreground text-sm max-w-md leading-relaxed dark:text-slate-400">
                  Select a voice from the library list on the left to preview it with custom text.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
