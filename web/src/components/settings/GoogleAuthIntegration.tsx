'use client';

import React, { useState, useEffect } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getApiBaseUrl } from '@/lib/api-utils';

export const GoogleAuthIntegration: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    checkGoogleConnection();
    
    // Check if we're returning from OAuth flow
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('google') === 'connected') {
      // OAuth flow completed, update database
      handleOAuthCallback();
    }
  }, []);

  const checkGoogleConnection = async () => {
    try {
      // Check if user has Google Calendar connected
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        // Use voice_agent_user_id if available, otherwise fall back to regular user id
        const userId = meData?.voice_agent_user_id || meData?.id;

        if (userId) {
          // Check calendar connection status from our database
          const statusRes = await fetch(`${getApiBaseUrl()}/api/calendar/google/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
          });

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setIsConnected(statusData.connected || false);
            setUserEmail(statusData.email || null);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Google connection:', error);
    }
  };

  const handleOAuthCallback = async () => {
    try {
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
      });

      if (meRes.ok) {
        const meData = await meRes.json();
        const userId = meData?.voice_agent_user_id || meData?.id;

        if (userId) {
          // Check status from our backend (which already has the data from VOAG callback)
          const statusRes = await fetch(`${getApiBaseUrl()}/api/calendar/google/status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ user_id: userId }),
          });

          if (statusRes.ok) {
            const statusData = await statusRes.json();
            
            if (statusData.connected && statusData.email) {
              // Connection is already recorded in database from callback
              setIsConnected(true);
              setUserEmail(statusData.email);
            }
          }
        }
      }

      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    } catch (error) {
      console.error('Error handling OAuth callback:', error);
    }
  };

  const connectGoogle = async () => {
    setIsLoading(true);
    
    try {
      // Get the logged-in user's voice_agent_user_id or regular id
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
      });

      const meData = await meRes.json();
      // Use voice_agent_user_id if available, otherwise fall back to regular user id
      const userId = meData?.voice_agent_user_id || meData?.id;

      if (!userId) {
        alert('User ID not available');
        setIsLoading(false);
        return;
      }

      // Start Google Calendar OAuth flow - use backend proxy to avoid CORS
      const startRes = await fetch(`${getApiBaseUrl()}/api/calendar/google/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId, frontend_id: 'settings' }),
      });

      const result = await startRes.json();
      
      console.log('Google start response:', result);
      console.log('Response status:', startRes.status);
      
      if (!startRes.ok) {
        console.error('Google start failed:', result);
        alert(`Failed to start Google Calendar sync: ${JSON.stringify(result)}`);
        setIsLoading(false);
        return;
      }
      
      // Get the Google consent URL and redirect
      const authUrl = result?.url;
      if (authUrl) {
        window.location.href = authUrl;
      } else if (result.success) {
        setIsConnected(true);
        checkGoogleConnection();
      } else {
        alert('Failed to start Google Calendar sync');
      }
    } catch (error) {
      console.error('Error connecting to Google:', error);
      alert('Failed to connect Google account');
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectGoogle = async () => {
    setIsLoading(true);
    
    try {
      const meRes = await fetch('/api/auth/me', {
        method: 'GET',
      });

      const meData = await meRes.json();
      // Use voice_agent_user_id if available, otherwise fall back to regular user id
      const userId = meData?.voice_agent_user_id || meData?.id;

      if (userId) {
        // Call our backend to disconnect (it will update voag and database)
        const response = await fetch(`${getApiBaseUrl()}/api/calendar/google/disconnect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ user_id: userId }),
        });

        if (response.ok) {
          setIsConnected(false);
          setUserEmail(null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('Failed to disconnect Google:', errorData);
          alert(`Failed to disconnect: ${JSON.stringify(errorData)}`);
        }
      }
    } catch (error) {
      console.error('Error disconnecting Google:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <CardTitle>Google Calendar Integration</CardTitle>
            <CardDescription>Connect your Google account for Calendar and Gmail access</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-600" />
            <div>
              <p className="font-medium text-sm">Connection Status</p>
              {isConnected && userEmail ? (
                <p className="text-xs text-gray-500 mt-1">Connected as {userEmail}</p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Google account is not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>

        {/* Permissions */}
        {isConnected && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Granted Permissions:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">Google Calendar</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-xs text-green-700">Gmail</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!isConnected ? (
            <Button
              onClick={connectGoogle}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    width="18"
                    height="18"
                    className="mr-2"
                  >
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.9-6.9C35.9 1.9 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.88 6.9C13.44 13.27 18.3 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.5 24.5c0-1.59-.14-3.11-.41-4.55H24v9.21h12.7c-.55 2.98-2.2 5.5-4.71 7.2l7.2 5.59C43.86 37.97 46.5 31.72 46.5 24.5z"/>
                    <path fill="#FBBC05" d="M11.44 20.12l-8.88-6.9C.89 16.73 0 20.24 0 24c0 3.72.88 7.2 2.47 10.27l8.97-6.92c-.52-1.55-.81-3.22-.81-4.96 0-1.8.31-3.53.81-5.27z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.12 15.9-5.77l-7.2-5.59c-2.01 1.35-4.59 2.15-8.7 2.15-5.7 0-10.56-3.77-12.56-8.7l-8.97 6.92C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={disconnectGoogle}
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
                'Disconnect Google'
              )}
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> We only access the data you explicitly grant permission for. You can revoke access at any time.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
