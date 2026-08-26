'use client';

/**
 * FollowupTouchesEditor
 * =====================
 * The cadence editor for the LinkedIn post-acceptance follow-up sequence.
 * One entry = one follow-up ("touch"): when it fires, and what it sends.
 *
 * Used at two scopes, with the SAME touch model on the wire:
 *   • tenant   - Settings → Chat → LinkedIn ("Follow-up Cadence")
 *   • campaign - Scheduled Follow-ups modal, per campaign (overrides the tenant)
 *
 * Controlled component: the parent owns `touches` and persists them. All state
 * here is transient UI (which row opened the create-template modal).
 */

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import CreateLinkedInTemplateModal from '@/components/templates/CreateLinkedInTemplateModal';
import { useLinkedInMessageTemplates } from '@lad/frontend-features/campaigns';
import type { LinkedInMessageTemplate } from '@lad/frontend-features/campaigns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * A null template_id + null touch_type means "AI-generated" (the historical
 * behaviour). A template id sends that template's body + media. A touch_type is
 * a structured mode, mutually exclusive with a template.
 */
export type FollowupTouch = {
  hours: number;
  template_id: string | null;
  touch_type?: 'industry_trend' | 'company_page_post' | null;
  /** Only set for touch_type 'company_page_post' - the page posts are shared from. */
  company_page_url?: string | null;
};

/** Backend default when neither campaign nor tenant configures a cadence. */
export const DEFAULT_FOLLOWUP_TOUCH_HOURS = [24, 72, 168, 336];
/** Matches MAX_TOUCHES in the backend validator (utils/followupTouches). */
export const MAX_FOLLOWUP_TOUCHES = 10;

export const defaultFollowupTouches = (): FollowupTouch[] =>
  DEFAULT_FOLLOWUP_TOUCH_HOURS.map((h) => ({ hours: h, template_id: null }));

/**
 * Read a cadence out of an API payload: the per-touch model wins, a legacy
 * `schedule_hours` array maps to AI-generated touches. Returns [] when neither is
 * present so callers can distinguish "nothing configured" from a real cadence
 * (the tenant editor substitutes the default; the campaign editor shows
 * "inheriting").
 */
export function touchesFromApi(data: any): FollowupTouch[] {
  if (Array.isArray(data?.touches) && data.touches.length > 0) {
    return data.touches
      .map((t: any) => ({
        hours: Number(t?.hours) || 0,
        template_id: t?.template_id || null,
        touch_type: t?.touch_type || null,
        company_page_url: t?.company_page_url || null,
      }))
      .filter((t: FollowupTouch) => t.hours > 0);
  }
  if (Array.isArray(data?.schedule_hours) && data.schedule_hours.length > 0) {
    return data.schedule_hours
      .map((v: any) => ({ hours: Number(v) || 0, template_id: null }))
      .filter((t: FollowupTouch) => t.hours > 0);
  }
  return [];
}

/**
 * Clamp + check a cadence before sending it. The backend re-validates (and is
 * the authority), but doing it here gives immediate, touch-numbered feedback
 * instead of a generic 400. Mirrors the backend's validateTouchesInput.
 *
 * Discriminated on `ok` rather than on a nullable `error`: truthiness of a
 * `string` field does NOT narrow a union in TypeScript (the empty string is
 * falsy), so callers would still see `FollowupTouch[] | null`.
 */
export type PreparedTouches =
  | { ok: true; touches: FollowupTouch[] }
  | { ok: false; error: string };

export function prepareTouchesForSave(touches: FollowupTouch[]): PreparedTouches {
  const clean = (touches || [])
    .map((t) => ({
      hours: Number(t.hours),
      template_id: t.touch_type ? null : (t.template_id || null),
      touch_type: t.touch_type || null,
      company_page_url: t.touch_type === 'company_page_post'
        ? (t.company_page_url || '').trim()
        : null,
    }))
    .filter((t) => Number.isFinite(t.hours) && t.hours > 0 && t.hours <= 24 * 365);

  if (clean.length === 0) {
    return { ok: false, error: 'Add at least one positive hour value to the cadence' };
  }
  // The backend rejects a company-page touch without a page; catch it here so the
  // user sees WHICH touch is at fault.
  const missingPageAt = clean.findIndex(
    (t) => t.touch_type === 'company_page_post' && !t.company_page_url
  );
  if (missingPageAt !== -1) {
    return {
      ok: false,
      error: `Touch ${missingPageAt + 1}: add the LinkedIn company page URL to share posts from`,
    };
  }
  return { ok: true, touches: clean };
}

interface Props {
  touches: FollowupTouch[];
  onChange: (next: FollowupTouch[]) => void;
  /** Greys out every control (parent's on/off toggle, or a save in flight). */
  disabled?: boolean;
  /** Sub-heading under the section title. */
  description?: React.ReactNode;
  /** Hide the "Reset" affordance (the campaign scope offers "Use tenant default" instead). */
  showReset?: boolean;
}

export default function FollowupTouchesEditor({
  touches,
  onChange,
  disabled = false,
  description,
  showReset = true,
}: Props) {
  // The touch row whose template dropdown is mid-"create new template" flow.
  const [pendingTemplateTouchIdx, setPendingTemplateTouchIdx] = useState<number | null>(null);
  // Tenant's LinkedIn templates for the per-touch dropdown. Auto-refreshes after
  // a create (the create hook invalidates the list + clears the local cache).
  const { data: liTemplates } = useLinkedInMessageTemplates({ is_active: true });

  const patchTouch = (idx: number, patch: Partial<FollowupTouch>) => {
    const next = [...touches];
    if (next[idx]) next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  return (
    <>
      <div className="border border-gray-100 dark:border-blue-950/40 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Cadence &amp; message per touch</p>
            <p className="text-xs text-gray-500 dark:text-slate-300">
              {description ?? (
                <>
                  One entry = one follow-up. Default: 24, 72, 168, 336 (≈ +1d, +3d, +7d, +14d).
                  Each touch is AI-generated by default, or you can pick a saved LinkedIn template.
                </>
              )}
            </p>
          </div>
          {showReset && (
            <button
              onClick={() => onChange(defaultFollowupTouches())}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              disabled={disabled}
              title="Reset to default cadence"
            >
              Reset
            </button>
          )}
        </div>

        <div className="space-y-2">
          {touches.map((touch, idx) => {
            // A selected template that is no longer in the active list (deleted
            // or deactivated) still needs an option so the select shows it.
            const templates = liTemplates || [];
            const selectedMissing = !!touch.template_id
              && !templates.some((t) => t.id === touch.template_id);
            return (
              <div key={idx} className="rounded-lg border border-gray-100 dark:border-blue-950/40 p-3 space-y-2 bg-gray-50/40 dark:bg-blue-950/10">
                {/* Timing row */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 w-16">
                    Touch {idx + 1}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={24 * 365}
                    value={touch.hours}
                    disabled={disabled}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      patchTouch(idx, { hours: Number.isFinite(v) ? v : 0 });
                    }}
                    className="w-24 px-2 py-1 border border-gray-200 dark:border-blue-950/60 bg-white dark:bg-[#030a21] dark:text-white rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-gray-50 dark:disabled:bg-blue-950/40 disabled:text-gray-400"
                  />
                  <span className="text-xs text-gray-400 dark:text-slate-300">
                    hours (≈ {(touch.hours / 24).toFixed(touch.hours % 24 === 0 ? 0 : 1)}d)
                  </span>
                  <button
                    onClick={() => onChange(touches.filter((_, i) => i !== idx))}
                    disabled={disabled || touches.length <= 1}
                    className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove this touch"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Template row (parity with the WhatsApp follow-up section) */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 w-16">Message</span>
                  <Select
                    value={
                      touch.touch_type === 'industry_trend' ? '__industry_trend__'
                      : touch.touch_type === 'company_page_post' ? '__company_post__'
                      : (touch.template_id || '__default__')
                    }
                    disabled={disabled}
                    onValueChange={(val: string) => {
                      if (val === '__create__') {
                        // Open the create modal; leave template_id untouched until saved.
                        setPendingTemplateTouchIdx(idx);
                        return;
                      }
                      if (val === '__industry_trend__') {
                        // Structured mode: researches the prospect's industry trend.
                        // Mutually exclusive with a template → clear template_id.
                        patchTouch(idx, { template_id: null, touch_type: 'industry_trend' });
                      } else if (val === '__company_post__') {
                        patchTouch(idx, { template_id: null, touch_type: 'company_page_post' });
                      } else if (val === '__default__') {
                        patchTouch(idx, { template_id: null, touch_type: null });
                      } else {
                        patchTouch(idx, { template_id: val, touch_type: null });
                      }
                    }}
                  >
                    <SelectTrigger
                      className="flex-1 h-9 px-3 text-sm border border-gray-200 dark:border-blue-950/60 rounded-xl bg-white dark:bg-[#030a21] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-40"
                      title="AI-generated by default; research the prospect's industry trend; share a post from your company page; or send a saved LinkedIn template (body + media) for this touch"
                    >
                      <SelectValue placeholder="AI-generated (default)" />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                      <SelectItem value="__default__" className="text-xs cursor-pointer">
                        AI-generated (default)
                      </SelectItem>
                      <SelectItem value="__industry_trend__" className="text-xs cursor-pointer">
                        🔎 Research industry trend
                      </SelectItem>
                      <SelectItem value="__company_post__" className="text-xs cursor-pointer">
                        📣 Share a company-page post
                      </SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs cursor-pointer">
                          {t.name}{t.is_default ? ' (Default)' : ''}
                        </SelectItem>
                      ))}
                      {selectedMissing && (
                        <SelectItem value={touch.template_id as string} className="text-xs cursor-pointer">
                          (selected template unavailable)
                        </SelectItem>
                      )}
                      <SelectItem value="__create__" className="text-xs cursor-pointer font-medium text-amber-600 dark:text-amber-400">
                        ➕ Create new template…
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Company page URL - only for the company-page-post mode.
                    Asked for explicitly: LinkedIn's API exposes admined pages
                    by URN with no slug, so the page can't be auto-resolved. */}
                {touch.touch_type === 'company_page_post' && (
                  <div className="flex items-start gap-2 mt-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-slate-300 w-16 pt-2">Page</span>
                    <div className="flex-1">
                      <input
                        type="url"
                        inputMode="url"
                        value={touch.company_page_url ?? ''}
                        disabled={disabled}
                        onChange={(e) => patchTouch(idx, { company_page_url: e.target.value })}
                        placeholder="https://www.linkedin.com/company/your-page"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-blue-950/60 rounded-xl bg-white dark:bg-[#030a21] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:opacity-40 disabled:bg-gray-50 dark:disabled:bg-blue-950/40 transition-all"
                        title="The LinkedIn company page this touch shares a post from"
                      />
                      <p className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 leading-snug">
                        We pick the post from this page that best fits the lead&apos;s industry. If nothing fits,
                        the touch sends an industry-trend message and shares the page link instead - never a broken post link.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => {
            const last = touches[touches.length - 1];
            const nextHours = (last ? last.hours * 2 : 24) || 24;
            onChange([...touches, { hours: nextHours, template_id: null }]);
          }}
          disabled={disabled || touches.length >= MAX_FOLLOWUP_TOUCHES}
          className="mt-3 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="h-3 w-3" />
          Add another touch
        </button>
      </div>

      {/* Create-new-template modal (opened by the per-touch dropdown). Auto-
          selects the new template for the touch that requested it. */}
      <CreateLinkedInTemplateModal
        open={pendingTemplateTouchIdx !== null}
        onClose={() => setPendingTemplateTouchIdx(null)}
        onCreated={(tpl: LinkedInMessageTemplate) => {
          const idx = pendingTemplateTouchIdx;
          if (idx === null) return;
          patchTouch(idx, { template_id: tpl.id, touch_type: null });
          setPendingTemplateTouchIdx(null);
        }}
      />
    </>
  );
}
