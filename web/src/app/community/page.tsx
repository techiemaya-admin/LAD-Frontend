'use client';

/**
 * /community - founding-group landing page.
 *
 * The destination for the "reply 'in'" InMail and the PDF lead magnet: an
 * operator with a working outreach playbook applies to build it as a Mr LAD
 * strategy, run it for real, and - if it produces results - have it published
 * to the shared strategy gallery.
 *
 * Public route (see lib/routes.ts). The form posts to /api/community-signup,
 * which relays to LAD_backend where validation, rate limiting and persistence
 * actually happen.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

const NAVY = '#0b1957';

/** Campaign sources the backend accepts (mirrors SIGNUP_SOURCES). */
const VALID_SOURCES = ['landing', 'inmail', 'pdf', 'referral', 'other'];

const ATTRIBUTION_KEY = 'mrlad_community_attribution';

interface Attribution {
  source: string;
  utm: Record<string, string>;
}

/**
 * Work out where this visitor came from.
 *
 * Read from the URL, then fall back to whatever we stored the first time they
 * arrived. FIRST touch wins on purpose: someone clicks the InMail link, reads,
 * leaves, then comes back later by typing the URL - without persistence that
 * signup would be miscredited to "landing" and the InMail would look like it
 * did nothing.
 *
 * Deliberately reads window.location rather than useSearchParams(): the latter
 * forces a Suspense boundary and opts the route out of static rendering, which
 * is a lot of ceremony for four query params.
 */
function resolveAttribution(): Attribution {
  const fallback: Attribution = { source: 'landing', utm: {} };
  if (typeof window === 'undefined') return fallback;

  const qs = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'src']) {
    const v = qs.get(key);
    if (v) utm[key] = v.slice(0, 120);
  }

  const raw = (qs.get('src') || '').toLowerCase();
  const medium = (qs.get('utm_medium') || '').toLowerCase();
  const utmSource = (qs.get('utm_source') || '').toLowerCase();

  let source: string | null = null;
  if (VALID_SOURCES.includes(raw)) source = raw;
  else if (medium === 'inmail' || utmSource === 'inmail') source = 'inmail';
  else if (medium === 'pdf' || utmSource === 'pdf') source = 'pdf';
  else if (medium === 'referral') source = 'referral';
  else if (Object.keys(utm).length) source = 'other';

  if (source) {
    const attribution = { source, utm };
    try {
      // First touch only - never overwrite an earlier, more meaningful visit.
      if (!window.localStorage.getItem(ATTRIBUTION_KEY)) {
        window.localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution));
      }
    } catch {
      /* private browsing - attribution just won't survive the round trip */
    }
    return attribution;
  }

  try {
    const stored = window.localStorage.getItem(ATTRIBUTION_KEY);
    if (stored) return JSON.parse(stored) as Attribution;
  } catch {
    /* ignore */
  }
  return fallback;
}

interface FieldErrors {
  full_name?: string;
  email?: string;
}

/**
 * The strategy lifecycle, end to end.
 *
 * `status` is deliberate and load-bearing: steps 1-4 exist in the product
 * today, step 5 does not. Marking that honestly on a public page is the
 * difference between a founding-member offer and a promise we cannot keep for
 * someone who signs up on the strength of it.
 */
const STAGES = [
  {
    n: '1',
    title: 'Build and submit your strategy',
    body: 'We rebuild your existing playbook as a Mr LAD strategy with you - the sequence, the timing, the branching, your messaging. You run it for real against your own prospects, and when it holds up you submit it.',
    status: 'live' as const,
  },
  {
    n: '2',
    title: 'We review it',
    body: 'Every submission is checked by our team before anyone else can see it. We look at what it does, whether it works, and confirm nothing account-specific survived the automatic strip.',
    status: 'live' as const,
  },
  {
    n: '3',
    title: 'It goes into the marketplace',
    body: 'Approved strategies are listed in the shared gallery that every Mr LAD business can browse - described by what they achieve, credited as a proven play.',
    status: 'live' as const,
  },
  {
    n: '4',
    title: 'A client picks it up',
    body: 'They import it as their own editable copy and run it on their channels, with their ICP. Your original stays untouched, and you can withdraw it from the gallery at any time.',
    status: 'live' as const,
  },
  {
    n: '5',
    title: 'You get paid',
    body: 'Every deployment of your strategy earns you a share. You are no longer billing for the hours it takes to set a playbook up - you are earning from the playbook itself, on clients you never had to win.',
    status: 'design' as const,
  },
];

const KEEPS = [
  'Every contact and uploaded list stays in your account.',
  'Connected mailboxes, WhatsApp numbers and LinkedIn accounts are never shared.',
  'Report recipients, webhooks and storage destinations are stripped automatically.',
  'You see exactly what would be published, field by field, before you confirm.',
];

export default function CommunityPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    company: '',
    linkedin_url: '',
    playbook: '',
    client_volume: '',
    website: '', // honeypot - hidden from humans, bots fill it
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [attribution, setAttribution] = useState<Attribution>({ source: 'landing', utm: {} });

  // Resolved after mount so the server render stays identical for every
  // visitor - attribution is per-visitor state, not page content.
  useEffect(() => {
    setAttribution(resolveAttribution());
  }, []);

  const set = (k: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFailed(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/community-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, source: attribution.source, utm: attribution.utm }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setDone(true);
        return;
      }
      if (res.status === 400 && data?.errors) {
        setErrors(data.errors);
      } else {
        setFailed(data?.error || 'Something went wrong. Please try again.');
      }
    } catch {
      setFailed('We could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const field =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0b1957] focus:ring-2 focus:ring-[#0b1957]/15';
  const label = 'mb-1.5 block text-[13px] font-semibold text-slate-700';

  return (
    <main className="min-h-screen bg-white">
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="bg-[#000724] px-6 py-20 text-white sm:py-24">
        <div className="mx-auto max-w-5xl">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-violet-400">
            For agencies, consultants &amp; fractional sales leaders
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-[1.1] sm:text-5xl">
            Turn your playbook into a product.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
            You have one outreach system that reliably works. Right now you rebuild it by hand for
            every client, and you cannot charge a cent for it.
          </p>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-300">
            We are opening a founding group inside the Mr LAD community to change that.
          </p>
          <a
            href="#apply"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-7 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-violet-500"
          >
            Apply to join
          </a>
        </div>
      </section>

      {/* ── Lifecycle ──────────────────────────────────────────────────── */}
      <section className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            From your playbook to income
          </h2>
          <div className="mt-3 h-1 w-10 rounded bg-violet-600" />
          <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
            Five steps. The first four work in Mr LAD today - the fifth is what this founding group
            is being formed to design.
          </p>

          <ol className="mt-10">
            {STAGES.map((s, i) => {
              const last = i === STAGES.length - 1;
              const paid = s.status === 'design';
              return (
                <li key={s.n} className="relative flex gap-5 pb-9 last:pb-0">
                  {/* Connector. Stops at the last node so the line doesn't dangle. */}
                  {!last && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[19px] top-11 h-[calc(100%-2.25rem)] w-px bg-slate-200"
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white ${
                      paid ? 'bg-violet-600 ring-4 ring-violet-100' : ''
                    }`}
                    style={paid ? undefined : { background: NAVY }}
                  >
                    {s.n}
                  </span>
                  <div className="pt-1.5">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <h3 className="text-[17px] font-bold text-slate-900">{s.title}</h3>
                      {paid ? (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-violet-700">
                          Designing with the founding group
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                          Live today
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="mt-4 rounded-xl border-l-[3px] border-violet-600 bg-violet-50 px-4 py-3.5 text-[14px] leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Why step five is not live yet.</span>{' '}
            Paying contributors properly means pricing, payouts and tax handled correctly across
            borders. We would rather build that with the people it pays than guess at it and get it
            wrong - which is exactly what the founding group is for.
          </p>
        </div>
      </section>

      {/* ── What stays yours ───────────────────────────────────────────── */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-2xl font-bold text-slate-900">What stays yours</h2>
          <div className="mt-3 h-1 w-10 rounded bg-violet-600" />
          <p className="mt-5 max-w-3xl text-[15px] leading-relaxed text-slate-600">
            Sharing a strategy shares the structure and the thinking, never your operation. Before
            anything is published, the platform strips everything account-specific:
          </p>
          <ul className="mt-6 grid max-w-3xl gap-3 sm:grid-cols-2">
            {KEEPS.map((k) => (
              <li key={k} className="flex gap-2.5 text-[14px] leading-relaxed text-slate-700">
                <span className="mt-[7px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-600" />
                {k}
              </li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl text-[14px] leading-relaxed text-slate-500">
            Your strategy stays yours. You can withdraw it at any time, and nothing is published
            without your explicit confirmation of what is being shared.
          </p>
        </div>
      </section>

      {/* ── Apply ──────────────────────────────────────────────────────── */}
      <section id="apply" className="px-6 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl">
          {done ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <h2 className="text-2xl font-bold text-emerald-900">You are on the list.</h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-emerald-800">
                We will come back with two or three questions to work out whether your playbook is a
                fit for the first group. Places are limited because each one means our team building
                your strategy with you.
              </p>
              <Link
                href="/"
                className="mt-6 inline-block text-[14px] font-semibold text-emerald-900 underline underline-offset-4"
              >
                Back to Mr LAD
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                Apply to the founding group
              </h2>
              <div className="mt-3 h-1 w-10 rounded bg-violet-600" />
              <p className="mt-5 text-[15px] leading-relaxed text-slate-600">
                It is free while we design it. Tell us what your playbook does and we will tell you
                honestly whether it is a fit.
              </p>

              <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="full_name" className={label}>
                      Your name <span className="text-violet-600">*</span>
                    </label>
                    <input
                      id="full_name"
                      className={field}
                      value={form.full_name}
                      onChange={set('full_name')}
                      placeholder="Alex Rivera"
                      autoComplete="name"
                      aria-invalid={!!errors.full_name}
                    />
                    {errors.full_name && (
                      <p className="mt-1.5 text-[13px] text-red-600">{errors.full_name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="email" className={label}>
                      Work email <span className="text-violet-600">*</span>
                    </label>
                    <input
                      id="email"
                      type="email"
                      className={field}
                      value={form.email}
                      onChange={set('email')}
                      placeholder="alex@agency.com"
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && (
                      <p className="mt-1.5 text-[13px] text-red-600">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="company" className={label}>
                      Company
                    </label>
                    <input
                      id="company"
                      className={field}
                      value={form.company}
                      onChange={set('company')}
                      placeholder="Rivera Growth"
                      autoComplete="organization"
                    />
                  </div>
                  <div>
                    <label htmlFor="linkedin_url" className={label}>
                      LinkedIn profile
                    </label>
                    <input
                      id="linkedin_url"
                      className={field}
                      value={form.linkedin_url}
                      onChange={set('linkedin_url')}
                      placeholder="linkedin.com/in/..."
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="playbook" className={label}>
                    What does your playbook do?
                  </label>
                  <textarea
                    id="playbook"
                    rows={4}
                    className={field}
                    value={form.playbook}
                    onChange={set('playbook')}
                    placeholder="e.g. LinkedIn connect then WhatsApp follow-up for fitness studio owners, booking trial classes. Roughly 20% reply rate."
                  />
                  <p className="mt-1.5 text-[13px] text-slate-500">
                    The more specific, the faster we can tell you if it is a fit.
                  </p>
                </div>

                <div>
                  <label htmlFor="client_volume" className={label}>
                    How many clients would you deploy it to?
                  </label>
                  <input
                    id="client_volume"
                    className={field}
                    value={form.client_volume}
                    onChange={set('client_volume')}
                    placeholder="e.g. 8, or 'depends - maybe 5 to 10'"
                  />
                </div>

                {/* Honeypot. Hidden from people, irresistible to bots. */}
                <div className="absolute left-[-9999px]" aria-hidden="true">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.website}
                    onChange={set('website')}
                  />
                </div>

                {failed && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-[14px] text-red-700">
                    {failed}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-violet-600 px-6 py-3.5 text-[15px] font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Sending…' : 'Apply to join'}
                </button>

                <p className="text-center text-[13px] leading-relaxed text-slate-500">
                  We will only use these details to talk to you about the founding group. No list, no
                  newsletter.
                </p>
              </form>
            </>
          )}
        </div>
      </section>

      <footer className="border-t border-slate-200 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 text-[13px] text-slate-500">
          <span>Mr LAD is built by TechieMaya, Sharjah, UAE.</span>
          <span className="flex gap-4">
            <Link href="/privacy-policy" className="hover:text-slate-800">
              Privacy
            </Link>
            <Link href="/terms-of-service" className="hover:text-slate-800">
              Terms
            </Link>
          </span>
        </div>
      </footer>
    </main>
  );
}
