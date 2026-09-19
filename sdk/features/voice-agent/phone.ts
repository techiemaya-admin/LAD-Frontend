/**
 * Dial-string helpers for the call form.
 *
 * The form has a country picker and a number box, so what the operator types
 * is a national number by intent. The one thing to guard against is a number
 * pasted with its country code already on it ("919182573443"), and that guard
 * must not eat the first digits of a national number that happens to start
 * with the same digits: 91xxxxxxxx is a valid Indian mobile, 971xxxxxx a
 * valid UAE one.
 */

/**
 * How many digits a national (subscriber) number has where that is one fixed
 * length. A number of exactly this length is national, whatever it starts
 * with; only a longer input can already carry the dial code.
 */
export const NATIONAL_NUMBER_LENGTH: Record<string, number> = {
  "+91": 10, // India
  "+971": 9, // UAE
  "+1": 10, // US / Canada
  "+44": 10, // UK
  "+61": 9, // Australia
};

/** Full E.164-style dial string for a typed number under the picked country. */
export function getFullPhoneNumber(phoneNumber: string, countryDialCode: string): string {
  const cleanPhone = phoneNumber.replace(/\s+/g, "").trim();
  // Already has a country code.
  if (cleanPhone.startsWith("+")) {
    return cleanPhone;
  }
  const nationalLength = NATIONAL_NUMBER_LENGTH[countryDialCode];
  if (nationalLength !== undefined && cleanPhone.length <= nationalLength) {
    return `${countryDialCode}${cleanPhone}`;
  }
  // Longer than a national number (or a country we have no length for) and it
  // starts with the dial code's digits: the code is already there.
  if (cleanPhone.startsWith(countryDialCode.replace("+", ""))) {
    return `+${cleanPhone}`;
  }
  return `${countryDialCode}${cleanPhone}`;
}

/**
 * The reason a call was refused, for the operator.
 *
 * LAD backend wraps a VOAG 4xx as `{ error: <generic>, details: { detail } }`.
 * The generic text ("Failed to initiate call with voice service") is useless to
 * the person at the form; the detail says what to fix.
 */
export function callErrorMessage(e: any, fallback = "Failed to initiate call. Please try again."): string {
  const details = e?.body?.details;
  const detail =
    (typeof details === "string" && details) || details?.detail || details?.error || details?.message;
  if (typeof detail === "string" && detail.trim()) return detail;
  return e?.message || fallback;
}
