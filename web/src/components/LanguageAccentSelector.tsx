import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ReactNode } from "react";

type Agent = {
    id: string;
    language: string;
    accent: string;
    gender: string;
    provider: string;
    description?: ReactNode;
    voice_sample_url?: string | null;
    name: string;
};

interface LanguageOption {
    id: string;
    label: string;
    value?: string;
}

interface LanguageAccentSelectorProps {
    agents: Agent[];
    languages: LanguageOption[];
    selectedLanguageId: string | undefined;
    onSelectedLanguageChange: (id: string) => void;
    selectedAccentId: string | undefined;
    onSelectedAccentChange: (id: string) => void;
    selectedAgent: Agent | undefined;
    onAgentIdChange: (id: string) => void;
}

export function LanguageAccentSelector({
    agents,
    languages,
    selectedLanguageId,
    onSelectedLanguageChange,
    selectedAccentId,
    onSelectedAccentChange,
    selectedAgent,
    onAgentIdChange,
}: LanguageAccentSelectorProps) {
    return (
        <div className="flex gap-4">
            {/* Language */}
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
                        if (agentWithLanguage) onAgentIdChange(String(agentWithLanguage.id));
                    }}
                >
                    <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                        <SelectValue placeholder={selectedAgent?.language || "Select language"} />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                        {Array.from(new Set(agents.map((a) => a.language).filter(Boolean)))
                            .map((language) => {
                                const lang = languages.find((l) => {
                                    const langLabel = l.label?.toLowerCase();
                                    const langValue = l.value?.toLowerCase();
                                    const agentLang = String(language).toLowerCase();
                                    return langLabel === agentLang || langValue === agentLang;
                                });
                                const value = (lang?.id || String(language)).trim();
                                if (!value) return null;
                                return (
                                    <SelectItem key={value} value={value}>
                                        <span>{lang?.label || String(language)}</span>
                                    </SelectItem>
                                );
                            })
                            .filter(Boolean)}
                    </SelectContent>
                </Select>
            </div>

            {/* Accent */}
            <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Accent
                </label>
                <Select
                    value={selectedAgent?.accent || selectedAccentId}
                    onValueChange={(value) => {
                        onSelectedAccentChange(value);
                        const agentWithAccent = agents.find((a) => a.accent === value);
                        if (agentWithAccent) onAgentIdChange(String(agentWithAccent.id));
                    }}
                >
                    <SelectTrigger className="h-12 rounded-[10px] border-gray-200 focus:ring-2 focus:ring-primary w-full">
                        <SelectValue placeholder={selectedAgent?.accent || "Select accent"} />
                    </SelectTrigger>
                    <SelectContent className="w-full">
                        {Array.from(
                            new Set(
                                agents
                                    .filter((agent) => {
                                        if (!selectedLanguageId) return true;
                                        const langLabel =
                                            languages.find((l) => l.id === selectedLanguageId)?.label ||
                                            selectedLanguageId;
                                        return agent.language === selectedLanguageId || agent.language === langLabel;
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
    );
}