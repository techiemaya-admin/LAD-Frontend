import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Square, Volume2, Upload, Plus, Loader2, Mic, StopCircle, Scissors, Settings2 } from 'lucide-react';
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
    let s = Math.max(-1, Math.min(1, interleaved[i]));
    dataView.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  
  return new Blob([dataView], { type: 'audio/wav' });
}

export function VoiceLibrary({ voices, setVoices }: VoiceLibraryProps) {
  const { toast } = useToast();
  
  const [selectedVoice, setSelectedVoice] = useState<Voice | null>(null);
  const [testText, setTestText] = useState("Hello! I am a newly cloned voice. How do I sound today?");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cloning states
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [cloneDesc, setCloneDesc] = useState("");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloneMode, setCloneMode] = useState<"instant" | "pro">("instant");
  const [cloneEnhance, setCloneEnhance] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
        
        // Default region: 10s or full length
        const end = Math.min(duration, cloneMode === "instant" ? 10 : 15);
        wsRegions.addRegion({
          start: 0,
          end: end,
          color: 'rgba(59, 130, 246, 0.2)',
          drag: true,
          resize: true,
          minLength: 5,
          maxLength: cloneMode === "instant" ? 10.5 : 15,
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
      if (isRecording) stopRecording();
    }
  }, [isCloneDialogOpen]);

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
        const defaultLength = cloneMode === "instant" ? 10 : 15;
        const newEnd = Math.min(audioDuration, region.start + defaultLength);
        region.onResize(newEnd - region.end, 'right');
      }
    }
  }, [cloneMode]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setCloneFile(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      mediaRecorderRef.current = mediaRecorder;
    } catch (err) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
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
          language: "en"
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(errText || "Failed to generate audio");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
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

    if (cloneMode === "instant" && (trimEnd - trimStart) > 10.5) {
      toast({
        title: "Audio Too Long",
        description: "Instant Voice Cloning requires 10 seconds of audio. Please trim your clip.",
        variant: "destructive"
      });
      return;
    }

    if ((trimEnd - trimStart) < 4.5) {
      toast({
        title: "Audio Too Short",
        description: "Please provide at least 5 seconds of audio for a high-quality clone.",
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
      formData.append("language", "en");
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
        accent: "unknown",
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
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 animate-fade-in">
      {/* Sidebar - Voice List */}
      <aside className="w-full lg:w-[320px] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold font-display">Voices</h2>
          
          <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gradient-primary">
                <Plus className="h-4 w-4 mr-1" /> Clone Voice
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[550px] p-6 rounded-3xl">
              <DialogHeader className="flex-col items-start gap-1.5 pb-4 border-none">
                <DialogTitle>Clone a New Voice</DialogTitle>
                <DialogDescription>
                  Upload or record a clean audio clip. Use the handles to trim it to the required length.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">
                <div className="grid gap-2">
                  <Label htmlFor="name">Voice Name</Label>
                  <Input 
                    id="name" 
                    value={cloneName} 
                    onChange={(e) => setCloneName(e.target.value)} 
                    placeholder="e.g. Sales Alex" 
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
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gender">Gender</Label>
                    <div className="flex bg-muted/50 rounded-lg p-1 border">
                      {(["male", "female", "neutral"] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setCloneGender(g)}
                          className={cn(
                            "flex-1 text-xs font-medium py-1.5 rounded-md capitalize transition-all",
                            cloneGender === g ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 bg-muted/30 p-4 rounded-lg border">
                  {/* Clone Mode */}
                  <div className="space-y-3">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clone Mode</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant={cloneMode === "instant" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setCloneMode("instant")}
                        className="w-full h-auto py-2 flex flex-col items-center justify-center gap-1"
                      >
                        <span className="font-semibold text-xs">Instant Clone</span>
                        <span className="text-[10px] font-normal opacity-80 whitespace-normal text-center leading-tight">
                          10s audio • 1 credit / char
                        </span>
                      </Button>
                      <Button 
                        variant={cloneMode === "pro" ? "default" : "outline"} 
                        size="sm" 
                        onClick={() => setCloneMode("pro")}
                        disabled
                        className="w-full h-auto py-2 flex flex-col items-center justify-center gap-1 opacity-60"
                      >
                        <span className="font-semibold text-xs">Pro Voice Clone</span>
                        <span className="text-[10px] font-normal opacity-80 whitespace-normal text-center leading-tight">
                          30m audio • Coming Soon
                        </span>
                      </Button>
                    </div>
                  </div>

                  <div className="w-full h-px bg-border/50" />

                  {/* Enhance Audio */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="enhance" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
                        <Settings2 className="w-4 h-4 text-primary" /> Enhance Audio
                      </Label>
                      <p className="text-xs text-muted-foreground leading-tight">
                        Applies AI noise reduction. Leads to cleaner speech but may slightly reduce similarity.
                      </p>
                    </div>
                    <Switch id="enhance" checked={cloneEnhance} onCheckedChange={setCloneEnhance} className="mt-1" />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="flex justify-between items-center">
                    <span>Audio Clip</span>
                    {cloneFile && (
                      <span className="text-xs font-normal text-muted-foreground">
                        Selected: {(trimEnd - trimStart).toFixed(1)}s
                      </span>
                    )}
                  </Label>
                  
                  {!cloneFile ? (
                    <div className="grid grid-cols-2 gap-3">
                      <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/50 transition-colors">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <Upload className="w-6 h-6 mb-2 text-muted-foreground" />
                          <p className="text-xs font-semibold">Upload Audio</p>
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
                        onClick={isRecording ? stopRecording : startRecording}
                        className={cn(
                          "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors",
                          isRecording ? "border-red-500/50 bg-red-500/10 text-red-600" : "bg-muted/20 hover:bg-muted/50 border-muted-foreground/25"
                        )}
                      >
                        {isRecording ? (
                          <>
                            <StopCircle className="w-6 h-6 mb-2 animate-pulse" />
                            <p className="text-xs font-semibold">Stop Recording</p>
                          </>
                        ) : (
                          <>
                            <Mic className="w-6 h-6 mb-2 text-muted-foreground" />
                            <p className="text-xs font-semibold">Record Mic</p>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 transition-all duration-300 hover:shadow-soft font-[Segoe UI]">
                        <button
                          type="button"
                          onClick={() => {
                            if (wavesurferRef.current) {
                              wavesurferRef.current.playPause();
                            }
                          }}
                          className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground hover:scale-105 transition-transform duration-200 shadow-md"
                        >
                          {isWsPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                        </button>
                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex items-center justify-between text-sm font-medium text-foreground mb-2">
                            <span className="flex items-center gap-1 text-primary"><Scissors className="w-4 h-4" /> Trim Audio</span>
                            <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setCloneFile(null)}>
                              Clear
                            </Button>
                          </div>
                          {/* Wavesurfer Container */}
                          <div ref={waveformRef} className="w-full bg-background rounded border overflow-hidden h-[60px]" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)} disabled={isCloning}>
                  Cancel
                </Button>
                <Button onClick={handleCloneSubmit} disabled={isCloning || !cloneName || !cloneFile} className="gradient-primary">
                  {isCloning ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cloning...</> : 'Clone Selected Region'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden shadow-sm h-[calc(100vh-12rem)] flex flex-col">
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => setSelectedVoice(voice)}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-lg transition-all duration-200 border border-transparent",
                  selectedVoice?.id === voice.id
                    ? "bg-primary/5 border-primary/20 shadow-sm"
                    : "hover:bg-muted"
                )}
              >
                <div className="font-medium text-sm flex items-center justify-between">
                  <span>{voice.description || "Unnamed Voice"}</span>
                  {selectedVoice?.id === voice.id && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  <span className="capitalize">{voice.gender}</span>
                  <span>•</span>
                  <span>{voice.provider}</span>
                </div>
              </button>
            ))}
            {voices.length === 0 && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No voices found.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content - Voice Tester */}
      <main>
        <Card className="form-section h-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="icon-container bg-primary/10">
                <Volume2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Test Voice</CardTitle>
                <CardDescription>Select a voice from the library to test it with custom text</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {selectedVoice ? (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-muted/30 rounded-lg border">
                  <h3 className="font-medium">{selectedVoice.description || "Unnamed Voice"}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                    <div><span className="font-medium">Provider ID:</span> {selectedVoice.provider_voice_id || 'N/A'}</div>
                    <div><span className="font-medium">Provider:</span> {selectedVoice.provider}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Text to Speak</Label>
                  <Textarea 
                    rows={6}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder="Enter the text you want the voice to say..."
                    className="resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleTestVoice} 
                    disabled={isGenerating || !testText}
                    className={cn(
                      "min-w-32 transition-all duration-300",
                      isPlaying && "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                    )}
                    variant={isPlaying ? "outline" : "default"}
                  >
                    {isGenerating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                    ) : isPlaying ? (
                      <><Square className="h-4 w-4 mr-2" /> Stop Playback</>
                    ) : (
                      <><Play className="h-4 w-4 mr-2" /> Generate & Play</>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center border-2 border-dashed rounded-xl bg-muted/10">
                <Volume2 className="h-10 w-10 text-muted-foreground/30 mb-4" />
                <h3 className="font-medium text-lg mb-1">No Voice Selected</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
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
