'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Loader2,
  QrCode,
  LogOut,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenant } from '@/contexts/TenantContext';

// ── Types ────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_scanning' | 'connected' | 'error';

interface PersonalAccount {
  id: string;
  status: string;
  phone_number: string | null;
  connected_at: string | null;
  gateway_account_id: string | null;
  qr_code?: string;
  qr_expires_in?: number;
}

// ── API helpers ──────────────────────────────────────────────────

const PERSONAL_WA_API = '/api/personal-whatsapp';

async function createAccount(tenantId: string | null): Promise<PersonalAccount | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getAccountStatus(accountId: string, tenantId: string | null): Promise<PersonalAccount | null> {
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/accounts/${accountId}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function logoutAccount(accountId: string, tenantId: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ account_id: accountId, reason: 'user_requested' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function listAccounts(tenantId: string | null): Promise<PersonalAccount[]> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${PERSONAL_WA_API}/accounts`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

// ── Component ────────────────────────────────────────────────────

export const WhatsAppIntegration: React.FC = () => {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [account, setAccount] = useState<PersonalAccount | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Restore QR session on mount ─────────────────────────────

  useEffect(() => {
    const restoreSession = async () => {
      const accounts = await listAccounts(tenantId);
      // Find the first connected account
      const connectedAccount = accounts.find((acc) => acc.status === 'connected');
      if (connectedAccount) {
        setAccount(connectedAccount);
        setStatus('connected');
      }
    };

    restoreSession();
  }, [tenantId]);

  // ── Start QR generation ─────────────────────────────────────

  const startLogin = useCallback(async () => {
    cleanup();
    setLoading(true);
    setError(null);
    setQrImage(null);
    setStatus('connecting');

    const result = await createAccount(tenantId);

    if (!result || !result.id) {
      setError('Failed to initiate QR. Check that the WhatsApp service is running.');
      setStatus('error');
      setLoading(false);
      return;
    }

    setAccount(result);

    // Generate QR image from QR string
    if (result.qr_code) {
      try {
        const QRCode = (await import('qrcode')).default;
        const img = await QRCode.toDataURL(result.qr_code, { width: 260, margin: 2 });
        setQrImage(img);
      } catch {
        setQrImage(null);
      }
    }

    setStatus('qr_scanning');
    setLoading(false);

    // Start countdown timer
    const expiresIn = result.qr_expires_in || 240;
    setTimer(expiresIn);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          cleanup();
          setQrImage(null);
          setStatus('disconnected');
          setError('QR code expired. Please try again.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Start polling for status
    pollRef.current = setInterval(async () => {
      const statusResult = await getAccountStatus(result.id, tenantId);
      if (!statusResult) return;

      if (statusResult.status === 'connected') {
        cleanup();
        setAccount(statusResult);
        setQrImage(null);
        setStatus('connected');
      } else if (statusResult.status === 'error' || statusResult.status === 'disconnected' || statusResult.status === 'expired') {
        cleanup();
        setQrImage(null);
        setStatus('error');
        setError('Connection failed. Please try again.');
      }
      // If qr_scanning or reconnecting, keep polling
    }, 3000);
  }, [tenantId, cleanup]);

  // ── Logout ──────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    await logoutAccount(account.id, tenantId);
    cleanup();
    setAccount(null);
    setQrImage(null);
    setStatus('disconnected');
    setError(null);
    setLoading(false);
  }, [account, tenantId, cleanup]);

  // ── Helpers ─────────────────────────────────────────────────

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'qr_scanning': return 'Waiting for scan...';
      case 'connecting': return 'Generating QR...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'qr_scanning':
      case 'connecting': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  // ── UI ──────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>Connect your personal WhatsApp via QR code</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-3 items-center">
            <Smartphone className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Connection Status</p>
              <p className="text-xs text-gray-500">{statusLabel()}</p>
            </div>
          </div>
          <StatusIcon />
        </div>

        {/* Connected Account Info */}
        {status === 'connected' && account && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Account Connected</span>
            </div>
            {account.phone_number && (
              <p className="text-xs text-green-700">Phone: {account.phone_number}</p>
            )}
            {account.connected_at && (
              <p className="text-xs text-green-600 mt-1">
                Since: {new Date(account.connected_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-xs p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* QR Code Display */}
        {qrImage && status === 'qr_scanning' && (
          <div className="border-2 border-dashed border-gray-300 p-5 rounded-lg text-center">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Scan with WhatsApp</span>
              <span className={`text-sm font-mono ${timer < 60 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                {formatTime(timer)}
              </span>
            </div>
            <img
              src={qrImage}
              alt="WhatsApp QR Code"
              className="mx-auto w-64 h-64 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-3">
              Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status !== 'connected' ? (
          <Button
            onClick={startLogin}
            disabled={loading || status === 'qr_scanning'}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <QrCode className="mr-2 h-4 w-4" />
            )}
            {status === 'qr_scanning' ? 'Waiting for scan...' : 'Generate QR'}
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Disconnect
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
