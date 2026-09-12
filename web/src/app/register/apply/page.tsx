"use client";
/**
 * /register/apply — tell us about the business.
 *
 * Reached only with a signup session (a verified identity that has no
 * account). Submits to /api/signup/applications with the signup token; the
 * backend queues it for review. Nothing here creates an account — the
 * applicant lands on /register/pending and hears from us.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { readSignupSession, clearSignupSession, SIGNUP_TOKEN_HEADER, type SignupSession } from '@/lib/signup-session';

const BOOKING_SYSTEMS = [
  { value: 'mindbody', label: 'Mindbody' },
  { value: 'glofox', label: 'Glofox' },
  { value: 'other', label: 'Something else' },
  { value: 'none', label: 'No booking system yet' },
];

const SERVICES = ['Pilates', 'Yoga', 'Personal training', 'Group classes', 'Physio / rehab', 'Spa / massage', 'Nutrition'];

interface FormState {
  business_name: string;
  website: string;
  city: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  goal: string;
  booking_system: string;
  services: string[];
  weekly_enquiries: string;
}

export default function RegisterApplyPage() {
  const router = useRouter();
  const [session, setSession] = useState<SignupSession | null | undefined>(undefined);
  const [form, setForm] = useState<FormState>({
    business_name: '', website: '', city: '', country: '', contact_name: '', contact_email: '', contact_phone: '',
    goal: '', booking_system: '', services: [], weekly_enquiries: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const s = readSignupSession();
    setSession(s);
    if (!s) {
      router.replace('/register');
      return;
    }
    setForm((f) => ({
      ...f,
      contact_name: f.contact_name || s.identity.name || '',
      contact_email: f.contact_email || s.identity.email || '',
    }));
  }, [router]);

  const timezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
  }, []);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggleService = (s: string) => set('services', form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.business_name.trim().length < 2) e.business_name = 'Tell us the name of your business.';
    if (form.contact_name.trim().length < 2) e.contact_name = 'Who should we talk to?';
    // The verified identity is always a way to reach them (the backend fills
    // contact_email / contact_phone from it), so neither field is required
    // here — only checked for shape when given.
    if (form.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contact_email.trim())) e.contact_email = 'That email does not look right.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!session || !validate()) return;
    setBusy(true); setSubmitError(null);
    try {
      const resp = await fetch('/api/signup/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [SIGNUP_TOKEN_HEADER]: session.signupToken },
        body: JSON.stringify({
          business_name: form.business_name,
          vertical: 'wellness',
          website: form.website || undefined,
          city: form.city || undefined,
          country: form.country || undefined,
          timezone: timezone || undefined,
          contact_name: form.contact_name,
          contact_email: form.contact_email || undefined,
          contact_phone: form.contact_phone || undefined,
          goal: form.goal || undefined,
          details: {
            booking_system: form.booking_system || undefined,
            services: form.services,
            weekly_enquiries: form.weekly_enquiries || undefined,
          },
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 401) {
        clearSignupSession();
        router.replace('/register?expired=1');
        return;
      }
      if (resp.status === 409) {
        // Already approved / rejected — the pending page explains.
        router.replace('/register/pending');
        return;
      }
      if (!resp.ok) {
        if (data?.errors) setErrors(data.errors);
        setSubmitError(data?.error || 'Something went wrong. Please try again.');
        return;
      }
      router.replace('/register/pending');
    } catch {
      setSubmitError('Could not submit. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (session === undefined || session === null) {
    return (
      <AuthPageShell>
        <div className="text-sm text-gray-500 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading…</div>
      </AuthPageShell>
    );
  }

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelCls = "block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1";
  const Err = ({ k }: { k: string }) => errors[k] ? <p className="text-xs text-red-500 mt-1">{errors[k]}</p> : null;

  return (
    <AuthPageShell>
      <form onSubmit={submit} className="w-full max-w-[460px] p-6 sm:p-7 rounded-2xl shadow-2xl border backdrop-blur-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#071131] dark:to-[#071131] border-gray-200 dark:border-gray-700 mx-auto space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tell us about your studio</h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-green-600" />
            Verified as <span className="font-medium">{session.identity.email || session.identity.phone}</span>
          </p>
        </div>

        {submitError && (
          <div role="alert" className="rounded-md border border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2">❗ {submitError}</div>
        )}

        <div>
          <label htmlFor="business_name" className={labelCls}>Business name *</label>
          <input id="business_name" className={inputCls} value={form.business_name} onChange={(e) => set('business_name', e.target.value)} placeholder="The Pad Fitness" required />
          <Err k="business_name" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="website" className={labelCls}>Website</label>
            <input id="website" className={inputCls} value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="thepad.ae" inputMode="url" />
            <Err k="website" />
          </div>
          <div>
            <label htmlFor="city" className={labelCls}>City</label>
            <input id="city" className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Dubai" />
          </div>
        </div>

        <div>
          <label className={labelCls}>What do you offer?</label>
          <div className="flex flex-wrap gap-2">
            {SERVICES.map((s) => (
              <button type="button" key={s} onClick={() => toggleService(s)}
                className={`px-3 py-1 rounded-full text-xs border transition ${form.services.includes(s) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:border-blue-400'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="booking_system" className={labelCls}>Booking system</label>
            <select id="booking_system" className={inputCls} value={form.booking_system} onChange={(e) => set('booking_system', e.target.value)}>
              <option value="">Choose…</option>
              {BOOKING_SYSTEMS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="weekly_enquiries" className={labelCls}>Enquiries per week</label>
            <select id="weekly_enquiries" className={inputCls} value={form.weekly_enquiries} onChange={(e) => set('weekly_enquiries', e.target.value)}>
              <option value="">Roughly…</option>
              <option value="<20">Under 20</option>
              <option value="20-100">20 – 100</option>
              <option value="100-500">100 – 500</option>
              <option value=">500">500+</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="goal" className={labelCls}>What should the assistant do for you?</label>
          <textarea id="goal" className={`${inputCls} min-h-[72px]`} value={form.goal} onChange={(e) => set('goal', e.target.value)}
            placeholder="Answer WhatsApp enquiries, book trial classes, chase no-shows…" maxLength={4000} />
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-3">
          <div>
            <label htmlFor="contact_name" className={labelCls}>Your name *</label>
            <input id="contact_name" className={inputCls} value={form.contact_name} onChange={(e) => set('contact_name', e.target.value)} autoComplete="name" required />
            <Err k="contact_name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="contact_email" className={labelCls}>Email{session.identity.provider === 'google' ? '' : <span className="text-gray-400"> (optional)</span>}</label>
              <input id="contact_email" type="email" className={inputCls} value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} autoComplete="email"
                readOnly={session.identity.provider === 'google'} />
              <Err k="contact_email" />
            </div>
            <div>
              <label htmlFor="contact_phone" className={labelCls}>WhatsApp number{session.identity.provider === 'whatsapp' ? <span className="text-gray-400"> (verified)</span> : <span className="text-gray-400"> (optional)</span>}</label>
              <input id="contact_phone" type="tel" className={inputCls} value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)}
                placeholder={session.identity.provider === 'whatsapp' ? session.identity.phone || '' : '+971 50 123 4567'} autoComplete="tel" />
              <Err k="contact_phone" />
            </div>
          </div>
        </div>

        <Button type="submit" disabled={busy}
          className="w-full p-2.5 sm:p-3 rounded-lg text-sm sm:text-base font-semibold bg-primary dark:bg-blue-600 dark:hover:bg-blue-500 text-white cursor-pointer">
          {busy ? <Loader2 size={16} className="animate-spin" /> : 'Submit for review'}
        </Button>
        <p className="text-[11px] text-gray-500 text-center">We review every application by hand and set your workspace up for you. Usually within one business day.</p>
      </form>
    </AuthPageShell>
  );
}
