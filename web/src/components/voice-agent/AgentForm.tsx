import React from 'react';
import { 
  Bot, 
  Globe, 
  Brain, 
  MessageSquare, 
  PhoneOutgoing, 
  Save, 
  RotateCcw,
  AlertCircle,
  Loader2,
  Languages,
  Sliders,
  Volume2,
  Music,
  Gauge
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AgentFormData, LANGUAGES, GENDERS, Voice } from '@/types/agent';
import { PromptEditor } from './PromptEditor';
import { VoicePreview } from './VoicePreview';
import { CharacterCounter } from './CharacterCounter';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

interface AgentFormProps {
  formData: AgentFormData;
  errors: Partial<Record<keyof AgentFormData, string>>;
  
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  isEditMode: boolean;
  voiceSampleUrl?: string;
  voices: Voice[];
  isLoadingVoices: boolean;
  onUpdateField: <K extends keyof AgentFormData>(field: K, value: AgentFormData[K]) => void;
  onSave: () => void;
  onReset: () => void;
  getCharCount: (field: keyof AgentFormData) => { current: number; max: number; percentage: number };
}

const SAMPLE_PROMPTS = {
  agent_instructions: `You are a professional sales representative for our company. Your goal is to qualify leads and schedule product demonstrations.

Key behaviors:
- Always be polite and professional
- Ask qualifying questions about the prospect's needs
- Handle objections gracefully
- Aim to schedule a demo call

Remember to collect:
- Company name and size
- Current solution they're using
- Budget timeline`,

  system_instructions: `You are an AI voice agent operating in a sales context. Follow these rules:

1. NEVER make up information about pricing or features
2. If unsure, offer to have a human representative follow up
3. Keep responses concise and conversational
4. Respect the prospect's time
5. End calls professionally if the prospect is not interested`,

  outbound_starter_prompt: `Hello! This is Alex from TechCorp. I noticed you recently visited our website and wanted to reach out personally. Do you have a moment to chat about how we might help your team?`,
};

export function AgentForm({
  formData,
  errors,
  isDirty,
  isValid,
  isSaving,
  isEditMode,
  voiceSampleUrl,
  voices,
  isLoadingVoices,
  onUpdateField,
  onSave,
  onReset,
  getCharCount,
}: AgentFormProps) {
  // Filter voices by selected gender
  const filteredVoices = voices.filter((v: Voice) => v.gender === formData.gender);

  // Local state for Universal Agent Settings (Voice Dynamics and Background Ambiance)
  const [speed, setSpeed] = React.useState<number>(1.0);
  const [pitch, setPitch] = React.useState<number>(0.0);
  const [volume, setVolume] = React.useState<number>(1.0);
  const [bgSoundOn, setBgSoundOn] = React.useState<boolean>(false);
  const [bgSoundUrl, setBgSoundUrl] = React.useState<string>('/office_chatter_loud.mp3');
  const [bgSoundVolume, setBgSoundVolume] = React.useState<number>(0.4);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {isEditMode ? 'Edit Agent' : 'Create New Agent'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEditMode 
              ? 'Modify your voice agent configuration' 
              : 'Configure a new AI voice agent'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="unsaved-badge">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </span>
          )}
          
          {isEditMode ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isSaving}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset Changes?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will discard all unsaved changes and restore the last saved version.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogAction onClick={onReset}>Reset</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button variant="outline" onClick={onReset} disabled={isSaving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}

          <Button 
            onClick={onSave} 
            disabled={!isValid || isSaving}
            className="justify-center gap-2 h-10 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] text-white dark:hover:bg-blue-700 shadow-lg transition-all font-medium flex"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditMode ? 'Update Agent' : 'Create Agent'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Basic Details */}
      <Card className="form-section animate-fade-in-up stagger-1">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Basic Details</CardTitle>
              <CardDescription>Configure your agent&apos;s identity</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agent Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center justify-between">
                <span>Agent Name <span className="text-destructive">*</span></span>
                <CharacterCounter 
                  current={getCharCount('name').current} 
                  max={getCharCount('name').max} 
                />
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => onUpdateField('name', e.target.value)}
                placeholder="e.g., Sales Assistant Alex"
                className={cn(
                  "border-gray-200 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-[#0B1957] dark:focus:border-[#2B7CFF]",
                  errors.name && "border-destructive dark:border-destructive"
                )}
              />
              {errors.name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Gender */}
            <div className="space-y-2">
              <Label>Voice Gender</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value) => onUpdateField('gender', value as 'male' | 'female' | 'neutral')}
                className="flex gap-4"
              >
                {GENDERS.map((gender) => (
                  <div key={gender.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={gender.value} id={`gender-${gender.value}`} />
                    <Label 
                      htmlFor={`gender-${gender.value}`}
                      className="cursor-pointer font-normal"
                    >
                      {gender.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice & Language */}
      <Card className="form-section animate-fade-in-up stagger-2">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container">
              <Languages className="h-5 w-5 text-blue" />
            </div>
            <div>
              <CardTitle className="text-lg">Voice & Language</CardTitle>
              <CardDescription>Set the speaking language and preview the voice</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            {/* Voice Selection */}
            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="voice">Voice</Label>
              <Select
                value={formData.voice_id}
                onValueChange={(value) => {
                  onUpdateField('voice_id', value);
                  const selectedVoice = voices.find(v => v.id === value);
                  if (selectedVoice) {
                    // Update voice sample URL for preview
                    // This would typically be handled via callback to parent
                  }
                }}
                disabled={isLoadingVoices || filteredVoices.length === 0}
              >
                <SelectTrigger 
                  id="voice" 
                  className="w-full border-gray-200 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-[#0B1957] dark:focus:border-[#2B7CFF]"
                >
                  <SelectValue placeholder={isLoadingVoices ? "Loading voices..." : "Select voice"} />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#132035] dark:border-slate-800 dark:text-slate-100">
                  {filteredVoices.length === 0 && !isLoadingVoices && (
                    <SelectItem value="no-voices" disabled className="dark:text-slate-400">
                      No voices available for selected gender
                    </SelectItem>
                  )}
                  {filteredVoices.map((voice) => (
                    <SelectItem 
                      key={voice.id} 
                      value={voice.id}
                      className="dark:focus:bg-slate-800 dark:focus:text-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="capitalize text-xs text-muted-foreground dark:text-slate-400 px-1.5 py-0.5 rounded bg-muted dark:bg-slate-800 dark:border dark:border-slate-700/60">
                          {voice.gender}
                        </span>
                        <span>{voice.description}</span>
                        <span className="text-muted-foreground dark:text-slate-400">({voice.accent})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {filteredVoices.length} voice{filteredVoices.length !== 1 ? 's' : ''} available for {formData.gender} gender
              </p>
            </div>

            <div className="flex-1 space-y-2 w-full">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => onUpdateField('language', value)}
              >
                <SelectTrigger 
                  id="language" 
                  className="w-full border-gray-200 dark:border-slate-700/80 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 focus:border-[#0B1957] dark:focus:border-[#2B7CFF]"
                >
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#132035] dark:border-slate-800 dark:text-slate-100">
                  {LANGUAGES.map((lang) => (
                    <SelectItem 
                      key={lang.value} 
                      value={lang.value}
                      className="dark:focus:bg-slate-800 dark:focus:text-slate-100 cursor-pointer"
                    >
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 shrink-0">
              <Label className="invisible hidden sm:block select-none" aria-hidden="true">Preview</Label>
              <div>
                <VoicePreview 
                  language={formData.language} 
                  gender={formData.gender}
                  voice_sample_url={voiceSampleUrl}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Universal Agent Settings */}
      <Card className="form-section animate-fade-in-up stagger-3">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container">
              <Sliders className="h-5 w-5 text-blue" />
            </div>
            <div>
              <CardTitle className="text-lg">Universal Agent Settings</CardTitle>
              <CardDescription>Configure provider-independent voice dynamics and ambiance masking</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left Column: Voice Dynamics */}
            <div className="space-y-6 md:pr-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Voice Dynamics</h3>
                <p className="text-xs text-muted-foreground">Standardized, provider-independent settings for pitch, speed, and volume.</p>
              </div>

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span>Speaking Rate (Speed)</span>
                  </Label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {speed.toFixed(2)}x
                  </span>
                </div>
                <Slider 
                  value={speed} 
                  onValueChange={setSpeed} 
                  min={0.5} 
                  max={2.0} 
                  step={0.05} 
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Slow (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Pitch */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-muted-foreground" />
                    <span>Voice Pitch</span>
                  </Label>
                  <span className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full",
                    pitch === 0 ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                  )}>
                    {pitch > 0 ? `+${pitch.toFixed(1)}` : pitch.toFixed(1)}
                  </span>
                </div>
                <Slider 
                  value={pitch} 
                  onValueChange={setPitch} 
                  min={-1.0} 
                  max={1.0} 
                  step={0.1} 
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Lowest (-1.0)</span>
                  <span>Native (0.0)</span>
                  <span>Highest (1.0)</span>
                </div>
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span>Loudness (Volume)</span>
                  </Label>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {volume.toFixed(2)}x
                  </span>
                </div>
                <Slider 
                  value={volume} 
                  onValueChange={setVolume} 
                  min={0.5} 
                  max={2.0} 
                  step={0.05} 
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Soft (0.5x)</span>
                  <span>Native (1.0x)</span>
                  <span>Loud (2.0x)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Background Ambiance */}
            <div className="space-y-6 pt-6 md:pt-0 md:pl-8">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Background Ambiance</h3>
                <p className="text-xs text-muted-foreground">Standardized control for enabling background ambient masking audio.</p>
              </div>

              {/* Background Sound On/Off */}
              <div className="flex items-center justify-between rounded-lg border border-border p-4 bg-muted/40">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Ambient Noise Masking</Label>
                  <p className="text-xs text-muted-foreground">Inject natural background atmosphere during calls</p>
                </div>
                <Switch 
                  checked={bgSoundOn} 
                  onCheckedChange={setBgSoundOn}
                />
              </div>

              {/* Background URL & Volume */}
              <div className={cn(
                "space-y-6 transition-all duration-300",
                !bgSoundOn ? "opacity-40 pointer-events-none" : "opacity-100"
              )}>
                {/* Background Sound URL */}
                <div className="space-y-2">
                  <Label htmlFor="bg-sound-url" className="text-xs font-medium">Sound Override URL / Path</Label>
                  <Input
                    id="bg-sound-url"
                    value={bgSoundUrl}
                    onChange={(e) => setBgSoundUrl(e.target.value)}
                    placeholder="/office_chatter_loud.mp3"
                    disabled={!bgSoundOn}
                    className="h-9 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Complete URL or relative sound path (e.g. <code>/office_chatter_loud.mp3</code>)
                  </p>
                </div>

                {/* Background Sound Volume */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-xs">
                      <Music className="h-4 w-4 text-muted-foreground" />
                      <span>Ambiance Volume</span>
                    </Label>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {Math.round(bgSoundVolume * 100)}%
                    </span>
                  </div>
                  <Slider 
                    value={bgSoundVolume} 
                    onValueChange={setBgSoundVolume} 
                    min={0.0} 
                    max={1.0} 
                    step={0.05}
                    disabled={!bgSoundOn}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Silent (0%)</span>
                    <span>Standard (40%)</span>
                    <span>Full (100%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Instructions */}
      <Card className="form-section animate-fade-in-up stagger-4">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-success/10">
              <Brain className="h-5 w-5 text-success" />
            </div>
            <div>
              <CardTitle className="text-lg">Agent Instructions</CardTitle>
              <CardDescription>Define how the agent should behave and respond</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PromptEditor
            id="agent_instructions"
            label="Instructions"
            description="Tell the agent what to do, how to act, and what goals to achieve"
            value={formData.agent_instructions}
            onChange={(value) => onUpdateField('agent_instructions', value)}
            placeholder="Enter detailed instructions for your agent..."
            error={errors.agent_instructions}
            rows={8}
            samplePrompt={SAMPLE_PROMPTS.agent_instructions}
          />
        </CardContent>
      </Card>

      {/* System Instructions */}
      <Card className="form-section animate-fade-in-up stagger-5">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-warning/10">
              <MessageSquare className="h-5 w-5 text-warning" />
            </div>
            <div>
              <CardTitle className="text-lg">System Instructions</CardTitle>
              <CardDescription>Set guardrails and behavioral constraints</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PromptEditor
            id="system_instructions"
            label="System Prompt"
            description="Rules the agent must always follow (safety, compliance, limitations)"
            value={formData.system_instructions}
            onChange={(value) => onUpdateField('system_instructions', value)}
            placeholder="Enter system-level instructions..."
            error={errors.system_instructions}
            rows={6}
            samplePrompt={SAMPLE_PROMPTS.system_instructions}
          />
        </CardContent>
      </Card>

      {/* Outbound Configuration */}
      <Card className="form-section animate-fade-in-up stagger-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="icon-container bg-primary/10">
              <PhoneOutgoing className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Outbound Call Configuration</CardTitle>
              <CardDescription>Configure the opening message for outbound calls</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <PromptEditor
            id="outbound_starter_prompt"
            label="Starter Prompt"
            description="The first message the agent speaks when initiating a call"
            value={formData.outbound_starter_prompt}
            onChange={(value) => onUpdateField('outbound_starter_prompt', value)}
            placeholder="Hello! This is [Agent Name] from [Company]..."
            error={errors.outbound_starter_prompt}
            rows={4}
            samplePrompt={SAMPLE_PROMPTS.outbound_starter_prompt}
          />
        </CardContent>
      </Card>
    </div>
  );
}
