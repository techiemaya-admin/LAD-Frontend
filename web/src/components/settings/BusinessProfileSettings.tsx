'use client';
/**
 * Business Profile settings tab.
 *
 * Renders all 14 (+3 optional) fields stored in
 * ai_icp_profiles.icp_data and persisted via /api/ai-playground.
 * Reads/writes through `useBusinessProfile()` so the wizard's Company step,
 * the ICP Discovery chat, and this tab all stay in sync.
 *
 * Field set + completeness math come from the shared SDK module — do not
 * duplicate that vocabulary here.
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Target, Save, CheckCircle2, AlertTriangle, Building2, MapPin, Clock, Upload } from 'lucide-react';
import {
  useBusinessProfile,
  uploadCompanyLogo,
  BUSINESS_PROFILE_COMPANY_HALF,
  BUSINESS_PROFILE_ICP_HALF,
  BUSINESS_PROFILE_OFFER_HALF,
  BUSINESS_PROFILE_OPTIONAL_FIELDS,
  computeOfferCompleteness,
  type BusinessProfile,
} from '@lad/frontend-features/ai-icp-assistant';
import { useBusinessHours, useUpdateBusinessHours } from '@lad/frontend-features/settings';
import type { BusinessHoursPayload, BusinessHoursRecord } from '@lad/frontend-features/settings';
import { selectSettings, setCompanyLogo, setCompanyLocation } from '@/store/slices/settingsSlice';
import { BusinessHoursModal } from './BusinessHoursModal';

// ── Business-hours summary (display only; the modal computes its own on save) ──
const BH_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
function bhSummary(bh: BusinessHoursRecord | BusinessHoursPayload | null | undefined): string | null {
  if (!bh || !bh.startTime) return null;
  const fmt = (v: string) => {
    const [h, m] = (v || '').split(':').map(Number);
    return `${(h % 12) || 12}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
  };
  const sorted = [...(bh.activeDays || [])].sort((a, b) => a - b);
  let days = sorted.map((i) => BH_DAY_LABELS[i]).join(', ') || 'No days';
  if (sorted.length === 7) days = 'All days';
  else if (JSON.stringify(sorted) === JSON.stringify([0, 1, 2, 3, 4])) days = 'Mon–Fri';
  else if (JSON.stringify(sorted) === JSON.stringify([5, 6])) days = 'Sat–Sun';
  return `${fmt(bh.startTime)} – ${fmt(bh.endTime)} · ${days} · ${bh.timezone}`;
}

type Key = keyof BusinessProfile;

interface FieldSpec {
  key: Key;
  label: string;
  hint?: string;
  multiline?: boolean;
  placeholder?: string;
}

// Field copy for every key the form surfaces. Kept here (not in the SDK)
// because labels are app-facing UI copy, not contract data.
const FIELD_COPY: Record<string, { label: string; hint?: string; multiline?: boolean; placeholder?: string }> = {
  companyName:        { label: 'Company name',         placeholder: 'Acme Inc.' },
  industry:           { label: 'Industry',             hint: 'Comma-separate if you serve multiple.', placeholder: 'B2B SaaS, Healthtech' },
  website:            { label: 'Website',              placeholder: 'https://acme.com' },
  valueProposition:   { label: 'Value proposition',    multiline: true,  placeholder: 'AI sales assistant for outbound teams in MENA.' },
  productsServices:   { label: 'Products & services',  multiline: true,  hint: 'What the prospect actually buys.' },
  targetCustomers:    { label: 'Target customers',     multiline: true,  hint: 'Plain language — the chat dives deeper.' },
  contactEmail:       { label: 'Contact email',        hint: 'Shared by the agent when a prospect asks how to reach you.', placeholder: 'you@company.com' },
  contactPhone:       { label: 'Contact phone',        hint: 'Shared by the agent when a prospect asks how to reach you.', placeholder: '+971 50 123 4567' },
  personaName:        { label: 'Agent speaks as',       hint: 'The name the LinkedIn agent messages prospects as.', placeholder: 'e.g. Sneha' },
  personaTitle:       { label: 'Your title / role',     hint: 'How you introduce yourself.', placeholder: 'e.g. Founder' },
  bookingLink:        { label: 'Booking / calendar link', hint: 'Offered when a prospect is ready for a call.', placeholder: 'https://cal.com/you/intro' },

  companyDescription: { label: 'Company description',  multiline: true },
  icpJobTitles:       { label: 'Job titles',           hint: 'Comma-separate, partial matches OK.', placeholder: 'Head of Growth, VP Sales' },
  icpCompanySize:     { label: 'Company size',         hint: 'Headcount or revenue range.', placeholder: '50–250 employees' },
  icpLocations:       { label: 'Locations',            hint: 'Where your buyers are based.', placeholder: 'UAE, Saudi Arabia' },
  icpPainPoints:      { label: 'Pain points',          multiline: true,  hint: 'What you solve, in their language.' },
  sampleConversation: { label: 'Sample conversation',  multiline: true,  hint: 'Optional — a real conversation that worked.' },
  operatingHours:     { label: 'Operating hours',      placeholder: '09:00 – 18:00' },
  timezone:           { label: 'Timezone',             placeholder: 'GST+4' },
  geographicFocus:    { label: 'Geographic focus',     placeholder: 'GCC, MENA' },
  competitors:        { label: 'Competitors',          hint: 'Optional — names help the AI position you.' },
  campaignTone:       { label: 'Campaign tone',        placeholder: 'Friendly, direct, low-jargon' },

  // Offer half — grounding for generated landing pages and lead reports.
  icpSegments:        { label: 'Buyer segments',       multiline: true, hint: 'The 2–4 distinct types of buyer you sell to, one per line.', placeholder: 'Owner-led firm, 20–80 staff — you are the whole sales team\nGrowing operator, 80–300 staff — one or two people carrying a target' },
  costOfInaction:     { label: 'Cost of doing nothing', multiline: true, hint: 'What actually goes wrong for a client who leaves this another year.' },
  discoveryQuestions: { label: 'Discovery questions',  multiline: true, hint: 'The questions you ask on a first call, one per line. Used to let readers diagnose themselves.' },
  deliveryProcess:    { label: 'What happens after they sign', multiline: true, hint: 'The first three or four steps, and roughly how long each takes.' },
  proofPoints:        { label: 'Evidenced results',    multiline: true, hint: 'The only place a number on a generated page can come from. Only figures you could defend if challenged — leave blank rather than estimate, and pages will carry no numbers.', placeholder: '40% reply rate across 2,000 prospects in the last 30 days' },
  notAGoodFit:        { label: 'Who is not a good fit', multiline: true, hint: 'The clients you turn away. Stating it plainly reads as confidence.' },
  commonObjections:   { label: 'Common objections',    multiline: true, hint: 'What you hear most often, and your answer. One per line.' },
  differentiators:    { label: 'Why buyers pick you',  multiline: true, hint: 'What you can say that a competitor honestly cannot.' },
  guarantee:          { label: 'Guarantee / risk reversal', multiline: true, hint: 'Any trial, pilot or guarantee that lowers the risk of saying yes. Leave blank if none.' },
};

const SECTIONS: { title: string; subtitle: string; keys: ReadonlyArray<Key> }[] = [
  {
    title: 'Company',
    subtitle: "Who you are. The wizard's Company step writes these.",
    keys: BUSINESS_PROFILE_COMPANY_HALF.filter((k) => !BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k)),
  },
  {
    title: 'Ideal Customer',
    subtitle: 'Who you sell to. The ICP chat writes these.',
    keys: BUSINESS_PROFILE_ICP_HALF.filter((k) => !BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k)),
  },
  {
    title: 'Optional',
    subtitle: 'Not required for the core flow, but help the AI personalise.',
    keys: [
      ...BUSINESS_PROFILE_COMPANY_HALF.filter((k) => BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k)),
      ...BUSINESS_PROFILE_ICP_HALF.filter((k) => BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k)),
    ],
  },
  {
    title: 'Offer',
    subtitle:
      'Only needed if you generate landing pages or client reports. Each answer adds a section to those pages; anything left blank is simply left out. Counted separately from the profile above.',
    keys: BUSINESS_PROFILE_OFFER_HALF,
  },
];

export const BusinessProfileSettings: React.FC = () => {
  const { profile, loading, saving, save, error, completeness } = useBusinessProfile();
  const [form, setForm] = useState<Partial<BusinessProfile>>({});
  const [hydrated, setHydrated] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // ── Company basics (merged in from the former Company tab) ────────────────
  // Logo + location are DB-backed through the same `icp_data` blob as the rest
  // of the profile (as `companyLogoUrl` / `companyLocation`, both outside the
  // canonical field list so they don't move the "X / 14" denominator).
  // Business hours persist separately via the settings API.
  //
  // Both used to live in Redux/localStorage only: the logo was a blob URL that
  // died with the tab and the location never left the browser.
  // The Redux dispatches are kept so the header avatar and any other consumer
  // of `settings` update immediately — Redux is now a mirror, not the store.
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const { data: savedBH } = useBusinessHours();
  const updateBH = useUpdateBusinessHours();
  const [hoursOpen, setHoursOpen] = useState(false);
  // useUpdateBusinessHours already supports onError — nothing previously wired
  // it up, so a failed save left the modal open with no feedback at all: no
  // toast, no banner, the button just sat there. A user had no way to tell a
  // failed save from a slow one.
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [locationSavedAt, setLocationSavedAt] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Seed from the server profile once loaded, falling back to whatever Redux
  // still holds from a pre-fix session so nothing visibly disappears.
  useEffect(() => {
    if (loading) return;
    const stored = typeof profile.companyLocation === 'string' ? profile.companyLocation : '';
    setLocation(stored || settings.companyLocation || '');
    if (typeof profile.companyLogoUrl === 'string' && profile.companyLogoUrl) {
      dispatch(setCompanyLogo(profile.companyLogoUrl));
    }
  }, [loading, profile.companyLocation, profile.companyLogoUrl, settings.companyLocation, dispatch]);

  const onLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failure
    if (!file) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const url = await uploadCompanyLogo(file);
      // The endpoint already merged companyLogoUrl into icp_data; mirror it
      // locally so the avatar and the next save() both see the new value.
      dispatch(setCompanyLogo(url));
      await save({ companyLogoUrl: url });
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLogoUploading(false);
    }
  };

  const saveLocation = async () => {
    dispatch(setCompanyLocation(location));
    try {
      await save({ companyLocation: location });
      setLocationSavedAt(Date.now());
    } catch {
      /* error surfaces via the hook's `error` in the footer */
    }
  };

  useEffect(() => {
    if (!loading && !hydrated) {
      // Seed from the loaded profile, but only for the keys this form renders.
      // Non-canonical extras like `linkedinAudit` stay in `profile` and survive
      // the round-trip because `save()` merges into the latest profile state.
      const next: Partial<BusinessProfile> = {};
      for (const section of SECTIONS) {
        for (const k of section.keys) {
          const v = (profile as Record<string, unknown>)[k as string];
          next[k] = typeof v === 'string' ? (v as string) : '';
        }
      }
      setForm(next);
      setHydrated(true);
    }
  }, [loading, hydrated, profile]);

  // Live off the form, not the saved profile, so the count moves as they type.
  const offerCompleteness = computeOfferCompleteness(form as BusinessProfile);

  const setField = (k: Key, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (saving) return;
    try {
      await save(form);
      setSavedAt(Date.now());
    } catch {
      /* error surfaces via the hook */
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1957] dark:border-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
      <div className="hidden md:block bg-white dark:bg-[#071131] rounded-lg shadow-sm border border-gray-200 dark:border-blue-950/40 p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl grid place-items-center bg-[#e8ebf7] dark:bg-[#0b1739] border dark:border-blue-900/40">
            <Target className="w-5 h-5 text-[#0B1957] dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-gray-900 dark:text-slate-100 text-xl font-semibold">Business Profile</h2>
            <p className="text-gray-600 dark:text-slate-300 text-sm mt-1">
              The 14 fields that power ICP Discovery, lead scoring, and message personalisation.
              The wizard fills these in; edit anything here whenever your positioning changes.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 dark:text-slate-300 font-medium">Profile completeness</div>
            <div
              className={`text-lg font-bold ${
                completeness.pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0B1957] dark:text-blue-400'
              }`}
            >
              {completeness.pct}% ({completeness.filled}/{completeness.total})
            </div>
          </div>
        </div>
        <div className="mt-4 h-1.5 rounded-full bg-gray-100 dark:bg-[#0b1739] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${completeness.pct}%`,
              background:
                completeness.pct >= 70
                  ? 'linear-gradient(90deg,#10b981,#059669)'
                  : 'linear-gradient(90deg,#0b1957,#2563eb)',
            }}
          />
        </div>
      </div>

      {/* ── MOBILE VERSION (Matches the screenshot exactly) ── */}
      <div className="block md:hidden bg-white dark:bg-[#071131] rounded-2xl border border-slate-100 dark:border-blue-950/40 p-4 shadow-sm flex flex-col gap-4">
        <div className="flex flex-row items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#0b1739] border border-slate-100 dark:border-blue-900/40 flex items-center justify-center shadow-sm shrink-0">
            <Target className="w-5 h-5 text-[#0B1957] dark:text-blue-400 stroke-[2]" />
          </div>
          <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Business Profile
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded border border-transparent dark:border-slate-800/40">
          Configuration Mode
        </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed mt-1">
              The 14 fields that power ICP Discovery, lead scoring, and outbound message personalization. The strategic AI wizard references these inputs directly; updates apply globally.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-900/80 dark:border-blue-950/40 bg-white dark:bg-[#0b1739]/50 space-y-2.5">
          <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
        Profile Completeness
      </span>
            <span className={`text-xs font-bold text-blue-600 dark:text-blue-400 font-mono tracking-tight ${
              completeness.pct >= 70 ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0B1957] dark:text-blue-400'
            }`}>

        {completeness.pct}% ({completeness.filled}/{completeness.total})
      </span>
          </div>

          {/* Progress Bar Track */}
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#0b1739] overflow-hidden border border-transparent dark:border-slate-950">
            <div
              className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-blue-950/40 via-[#0B1957] to-[#2563eb]"
              style={{ width: `${completeness.pct}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-400 dark:text-slate-300">
            <span className="w-3.5 h-3.5 rounded-full border border-blue-500 text-blue-500 flex items-center justify-center text-[9px] font-bold shrink-0">!</span>
            <span>{completeness.total - completeness.filled} metrics need completion for 100% target match</span>
          </div>
        </div>
      </div>
    </div>
      {/* Company basics — merged in from the former Company tab. Operational
          fields (logo, location, hours) that aren't part of the 14-field ICP. */}
      <div className="bg-white dark:bg-[#071131] rounded-lg shadow-sm border border-gray-200 dark:border-blue-950/40 p-6">
        <h3 className="text-gray-900 dark:text-slate-100 text-base font-semibold flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#0B1957] dark:text-blue-400" />
          Company basics
        </h3>
        <p className="text-gray-500 dark:text-slate-300 text-xs mt-0.5 mb-4">Logo, location, and operating hours.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-50 dark:bg-[#0b1739] border border-gray-200 dark:border-blue-900/40 grid place-items-center flex-shrink-0">
              {settings.companyLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.companyLogo} alt="Company logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-6 h-6 text-gray-300 dark:text-slate-600" />
              )}
            </div>
            <div>
              <span className="text-[12px] font-semibold text-[#172560] dark:text-slate-200 block mb-1.5">Company logo</span>
              <label
                className={`inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-slate-200 dark:border-blue-900/40 text-[12px] font-medium text-[#0B1957] dark:text-blue-400 transition ${
                  logoUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[#0b1739]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {logoUploading ? 'Uploading…' : 'Upload'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={logoUploading}
                  onChange={onLogoPick}
                />
              </label>
              <span className="block text-[11px] text-slate-400 dark:text-slate-500 mt-1">PNG or JPG, up to 2MB.</span>
              {logoError && (
                <span className="block text-[11px] text-red-600 dark:text-red-400 mt-0.5">{logoError}</span>
              )}
            </div>
          </div>

          {/* Location */}
          <label className="flex flex-col">
            <span className="text-[12px] font-semibold text-[#172560] dark:text-slate-200 inline-flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#0B1957] dark:text-blue-400" /> Company location
            </span>
            <span className="block text-[11.5px] text-slate-500 dark:text-slate-300 mt-0.5">Where your business is based.</span>
            <div className="mt-auto pt-1.5 flex gap-2">
              <input
                type="text"
                value={location}
                placeholder="Dubai, UAE"
                onChange={(e) => { setLocation(e.target.value); setLocationSavedAt(null); }}
                className="flex-1 h-10 px-3 rounded-lg border border-slate-200 dark:border-blue-900/40 bg-white dark:bg-slate-800/50 text-[13px] text-[#172560] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
              />
              <button
                onClick={saveLocation}
                className="h-10 px-3 rounded-lg text-[12px] font-semibold text-white bg-[#0B1957] dark:bg-blue-600 hover:opacity-95 transition"
              >
                {locationSavedAt ? 'Saved' : 'Save'}
              </button>
            </div>
          </label>

          {/* Business hours — DB-backed via the settings API; edited in the modal */}
          <div className="sm:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 dark:border-blue-900/40 dark:bg-[#0b1739]/40 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0 bg-[#e8ebf7] dark:bg-[#0b1739] border dark:border-blue-900/30">
                <Clock className="w-4 h-4 text-[#0B1957] dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-[#172560] dark:text-slate-200">Business hours</div>
                <div className="text-[12px] text-slate-500 dark:text-slate-300 truncate">{bhSummary(savedBH) || 'Not set'}</div>
              </div>
            </div>
            <button
              onClick={() => { setHoursError(null); setHoursOpen(true); }}
              className="h-9 px-3 rounded-lg text-[12px] font-semibold text-[#0B1957] dark:text-blue-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap transition"
            >
              {savedBH ? 'Edit' : 'Set hours'}
            </button>
          </div>
        </div>
      </div>

      {/* Sections */}
      {SECTIONS.map((section) => (
        <div key={section.title} className="bg-white dark:bg-[#071131] rounded-lg shadow-sm border border-gray-200 dark:border-blue-950/40 p-6">
          <h3 className="text-gray-900 dark:text-slate-100 text-base font-semibold inline-flex items-center gap-2">
            {section.title}
            {/* Offer carries its own denominator. Folding it into the headline
                "X / 14" would mark every existing tenant incomplete overnight
                for fields they may never need. */}
            {section.title === 'Offer' && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {offerCompleteness.filled} / {offerCompleteness.total}
              </span>
            )}
          </h3>
          <p className="text-gray-500 dark:text-slate-300 text-xs mt-0.5 mb-4">{section.subtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.keys.map((k) => {
              const copy: FieldSpec = { key: k, ...FIELD_COPY[k as string] } as FieldSpec;
              const value = typeof form[k] === 'string' ? (form[k] as string) : '';
              const isOptional = BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k);
              return (
                <label key={k as string} className={`flex flex-col h-full ${copy.multiline ? 'sm:col-span-2' : ''}`}>
                  <span className="text-[12px] font-semibold text-[#172560] dark:text-slate-200 inline-flex items-center gap-1.5">
                    {copy.label}
                    {isOptional && (
                      <span className="text-[10px] uppercase tracking-wide font-medium text-gray-400 dark:text-slate-300">
                        optional
                      </span>
                    )}
                  </span>
                  {copy.hint && (
                    <span className="block text-[11.5px] text-slate-500 dark:text-slate-300 mt-0.5">{copy.hint}</span>
                  )}
                  {/* mt-auto pins the control to the bottom of the (stretched) grid
                      cell so paired inputs line up even when one field has a hint
                      line and the other doesn't. */}
                  <div className="mt-auto pt-1.5">
                    {copy.multiline ? (
                      <textarea
                        rows={3}
                        value={value}
                        placeholder={copy.placeholder}
                        onChange={(e) => setField(k, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-blue-900/40 bg-white dark:bg-slate-800/50 text-[13px] text-[#172560] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        placeholder={copy.placeholder}
                        onChange={(e) => setField(k, e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-blue-900/40 bg-white dark:bg-slate-800/50 text-[13px] text-[#172560] dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50"
                      />
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Footer: status + save */}
      <div className="bg-white dark:bg-[#071131] rounded-lg shadow-sm border border-gray-200 dark:border-blue-950/40 p-4 flex items-center justify-between">
        <div className="text-sm">
          {error ? (
            <span className="text-red-600 dark:text-red-400 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" />
              Couldn&apos;t save: {error.message}
            </span>
          ) : savedAt ? (
            <span className="text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Saved.
            </span>
          ) : (
            <span className="text-gray-500 dark:text-slate-300">Changes are saved when you click Save.</span>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="h-10 px-4 rounded-lg text-[13px] font-semibold text-white inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed bg-[#0B1957] dark:bg-blue-600"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Business-hours editor (reused from the former Company tab) */}
      {hoursOpen && (
        <BusinessHoursModal
          initialData={
            savedBH
              ? {
                  startTime: savedBH.startTime,
                  endTime: savedBH.endTime,
                  timezone: savedBH.timezone,
                  activeDays: savedBH.activeDays,
                }
              : undefined
          }
          onSave={(payload: BusinessHoursPayload) => {
            setHoursError(null);
            updateBH.mutate(payload, {
              onSuccess: () => setHoursOpen(false),
              onError: (err) => setHoursError(err?.message || 'Could not save business hours. Please try again.'),
            });
          }}
          saving={updateBH.isPending}
          error={hoursError}
          onClose={() => setHoursOpen(false)}
        />
      )}
    </div>
  );
};

export default BusinessProfileSettings;
