import { useState, useEffect, useRef } from "react";

type Agent = {
    id: string;
    voice_sample_url?: string | null;
};

export function useAudioPreview(selectedAgent: Agent | undefined) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [signedSampleUrl, setSignedSampleUrl] = useState<string | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const signedSampleUrlCache = useRef<Map<string, string>>(new Map());

    // Fetch token from /api/token endpoint
    useEffect(() => {
        fetch('/api/token', { credentials: 'include' })
            .then(r => r.json())
            .then(d => setToken(d.token ?? null))
            .catch(() => setToken(null));
    }, []);

    const getAgentSampleUrl = (agent: Agent | undefined): string | null => {
        if (!agent?.voice_sample_url) return null;
        if (signedSampleUrl) return signedSampleUrl;
        if (!agent.voice_sample_url.startsWith('gs://')) return agent.voice_sample_url;

        return `/api/recording-proxy?url=${encodeURIComponent(
            agent.voice_sample_url
        )}&agentId=${encodeURIComponent(String(agent.id))}&token=${encodeURIComponent(token ?? '')}`;
    };

    // When agent changes, reset signed URL
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
                // VAPI DISABLED
                if (!cancelled) setSignedSampleUrl(null);
            } catch (e) {
                if (!cancelled) setSignedSampleUrl(null);
            }
        })();

        return () => { cancelled = true; };
    }, [selectedAgent?.id]);

    // Setup audio when agent or url changes
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

        return () => { a.pause(); };
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

    return { isPlaying, togglePlay };
}