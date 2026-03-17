"use client";

import { useMemo, useEffect, ReactNode } from "react";
import { Phone } from "lucide-react";
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import { PhoneNumberSelector } from "./PhoneNumberSelector";
import { VoiceAgentSelector } from "./VoiceAgentSelector";
import { LanguageAccentSelector } from "./LanguageAccentSelector";
import { AdditionalInstructions } from "./AdditionalInstructions";
import { useAudioPreview } from "@/hooks/useAudioPreview";

type Agent = {
  id: string;
  name: string;
  language: string;
  accent: string;
  gender: string;
  provider: string;
  description?: ReactNode;
  voice_sample_url?: string | null;
};

type NumberItem = {
  id: string;
  phone_number: string;
  country_code?: string;
  base_number?: string;
  provider?: string;
  type?: string;
};

interface LanguageOption {
  id: string;
  label: string;
  value?: string;
}

interface CallConfigurationProps {
  numbers: NumberItem[];
  agents: Agent[];
  countryCodes: string[];
  selectedCountryCode: string | undefined;
  onSelectedCountryCodeChange: (code: string) => void;
  selectedNumberId: string | undefined;
  onSelectedNumberChange: (id: string) => void;
  languages: LanguageOption[];
  selectedLanguageId: string | undefined;
  onSelectedLanguageChange: (id: string) => void;
  selectedAccentId: string | undefined;
  onSelectedAccentChange: (id: string) => void;
  agentId: string | undefined;
  onAgentIdChange: (id: string) => void;
  additionalInstructions: string;
  onAdditionalInstructionsChange: (instructions: string) => void;
}

export function CallConfiguration({
  numbers,
  agents,
  countryCodes,
  selectedCountryCode,
  onSelectedCountryCodeChange,
  selectedNumberId,
  onSelectedNumberChange,
  languages,
  selectedLanguageId,
  onSelectedLanguageChange,
  selectedAccentId,
  onSelectedAccentChange,
  agentId,
  onAgentIdChange,
  additionalInstructions,
  onAdditionalInstructionsChange,
}: CallConfigurationProps) {

  const selectedAgent = useMemo<Agent | undefined>(
    () => agents.find((a) => String(a.id) === String(agentId)) || agents[0],
    [agents, agentId]
  );

  const { isPlaying, togglePlay } = useAudioPreview(selectedAgent);

  // Auto-sync language & accent from selected agent
  useEffect(() => {
    if (!selectedAgent) return;
    if (selectedAgent.language) {
      const lang = languages.find(
        (l) =>
          l.label.toLowerCase() === selectedAgent.language.toLowerCase() ||
          l.value?.toLowerCase() === selectedAgent.language.toLowerCase()
      );
      if (lang) onSelectedLanguageChange(lang.id);
    }
    if (selectedAgent.accent) {
      onSelectedAccentChange(selectedAgent.accent);
    }
  }, [selectedAgent, onSelectedLanguageChange, onSelectedAccentChange, languages]);

  return (
    <Card className="rounded-2xl transition-all p-2 bg-white border border-gray-100">
      <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-white/5 rounded-3xl px-5 py-1 border border-white/30 dark:border-white/10 mb-1 -mx-2 mt-2">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
          <Phone className="w-5 h-5 inline mr-2" /> Call Configuration
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          Select number and voice agent
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <PhoneNumberSelector
          numbers={numbers}
          countryCodes={countryCodes}
          selectedCountryCode={selectedCountryCode}
          onSelectedCountryCodeChange={onSelectedCountryCodeChange}
          selectedNumberId={selectedNumberId}
          onSelectedNumberChange={onSelectedNumberChange}
        />

        <VoiceAgentSelector
          agents={agents}
          agentId={agentId}
          onAgentIdChange={onAgentIdChange}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          selectedAgent={selectedAgent}
        />

        <LanguageAccentSelector
          agents={agents}
          languages={languages}
          selectedLanguageId={selectedLanguageId}
          onSelectedLanguageChange={onSelectedLanguageChange}
          selectedAccentId={selectedAccentId}
          onSelectedAccentChange={onSelectedAccentChange}
          selectedAgent={selectedAgent}
          onAgentIdChange={onAgentIdChange}
        />

        <AdditionalInstructions
          value={additionalInstructions}
          onChange={onAdditionalInstructionsChange}
        />
      </CardContent>
    </Card>
  );
}