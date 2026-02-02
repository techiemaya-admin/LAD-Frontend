'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Loader2,
  QrCode
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

const BACKEND = process.env.NEXT_PUBLIC_WP_BACKEND!;

export const WhatsAppIntegration: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);
  const [timer, setTimer] = useState(240);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /* -------------------- SSE -------------------- */

  useEffect(() => {
    connectSSE();
    return () => cleanupAll();
  }, []);

  const connectSSE = async () => {
    try {
      const response = await fetch(`${BACKEND}/events`, {
        headers: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok || !response.body) {
        throw new Error('SSE connection failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const message = JSON.parse(line.slice(6));
              console.log('📨 SSE:', message);
              await handleSSE(message);
            } catch (err) {
              console.error('SSE parse error:', err);
            }
          }
        }
      }
    } catch (err) {
      console.error('❌ SSE error:', err);
      setSseConnected(false);
      
      setTimeout(() => {
        connectSSE();
      }, 3000);
    }
  };

  /* -------------------- HANDLE EVENTS -------------------- */

  const handleSSE = async (msg: any) => {
    switch (msg.type) {
      case 'connected':
        console.log('✅ SSE connected successfully');
        setSseConnected(true);
        break;

      case 'qr': {
        const QRCode = (await import('qrcode')).default;
        const img = await QRCode.toDataURL(msg.data.qr, { width: 260 });
        setQrCode(img);
        setStatus('connecting');
        setLoading(false);
        startTimer();
        break;
      }

      case 'login_success':
        cleanupQR();
        setQrCode(null);
        setIsConnected(true);
        setStatus('connected');
        break;

      case 'qr_timeout':
      case 'qr_error':
        cleanupQR();
        setQrCode(null);
        setStatus('disconnected');
        alert('QR expired. Try again.');
        break;
    }
  };

  /* -------------------- TIMER -------------------- */

  const startTimer = () => {
    cleanupQR();
    setTimer(240);

    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          cleanupQR();
          setQrCode(null);
          setStatus('disconnected');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const cleanupQR = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cleanupAll = () => {
    cleanupQR();
  };

  /* -------------------- ACTIONS -------------------- */

  const startLogin = async () => {
    if (!sseConnected || status === 'connecting') return;

    setLoading(true);
    setStatus('connecting');

    await fetch(`${BACKEND}/api/login`, { method: 'POST' });
    // QR will arrive via SSE
  };

  const logout = async () => {
    await fetch(`${BACKEND}/api/logout`, { method: 'POST' });
    cleanupQR();
    setIsConnected(false);
    setStatus('disconnected');
    setQrCode(null);
  };

  const formatTime = () =>
    `${Math.floor(timer / 60)
      .toString()
      .padStart(2, '0')}:${(timer % 60).toString().padStart(2, '0')}`;

  /* -------------------- UI -------------------- */

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>Connect using QR code</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!sseConnected && (
          <div className="flex items-center gap-2 text-xs p-3 bg-yellow-50 border rounded">
            <Loader2 className="h-4 w-4 animate-spin" />
            Connecting to server…
          </div>
        )}

        <div className="flex justify-between p-4 bg-gray-50 rounded">
          <div className="flex gap-2 items-center">
            <Smartphone className="h-5 w-5" />
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-xs text-gray-500">
                {status === 'connected'
                  ? 'Connected'
                  : status === 'connecting'
                  ? 'Waiting for scan'
                  : 'Disconnected'}
              </p>
            </div>
          </div>

          {status === 'connected' && <CheckCircle className="text-green-500" />}
          {status === 'connecting' && <RefreshCw className="animate-spin" />}
          {status === 'disconnected' && <AlertCircle />}
        </div>

        {qrCode && (
          <div className="border-2 border-dashed p-4 rounded text-center">
            <div className="flex justify-between mb-2 text-sm">
              <span>Scan QR</span>
              <span className={timer < 60 ? 'text-red-500' : ''}>
                {formatTime()}
              </span>
            </div>
            <img src={qrCode} className="mx-auto w-64 h-64" />
          </div>
        )}

        {!isConnected ? (
          <Button
            onClick={startLogin}
            disabled={loading || !sseConnected}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" />
            ) : (
              <QrCode className="mr-2" />
            )}
            Generate QR
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={logout}
            className="w-full"
          >
            Disconnect
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
