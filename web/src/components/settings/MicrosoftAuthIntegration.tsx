'use client';
import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiPost } from '@/lib/api';
import { getApiBaseUrl } from '@/lib/api-utils';
import { safeStorage } from '@/utils/storage';
export const MicrosoftAuthIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => {
    checkMicrosoftConnection();
    // Check if we're returning from OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('microsoft') === 'connected') {
      // OAuth flow completed, update database
      handleOAuthCallback();
    }
  }, []);
  const checkMicrosoftConnection = async () => {
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject({ timeout: true }), 15000) // 15 seconds timeout
      );
      // Check if user has Microsoft Calendar connected
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      const mePromise = fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const meRes = await Promise.race([mePromise, timeoutPromise]) as Response;
      if (meRes.ok) {
        const meData = await meRes.json();
        const userId = meData?.user?.id || meData?.id;
        if (userId) {
          // Check calendar connection status from our database with timeout
          const statusPromise = apiPost<any>('/api/social-integration/calendar/microsoft/status', { user_id: userId });
          const statusData = await Promise.race([statusPromise, timeoutPromise]);
          if (statusData.connected && statusData.email) {
            setIsConnected(true);
            setUserEmail(statusData.email);
          } else {
            setIsConnected(false);
            setUserEmail(null);
          }
        }
      }
    } catch (error: any) {
      if (error?.timeout) {
        console.error('[Microsoft Integration] Request timed out');
      } else {
        console.error('[Microsoft Integration] Error checking connection:', error);
      }
      setIsConnected(false);
      setUserEmail(null);
    }
  };
  const handleOAuthCallback = async () => {
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const meData = await meRes.json();
      const userId = meData?.user?.id || meData?.id;
      if (userId) {
        // Check if connection was successful
        const statusData = await apiPost<any>('/api/social-integration/calendar/microsoft/status', { user_id: userId });
        if (statusData.connected && statusData.email) {
          // Connection is already recorded in database from callback
          setIsConnected(true);
          setUserEmail(statusData.email);
        }
      }
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };
  const connectMicrosoft = async () => {
    setIsLoading(true);
    try {
      // Get the logged-in user's id
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!meRes.ok) {
        throw new Error('Failed to fetch user data');
      }
      const meData = await meRes.json();
      const userId = meData?.user?.id || meData?.id;
      if (!userId) {
        alert('User ID not available');
        setIsLoading(false);
        return;
      }
      // Start Microsoft Calendar OAuth flow - use backend proxy to avoid CORS
      const result = await apiPost<any>('/api/social-integration/calendar/microsoft/start', { 
        user_id: userId, 
        frontend_id: 'settings' 
      });
      if (!result?.url) {
        console.error('[Microsoft Integration] No OAuth URL in response:', result);
        alert('Failed to get Microsoft authorization URL. Please try again.');
        setIsLoading(false);
        return;
      }
      // Redirect to Microsoft OAuth URL
      window.location.href = result.url;
    } catch (error) {
      console.error('Error connecting to Microsoft:', error);
      alert('Failed to connect Microsoft account');
    } finally {
      setIsLoading(false);
    }
  };
  const disconnectMicrosoft = async () => {
    setIsLoading(true);
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!meRes.ok) {
        throw new Error('Failed to fetch user data');
      }
      const meData = await meRes.json();
      const userId = meData?.user?.id || meData?.id;
      if (!userId) {
        alert('User ID not available');
        setIsLoading(false);
        return;
      }
      // Disconnect Microsoft Calendar
      await apiPost('/api/social-integration/calendar/microsoft/disconnect', { user_id: userId });
      setIsConnected(false);
      setUserEmail(null);
    } catch (error) {
      console.error('Error disconnecting Microsoft:', error);
      alert('Failed to disconnect Microsoft account');
    } finally {
      setIsLoading(false);
    }
  };
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
                {isConnected && userEmail 
                  ? `Connected as ${userEmail}` 
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
            onClick={disconnectMicrosoft}
            disabled={isLoading}
          >
            {isLoading ? (
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
            disabled={isLoading}
          >
            {isLoading ? (
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
