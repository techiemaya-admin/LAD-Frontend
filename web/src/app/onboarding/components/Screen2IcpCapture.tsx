'use client';
// R8 Phase 3 - ICP capture step. Renders the split-layout IcpDiscoveryChat
// (chat left, live ICP card right). The old approach of embedding
// AdvancedSearchAIPage caused layout issues and surfaced the lead-search chat
// instead of a guided ICP capture; this self-contained component fixes both.

import * as React from 'react';
import IcpDiscoveryChat from './wizard/IcpDiscoveryChat';

interface Screen2IcpCaptureProps {
  onBack: () => void;
  onSkip: () => void;
  /** Fired after the ICP is persisted so the wizard can advance to Review. */
  onComplete?: () => void;
}

export default function Screen2IcpCapture({ onBack, onSkip, onComplete }: Screen2IcpCaptureProps) {
  return <IcpDiscoveryChat onBack={onBack} onSkip={onSkip} onComplete={onComplete} />;
}
