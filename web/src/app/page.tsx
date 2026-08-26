// src/app/page.tsx
// Server component wrapper so the public home route ("/") can declare its own
// SEO metadata (client components - like the landing page below - cannot export
// `metadata`). It simply renders the client landing page as a child.
import type { Metadata } from 'next';
import Landing from './landing/page';

export const metadata: Metadata = {
  title: 'Mr LAD - Your AI Sales Employee across every channel',
  description:
    'Mr LAD is one AI Sales Employee who finds your ideal customers, starts real conversations, follows up, and books meetings across LinkedIn, WhatsApp, Instagram, email, and voice.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Mr LAD - Your AI Sales Employee across every channel',
    description:
      'One AI Sales Employee who prospects, chats, calls, and books meetings across LinkedIn, WhatsApp, Instagram, email, and voice - the output of an entire sales team.',
    url: '/',
    type: 'website',
    // Next.js replaces (does not deep-merge) the openGraph object from the
    // layout, so the image must be repeated here or the home page ships with
    // no og:image.
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Mr LAD' }],
  },
};

export default function Home() {
  return <Landing />;
}
