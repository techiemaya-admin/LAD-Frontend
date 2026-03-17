import { Mic, Play, Pause } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReactNode } from "react";

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

interface VoiceAgentSelectorProps {
    agents: Agent[];
    agentId: string | undefined;
    onAgentIdChange: (id: string) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    selectedAgent: Agent | undefined;
}

export function VoiceAgentSelector({
    agents,
    agentId,
    onAgentIdChange,
    isPlaying,
    onTogglePlay,
    selectedAgent,
}: VoiceAgentSelectorProps) {
    return (
        <div className="w-full mx-0">
            <label className="text-sm font-medium text-gray-700 mb-1 block">
                Voice Agent
            </label>
            <div className="flex flex-col md:flex-row md:items-start items-center gap-3">
                <div className="w-full md:flex-shrink-0 md:w-80">
                    <Select
                        value={agentId || ""}
                        onValueChange={onAgentIdChange}
                    >
                        <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full md:w-80 overflow-hidden">
                            {selectedAgent ? (
                                <div className="flex items-center gap-3 p-2 overflow-hidden">
                                    <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                    <div className="flex flex-col items-start min-w-0 overflow-hidden whitespace-nowrap">
                                        <span className="font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                                            {selectedAgent.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground overflow-hidden whitespace-nowrap text-ellipsis">
                                            {selectedAgent.description} • {selectedAgent.accent} • {selectedAgent.gender}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <span className="text-muted-foreground">No agents available</span>
                            )}
                        </SelectTrigger>
                        <SelectContent className="w-full">
                            {agents.map((agent) => (
                                <SelectItem key={agent.id} value={String(agent.id)} className="h-auto py-3">
                                    <div className="flex items-center gap-3 w-full">
                                        <Mic className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                        <div className="flex flex-col items-start min-w-0">
                                            <span className="font-medium truncate">{agent.name}</span>
                                            <span className="text-xs text-muted-foreground truncate">
                                                {agent.description} • {agent.accent} • {agent.gender}
                                            </span>
                                        </div>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Play/Pause button */}
                <button
                    type="button"
                    onClick={onTogglePlay}
                    disabled={!selectedAgent?.voice_sample_url}
                    aria-label={isPlaying ? "Pause sample" : "Play sample"}
                    className={[
                        "relative inline-flex items-center justify-center",
                        "h-12 w-12 rounded-full shadow-xl bg-[#0f1f5a]",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f1f5a]/40",
                        "md:ml-auto",
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
    );
}