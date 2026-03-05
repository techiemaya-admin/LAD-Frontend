'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';

type LiveBadgeProps = {
  isConnected?: boolean;
  showOffline?: boolean;
  className?: string;
};

export function LiveBadge({ isConnected = true, showOffline = false, className }: LiveBadgeProps) {
  const connected = Boolean(isConnected);

  if (!connected && showOffline) {
    return (
      <Badge
        className={className}
        style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
      >
        <WifiOff className="w-3 h-3 mr-1" />
        Offline
      </Badge>
    );
  }

  return (
    <Badge
      className={className}
      style={{ backgroundColor: '#dbfce7', color: 'green' }}
    >
      <Wifi className="w-3 h-3 mr-1" />
      Live
    </Badge>
  );
}
