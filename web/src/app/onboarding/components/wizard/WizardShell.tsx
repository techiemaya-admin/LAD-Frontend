'use client';
// R8 Phase 3 - top-level shell for the linear signup wizard. Owns step state,
// keeps it in sync with the ?step= query param, animates transitions, and
// renders the appropriate Screen component.

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveIcpDefinition } from '@lad/frontend-features/ai-icp-assistant';

import WizardStepper from './WizardStepper';
import {
  WIZARD_STEPS,
  indexOfStep,
  nextStepId,
  prevStepId,
  type WizardStepId,
} from './types';

import Screen2IcpCapture from '../Screen2IcpCapture';
import Screen2IcpReview from '../Screen2IcpReview';
import WizardWelcomeStep from './WizardWelcomeStep';
import WizardCompanyStep from './WizardCompanyStep';
import WizardIntegrationsStep from './WizardIntegrationsStep';

function isWizardStepId(v: string | null): v is WizardStepId {
  return !!v && WIZARD_STEPS.some((s) => s.id === v);
}

export default function WizardShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  const initial: WizardStepId = isWizardStepId(stepParam) ? stepParam : 'welcome';

  const [step, setStep] = useState<WizardStepId>(initial);
  const { definition: activeIcp, loading: loadingIcp, refetch } = useActiveIcpDefinition();

  // Sync step state to URL so refreshes / back button work
  const setStepAndUrl = useCallback(
    (next: WizardStepId) => {
      setStep(next);
      const params = new URLSearchParams(searchParams.toString());
      params.set('step', next);
      router.replace(`/onboarding?${params.toString()}`);
    },
    [router, searchParams],
  );

  // Listen for external step changes (back/forward buttons)
  useEffect(() => {
    if (isWizardStepId(stepParam) && stepParam !== step) {
      setStep(stepParam);
    }
  }, [stepParam, step]);

  // Auto-advance from ICP capture once the canonical ICP exists
  useEffect(() => {
    if (step === 'icp' && !loadingIcp && activeIcp) {
      // Wait one tick so the chat's own "Done!" UI flashes
      const t = setTimeout(() => setStepAndUrl('review'), 600);
      return () => clearTimeout(t);
    }
  }, [step, loadingIcp, activeIcp, setStepAndUrl]);

  // Skip the capture step entirely if the tenant already has an ICP and they
  // landed on /onboarding with no step param (returning user)
  useEffect(() => {
    if (!stepParam && !loadingIcp && activeIcp && step === 'welcome') {
      setStepAndUrl('review');
    }
  }, [stepParam, loadingIcp, activeIcp, step, setStepAndUrl]);

  const advance = useCallback(() => {
    const n = nextStepId(step);
    if (n) setStepAndUrl(n);
  }, [step, setStepAndUrl]);

  const goBack = useCallback(() => {
    const p = prevStepId(step);
    if (p) setStepAndUrl(p);
  }, [step, setStepAndUrl]);

  const direction = useMemo(() => {
    // Track per-render direction so transitions slide correctly. We can't tell
    // direction from a single render - Framer's `custom` prop pattern fits, but
    // for the wizard's simple linear flow we always slide forward except on back.
    return 1;
  }, []);

  return (
    // h-screen + flex-col so the parent's `h-screen overflow-hidden` (set by
    // OnboardingPage) doesn't clip wizard content. The main area scrolls
    // internally; header + footer stay pinned.
    <div className="h-screen w-full bg-[#F8F9FE] dark:bg-[#000724] flex flex-col overflow-hidden">
      {/* z-[9999] keeps the wizard step indicator above the embedded ICP
          playground drawer (which sits at z-index 9998) so the tenant always
          sees their progress. */}
      <header className="border-b border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] z-[9999] shrink-0">
        <WizardStepper current={step} onJump={setStepAndUrl} />
      </header>

      <main className="flex-1 w-full overflow-y-auto">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            // min-h-full so short steps (Welcome/Company/Integrations) fill the
            // viewport while tall steps (Review with many sections) extend past
            // it and let the wizard's main `overflow-y-auto` kick in.
            className="min-h-full"
          >
            {step === 'welcome' && (
              <WizardWelcomeStep onContinue={advance} />
            )}
            {step === 'company' && (
              <WizardCompanyStep onBack={goBack} onContinue={advance} />
            )}
            {step === 'icp' && (
              <Screen2IcpCapture
                onBack={goBack}
                onSkip={() => setStepAndUrl('review')}
                onComplete={() => {
                  // Refresh the cached active ICP so the Review step pre-fills,
                  // then advance.
                  refetch();
                  setStepAndUrl('review');
                }}
              />
            )}
            {step === 'review' && (
              <Screen2IcpReview
                onBack={() => setStepAndUrl('icp')}
                onContinue={advance}
                onSavedRefetch={refetch}
              />
            )}
            {step === 'integrations' && (
              <WizardIntegrationsStep onBack={goBack} onContinue={() => router.push('/overview')} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="px-6 py-3 text-[11px] text-slate-400 dark:text-[#7a8ba3]/70 flex items-center justify-between border-t border-slate-200/60 dark:border-[#262831]">
        <span>Step {indexOfStep(step) + 1} of {WIZARD_STEPS.length}</span>
        <span>Mr LAD · signup wizard</span>
      </footer>
    </div>
  );
}
