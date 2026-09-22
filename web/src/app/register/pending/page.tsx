"use client";
/**
 * /register/pending — where the application stands.
 *
 * Reads /api/signup/applications/mine with the signup token while it is still
 * valid; once it has expired the page can only say "we have it", which is
 * still true. The status vocabulary is the backend's (pending / approved /
 * rejected / provisioned).
 */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import AuthPageShell from '@/components/auth/AuthPageShell';
import { readSignupSession, SIGNUP_TOKEN_HEADER } from '@/lib/signup-session';

interface ApplicantView { id: string; status: string; business_name: string; vertical: string; created_at: string; updated_at: string }

const COPY: Record<string, { icon: React.ReactNode; title: string; body: string }> = {
  pending: {
    icon: <Clock className="text-amber-500" size={36} />,
    title: 'Application received',
    body: 'We review every application by hand and set your workspace up for you — usually within one business day. We will reach you on the email or WhatsApp number you gave us.',
  },
  approved: {
    icon: <CheckCircle2 className="text-green-600" size={36} />,
    title: 'Approved — setting you up',
    body: 'Your application is approved and your workspace is being prepared. Your sign-in details will arrive by email or WhatsApp shortly.',
  },
  provisioned: {
    icon: <CheckCircle2 className="text-green-600" size={36} />,
    title: 'Your workspace is ready',
    body: 'Check your email or WhatsApp for your sign-in details, then sign in below.',
  },
  rejected: {
    icon: <XCircle className="text-red-500" size={36} />,
    title: 'We could not accept this application',
    body: 'If you think that was a mistake, reply to the message we sent you or contact us and we will take another look.',
  },
};

export default function RegisterPendingPage() {
  const [app, setApp] = useState<ApplicantView | null | undefined>(undefined);
  const [tokenExpired, setTokenExpired] = useState(false);

  useEffect(() => {
    const s = readSignupSession();
    if (!s) { setApp(null); setTokenExpired(true); return; }
    fetch('/api/signup/applications/mine', { headers: { [SIGNUP_TOKEN_HEADER]: s.signupToken } })
      .then(async (r) => {
        if (r.status === 401) { setTokenExpired(true); setApp(null); return; }
        const d = await r.json().catch(() => ({}));
        setApp(d?.application || null);
      })
      .catch(() => setApp(null));
  }, []);

  const status = app?.status && COPY[app.status] ? app.status : 'pending';
  const c = COPY[status];

  return (
    <AuthPageShell>
      <div className="w-full max-w-[420px] p-6 sm:p-7 rounded-2xl shadow-2xl border backdrop-blur-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#071131] dark:to-[#071131] border-gray-200 dark:border-gray-700 mx-auto text-center space-y-3">
        {app === undefined ? (
          <div className="text-sm text-gray-500 flex items-center justify-center gap-2 py-6"><Loader2 size={16} className="animate-spin" /> Checking…</div>
        ) : (
          <>
            <div className="flex justify-center">{c.icon}</div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{c.title}</h2>
            {app?.business_name && <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{app.business_name}</p>}
            <p className="text-sm text-gray-600 dark:text-gray-300">{c.body}</p>
            {tokenExpired && (
              <p className="text-[11px] text-gray-500">Your verification has expired, so we can&apos;t show live status here — but your application is safe with us.</p>
            )}
            <div className="pt-2 text-xs text-gray-500">
              {status === 'provisioned' ? (
                <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</Link>
              ) : (
                <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">Back to home</Link>
              )}
            </div>
          </>
        )}
      </div>
    </AuthPageShell>
  );
}
