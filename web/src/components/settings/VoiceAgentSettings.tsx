'use client';

import React, { useState, useEffect } from 'react';
import { Mic, Volume2, Brain, Save, RefreshCw } from 'lucide-react';
import { LoadingSpinner } from '../LoadingSpinner';
import { getApiBaseUrl } from '@/lib/api-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { safeStorage } from '@/utils/storage';

interface VoiceAgentSettings {
  llm: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tts: {
    provider: string;
    voice: string;
    speed: number;
    pitch: number;
  };
  stt: {
    provider: string;
    language: string;
    model: string;
  };
  systemPrompt: string;
}

export const VoiceAgentSettings: React.FC = () => {
  const [settings, setSettings] = useState<VoiceAgentSettings>({
    llm: {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000
    },
    tts: {
      provider: 'elevenlabs',
      voice: 'rachel',
      speed: 1.0,
      pitch: 1.0
    },
    stt: {
      provider: 'deepgram',
      language: 'en-US',
      model: 'nova-2'
    },
    systemPrompt: 'You are a helpful AI assistant focused on lead generation and customer engagement.'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/voice-agent/settings`, {
        headers: {
          'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const json = await response.json();
        // Extract data from the response wrapper
        const data = json.data || json;
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading voice agent settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/voice-agent/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        // Show success message
        alert('Settings saved successfully!');
      }
    } catch (error) {
      console.error('Error saving voice agent settings:', error);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="md" message="Loading voice agent settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* LLM Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle>Large Language Model (LLM)</CardTitle>
              <CardDescription>Configure the AI model for conversation intelligence</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="llm-provider">Provider</Label>
              <Select
                value={settings.llm.provider}
                onValueChange={(value) => setSettings({ ...settings, llm: { ...settings.llm, provider: value } })}
              >
                <SelectTrigger id="llm-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="google">Google (Gemini)</SelectItem>
                  <SelectItem value="groq">Groq</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-model">Model</Label>
              <Select
                value={settings.llm.model}
                onValueChange={(value) => setSettings({ ...settings, llm: { ...settings.llm, model: value } })}
              >
                <SelectTrigger id="llm-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {settings.llm.provider === 'openai' && (
                    <>
                      <SelectItem value="gpt-4">GPT-4</SelectItem>
                      <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                      <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    </>
                  )}
                  {settings.llm.provider === 'anthropic' && (
                    <>
                      <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                      <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                      <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                    </>
                  )}
                  {settings.llm.provider === 'google' && (
                    <>
                      <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      <SelectItem value="gemini-ultra">Gemini Ultra</SelectItem>
                    </>
                  )}
                  {settings.llm.provider === 'groq' && (
                    <>
                      <SelectItem value="mixtral-8x7b">Mixtral 8x7B</SelectItem>
                      <SelectItem value="llama2-70b">Llama 2 70B</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Temperature: {settings.llm.temperature}</Label>
            <Slider
              value={settings.llm.temperature}
              onValueChange={(value) => setSettings({ ...settings, llm: { ...settings.llm, temperature: value } })}
              min={0}
              max={2}
              step={0.1}
              className="w-full"
            />
            <p className="text-xs text-gray-500">Controls randomness. Lower = more focused, Higher = more creative</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              value={settings.llm.maxTokens}
              onChange={(e) => setSettings({ ...settings, llm: { ...settings.llm, maxTokens: parseInt(e.target.value) } })}
              min={100}
              max={8000}
            />
            <p className="text-xs text-gray-500">Maximum length of the generated response</p>
          </div>
        </CardContent>
      </Card>

      {/* TTS Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Volume2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle>Text-to-Speech (TTS)</CardTitle>
              <CardDescription>Configure voice output settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tts-provider">Provider</Label>
              <Select
                value={settings.tts.provider}
                onValueChange={(value) => setSettings({ ...settings, tts: { ...settings.tts, provider: value } })}
              >
                <SelectTrigger id="tts-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                  <SelectItem value="openai">OpenAI TTS</SelectItem>
                  <SelectItem value="google">Google Cloud TTS</SelectItem>
                  <SelectItem value="azure">Azure TTS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tts-voice">Voice</Label>
              <Select
                value={settings.tts.voice}
                onValueChange={(value) => setSettings({ ...settings, tts: { ...settings.tts, voice: value } })}
              >
                <SelectTrigger id="tts-voice">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rachel">Rachel (Female)</SelectItem>
                  <SelectItem value="adam">Adam (Male)</SelectItem>
                  <SelectItem value="bella">Bella (Female)</SelectItem>
                  <SelectItem value="josh">Josh (Male)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Speed: {settings.tts.speed}x</Label>
            <Slider
              value={settings.tts.speed}
              onValueChange={(value) => setSettings({ ...settings, tts: { ...settings.tts, speed: value } })}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label>Pitch: {settings.tts.pitch}x</Label>
            <Slider
              value={settings.tts.pitch}
              onValueChange={(value) => setSettings({ ...settings, tts: { ...settings.tts, pitch: value } })}
              min={0.5}
              max={1.5}
              step={0.1}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* STT Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Mic className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <CardTitle>Speech-to-Text (STT)</CardTitle>
              <CardDescription>Configure speech recognition settings</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stt-provider">Provider</Label>
              <Select
                value={settings.stt.provider}
                onValueChange={(value) => setSettings({ ...settings, stt: { ...settings.stt, provider: value } })}
              >
                <SelectTrigger id="stt-provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deepgram">Deepgram</SelectItem>
                  <SelectItem value="assembly">AssemblyAI</SelectItem>
                  <SelectItem value="google">Google Speech</SelectItem>
                  <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-language">Language</Label>
              <Select
                value={settings.stt.language}
                onValueChange={(value) => setSettings({ ...settings, stt: { ...settings.stt, language: value } })}
              >
                <SelectTrigger id="stt-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                  <SelectItem value="es-ES">Spanish</SelectItem>
                  <SelectItem value="fr-FR">French</SelectItem>
                  <SelectItem value="de-DE">German</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="stt-model">Model</Label>
              <Select
                value={settings.stt.model}
                onValueChange={(value) => setSettings({ ...settings, stt: { ...settings.stt, model: value } })}
              >
                <SelectTrigger id="stt-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nova-2">Nova 2 (Latest)</SelectItem>
                  <SelectItem value="enhanced">Enhanced</SelectItem>
                  <SelectItem value="base">Base</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle>System Prompt</CardTitle>
          <CardDescription>Define the behavior and personality of your AI agent</CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })}
            rows={6}
            placeholder="Enter system prompt..."
            className="font-mono text-sm"
          />
          <p className="text-xs text-gray-500 mt-2">
            This prompt guides how the AI responds to users. Be specific about tone, knowledge areas, and limitations.
          </p>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <Button
          onClick={loadSettings}
          variant="outline"
          disabled={isLoading || isSaving}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={saveSettings}
          disabled={isLoading || isSaving}
        >
          {isSaving ? (
            <>
              <LoadingSpinner inline size="sm" message="Saving..." />
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
