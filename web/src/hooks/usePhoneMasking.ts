'use client';

/**
 * usePhoneMasking - should this VIEWER see contact phone numbers, and how are
 * they rendered when they should not?
 *
 * The flag is per-user, not per-tenant/account/channel: it lives on the
 * viewer's own record as metadata.mask_phone_number, is toggled per-user in
 * Team Management, and arrives from /me as `maskPhoneNumber`. Whose
 * conversation it is, and how that WhatsApp number was onboarded, are
 * irrelevant to it.
 *
 * This hook exists because the masking logic was previously a private
 * useCallback inside ConversationContextPanel, so exactly two render sites
 * were masked while the conversation list, group member lists, group sender
 * labels and starred messages all printed the raw number. Anyone with masking
 * enabled still saw unmasked numbers on nearly every surface - which reads as
 * "masking is broken" rather than "masking was never wired up there".
 *
 * ── IMPORTANT: this is cosmetic, not access control ──────────────────────
 * Masking happens in the browser. The API returns the full number in every
 * response regardless of this flag, so it remains visible in devtools, the
 * network tab, and to any other API client. If masking is ever needed as a
 * privacy or compliance control rather than a shoulder-surfing convenience,
 * it has to be enforced server-side, keyed on the requesting user. Do not
 * treat this hook as if it withholds anything.
 */

import { useCallback, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';

/** Last 4 digits stay legible; everything before them becomes bullets. */
export function maskPhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const masked = Array(digits.length - 4).fill('•').join('');
  return `+${masked}${digits.slice(-4)}`;
}

/**
 * Does this string look like a phone number rather than a person's name?
 *
 * Needed because some fields arrive already collapsed to `name || phone` by
 * the time they reach a render site - a group participant's `senderName` is
 * their WhatsApp pushname when they have one and their raw number when they
 * do not. Masking the whole field unconditionally would bullet out real names.
 *
 * Deliberately strict: digits and phone punctuation only, at least 7 digits.
 * Any letter disqualifies it, so a name is never masked. A name that is
 * literally all digits would be masked - an acceptable trade, since that is
 * indistinguishable from a number and erring toward masking is the safe
 * direction for a privacy setting.
 */
export function looksLikePhoneNumber(value: string): boolean {
  const v = (value || '').trim();
  if (!v) return false;
  if (!/^[+(]?[\d\s\-().]+$/.test(v)) return false;
  return v.replace(/\D/g, '').length >= 7;
}

export interface PhoneMasking {
  /** True once /me has confirmed this viewer has masking enabled. */
  maskPhoneNumbers: boolean;
  /**
   * Render a phone for display. Pass-through when masking is off or the value
   * is empty, so it is safe to wrap any phone-rendering site unconditionally.
   */
  displayPhone: (phone: string | null | undefined) => string;
  /**
   * Render a label that falls back to the phone when no name is known  - 
   * `name || phone` shapes, which are how raw numbers leaked into the
   * conversation list and group views. Masks ONLY the fallback, never a real
   * name, and never turns an empty label into a bullet string.
   */
  displayNameOrPhone: (
    name: string | null | undefined,
    phone: string | null | undefined,
    fallback?: string,
  ) => string;
  /**
   * Render a field that is ALREADY collapsed to "a name, or a phone if no name
   * was known" - e.g. a group participant's senderName. Masks only when the
   * value is phone-shaped, so real names pass through untouched.
   */
  displayPossiblePhone: (value: string | null | undefined) => string;
}

export function usePhoneMasking(): PhoneMasking {
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u: unknown) => {
        if (cancelled) return;
        const rec = (u ?? {}) as Record<string, unknown>;
        const nested = (rec.user ?? {}) as Record<string, unknown>;
        setMaskPhoneNumbers(!!(rec.maskPhoneNumber ?? nested.maskPhoneNumber));
      })
      // Default to NOT masking on failure: this is a display preference, and
      // silently bulleting every number when /me is briefly unavailable would
      // look like data loss. The server is the source of truth either way.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPhone = useCallback(
    (phone: string | null | undefined) => {
      if (!phone) return phone ?? '';
      if (!maskPhoneNumbers) return phone;
      return maskPhoneNumber(phone);
    },
    [maskPhoneNumbers],
  );

  const displayNameOrPhone = useCallback(
    (
      name: string | null | undefined,
      phone: string | null | undefined,
      fallback = 'Unknown',
    ) => {
      const trimmed = (name || '').trim();
      if (trimmed) return trimmed;
      if (!phone) return fallback;
      return maskPhoneNumbers ? maskPhoneNumber(phone) : phone;
    },
    [maskPhoneNumbers],
  );

  const displayPossiblePhone = useCallback(
    (value: string | null | undefined) => {
      if (!value) return value ?? '';
      if (!maskPhoneNumbers) return value;
      return looksLikePhoneNumber(value) ? maskPhoneNumber(value) : value;
    },
    [maskPhoneNumbers],
  );

  return { maskPhoneNumbers, displayPhone, displayNameOrPhone, displayPossiblePhone };
}
