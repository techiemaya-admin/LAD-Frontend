"use client";

import { useMemo, useState, useEffect, useRef, ReactNode } from "react";
import Image from "next/image";

interface ApiResponse<T = any> {
  success: boolean;
  [key: string]: any;
}
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Phone, Mic, Play, Pause, Bot, ChevronDown } from "lucide-react";
import { apiGet } from "@/lib/api";

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
  const normalizeE164Like = (phone: unknown): string =>
    String(phone ?? "")
      .trim()
      .replace(/^\+{2,}/, "+");

  type SignedSampleResponse = {
    success?: boolean;
    signed_url?: string;
    signedUrl?: string;
    url?: string;
    [key: string]: any;
  };

  // ----- Agent selection -----
  const selectedAgent = useMemo<Agent | undefined>(
    () =>
      agents.find((a) => String(a.id) === String(agentId)) ||
      agents[0],
    [agents, agentId]
  );

  // ----- Audio preview state -----
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [signedSampleUrl, setSignedSampleUrl] = useState<string | null>(null);
  const signedSampleUrlCache = useRef<Map<string, string>>(new Map());

  const getAgentSampleUrl = (agent: Agent | undefined): string | null => {
    if (!agent?.voice_sample_url) return null;
    if (signedSampleUrl) return signedSampleUrl;

    // Fallback for non-gs URLs when signing isn't available.
    if (!agent.voice_sample_url.startsWith('gs://')) return agent.voice_sample_url;

    // For gs:// URLs, route through the recording proxy.
    // The token is an HTTP-only cookie - JavaScript cannot read it, but the browser
    // automatically sends it with same-origin <audio> requests.
    // The proxy reads the cookie server-side (via Next.js cookies()), so no token
    // param is needed in the URL.
    return `/api/recording-proxy?url=${encodeURIComponent(
      agent.voice_sample_url
    )}&agentId=${encodeURIComponent(String(agent.id))}`;
  };

  // When agent changes, fetch a signed sample URL once (cached by agent id)
  useEffect(() => {
    const id = selectedAgent?.id;
    if (!id) {
      setSignedSampleUrl(null);
      return;
    }

    const key = String(id);
    const cached = signedSampleUrlCache.current.get(key);
    if (cached) {
      setSignedSampleUrl(cached);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // VAPI DISABLED: Commenting out voice agent sample URL fetch
        // const res = await apiGet<SignedSampleResponse>(
        //   `/api/voice-agent/agents/${encodeURIComponent(key)}/sample-signed-url`
        // );
        // const url = (res?.signed_url || res?.signedUrl || res?.url || '').toString().trim();
        // if (!cancelled && url) {
        //   signedSampleUrlCache.current.set(key, url);
        //   setSignedSampleUrl(url);
        // } else if (!cancelled) {
        //   setSignedSampleUrl(null);
        // }

        // VAPI DISABLED: Set null since voice agent is disabled
        if (!cancelled) {
          setSignedSampleUrl(null);
        }
      } catch (e) {
        // Non-fatal: we'll fall back to proxy or direct URL.
        if (!cancelled) setSignedSampleUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedAgent?.id]);

  // When selected agent changes, setup audio
  useEffect(() => {
    setIsPlaying(false);
    const existingAudio = audioRef.current;
    if (existingAudio) {
      existingAudio.pause();
      audioRef.current = null;
    }

    const audioUrl = getAgentSampleUrl(selectedAgent);
    if (!audioUrl) return;

    const a = new Audio(audioUrl);
    a.onended = () => setIsPlaying(false);
    audioRef.current = a;

    return () => {
      a.pause();
    };
  }, [selectedAgent?.id, selectedAgent?.voice_sample_url, signedSampleUrl]);

  const togglePlay = async () => {
    if (!selectedAgent?.voice_sample_url) return;
    const audioUrl = getAgentSampleUrl(selectedAgent);
    if (!audioUrl) return;
    if (!audioRef.current) {
      const a = new Audio(audioUrl);
      a.onended = () => setIsPlaying(false);
      audioRef.current = a;
    }
    try {
      if (!isPlaying) {
        await audioRef.current!.play();
        setIsPlaying(true);
      } else {
        audioRef.current!.pause();
        setIsPlaying(false);
      }
    } catch (e) {
      console.error("Audio play error:", e);
    }
  };

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

  const [isRephrasing, setIsRephrasing] = useState(false);
  /** Set when a rephrase attempt failed, so the button does not just look broken. */
  const [rephraseError, setRephraseError] = useState<string | null>(null);

  return (
    <Card className="rounded-2xl transition-all p-2 bg-white dark:bg-[#071131] border border-gray-100 dark:border-blue-950/40">
      <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-[#071131] rounded-3xl px-5 py-1 border border-white/30 dark:border-none mb-1 -mx-2 mt-2">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
          <Phone className="w-5 h-5 inline mr-2" /> Call Configuration
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-[#7a8ba3]">
          Select number and voice agent
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Combined Phone Input: [🏳 +XX ▼] | [base_number ▼] */}
        {countryCodes.length > 0 && (() => {
          // Map dialCode → { code, name } using the same COUNTRIES data as CallOptions
          const DIAL_TO_COUNTRY: Record<string, { code: string; name: string }> = {
            "+1": { code: "us", name: "US" },
            "+44": { code: "gb", name: "GB" },
            "+91": { code: "in", name: "IN" },
            "+971": { code: "ae", name: "AE" },
            "+61": { code: "au", name: "AU" },
            "+49": { code: "de", name: "DE" },
            "+33": { code: "fr", name: "FR" },
            "+81": { code: "jp", name: "JP" },
            "+86": { code: "cn", name: "CN" },
            "+7": { code: "ru", name: "RU" },
            "+55": { code: "br", name: "BR" },
            "+52": { code: "mx", name: "MX" },
            "+27": { code: "za", name: "ZA" },
            "+234": { code: "ng", name: "NG" },
            "+20": { code: "eg", name: "EG" },
            "+966": { code: "sa", name: "SA" },
            "+65": { code: "sg", name: "SG" },
            "+60": { code: "my", name: "MY" },
            "+62": { code: "id", name: "ID" },
            "+63": { code: "ph", name: "PH" },
            "+92": { code: "pk", name: "PK" },
            "+880": { code: "bd", name: "BD" },
            "+94": { code: "lk", name: "LK" },
            "+974": { code: "qa", name: "QA" },
            "+965": { code: "kw", name: "KW" },
            "+973": { code: "bh", name: "BH" },
            "+968": { code: "om", name: "OM" },
          };
          const activeCode = selectedCountryCode ?? countryCodes[0];
          const activeCountry = DIAL_TO_COUNTRY[activeCode];

          return (
            <div className="w-full mx-0">
              <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
                Phone Number
              </label>
              {/* Unified container - same height/border as CallOptions */}
              <div className="flex rounded-[10px] border border-gray-200 dark:border-blue-950/40 overflow-hidden focus-within:ring-2 focus-within:ring-gray-200 min-h-[48px] bg-white dark:bg-slate-800/50">

                {/* Left: flag + country code selector - styled like CallOptions button */}
                <Select
                  value={activeCode}
                  onValueChange={onSelectedCountryCodeChange}
                >
                  <SelectTrigger className="flex items-center gap-2 px-3 bg-gray-50 dark:bg-slate-800/50 border-0 border-r border-gray-200 dark:border-blue-950/40 hover:bg-gray-100 dark:hover:bg-slate-800/70 rounded-none focus:ring-0 shadow-none h-auto min-w-[96px] max-w-[116px] min-h-[48px]">
                    <div className="flex items-center gap-2">
                      {activeCountry ? (
                        <Image
                          src={`https://flagcdn.com/w40/${activeCountry.code}.png`}
                          alt={activeCountry.name}
                          width={24}
                          height={16}
                          unoptimized
                        />
                      ) : (
                        <Phone className="w-4 h-4 text-gray-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700 dark:text-white">{activeCode}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40">
                    {countryCodes.map((code) => {
                      const country = DIAL_TO_COUNTRY[code];
                      return (
                        <SelectItem key={code} value={code} className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white focus:bg-primary focus:text-primary-foreground dark:focus:bg-primary dark:focus:text-primary-foreground data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary dark:data-[state=checked]:text-primary-foreground dark:data-[state=checked]:focus:bg-primary dark:data-[state=checked]:focus:text-primary-foreground">
                          <div className="flex items-center gap-3">
                            {country ? (
                              <Image
                                src={`https://flagcdn.com/w40/${country.code}.png`}
                                alt={country.name}
                                width={24}
                                height={16}
                                unoptimized
                              />
                            ) : (
                              <Phone className="w-4 h-4 text-gray-400" />
                            )}
                            <span className="text-sm">
                              {country?.name ?? code}
                            </span>
                            <span className="text-sm font-medium ml-auto">
                              {code}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {/* Right: base number selector */}
                <Select
                  value={selectedNumberId}
                  onValueChange={onSelectedNumberChange}
                >
                  <SelectTrigger className="h-auto flex-1 border-0 rounded-none focus:ring-0 shadow-none bg-transparent px-3 text-left min-h-[48px]">
                    <SelectValue placeholder="Select number" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40">
                    {numbers.map((n) => (
                      <SelectItem key={n.id} value={n.id} className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:focus:bg-[#2563eb] dark:data-[state=checked]:focus:text-white">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {n.base_number ?? normalizeE164Like(n.phone_number)}
                          </span>
                          {n.provider && (
                            <span className="text-xs truncate text-slate-400 dark:text-slate-300 transition-colors duration-100 group-data-[highlighted]:text-white/80 dark:group-data-[highlighted]:text-white/80">
                              {n.provider}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>
            </div>
          );
        })()}

        {/* Fallback phone select when no country codes */}
        {countryCodes.length === 0 && (
          <div className="w-full mx-0">
            <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
              Phone Number
            </label>
            <Select value={selectedNumberId} onValueChange={onSelectedNumberChange}>
              <SelectTrigger className="h-12 rounded-[10px] border-gray-200 dark:border-blue-950/40 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/50 w-full">
                <SelectValue placeholder="Select number" />
              </SelectTrigger>
              <SelectContent>
                {numbers.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span>{n.base_number ?? normalizeE164Like(n.phone_number)}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Voice Agent + inline round play button */}
        <div className="w-full mx-0">
          <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
            Voice Agent
          </label>

          <div className="flex flex-row items-center gap-3">
            {/* Select - expands to fill space */}
            <div className="flex-1 min-w-0">
              <Select
                value={agentId || ""}
                onValueChange={(value) => onAgentIdChange(value)}
              >
                <SelectTrigger className="h-12 rounded-[10px] border-gray-200 dark:border-blue-950/40 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/50 w-full overflow-hidden">
                  {selectedAgent ? (
                    <div className="flex items-center gap-3 p-2 overflow-hidden">
                      <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex flex-col items-start min-w-0 overflow-hidden whitespace-nowrap text-left">
                        <span className="font-medium overflow-hidden whitespace-nowrap text-ellipsis max-w-full">
                          {selectedAgent.name}
                        </span>
                        <span className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-300 overflow-hidden whitespace-nowrap text-ellipsis max-w-full">
                          {selectedAgent.accent} • {selectedAgent.gender}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-300">
                      No agents available
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent className="w-full bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40">
                  {agents.map((agent) => (
                    <SelectItem
                      key={agent.id}
                      value={String(agent.id)}
                      className="h-auto py-3 group" // <-- Ensure 'group' is fully present here
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Mic className="w-4 h-4 text-blue-500 flex-shrink-0 transition-colors duration-100 group-data-[highlighted]:text-white dark:group-data-[highlighted]:text-white" />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-medium truncate">
                              {agent.name}
                            </span>
                            <span className="text-xs truncate text-slate-400 dark:text-slate-300 transition-colors duration-100 group-data-[highlighted]:text-white/80 dark:group-data-[highlighted]:text-white/80">
                              {agent.description} • {agent.accent} •{" "}
                              {agent.gender}
                            </span>
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Round play/pause icon button - fixed size */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={!selectedAgent?.voice_sample_url}
              aria-label={isPlaying ? "Pause sample" : "Play sample"}
              className={[
                "relative inline-flex items-center justify-center flex-shrink-0",
                "h-12 w-12 rounded-full shadow-lg",
                "bg-[#0b1957]",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f1f5a]/40",
              ].join(" ")}
            >
              <span className="absolute inset-0 rounded-full bg-black/0 pointer-events-none" />
              {isPlaying ? (
                <Pause className="h-5 w-5 text-white" />
              ) : (
                <Play className="h-5 w-5 text-white translate-x-[1px]" />
              )}
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Choose a voice agent for the call
          </p>
        </div>

        {/* Language / Accent */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
              Language
            </label>
            <Select
              value={selectedLanguageId}
              onValueChange={(value) => {
                onSelectedLanguageChange(value);
                const agentWithLanguage = agents.find(
                  (a) =>
                    a.language.toLowerCase() === value.toLowerCase() ||
                    languages.find((l) => l.id === value)?.label.toLowerCase() ===
                    a.language.toLowerCase()
                );
                if (agentWithLanguage) {
                  onAgentIdChange(String(agentWithLanguage.id));
                }
              }}
            >
              <SelectTrigger className="h-12 rounded-[10px] border-gray-200 dark:border-blue-950/40 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/50 w-full">
                <SelectValue
                  placeholder={selectedAgent?.language || "Select language"}
                />
              </SelectTrigger>
              <SelectContent className="w-full bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40">
                {Array.from(
                  new Map(
                    agents
                      .map((a) => a.language)
                      .filter(Boolean)
                      .map((language) => {
                        const lang = languages.find((l) => {
                          const langLabel = l.label?.toLowerCase();
                          const langValue = l.value?.toLowerCase();
                          const agentLang = String(language).toLowerCase();
                          return langLabel === agentLang || langValue === agentLang;
                        });
                        const value = (lang?.id || String(language)).trim();
                        const label = lang?.label || String(language);
                        return [value, label] as [string, string];
                      })
                      .filter(([value]) => !!value)
                  ).entries()
                ).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    <span>{label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
              Accent
            </label>
            <Select
              value={selectedAgent?.accent || selectedAccentId}
              onValueChange={(value) => {
                onSelectedAccentChange(value);
                const agentWithAccent = agents.find((a) => a.accent === value);
                if (agentWithAccent) {
                  onAgentIdChange(String(agentWithAccent.id));
                }
              }}
            >
              <SelectTrigger className="h-12 rounded-[10px] border-gray-200 dark:border-blue-950/40 dark:bg-slate-800/50 focus:ring-2 focus:ring-primary/50 w-full">
                <SelectValue
                  placeholder={selectedAgent?.accent || "Select accent"}
                />
              </SelectTrigger>
              <SelectContent className="w-full bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40">
                {Array.from(
                  new Set(
                    agents
                      .filter((agent) => {
                        if (!selectedLanguageId) return true;
                        const langLabel =
                          languages.find((l) => l.id === selectedLanguageId)
                            ?.label || selectedLanguageId;
                        return (
                          agent.language === selectedLanguageId ||
                          agent.language === langLabel
                        );
                      })
                      .map((a) => a.accent)
                      .filter(Boolean)
                  )
                )
                  .map((accent) => {
                    const value = String(accent).trim();
                    if (!value) return null;
                    return (
                      <SelectItem key={value} value={value}>
                        <span className="capitalize">{accent}</span>
                      </SelectItem>
                    );
                  })
                  .filter(Boolean)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Additional Instructions + Rephrase */}
        <div className="w-full mx-0 mt-4">
          <label className="text-sm font-medium text-gray-700 dark:text-white mb-1 block">
            Additional Instructions
          </label>

          <div className="relative">
            <textarea
              value={additionalInstructions}
              onChange={(e) => onAdditionalInstructionsChange(e.target.value)}
              className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 dark:border-blue-950/40 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 bg-white dark:bg-slate-800/50 text-gray-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-[#7a8ba3]"
              placeholder="Enter any additional instructions for the call..."
            />

            <button
              type="button"
              title="Maya-Rephrase"
              onClick={async () => {
                if (!additionalInstructions.trim()) return;

                try {
                  setIsRephrasing(true);
                  setRephraseError(null);

                  const apiBase =
                    process.env.NEXT_PUBLIC_USE_API_PROXY === "true"
                      ? ""
                      : process.env.NEXT_PUBLIC_API_BASE_URL;

                  const res = await fetch(
                    `${apiBase}/api/gemini/generate-phrase`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        context: additionalInstructions,
                      }),
                    }
                  );

                  const data = await res.json().catch(() => ({}));
                  // `fetch` does not throw on 4xx/5xx, so a server error landed
                  // here and was only console.error'd. The spinner stopped and
                  // the text was unchanged, which is exactly what a broken
                  // button looks like — say what happened instead.
                  if (!res.ok || !data?.success) {
                    setRephraseError(
                      data?.error || `Couldn't rephrase that (${res.status}).`
                    );
                    return;
                  }
                  onAdditionalInstructionsChange(data.generatedText);
                } catch (err) {
                  console.error("Rephrase Failed:", err);
                  setRephraseError("Couldn't rephrase that — check your connection.");
                } finally {
                  setIsRephrasing(false);
                }
              }}
              className="
                absolute top-2 right-2
                h-8 px-3 rounded-md
                bg-gray-100 dark:bg-input/30 hover:bg-gray-200 dark:hover:bg-input/50
                flex items-center gap-1
                border border-gray-300 dark:border-blue-950/60
                shadow-sm
                text-xs font-medium text-gray-700 dark:text-white
              "
            >
              {isRephrasing ? (
                <span className="animate-spin text-gray-600">⏳</span>
              ) : (
                <>✨</>
              )}
            </button>
          </div>

          {rephraseError && (
            <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
              {rephraseError} Your text is unchanged.
            </p>
          )}

          <p className="mt-1 text-xs text-gray-500 dark:text-[#7a8ba3]">
            These instructions will be provided as context for the voice agent.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
