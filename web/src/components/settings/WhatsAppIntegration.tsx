'use client';

import React, { useState } from 'react';
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
import { safeStorage } from '@/utils/storage';
import { getApiBaseUrl } from '@/lib/api-utils';

export const WhatsAppIntegration: React.FC = () => {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  const generateQRCode = async () => {
    setIsLoading(true);
    setConnectionStatus('connecting');
    
    try {
            const response = await fetch(`${getApiBaseUrl()}/api/whatsapp/generate-qr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to generate QR code');
      }

      const data = await response.json();
      setQrCode(data.qrCode);
      
      // Poll for connection status
      pollConnectionStatus();
    } catch (error) {
      console.error('Error generating QR code:', error);
      setConnectionStatus('disconnected');
    } finally {
      setIsLoading(false);
    }
  };

  const pollConnectionStatus = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/whatsapp/status`, {
          headers: {
            'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`
          }
        });

        const data = await response.json();
        
        if (data.connected) {
          setIsConnected(true);
          setConnectionStatus('connected');
          setQrCode(null);
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    }, 3000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  };

  const disconnectWhatsApp = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${safeStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setConnectionStatus('disconnected');
        setQrCode(null);
      }
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>Connect your WhatsApp account to send and receive messages</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Smartphone className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-sm">Connection Status</p>
              <p className="text-xs text-gray-500 mt-1">
                {connectionStatus === 'connected' ? 'WhatsApp is connected and active' : 
                 connectionStatus === 'connecting' ? 'Waiting for QR code scan...' :
                 'WhatsApp is not connected'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <CheckCircle className="h-5 w-5 text-green-500" />
            )}
            {connectionStatus === 'connecting' && (
              <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
            )}
            {connectionStatus === 'disconnected' && (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* QR Code Display */}
        {qrCode && (
          <div className="flex flex-col items-center justify-center p-6 bg-white border-2 border-dashed border-gray-300 rounded-lg">
            <QrCode className="h-8 w-8 text-gray-400 mb-4" />
            <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mb-4" />
            <p className="text-sm text-gray-600 text-center">
              Scan this QR code with WhatsApp on your phone
            </p>
            <p className="text-xs text-gray-500 text-center mt-2">
              Open WhatsApp → Settings → Linked Devices → Link a Device
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={generateQRCode}
              disabled={isLoading || connectionStatus === 'connecting'}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Generate QR Code
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnectWhatsApp}
              disabled={isLoading}
              variant="destructive"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disconnecting...
                </>
              ) : (
                'Disconnect WhatsApp'
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Keep your phone connected to the internet. Messages will be synced automatically.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
