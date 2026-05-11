import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const STORAGE_KEY = 'conversation_message_settings';

interface MessageSettingsState {
  markAsReadOnOpen: boolean;
  confirmBeforeSend: boolean;
  messageDelay: number;
}

const defaults: MessageSettingsState = {
  markAsReadOnOpen: true,
  confirmBeforeSend: false,
  messageDelay: 0,
};

// Default per-tenant inbound debounce (seconds).  Mirrors the backend default
// in chat_settings.inbound_debounce_seconds and the INBOUND_DEBOUNCE_SECONDS
// env var fallback used by the WhatsApp service.
const INBOUND_DEBOUNCE_DEFAULT = 5;
const INBOUND_DEBOUNCE_MIN = 0;
const INBOUND_DEBOUNCE_MAX = 30;

function loadSettings(): MessageSettingsState {
  if (typeof window === 'undefined') return defaults;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...defaults, ...JSON.parse(stored) } : defaults;
  } catch {
    return defaults;
  }
}

function saveSettings(settings: MessageSettingsState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function useMessageSettings() {
  const [settings, setSettings] = useState<MessageSettingsState>(defaults);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const updateSetting = useCallback(<K extends keyof MessageSettingsState>(
    key: K,
    value: MessageSettingsState[K]
  ) => {
    setSettings((prev) => {
      const updated = { ...prev, [key]: value };
      saveSettings(updated);
      return updated;
    });
  }, []);

  return { settings, updateSetting };
}

export function MessageSettings() {
  const { settings, updateSetting } = useMessageSettings();

  // Per-tenant inbound debounce — persisted server-side via the WABA
  // chat-settings API (NOT localStorage), because it controls server
  // behaviour (asyncio.sleep before AI generation), not just UI behaviour.
  const [inboundDebounce, setInboundDebounce] = useState<number>(INBOUND_DEBOUNCE_DEFAULT);
  const [debounceLoaded, setDebounceLoaded] = useState(false);
  const [debounceSaving, setDebounceSaving] = useState(false);
  const [debounceError, setDebounceError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);

  // Fetch current value when the modal first opens, so we don't hit the API
  // on every conversation page load for users who never open the menu.
  useEffect(() => {
    if (!open || debounceLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/whatsapp-conversations/chat-settings?channel=waba', {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const v = Number(data?.inbound_debounce_seconds);
        if (Number.isFinite(v)) {
          setInboundDebounce(
            Math.min(INBOUND_DEBOUNCE_MAX, Math.max(INBOUND_DEBOUNCE_MIN, Math.round(v))),
          );
        }
        setDebounceLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setDebounceError('Could not load saved value');
          setDebounceLoaded(true); // allow the slider to be used anyway
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debounceLoaded]);

  // Debounced save to avoid hammering the API while the user drags the slider.
  const persistInboundDebounce = useCallback((value: number) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setDebounceSaving(true);
      setDebounceError(null);
      try {
        const res = await fetch('/api/whatsapp-conversations/chat-settings?channel=waba', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ inbound_debounce_seconds: value }),
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(text || `HTTP ${res.status}`);
        }
      } catch (err) {
        setDebounceError(err instanceof Error ? err.message : 'Save failed');
      } finally {
        setDebounceSaving(false);
      }
    }, 400);
  }, []);

  const onInboundDebounceChange = (value: number) => {
    setInboundDebounce(value);
    persistInboundDebounce(value);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Message settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Message Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="mark-read" className="text-sm cursor-pointer">
              Mark as read on open
            </Label>
            <Switch
              id="mark-read"
              checked={settings.markAsReadOnOpen}
              onCheckedChange={(v) => updateSetting('markAsReadOnOpen', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="confirm-send" className="text-sm cursor-pointer">
              Confirm before send
            </Label>
            <Switch
              id="confirm-send"
              checked={settings.confirmBeforeSend}
              onCheckedChange={(v) => updateSetting('confirmBeforeSend', v)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-delay" className="text-sm">
              Message delay: {settings.messageDelay}s
            </Label>
            <input
              id="msg-delay"
              type="range"
              min={0}
              max={5}
              step={1}
              value={settings.messageDelay}
              onChange={(e) => updateSetting('messageDelay', Number(e.target.value))}
              className="w-full h-1.5 accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0s (instant)</span>
              <span>5s</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="inbound-debounce" className="text-sm">
              Inbound debounce: {inboundDebounce}s
              {debounceSaving && (
                <span className="ml-2 text-[10px] text-muted-foreground">saving…</span>
              )}
            </Label>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Time to wait after a customer message before generating a reply
              (helps coalesce typing bursts).
            </p>
            <input
              id="inbound-debounce"
              type="range"
              min={INBOUND_DEBOUNCE_MIN}
              max={INBOUND_DEBOUNCE_MAX}
              step={1}
              value={inboundDebounce}
              disabled={!debounceLoaded}
              onChange={(e) => onInboundDebounceChange(Number(e.target.value))}
              className="w-full h-1.5 accent-primary disabled:opacity-50"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0s (off)</span>
              <span>{INBOUND_DEBOUNCE_MAX}s</span>
            </div>
            {debounceError && (
              <p className="text-[10px] text-destructive">{debounceError}</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
