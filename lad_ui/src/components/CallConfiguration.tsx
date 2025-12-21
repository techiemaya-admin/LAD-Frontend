
// "use client";

// import { useMemo, useState, useEffect, useRef, ReactNode } from "react";

// interface ApiResponse<T = any> {
//   success: boolean;
//   [key: string]: any;
// }
// import {
//   Card, CardHeader, CardTitle, CardDescription, CardContent,
// } from "@/components/ui/card";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/components/ui/select";
// import { Phone, Mic, Play, Pause, Bot } from "lucide-react"; // ⬅️ added Play/Pause
// import { apiGet } from "@/lib/api";

// type Agent = {
//   description: ReactNode;
//   id: string;
//   name: string;
//   language: string;
//   accent: string;
//   gender: string;
//   provider: string;
//   voice_sample_url?: string;
// };

// type NumberItem = {
//   id: string;
//   phone_number: string;
//   provider?: string;
//   type?: string;
// };

// interface LanguageOption {
//   id: string;
//   label: string;
//   value?: string;
// }

// interface CallConfigurationProps {
//   organizationId: string;
//   selectedNumberId: string | undefined;
//   onSelectedNumberChange: (id: string) => void;
//   languages: LanguageOption[];
//   selectedLanguageId: string | undefined;
//   onSelectedLanguageChange: (id: string) => void;
//   accents: string[];
//   selectedAccentId: string | undefined;
//   onSelectedAccentChange: (id: string) => void;
//   agentId: string | undefined;
//   onAgentIdChange: (id: string) => void;
//   additionalInstructions: string;
//   onAdditionalInstructionsChange: (instructions: string) => void;
// }

// export function CallConfiguration({
//   organizationId,
//   selectedNumberId,
//   onSelectedNumberChange,
//   languages,
//   selectedLanguageId,
//   onSelectedLanguageChange,
//   accents,
//   selectedAccentId,
//   onSelectedAccentChange,
//   agentId,
//   onAgentIdChange,
//   additionalInstructions,
//   onAdditionalInstructionsChange,
// }: CallConfigurationProps) {
//   const [numbers, setNumbers] = useState<NumberItem[]>([]);
//   const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
//   const [loadingAgents, setLoadingAgents] = useState(true);

//   // Inline audio player state
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const [isPlaying, setIsPlaying] = useState(false);

//   // Fetch Numbers for User (based on organization)
//   useEffect(() => {
//     if (!organizationId) return;

//     const loadNumbers = async () => {
//       const res = await apiGet<ApiResponse<{ numbers: NumberItem[] }>>(`/api/voiceagent/user/available-numbers?organizationId=${organizationId}`);
//       if (res.success) {
//         setNumbers(res.numbers);
//         if (!selectedNumberId && res.numbers.length > 0) {
//           onSelectedNumberChange(res.numbers[0].id);
//         }
//       }
//     };
//     loadNumbers();
//   }, [organizationId]);

//   // Fetch Agents for User (based on organization)
//   useEffect(() => {
//     if (!organizationId) return;

//     const loadAgents = async () => {
//       try {
//         const res = await apiGet<ApiResponse<{ agents: Agent[] }>>(`/api/voiceagent/user/available-agents?organizationId=${organizationId}`);
//         if (res.success && Array.isArray(res.agents)) {
//           setAvailableAgents(res.agents);
//           if (res.agents.length > 0 && !agentId) {
//             onAgentIdChange(String(res.agents[0].id));
//           }
//         }
//       } catch (err) {
//         console.error("Error loading agents", err);
//       } finally {
//         setLoadingAgents(false);
//       }
//     };

//     loadAgents();
//   }, [organizationId, agentId, onAgentIdChange]);

//   const selectedAgent = useMemo<Agent | undefined>(
//     () => availableAgents.find((a) => String(a.id) === String(agentId)) || availableAgents[0],
//     [availableAgents, agentId]
//   );

//   // If the selected agent changes, reset/prepare the audio
//   useEffect(() => {
//     setIsPlaying(false);
//     if (!selectedAgent?.voice_sample_url) {
//       if (audioRef.current) {
//         audioRef.current.pause();
//         audioRef.current = null;
//       }
//       return;
//     }
//     // Create/replace audio with new src - use proxy for gs:// URLs
//     const audioUrl = selectedAgent.voice_sample_url.startsWith('gs://')
//       ? `/api/recording-proxy?url=${encodeURIComponent(selectedAgent.voice_sample_url)}`
//       : selectedAgent.voice_sample_url;
//     const a = new Audio(audioUrl);
//     a.onended = () => setIsPlaying(false);
//     audioRef.current = a;

//     return () => {
//       a.pause();
//     };
//   }, [selectedAgent?.voice_sample_url]);

//   const togglePlay = async () => {
//     if (!selectedAgent?.voice_sample_url) return;
//     if (!audioRef.current) {
//       const audioUrl = selectedAgent.voice_sample_url.startsWith('gs://')
//         ? `/api/recording-proxy?url=${encodeURIComponent(selectedAgent.voice_sample_url)}`
//         : selectedAgent.voice_sample_url;
//       const a = new Audio(audioUrl);
//       a.onended = () => setIsPlaying(false);
//       audioRef.current = a;
//     }
//     try {
//       if (!isPlaying) {
//         await audioRef.current.play();
//         setIsPlaying(true);
//       } else {
//         audioRef.current.pause();
//         setIsPlaying(false);
//       }
//     } catch (e) {
//       console.error("Audio play error:", e);
//     }
//   };

//   // auto-sync language & accent from selected agent (optional)
//   useEffect(() => {
//     if (!selectedAgent) return;
//     if (selectedAgent.language) {
//       const lang = languages.find(
//         (l) =>
//           l.label.toLowerCase() === selectedAgent.language.toLowerCase() ||
//           l.value?.toLowerCase() === selectedAgent.language.toLowerCase()
//       );
//       if (lang) onSelectedLanguageChange(lang.id);
//     }
//     if (selectedAgent.accent) {
//       onSelectedAccentChange(selectedAgent.accent);
//     }
//   }, [selectedAgent, onSelectedLanguageChange, onSelectedAccentChange, languages]);
//   const [isRephrasing, setIsRephrasing] = useState(false);


//   return (
//     <Card className="rounded-2xl transition-all p-6 bg-white border border-gray-100">
//       <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-white/5 rounded-3xl px-6 py-5 border border-white/30 dark:border-white/10 mb-6 -mx-6 mt-0">
//         <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
//           <Phone className="w-5 h-5 inline mr-2" /> Call Configuration
//         </CardTitle>
//         <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
//           Select number and voice agent
//         </CardDescription>
//       </CardHeader>

//       <CardContent className="space-y-5">
//         {/* Phone number */}
//         <div className="w-full mx-0">
//           <label className="text-sm font-medium text-gray-700 mb-1 block">Phone Number</label>
//           <Select value={selectedNumberId} onValueChange={onSelectedNumberChange}>
//             <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
//               <SelectValue placeholder="Select number" />
//             </SelectTrigger>
//             <SelectContent className="w-full">
//               {numbers.map((n) => (
//                 <SelectItem key={n.id} value={n.id}>
//                   <div className="flex items-center gap-2">
//                     <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
//                     <div className="flex flex-col">
//                       <span>{n.phone_number}</span>
//                       {n.provider && (
//                         <span className="text-xs text-gray-500">
//                           {n.provider} • {n.type || "number"}
//                         </span>
//                       )}
//                     </div>
//                   </div>
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>

//         {/* Voice Agent + inline round play button */}
//         <div className="w-full space-y-2 mx-0">
//           <label className="text-sm font-medium text-gray-700 mb-1 block">Voice Agent</label>

//           <div className="flex items-center gap-3">
//             {/* Select (flex-1) */}
//             <div className="flex-1">
//               <Select
//                 value={agentId || ""}
//                 onValueChange={(value) => onAgentIdChange(value)}
//                 disabled={loadingAgents}
//               >
//                 <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
//                   {loadingAgents ? (
//                     <span className="text-muted-foreground">Loading agents...</span>
//                   ) : selectedAgent ? (
//                     <div className="flex items-center gap-3 p-2 w-full">
//                       <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
//                       <div className="flex flex-col items-start min-w-0 flex-1">
//                         <span className="font-medium truncate">{selectedAgent.name}</span>
//                         <span className="text-xs text-muted-foreground truncate">
//                           {selectedAgent.description} • {selectedAgent.accent} • {selectedAgent.gender}
//                         </span>
//                       </div>
//                     </div>
//                   ) : (
//                     <span className="text-muted-foreground">No agents available</span>
//                   )}
//                 </SelectTrigger>
//                 <SelectContent className="w-full">
//                   {availableAgents.map((agent) => (
//                     <SelectItem
//                       key={agent.id}
//                       value={String(agent.id)}
//                       className="h-auto py-3"
//                     >
//                       <div className="flex items-center gap-3 w-full">
//                         <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
//                         <div className="flex-1 flex items-center justify-between min-w-0">
//                           <div className="flex flex-col items-start min-w-0">
//                             <span className="font-medium truncate">{agent.name}</span>
//                             <span className="text-xs text-muted-foreground truncate">
//                               {agent.description} • {agent.accent} • {agent.gender}
//                             </span>
//                           </div>
//                         </div>
//                       </div>
//                     </SelectItem>
//                   ))}
//                 </SelectContent>
//               </Select>
//             </div>

//             {/* Round play/pause icon button */}
//             <button
//               type="button"
//               onClick={togglePlay}
//               disabled={!selectedAgent?.voice_sample_url}
//               aria-label={isPlaying ? "Pause sample" : "Play sample"}
//               className={[
//                 "relative inline-flex items-center justify-center",
//                 "h-12 w-12 rounded-full shadow-xl",
//                 "bg-[#0f1f5a]", // deep navy
//                 "disabled:opacity-50 disabled:cursor-not-allowed",
//                 "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f1f5a]/40",
//               ].join(" ")}
//             >
//               {/* soft container background edge like the screenshot */}
//               <span className="absolute inset-0 rounded-full bg-black/0 pointer-events-none" />
//               {isPlaying ? (
//                 <Pause className="h-5 w-5 text-white" />
//               ) : (
//                 <Play className="h-5 w-5 text-white translate-x-[1px]" />
//               )}
//             </button>
//           </div>

//           <p className="text-xs text-muted-foreground">Choose a voice agent for the call</p>
//         </div>

//         {/* Language / Accent */}
//         <div className="flex gap-4">
//           <div className="flex-1">
//             <label className="text-sm font-medium text-gray-700 mb-1 block">Language</label>
//             <Select
//               value={selectedLanguageId}
//               onValueChange={(value) => {
//                 onSelectedLanguageChange(value);
//                 const agentWithLanguage = availableAgents.find(
//                   (a) =>
//                     a.language.toLowerCase() === value.toLowerCase() ||
//                     languages.find((l) => l.id === value)?.label.toLowerCase() ===
//                       a.language.toLowerCase()
//                 );
//                 if (agentWithLanguage) {
//                   onAgentIdChange(String(agentWithLanguage.id));
//                 }
//               }}
//             >
//               <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
//                 <SelectValue placeholder={selectedAgent?.language || "Select language"} />
//               </SelectTrigger>
//               <SelectContent className="w-full">
//                 {Array.from(new Set(availableAgents.map((a) => a.language))).map((language) => {
//                   const lang = languages.find(
//                     (l) =>
//                       l.label.toLowerCase() === language.toLowerCase() ||
//                       l.value?.toLowerCase() === language.toLowerCase()
//                   );
//                   const value = lang?.id || language;
//                   const label = lang?.label || language;
//                   return (
//                     <SelectItem key={value} value={value}>
//                       <span>{label}</span>
//                     </SelectItem>
//                   );
//                 })}
//               </SelectContent>
//             </Select>
//           </div>

//           <div className="flex-1">
//             <label className="text-sm font-medium text-gray-700 mb-1 block">Accent</label>
//             <Select
//               value={selectedAgent?.accent || selectedAccentId}
//               onValueChange={(value) => {
//                 onSelectedAccentChange(value);
//                 const agentWithAccent = availableAgents.find((a) => a.accent === value);
//                 if (agentWithAccent) {
//                   onAgentIdChange(String(agentWithAccent.id));
//                 }
//               }}
//             >
//               <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
//                 <SelectValue placeholder={selectedAgent?.accent || "Select accent"} />
//               </SelectTrigger>
//               <SelectContent className="w-full">
//                 {Array.from(
//                   new Set(
//                     availableAgents
//                       .filter(
//                         (agent) =>
//                           !selectedLanguageId ||
//                           agent.language === selectedLanguageId ||
//                           languages.find((l) => l.id === selectedLanguageId)?.label ===
//                             agent.language
//                       )
//                       .map((a) => a.accent)
//                   )
//                 ).map((accent) => (
//                   <SelectItem key={accent} value={accent}>
//                     <span className="capitalize">{accent}</span>
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         </div>

//         <div className="w-full mx-0 mt-4">
//   <label className="text-sm font-medium text-gray-700 mb-1 block">
//     Additional Instructions
//   </label>

//   <div className="relative">
    
//     <textarea
//       value={additionalInstructions}
//       onChange={(e) => onAdditionalInstructionsChange(e.target.value)}
//       className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
//       placeholder="Enter any additional instructions for the call..."
//     />

    
//  <button
//   type="button"
//   title="Maya-Rephrase"
//   onClick={async () => {
//     if (!additionalInstructions.trim()) return;

//     try {
//       setIsRephrasing(true);

//       const apiBase = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true'
//         ? ''
//         : process.env.NEXT_PUBLIC_API_BASE_URL;
      
//       const res = await fetch(
//         `${apiBase}/api/gemini/generate-phrase`,
//         {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ context: additionalInstructions }),
//         }
//       );

//       const data = await res.json();
//       if (data.success) {
//         onAdditionalInstructionsChange(data.generatedText);
//       } else {
//         console.error("Gemini Error:", data.error);
//       }
//     } catch (err) {
//       console.error("Rephrase Failed:", err);
//     } finally {
//       setIsRephrasing(false);
//     }
//   }}
//   className="
//     absolute top-2 right-2 
//     h-8 px-3 rounded-md 
//     bg-gray-100 hover:bg-gray-200 
//     flex items-center gap-1 
//     border border-gray-300
//     shadow-sm
//     text-xs font-medium text-gray-700
//   "
// >
//   {isRephrasing ? (
//     <span className="animate-spin text-gray-600">⏳</span>
//   ) : (
//     <>✨</>
//   )}
// </button>


//   </div>

//   <p className="mt-1 text-xs text-gray-500">
//     These instructions will be provided as context for the voice agent.
//   </p>
// </div>


        

//         {/* Removed <AgentAudioPlayer /> — replaced by the round icon button */}
//       </CardContent>
//     </Card>
//   );
// }


"use client";

import { useMemo, useState, useEffect, useRef, ReactNode } from "react";

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
import { Phone, Mic, Play, Pause, Bot } from "lucide-react"; // ⬅️ added Play/Pause
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

  // Helper to get auth token
  const getAuthToken = () => {
    try {
      return localStorage.getItem('token') || '';
    } catch {
      return '';
    }
  };

  // When selected agent changes, setup audio
  useEffect(() => {
    setIsPlaying(false);
    if (!selectedAgent?.voice_sample_url) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }

    const token = getAuthToken();
    const audioUrl = selectedAgent.voice_sample_url.startsWith("gs://")
      ? `/api/recording-proxy?url=${encodeURIComponent(
          selectedAgent.voice_sample_url
        )}&agentId=${selectedAgent.id}&token=${encodeURIComponent(token)}`
      : selectedAgent.voice_sample_url;

    const a = new Audio(audioUrl);
    a.onended = () => setIsPlaying(false);
    audioRef.current = a;

    return () => {
      a.pause();
    };
  }, [selectedAgent?.voice_sample_url, selectedAgent?.id]);

  const togglePlay = async () => {
    if (!selectedAgent?.voice_sample_url) return;
    if (!audioRef.current) {
      const token = getAuthToken();
      const audioUrl = selectedAgent.voice_sample_url.startsWith("gs://")
        ? `/api/recording-proxy?url=${encodeURIComponent(
            selectedAgent.voice_sample_url
          )}&agentId=${selectedAgent.id}&token=${encodeURIComponent(token)}`
        : selectedAgent.voice_sample_url;
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

  return (
    <Card className="rounded-2xl transition-all p-6 bg-white border border-gray-100">
      <CardHeader className="backdrop-blur-xl bg-white/80 dark:bg-white/5 rounded-3xl px-6 py-5 border border-white/30 dark:border-white/10 mb-6 -mx-6 mt-0">
        <CardTitle className="text-lg font-bold text-gray-900 dark:text-gray-100">
          <Phone className="w-5 h-5 inline mr-2" /> Call Configuration
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
          Select number and voice agent
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Phone number */}
        <div className="w-full mx-0">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Phone Number
          </label>
          <Select
            value={selectedNumberId}
            onValueChange={onSelectedNumberChange}
          >
            <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
              <SelectValue placeholder="Select number" />
            </SelectTrigger>
            <SelectContent className="w-full">
              {numbers.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <div className="flex flex-col">
                      <span>{n.phone_number}</span>
                      {n.provider && (
                        <span className="text-xs text-gray-500">
                          {n.provider} • {n.type || "number"}
                        </span>
                      )}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Voice Agent + inline round play button */}
        <div className="w-full space-y-2 mx-0">
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Voice Agent
          </label>

          <div className="flex items-center gap-3">
            {/* Select */}
            <div className="flex-1">
              <Select
                value={agentId || ""}
                onValueChange={(value) => onAgentIdChange(value)}
              >
                <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                  {selectedAgent ? (
                    <div className="flex items-center gap-3 p-2 w-full">
                      <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="font-medium truncate">
                          {selectedAgent.name}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {selectedAgent.description} • {selectedAgent.accent} •{" "}
                          {selectedAgent.gender}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      No agents available
                    </span>
                  )}
                </SelectTrigger>
                <SelectContent className="w-full">
                  {agents.map((agent) => (
                    <SelectItem
                      key={agent.id}
                      value={String(agent.id)}
                      className="h-auto py-3"
                    >
                      <div className="flex items-center gap-3 w-full">
                        <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <div className="flex flex-col items-start min-w-0">
                            <span className="font-medium truncate">
                              {agent.name}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
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

            {/* Round play/pause icon button */}
            <button
              type="button"
              onClick={togglePlay}
              disabled={!selectedAgent?.voice_sample_url}
              aria-label={isPlaying ? "Pause sample" : "Play sample"}
              className={[
                "relative inline-flex items-center justify-center",
                "h-12 w-12 rounded-full shadow-xl",
                "bg-[#0f1f5a]",
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

          <p className="text-xs text-muted-foreground">
            Choose a voice agent for the call
          </p>
        </div>

        {/* Language / Accent */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
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
              <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                <SelectValue
                  placeholder={selectedAgent?.language || "Select language"}
                />
              </SelectTrigger>
              <SelectContent className="w-full">
                {Array.from(
                  new Set(agents.map((a) => a.language).filter(Boolean))
                )
                  .map((language) => {
                    const lang = languages.find((l) => {
                      const langLabel = l.label?.toLowerCase();
                      const langValue = l.value?.toLowerCase();
                      const agentLang = String(language).toLowerCase();
                      return langLabel === agentLang || langValue === agentLang;
                    });
                    const value = (lang?.id || String(language)).trim();
                    if (!value) return null;
                    const label = lang?.label || String(language);
                    return (
                      <SelectItem key={value} value={value}>
                        <span>{label}</span>
                      </SelectItem>
                    );
                  })
                  .filter(Boolean)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
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
              <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                <SelectValue
                  placeholder={selectedAgent?.accent || "Select accent"}
                />
              </SelectTrigger>
              <SelectContent className="w-full">
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
          <label className="text-sm font-medium text-gray-700 mb-1 block">
            Additional Instructions
          </label>

          <div className="relative">
            <textarea
              value={additionalInstructions}
              onChange={(e) => onAdditionalInstructionsChange(e.target.value)}
              className="w-full h-24 p-3 pr-12 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter any additional instructions for the call..."
            />

            <button
              type="button"
              title="Maya-Rephrase"
              onClick={async () => {
                if (!additionalInstructions.trim()) return;

                try {
                  setIsRephrasing(true);

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

                  const data = await res.json();
                  if (data.success) {
                    onAdditionalInstructionsChange(data.generatedText);
                  } else {
                    console.error("Gemini Error:", data.error);
                  }
                } catch (err) {
                  console.error("Rephrase Failed:", err);
                } finally {
                  setIsRephrasing(false);
                }
              }}
              className="
                absolute top-2 right-2 
                h-8 px-3 rounded-md 
                bg-gray-100 hover:bg-gray-200 
                flex items-center gap-1 
                border border-gray-300
                shadow-sm
                text-xs font-medium text-gray-700
              "
            >
              {isRephrasing ? (
                <span className="animate-spin text-gray-600">⏳</span>
              ) : (
                <>✨</>
              )}
            </button>
          </div>

          <p className="mt-1 text-xs text-gray-500">
            These instructions will be provided as context for the voice agent.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
