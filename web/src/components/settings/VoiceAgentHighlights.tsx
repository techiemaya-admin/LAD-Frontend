// components/settings/VoiceAgentHighlights.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl } from "@/lib/api-utils";
import { safeStorage } from "@/utils/storage";
import { Brain, Volume2, Mic, Sparkles } from "lucide-react";

export function VoiceAgentHighlights() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/voice-agent/settings`, {
          headers: {
            "Authorization": `Bearer ${safeStorage.getItem("auth_token")}`
          }
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {}
    }

    load();
  }, []);

  return (
    <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg font-semibold">Voice Agent Settings</CardTitle>
        </div>
        <CardDescription className="text-sm">
          Quick overview of your conversational AI configuration ✨
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">

        {!data ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* LLM */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 bg-purple-100 rounded-full">
                <Brain className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold">🤖 LLM</p>
                <p className="text-xs text-muted-foreground">
                  {data.llm.provider} → {data.llm.model}
                </p>
              </div>
            </div>

            {/* TTS */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 bg-blue-100 rounded-full">
                <Volume2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold">🗣️ TTS Voice</p>
                <p className="text-xs text-muted-foreground">
                  {data.tts.voice} ({data.tts.provider})
                </p>
              </div>
            </div>

            {/* STT */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 bg-green-100 rounded-full">
                <Mic className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold">🎤 STT Model</p>
                <p className="text-xs text-muted-foreground">
                  {data.stt.model} ({data.stt.provider})
                </p>
              </div>
            </div>

            {/* Prompt */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
              <div className="p-2 bg-yellow-100 rounded-full">
                <Sparkles className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-semibold">✨ Prompt</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {data.systemPrompt}
                </p>
              </div>
            </div>

          </div>
        )}

        {/* Footer Button */}
        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            onClick={() => window.location.href = "/settings?tab=voice"}
          >
            View more →
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
