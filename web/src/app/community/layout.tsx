import type { Metadata } from 'next';

/**
 * Metadata for the founding-group landing page.
 *
 * This lives in a layout rather than the page because page.tsx is a client
 * component ('use client') and cannot export `metadata`.
 *
 * It matters more than usual here: LinkedIn does not support anchor text, so
 * the nearest thing to a labelled "Apply Now" button is the link-preview card
 * generated from these Open Graph tags. The title below is what the recipient
 * actually reads on that card, so it is written as a call to action rather
 * than as a page name.
 */
export const metadata: Metadata = {
  title: 'Apply: turn your playbook into a product | Mr LAD',
  description:
    'A founding group for agencies and consultants. Package the outreach playbook you already have, run it for real, and earn when other businesses deploy it.',
  openGraph: {
    title: 'Apply: turn your playbook into a product',
    description:
      'Package the outreach playbook you already have, run it for real, and earn when other businesses deploy it. Free to join.',
    type: 'website',
    siteName: 'Mr LAD',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Apply: turn your playbook into a product',
    description:
      'Package the outreach playbook you already have, run it for real, and earn when other businesses deploy it.',
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
