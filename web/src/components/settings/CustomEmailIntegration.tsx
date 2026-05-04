'use client';

/**
 * Custom SMTP / IMAP integration tile.
 *
 * For self-hosted webmail (Roundcube, Snappymail, cPanel mail), Zoho, Yandex,
 * Fastmail, and any other mailbox NOT federated with Google/Microsoft. Outbound
 * (SMTP) only — IMAP inbound parity is a separate, future feature.
 *
 * Flow:
 *   1. User fills SMTP host/port/secure/user/password + From address/name.
 *   2. "Test connection" hits /custom/test (no save) → opens EHLO + AUTH.
 *   3. "Save & Connect" hits /custom/connect → tests then persists encrypted creds.
 *   4. Connected account is treated as a normal sender by EmailSenderService.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Server, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Smart defaults so the form isn't intimidating ────────────────────────────
//
// Most providers offer one of two flavours:
//   • SMTPS    on 465  (TLS handshake first — `secure: true`)
//   • STARTTLS on 587  (plain → upgraded — `secure: false`)
//
// We default to 587/false because it's the most widely supported. The user can
// flip the toggle if their provider only offers 465.
const DEFAULT_FORM = {
  host:         '',
  port:         '587',
  secure:       false,
  username:     '',
  password:     '',
  from_address: '',
  display_name: '',
};

interface CustomStatus {
  connected: boolean;
  email?: string;
  display_name?: string;
  host?: string;
  port?: number;
}

interface Props {
  /** Optional: parent passes a callback so the integrations grid can refresh
   *  the connection-status pills when this component changes state. */
  onStatusChange?: (connected: boolean) => void;
}

export const CustomEmailIntegration: React.FC<Props> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<CustomStatus>({ connected: false });
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Stash onStatusChange in a ref so `refresh` doesn't take it as a dep.
  // Without this, the parent's inline arrow `onStatusChange={...}` would be a
  // new identity each render → useCallback recomputes → useEffect re-fires →
  // setState → parent re-renders → infinite flicker loop.
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchWithTenant('/api/social-integration/email/custom/status', {
        method: 'POST',
      });
      if (r.ok) {
        const data = await r.json();
        setStatus(data);
        onStatusChangeRef.current?.(Boolean(data.connected));
      }
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []); // ← stable identity, runs once

  // Initial load — fires exactly once when the component mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  // Handle the "TLS / STARTTLS" toggle — auto-flip the port to the conventional
  // value so users don't have to remember 465 vs 587.
  const setSecure = (secure: boolean) => {
    setForm(f => ({
      ...f,
      secure,
      // Only auto-update port if the user hasn't customised it from the previous default.
      port: secure
        ? (f.port === '587' ? '465' : f.port)
        : (f.port === '465' ? '587' : f.port),
    }));
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const r = await fetchWithTenant('/api/social-integration/email/custom/test', {
        method: 'POST',
        body: JSON.stringify({
          host:     form.host,
          port:     Number(form.port),
          secure:   form.secure,
          username: form.username,
          password: form.password,
        }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setTestResult({ ok: true, message: 'Connection successful — credentials work.' });
      } else {
        setTestResult({ ok: false, message: data.error || data.message || 'Connection test failed.' });
      }
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setTestResult(null);
    try {
      const r = await fetchWithTenant('/api/social-integration/email/custom/connect', {
        method: 'POST',
        body: JSON.stringify({
          host:         form.host,
          port:         Number(form.port),
          secure:       form.secure,
          username:     form.username,
          password:     form.password,
          from_address: form.from_address || form.username,
          display_name: form.display_name,
        }),
      });
      const data = await r.json();
      if (r.ok && data.success) {
        setForm(DEFAULT_FORM);
        await refresh();
      } else {
        setError(data.message || data.error || 'Failed to save SMTP account.');
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect this SMTP account? You can reconnect anytime.')) return;
    setLoading(true);
    try {
      await fetchWithTenant('/api/social-integration/email/custom/disconnect', { method: 'POST' });
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    form.host.trim() &&
    Number(form.port) > 0 &&
    form.username.trim() &&
    form.password;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <Server className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>Custom Email (SMTP / Webmail)</CardTitle>
            <CardDescription>
              Connect any mailbox via SMTP — Roundcube, cPanel mail, Zoho, Yandex,
              Fastmail, or your own server. Use this when Google or Microsoft can&apos;t.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : status.connected ? (
          // ── Connected state ───────────────────────────────────────────────
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Connected as {status.email}</p>
                {status.display_name && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Display name: {status.display_name}
                  </p>
                )}
                {status.host && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    SMTP: {status.host}:{status.port}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          // ── Connection form ───────────────────────────────────────────────
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">SMTP host</label>
                <Input
                  placeholder="smtp.webaaps.live"
                  value={form.host}
                  onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Port</label>
                <Input
                  type="number"
                  placeholder="587"
                  value={form.port}
                  onChange={e => setForm(f => ({ ...f, port: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* TLS toggle — auto-flips port between 465 and 587 */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setSecure(!form.secure)}
                className={`px-2.5 py-1 rounded-full border transition-colors ${
                  form.secure
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-muted/50 border-border text-muted-foreground'
                }`}
              >
                {form.secure ? 'SMTPS (TLS) on 465' : 'STARTTLS on 587'}
              </button>
              <span className="text-muted-foreground">
                Click to toggle. Most providers use 587/STARTTLS.
              </span>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Username</label>
              <Input
                placeholder="sales@webaaps.live"
                value={form.username}
                onChange={e => setForm(f => ({
                  ...f,
                  username: e.target.value,
                  // Mirror to from_address if user hasn't customised it
                  from_address: f.from_address || e.target.value,
                }))}
                className="mt-1"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                If your provider supports app passwords, prefer one over your account password.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">From address (optional)</label>
                <Input
                  placeholder="Defaults to username"
                  value={form.from_address}
                  onChange={e => setForm(f => ({ ...f, from_address: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Display name (optional)</label>
                <Input
                  placeholder="WebApps Sales"
                  value={form.display_name}
                  onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Test result + error banners */}
            {testResult && (
              <div
                className={`flex items-start gap-2 text-xs rounded-lg px-3 py-2 border ${
                  testResult.ok
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {testResult.ok
                  ? <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />}
                <span>{testResult.message}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={!isFormValid || testing || saving}
              >
                {testing
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Testing…</>
                  : <><Mail className="h-3.5 w-3.5 mr-1.5" /> Test connection</>}
              </Button>
              <Button onClick={handleSave} disabled={!isFormValid || testing || saving}>
                {saving
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Saving…</>
                  : 'Save & connect'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
