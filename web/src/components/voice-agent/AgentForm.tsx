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
  Loader2
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
import { AgentFormData, LANGUAGES, GENDERS } from '@/types/agent';
import { PromptEditor } from './PromptEditor';
import { VoicePreview } from './VoicePreview';
import { CharacterCounter } from './CharacterCounter';
import { cn } from '@/lib/utils';

interface AgentFormProps {
  formData: AgentFormData;
  errors: Partial<Record<keyof AgentFormData, string>>;
  
  isDirty: boolean;
  isValid: boolean;
  isSaving: boolean;
  isEditMode: boolean;
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
  onUpdateField,
  onSave,
  onReset,
  getCharCount,
}: AgentFormProps) {
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
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
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
            className="gradient-primary min-w-32"
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
              <CardDescription>Configure your agent's identity</CardDescription>
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
                className={cn(errors.name && "border-destructive")}
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
            <div className="icon-container bg-accent/10">
              <Globe className="h-5 w-5 text-accent" />
            </div>
            <div>
              <CardTitle className="text-lg">Voice & Language</CardTitle>
              <CardDescription>Set the speaking language and preview the voice</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={formData.language}
                onValueChange={(value) => onUpdateField('language', value)}
              >
                <SelectTrigger id="language" className="w-full">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:self-end">
              <VoicePreview 
                language={formData.language} 
                gender={formData.gender}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Agent Instructions */}
      <Card className="form-section animate-fade-in-up stagger-3">
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
      <Card className="form-section animate-fade-in-up stagger-4">
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
      <Card className="form-section animate-fade-in-up">
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
