'use client';
/**
 * Microsoft Bookings configuration wizard.
 *
 * React port of VOAG's server-rendered `api/templates/booking_wizard.html`, which
 * ran as a post-OAuth redirect step. LAD_backend's callback goes straight back to
 * /settings, so the picker lives here instead - same three steps, same auto-select
 * and auto-advance behaviour, same save payload.
 *
 * The API layer was already migrated (routes + proxy routes + SDK hooks); this is
 * the only piece that was missing.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Building2, Calendar, CheckCircle, ChevronLeft, Loader2, Users, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useMsBookingBusinesses,
  useMsBookingServices,
  useMsBookingStaff,
  useSaveMsBookingConfig,
} from '@lad/frontend-features/email-accounts';
import type {
  MsBookingBusiness,
  MsBookingService,
  MsBookingStaff,
} from '@lad/frontend-features/email-accounts';

type Step = 1 | 2 | 3;

interface Picked {
  id: string;
  name: string;
}

interface MicrosoftBookingWizardProps {
  /** Called after the config is saved, so the parent can refetch status. */
  onSaved: () => void;
  /** Called when the user dismisses the wizard without saving. */
  onSkip: () => void;
}

const STEPS: { step: Step; label: string; icon: React.ElementType }[] = [
  { step: 1, label: 'Booking page', icon: Building2 },
  { step: 2, label: 'Service',      icon: Calendar },
  { step: 3, label: 'Staff',        icon: Users },
];

export const MicrosoftBookingWizard: React.FC<MicrosoftBookingWizardProps> = ({ onSaved, onSkip }) => {
  const [step,     setStep]     = useState<Step>(1);
  const [business, setBusiness] = useState<Picked | null>(null);
  const [service,  setService]  = useState<Picked | null>(null);
  const [staff,    setStaff]    = useState<Picked | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const businessesQ = useMsBookingBusinesses(true);
  const servicesQ   = useMsBookingServices(business?.id ?? '', !!business);
  const staffQ      = useMsBookingStaff(business?.id ?? '', !!business && step === 3);

  const { saveConfig, isSaving } = useSaveMsBookingConfig();

  // One-shot guards so the auto-select effects can't re-fire and fight the user
  // if they navigate back to an earlier step.
  const autoBusiness = useRef(false);
  const autoService  = useRef(false);
  const autoStaff    = useRef(false);

  const save = useCallback(
    async (chosenStaff: Picked | null) => {
      if (!business) return;
      setSaveError(null);
      try {
        await saveConfig.mutateAsync({
          business_id:     business.id,
          business_name:   business.name,
          // Backend auto-detects anything omitted, so only send real selections.
          ...(service     ? { service_id: service.id }             : {}),
          ...(chosenStaff ? { staff_member_id: chosenStaff.id }    : {}),
        });
        onSaved();
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save booking configuration');
      }
    },
    [business, service, saveConfig, onSaved],
  );

  // Step 1 → auto-select and advance when there is exactly one booking page.
  useEffect(() => {
    if (step !== 1 || businessesQ.isPending || autoBusiness.current) return;
    if (businessesQ.businesses.length === 1) {
      const only = businessesQ.businesses[0];
      autoBusiness.current = true;
      setBusiness({ id: only.id, name: only.displayName });
      setStep(2);
    }
  }, [step, businessesQ.isPending, businessesQ.businesses]);

  // Step 2 → auto-select and advance when the business exposes one service.
  useEffect(() => {
    if (step !== 2 || servicesQ.isPending || autoService.current) return;
    if (servicesQ.services.length === 1) {
      const only = servicesQ.services[0];
      autoService.current = true;
      setService({ id: only.id, name: only.displayName });
      setStep(3);
    }
  }, [step, servicesQ.isPending, servicesQ.services]);

  // Step 3 → a single staff member means everything is resolved: save immediately.
  useEffect(() => {
    if (step !== 3 || staffQ.isPending || autoStaff.current) return;
    if (staffQ.staff.length === 1) {
      const only = staffQ.staff[0];
      autoStaff.current = true;
      const picked = { id: only.id, name: only.displayName };
      setStaff(picked);
      void save(picked);
    }
  }, [step, staffQ.isPending, staffQ.staff, save]);

  const activeQuery =
    step === 1 ? businessesQ : step === 2 ? servicesQ : staffQ;

  // A booking page can legitimately expose no services and no bookable staff.
  // Without these escapes the user dead-ends on an empty list with Next disabled
  // and no way forward. The backend fills in whatever we omit via
  // autoDetectBookingConfig, so saving a business alone is valid.
  // isPending, not isLoading: a query that failed and had its retry paused (offline,
  // backend unreachable) sits at status=pending/fetchStatus=paused, where isLoading
  // AND isError are both false and data is undefined. Keying off isLoading would
  // render that as "no services found" and tell the user to go create one.
  const serviceOptional = step === 2 && !servicesQ.isPending && servicesQ.services.length === 0;
  const staffOptional   = step === 3 && !staffQ.isPending   && staffQ.staff.length === 0;

  const goBack = () => {
    setSaveError(null);
    if (step === 3) {
      setStaff(null);
      setStep(2);
    } else if (step === 2) {
      setService(null);
      setStep(1);
    }
  };

  // Must mirror `canAdvance` exactly - if Next is enabled but this refuses to
  // move, the button silently does nothing.
  const goNext = () => {
    if (step === 1 && business) setStep(2);
    else if (step === 2 && (service || serviceOptional)) setStep(3);
  };
  const canAdvance =
    (step === 1 && !!business) ||
    (step === 2 && (!!service || serviceOptional)) ||
    (step === 3 && (!!staff || staffOptional));

  const renderOptions = () => {
    // Covers first load, retries, and retries paused while the backend is
    // unreachable - none of which should ever look like an empty result.
    if (activeQuery.isPending) {
      return (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      );
    }

    if (activeQuery.isError) {
      return (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-medium">Couldn&apos;t load this step</p>
            <p className="mt-0.5 text-xs opacity-90">{activeQuery.error?.message}</p>
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => activeQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      );
    }

    if (step === 1) {
      if (businessesQ.businesses.length === 0) {
        return (
          <EmptyState message="No booking pages found. Set up Microsoft Bookings first, then reconnect." />
        );
      }
      return businessesQ.businesses.map((b: MsBookingBusiness) => (
        <OptionRow
          key={b.id}
          title={b.displayName}
          subtitle={b.email ?? b.webSiteUrl ?? undefined}
          selected={business?.id === b.id}
          onSelect={() => setBusiness({ id: b.id, name: b.displayName })}
        />
      ));
    }

    if (step === 2) {
      if (servicesQ.services.length === 0) {
        return (
          <EmptyState message="No services on this booking page. Continue and we'll detect one automatically." />
        );
      }
      return servicesQ.services.map((s: MsBookingService) => (
        <OptionRow
          key={s.id}
          title={s.displayName}
          subtitle={s.defaultDuration ? formatDuration(s.defaultDuration) : undefined}
          selected={service?.id === s.id}
          onSelect={() => setService({ id: s.id, name: s.displayName })}
        />
      ));
    }

    if (staffQ.staff.length === 0) {
      return <EmptyState message="No staff members on this booking page. You can save without one." />;
    }
    return staffQ.staff.map((m: MsBookingStaff) => (
      <OptionRow
        key={m.id}
        title={m.displayName}
        subtitle={m.role ?? m.email ?? undefined}
        selected={staff?.id === m.id}
        onSelect={() => setStaff({ id: m.id, name: m.displayName })}
      />
    ));
  };

  return (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#00051d]/40 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-800 dark:text-white">Choose your booking page</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          The agent books appointments against this Microsoft Bookings page.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map(({ step: s, label, icon: Icon }, i) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                s === step
                  ? 'text-blue-600 dark:text-blue-400'
                  : s < step
                    ? 'text-slate-500 dark:text-slate-400'
                    : 'text-slate-300 dark:text-slate-600'
              }`}
            >
              {s < step ? <CheckCircle className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />}
          </React.Fragment>
        ))}
      </div>

      <div className="space-y-2">{renderOptions()}</div>

      {saveError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {step > 1 && (
          <Button type="button" variant="outline" size="sm" onClick={goBack} disabled={isSaving}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button type="button" variant="ghost" size="sm" onClick={onSkip} disabled={isSaving}>
          Skip for now
        </Button>
        {step < 3 ? (
          <Button type="button" size="sm" onClick={goNext} disabled={!canAdvance}>
            Next
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={() => void save(staff)} disabled={!canAdvance || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save'
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

const OptionRow: React.FC<{
  title: string;
  subtitle?: string;
  selected: boolean;
  onSelect: () => void;
}> = ({ title, subtitle, selected, onSelect }) => (
  <button
    type="button"
    onClick={onSelect}
    aria-pressed={selected}
    className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors ${
      selected
        ? 'border-blue-500 bg-blue-50 dark:border-blue-500 dark:bg-blue-950/40'
        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#000724] dark:hover:border-slate-700'
    }`}
  >
    <span className="min-w-0">
      <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">{title}</span>
      {subtitle && (
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</span>
      )}
    </span>
    {selected && <CheckCircle className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />}
  </button>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <p className="rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
    {message}
  </p>
);

/** Graph returns ISO-8601 durations like "PT30M" / "PT1H30M". */
function formatDuration(iso: string): string {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?$/.exec(iso);
  if (!match) return iso;
  const [, h, m] = match;
  const parts: string[] = [];
  if (h) parts.push(`${h} hr`);
  if (m) parts.push(`${m} min`);
  return parts.length ? parts.join(' ') : iso;
}
