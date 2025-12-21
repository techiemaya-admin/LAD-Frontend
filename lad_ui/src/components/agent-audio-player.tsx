"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export function AgentAudioPlayer({ src }: { src?: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [src]);

  return (
    <div className="rounded-lg bg-secondary p-4">
      <audio ref={audioRef} src={src} />
      <Button
        className="bg-primary text-white"
        onClick={() => {
          const a = audioRef.current;
          if (!a) return;
          if (playing) {
            a.pause();
            setPlaying(false);
          } else {
            a.play();
            setPlaying(true);
          }
        }}
        disabled={!src}
      >
        {playing ? "Pause" : "Play"}
      </Button>
      <div className="mt-2 text-xs text-muted-foreground">{src ? "Preview the selected agent voice" : "Select an agent to preview audio"}</div>
    </div>
  );
}
