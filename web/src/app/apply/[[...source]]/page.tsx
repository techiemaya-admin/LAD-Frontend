/**
 * /apply - short, CTA-shaped entry point to the founding-group landing page.
 *
 * LinkedIn messages don't support anchor text: a URL in an InMail renders as
 * the raw URL, so the URL itself has to read like the call to action. This
 * turns the ugly, obviously-tracked
 *     mrlads.com/community?src=inmail
 * into
 *     mrlads.com/apply/inmail
 * which carries identical attribution without looking like a tracking link  - 
 * query strings in cold outreach read as marketing automation and depress
 * click-through.
 *
 * Server component: the redirect happens before any HTML ships, so the visitor
 * never sees an intermediate page. Attribution is then resolved by /community
 * exactly as it is for a direct ?src= visit - one attribution path, not two.
 */
import { redirect } from 'next/navigation';

/** Mirrors SIGNUP_SOURCES on the backend. Anything else falls back to organic. */
const VALID_SOURCES = ['landing', 'inmail', 'pdf', 'referral', 'other'];

interface Props {
  params: Promise<{ source?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ApplyRedirect({ params, searchParams }: Props) {
  const { source } = await params;
  const sp = await searchParams;

  // /apply/inmail -> inmail. Extra path segments are ignored rather than 404ing;
  // a mistyped link should still land someone on the form.
  const fromPath = (source?.[0] || '').toLowerCase();

  const qs = new URLSearchParams();
  if (VALID_SOURCES.includes(fromPath)) qs.set('src', fromPath);

  // Preserve any UTM params already on the link so /apply/inmail?utm_content=hook_a
  // keeps working for A/B tests.
  for (const [key, value] of Object.entries(sp)) {
    if (!key.startsWith('utm_') && key !== 'src') continue;
    const v = Array.isArray(value) ? value[0] : value;
    if (v) qs.set(key, v);
  }

  const query = qs.toString();
  redirect(`/community${query ? `?${query}` : ''}#apply`);
}
