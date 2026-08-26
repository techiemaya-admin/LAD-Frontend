'use client';

import Link from 'next/link';
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

const LEGAL_LINKS = [
  { href: '/privacy-policy', label: 'Privacy Policy' },
  { href: '/terms-of-service', label: 'Terms of Service' },
  { href: '/cookies-policy', label: 'Cookies Policy' },
  { href: '/account-deletion-policy', label: 'Account Deletion Policy' },
];

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  /** Short lead paragraph shown above the main body. */
  intro?: string;
  /** Pathname of the current page, used to highlight the active tab. */
  activePath: string;
  children: React.ReactNode;
}

const LegalPageLayout = memo(function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  activePath,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen relative bg-gradient-to-b from-background via-background to-background pt-16 md:pt-20 pb-20">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-[#0b1957] dark:text-white mb-4">
            {title}
          </h1>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Last updated: {lastUpdated}
          </p>
        </motion.div>

        {/* Legal section tabs */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10">
          {LEGAL_LINKS.map((link) => {
            const isActive = link.href === activePath;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-[#0b1957] text-white shadow dark:bg-blue-600 dark:text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#1a2f6b]/50 dark:text-gray-300 dark:hover:bg-[#1a2f6b] dark:hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Content card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="max-w-4xl mx-auto bg-white dark:bg-[#0e1b4d]/40 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-lg p-6 sm:p-10 md:p-12"
        >
          {intro && (
            <p className="text-lg leading-relaxed text-gray-700 dark:text-gray-200 mb-8">
              {intro}
            </p>
          )}
          <div className="legal-prose">{children}</div>
        </motion.div>

        {/* Contact / questions block */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="max-w-4xl mx-auto mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-white to-gray-50 dark:from-[#1a2f6b] dark:to-gray-900 border border-gray-200 dark:border-gray-700 p-6 sm:p-8"
        >
          <div>
            <h3 className="text-lg font-bold text-[#0b1957] dark:text-white mb-1">
              Questions about this policy?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Reach out and our team will be happy to help.
            </p>
          </div>
          <a
            href="mailto:support@techiemaya.com"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0b1957] px-6 py-3 font-bold text-white transition-all hover:shadow-lg"
          >
            <Mail className="h-5 w-5" />
            Contact us
          </a>
        </motion.div>
      </div>
    </div>
  );
});

export default LegalPageLayout;
