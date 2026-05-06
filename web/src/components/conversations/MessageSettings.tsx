import { useState, useEffect, useCallback } from 'react';
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Message settings">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 text-blue-600 border border-blue-100 shadow-sm flex items-center justify-center w-10 h-10">
              <Settings className="h-5 w-5" />
            </div>
            <DialogTitle>Message Settings</DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="mark-read" className="text-sm font-medium cursor-pointer">
              Mark as read on open
            </Label>
            <Switch
              id="mark-read"
              checked={settings.markAsReadOnOpen}
              onCheckedChange={(v) => updateSetting('markAsReadOnOpen', v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="confirm-send" className="text-sm font-medium cursor-pointer">
              Confirm before send
            </Label>
            <Switch
              id="confirm-send"
              checked={settings.confirmBeforeSend}
              onCheckedChange={(v) => updateSetting('confirmBeforeSend', v)}
            />
          </div>

          <div className="space-y-3">
            <Label htmlFor="msg-delay" className="text-sm font-medium">
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
              className="w-full h-1.5 accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <span>0s (instant)</span>
              <span>5s</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
