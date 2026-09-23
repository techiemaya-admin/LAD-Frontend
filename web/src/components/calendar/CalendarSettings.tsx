'use client';

/**
 * Settings → Calendars.
 *
 * Two lists:
 *  1. the mailboxes you have connected, and whether Mr LAD may read their
 *     calendar yet. A mailbox connected before calendars existed can send mail
 *     but not read meetings — that is a normal state with a Reconnect button,
 *     not an error;
 *  2. the calendars he actually reads, with the window, an on/off switch,
 *     "Sync now", and whatever the last sync said.
 *
 * The OAuth connect flow is the email one (social-integration/email/<provider>),
 * re-used verbatim — the only difference is that the consent screen now also
 * asks for calendar access.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle, CalendarDays, CheckCircle2, Loader2, Mail, Plus, RefreshCw, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  useCalendarAccounts,
  useCalendarSources,
  useDeleteCalendarSource,
  useSaveCalendarSource,
  useSyncCalendarSource,
  type CalendarAccount,
  type CalendarProvider,
  type CalendarSource,
} from '@lad/frontend-features/calendar';
import { startGoogleOAuth, startMicrosoftOAuth } from '@lad/frontend-features/email-accounts';
import { UpcomingMeetings } from './UpcomingMeetings';

const PROVIDER_LABEL: Record<CalendarProvider, string> = {
  google: 'Google',
  microsoft: 'Microsoft',
  internal: 'Mr LAD',
};

/** "2 minutes ago" / "just now" — the last sync only ever needs this much precision. */
function ago(at?: string | null): string {
  if (!at) return 'never';
  const secs = Math.round((Date.now() - new Date(at).getTime()) / 1000);
  if (!Number.isFinite(secs)) return 'never';
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export const CalendarSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const accountsQ = useCalendarAccounts();
  const sourcesQ = useCalendarSources();
  const saveSource = useSaveCalendarSource();
  const deleteSource = useDeleteCalendarSource();
  const syncSource = useSyncCalendarSource();

  const [connecting, setConnecting] = useState<CalendarProvider | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  /** The provider we have just come back from re-consenting for, from the callback URL. */
  const [returnedFrom, setReturnedFrom] = useState<CalendarProvider | null>(null);
  const [busySourceId, setBusySourceId] = useState<string | null>(null);

  useEffect(() => {
    if (searchParams?.get('calendar') !== 'connected') return;
    const p = searchParams.get('provider');
    setReturnedFrom(p === 'google' || p === 'microsoft' ? p : null);
    accountsQ.refetch();
    sourcesQ.refetch();
    // Keep the tab, drop the one-shot callback params so a refresh does not re-run this.
    window.history.replaceState({}, '', `${window.location.pathname}?tab=calendars`);
    // Intentionally runs once per callback: the query objects are new on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const accounts = accountsQ.data;
  const sources = sourcesQ.data;

  const connect = async (provider: CalendarProvider) => {
    if (provider === 'internal') return;
    setConnecting(provider);
    setConnectError(null);
    try {
      const result = provider === 'google'
        ? await startGoogleOAuth('settings')
        : await startMicrosoftOAuth('settings');
      if (!result?.url) {
        setConnectError('We could not open the permission screen. Please try again.');
        return;
      }
      window.location.href = result.url;
    } catch {
      setConnectError(`We could not start the ${PROVIDER_LABEL[provider]} connection. Please try again.`);
    } finally {
      setConnecting(null);
    }
  };

  const addSource = async (account: CalendarAccount) => {
    await saveSource.mutateAsync({
      provider: account.provider,
      account_id: account.accountId,
      calendar_id: 'primary',
      label: account.email || `${PROVIDER_LABEL[account.provider]} calendar`,
      is_active: true,
      sync_window_days: 14,
    });
  };

  /** A mailbox we came back from that still cannot read its calendar. */
  const stillUngranted = useMemo(() => {
    if (!returnedFrom || !accounts) return false;
    const row = accounts.find((a) => a.provider === returnedFrom);
    return Boolean(row && !row.hasCalendarScope);
  }, [returnedFrom, accounts]);

  return (
    <div className="space-y-6">
      <Card className="dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-lg">
              <CalendarDays className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="dark:text-white">Your mailboxes</CardTitle>
              <CardDescription className="dark:text-gray-400">
                Mr LAD reads booked meetings from the calendar that belongs to a mailbox you have connected.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectError && (
            <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{connectError}</p>
          )}
          {stillUngranted && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                The calendar permission was not granted — try again and accept the calendar access request.
              </p>
            </div>
          )}

          {accountsQ.isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking your mailboxes…
            </p>
          )}

          {/* Failure is not emptiness: only say "none" when the list really came back. */}
          {!accountsQ.isLoading && accounts === undefined && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              We could not check your mailboxes just now. Reload the page to try again.
            </p>
          )}

          {accounts?.map((account) => {
            const sourceAdded = Boolean(
              account.sourceId || sources?.some((s) => s.account_id === account.accountId),
            );
            return (
              <div
                key={`${account.provider}-${account.accountId ?? account.email}`}
                className="flex flex-col gap-3 rounded-lg border border-transparent bg-gray-50 p-4 dark:border-blue-950/40 dark:bg-[#061033]/70 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gray-600 dark:text-gray-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium dark:text-white">
                      {account.email || `${PROVIDER_LABEL[account.provider]} account`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {PROVIDER_LABEL[account.provider]}
                      {account.hasCalendarScope ? ' · calendar access granted' : ''}
                    </p>
                    {!account.hasCalendarScope && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Mr LAD can send from this mailbox but cannot read its calendar yet.
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {account.hasCalendarScope ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-emerald-400" />
                      {sourceAdded ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">Added below</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addSource(account)}
                          disabled={saveSource.isPending}
                        >
                          <Plus className="mr-1.5 h-4 w-4" />
                          Read this calendar
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => connect(account.provider)}
                      disabled={connecting === account.provider}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {connecting === account.provider ? (
                        <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Opening…</>
                      ) : 'Reconnect'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {accounts?.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No mailbox is connected yet. Connect one and Mr LAD can read the meetings on its calendar.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => connect('google')} disabled={connecting !== null}>
              Connect a Google account
            </Button>
            <Button variant="outline" size="sm" onClick={() => connect('microsoft')} disabled={connecting !== null}>
              Connect a Microsoft account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="dark:bg-[#030a21]/60 dark:border-blue-950/40">
        <CardHeader>
          <CardTitle className="dark:text-white">Calendars Mr LAD reads</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Meetings on these calendars show up below and can be used in a campaign.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sourcesQ.isLoading && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your calendars…
            </p>
          )}
          {!sourcesQ.isLoading && sources === undefined && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              We could not load your calendars just now. Reload the page to try again.
            </p>
          )}
          {sources?.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No calendar has been added yet. Pick one from a mailbox above.
            </p>
          )}

          {sources?.map((source: CalendarSource) => {
            const busy = busySourceId === source.id;
            const needsReconnect = source.has_calendar_scope === false;
            return (
              <div
                key={source.id}
                className="rounded-lg border border-slate-200 p-4 dark:border-blue-950/40 dark:bg-[#061033]/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium dark:text-white">
                      {source.label || source.account_email || `${PROVIDER_LABEL[source.provider]} calendar`}
                    </p>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {PROVIDER_LABEL[source.provider]}
                      {source.account_email ? ` · ${source.account_email}` : ''}
                      {' · last checked '}
                      {ago(source.last_synced_at)}
                    </p>
                    {needsReconnect && (
                      <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                        Reconnect this mailbox above before Mr LAD can read it.
                      </p>
                    )}
                    {source.last_error && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-rose-600 dark:text-rose-400">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{source.last_error}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`active-${source.id}`}
                        checked={source.is_active}
                        onCheckedChange={(checked: boolean) =>
                          saveSource.mutate({ id: source.id, is_active: checked })
                        }
                      />
                      <Label htmlFor={`active-${source.id}`} className="text-xs dark:text-gray-300">On</Label>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setBusySourceId(source.id);
                        try { await syncSource.mutateAsync(source.id); } finally { setBusySourceId(null); }
                      }}
                      disabled={busy}
                    >
                      {busy
                        ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Syncing…</>
                        : <><RefreshCw className="mr-1.5 h-4 w-4" /> Sync now</>}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${source.label || 'calendar'}`}
                      onClick={() => deleteSource.mutate(source.id)}
                      disabled={deleteSource.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Label htmlFor={`window-${source.id}`} className="text-xs dark:text-gray-300">
                    Look ahead
                  </Label>
                  <Input
                    id={`window-${source.id}`}
                    type="number"
                    min={1}
                    max={60}
                    defaultValue={source.sync_window_days}
                    className="h-8 w-20"
                    onBlur={(e) => {
                      const days = Number(e.target.value);
                      if (!Number.isFinite(days) || days === source.sync_window_days) return;
                      saveSource.mutate({ id: source.id, sync_window_days: Math.min(60, Math.max(1, Math.round(days))) });
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <UpcomingMeetings />
    </div>
  );
};

export default CalendarSettings;
