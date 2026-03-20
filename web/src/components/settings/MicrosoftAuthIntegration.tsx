'use client';
import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useMicrosoftEmailStatus,
  startMicrosoftOAuth,
} from '@lad/frontend-features/email-accounts';

export const MicrosoftAuthIntegration: React.FC = () => {
  const { isConnected, email, isLoading, refetch, disconnect } = useMicrosoftEmailStatus();
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    // If returning from Microsoft OAuth flow, refresh status + clean up URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('microsoft') === 'connected') {
      refetch();
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    }
  }, [refetch]);

  const connectMicrosoft = async () => {
    setIsActing(true);
    try {
      const result = await startMicrosoftOAuth('settings');
      if (!result?.url) {
        alert('Failed to get Microsoft authorization URL. Please try again.');
        return;
      }
      window.location.href = result.url;
    } catch (error) {
      console.error('[MicrosoftAuthIntegration] Error starting OAuth:', error);
      alert('Failed to connect Microsoft account');
    } finally {
      setIsActing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsActing(true);
    try {
      await disconnect();
    } catch (error) {
      console.error('[MicrosoftAuthIntegration] Error disconnecting:', error);
      alert('Failed to disconnect Microsoft account');
    } finally {
      setIsActing(false);
    }
  };

  const busy = isLoading || isActing;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle>Microsoft Calendar Integration</CardTitle>
            <CardDescription>
              Connect your Microsoft account for Calendar and Contacts access
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-sm text-gray-500">
                {isConnected && email
                  ? `Connected as ${email}`
                  : 'Microsoft account is not connected'}
              </p>
            </div>
          </div>
          {isConnected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {isConnected ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleDisconnect}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect'
            )}
          </Button>
        ) : (
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={connectMicrosoft}
            disabled={busy}
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-gray-500">
          <strong>Note:</strong> We only access the data you explicitly grant permission for. You can revoke access at any time.
        </p>
      </CardContent>
    </Card>
  );
};
