'use client';

import React, { useState, useEffect } from 'react';
import { Linkedin, CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';
import { apiGet, apiPost } from '@/lib/api';
import { safeStorage } from '@/utils/storage';

// Helper to get auth headers for fetch calls
const getAuthHeaders = () => {
  const token = safeStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

interface LinkedInAccount {
  id?: string;
  connected: boolean;
  status?: 'connected' | 'disconnected' | 'stopped' | 'checkpoint' | 'unknown' | 'error';
  profileName?: string;
  profileUrl?: string;
  email?: string;
  connectedAt?: string;
  connectionMethod?: string;
  checkpoint?: {
    required: boolean;
    type?: string;
    message?: string;
    is_yes_no?: boolean;
    is_otp?: boolean;
  };
  unipileAccount?: {
    id: string;
    state: string;
    lastChecked: string;
  };
}

interface LinkedInStatusResponse {
  connected: boolean;
  status: string;
  connections: LinkedInAccount[];
  totalConnections: number;
}

type AuthMethod = 'credentials' | 'cookies';

export const LinkedInIntegration: React.FC = () => {
  const [linkedInConnections, setLinkedInConnections] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<{ [key: string]: boolean }>({});
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials');
  const [showOptionalSettings, setShowOptionalSettings] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [liAtCookie, setLiAtCookie] = useState('');
  const [liACookie, setLiACookie] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  
  // OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [currentCheckpointAccount, setCurrentCheckpointAccount] = useState<LinkedInAccount | null>(null);
  
  // Yes/No auto-polling states
  const [yesNoPolling, setYesNoPolling] = useState<NodeJS.Timeout | null>(null);
  const [autoResolving, setAutoResolving] = useState(false);

  useEffect(() => {
    checkLinkedInConnection();
    
    // Start polling status every 30 seconds if any connection is active
    const pollInterval = setInterval(() => {
      if (linkedInConnections.some(conn => conn.connected)) {
        checkLinkedInConnection();
      }
    }, 30000); // Poll every 30 seconds
    
    setStatusPolling(pollInterval);
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
      }
    };
  }, [linkedInConnections.length]);

  // Auto-polling for Yes/No checkpoint - monitors Unipile and auto-logins when user clicks Yes on mobile
  useEffect(() => {
    // If we have a Yes/No checkpoint, start polling to detect when user clicks Yes on mobile
    if (currentCheckpointAccount?.checkpoint?.is_yes_no && showOtpModal && !yesNoPolling) {
      console.log('[LinkedIn Integration] Starting Yes/No auto-polling to monitor Unipile...');
      
      const pollInterval = setInterval(async () => {
        try {
          const accountId = currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id;
          if (!accountId) return;

          console.log('[LinkedIn Integration] Polling checkpoint status for account:', accountId);
          
          const response = await fetch(`${getApiBaseUrl()}/api/social-integration/linkedin/checkpoint-status?account_id=${accountId}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });

          const data = await response.json();
          
          // If checkpoint is resolved (user clicked Yes on mobile), auto-login
          if (data.connected || data.status === 'connected' || (data.checkpoint && !data.checkpoint.required)) {
            console.log('[LinkedIn Integration] ✅ Checkpoint resolved! User clicked Yes on mobile. Auto-logging in...');
            
            // Stop polling
            if (yesNoPolling) {
              clearInterval(yesNoPolling);
              setYesNoPolling(null);
            }
            
            // Auto-close modal and refresh
            setAutoResolving(true);
            setShowOtpModal(false);
            setConnectionSuccess(true);
            
            // Refresh account status
            const accountEmail = currentCheckpointAccount?.email || email;
            await checkLinkedInConnection(accountEmail);
            
            // Close connection modal after a short delay
            setTimeout(() => {
              setShowConnectionModal(false);
              setEmail('');
              setPassword('');
              setLiAtCookie('');
              setLiACookie('');
              setAutoResolving(false);
            }, 2000);
          }
        } catch (error) {
          console.error('[LinkedIn Integration] Error polling checkpoint status:', error);
        }
      }, 3000); // Poll every 3 seconds
      
      setYesNoPolling(pollInterval);
      
      // Cleanup after 5 minutes (stop polling if user hasn't clicked Yes)
      setTimeout(() => {
        if (yesNoPolling) {
          clearInterval(yesNoPolling);
          setYesNoPolling(null);
          console.log('[LinkedIn Integration] Stopped Yes/No auto-polling after timeout');
        }
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    return () => {
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
    };
  }, [currentCheckpointAccount?.checkpoint?.is_yes_no, showOtpModal, yesNoPolling, email]);

  const checkLinkedInConnection = async (email?: string) => {
    try {
      // Use apiGet for authenticated requests
      const data = await apiGet<LinkedInStatusResponse>('/api/social-integration/linkedin/status');
      console.log('[LinkedIn Integration] Status response:', data);
      console.log('[LinkedIn Integration] Connections array:', data.connections);
      console.log('[LinkedIn Integration] Total connections:', data.connections?.length || 0);
      
      // Handle both old format (single account) and new format (array of connections)
      if (data.connections && Array.isArray(data.connections)) {
        console.log('[LinkedIn Integration] Setting', data.connections.length, 'connection(s)');
        setLinkedInConnections(data.connections);
      } else {
        // Fallback for old format
        console.log('[LinkedIn Integration] Using fallback format, setting 1 connection');
        setLinkedInConnections([data as LinkedInAccount]);
      }
    } catch (error) {
      console.error('Error checking LinkedIn connection:', error);
      setLinkedInConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(false);

    try {
      // Get user agent for cookie method
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      
      const payload = authMethod === 'credentials' 
        ? { method: 'credentials', email, password }
        : { method: 'cookies', li_at: liAtCookie, li_a: liACookie, user_agent: userAgent };

      const data = await apiPost<any>('/api/social-integration/linkedin/connect', payload);

      if (!data.success) {
        const errorMessage = data.error || 'Failed to connect LinkedIn account';
        setConnectionError(errorMessage);
        throw new Error(errorMessage);
      }

      // Check if checkpoint (OTP or Yes/No) is required
      if (data.checkpoint && data.checkpoint.required) {
        // Show checkpoint modal instead of closing connection modal
        setShowOtpModal(true);
        setConnectionSuccess(false);
        setConnectionError(null);
        
        // Store checkpoint account info
        const checkpointAccount: LinkedInAccount = {
          id: data.account_id,
          connected: false,
          status: 'checkpoint',
          profileName: data.profileName,
          profileUrl: data.profileUrl,
          email: data.email,
          connectedAt: data.connectedAt,
          checkpoint: data.checkpoint,
          unipileAccount: data.unipileAccount
        };
        setCurrentCheckpointAccount(checkpointAccount);
        
        // If it's a Yes/No checkpoint, show message that we're monitoring
        if (data.checkpoint.is_yes_no) {
          console.log('[LinkedIn Integration] Yes/No checkpoint detected - starting auto-monitoring');
        }
      } else {
        // Success - account created or connected
        setConnectionSuccess(true);
        
        // Clear form after a short delay to show success message
        setTimeout(() => {
          setShowConnectionModal(false);
          setEmail('');
          setPassword('');
          setLiAtCookie('');
          setLiACookie('');
          setConnectionError(null);
          setConnectionSuccess(false);
          // Refresh connection status to get ALL accounts for this user
          checkLinkedInConnection();
        }, 1500);
      }
    } catch (error) {
      console.error('Error connecting LinkedIn:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect LinkedIn account');
    } finally {
      setConnecting(false);
    }
  };

  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    setOtpError(null);

    try {
      // Include account_id and email from checkpoint account to help backend find the correct account
      const payload: any = { otp };
      if (currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id) {
        payload.account_id = currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id;
      }
      if (currentCheckpointAccount?.email || email) {
        payload.email = currentCheckpointAccount?.email || email;
      }

      const response = await fetch(`${getApiBaseUrl()}/api/social-integration/linkedin/verify-otp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to verify OTP';
        setOtpError(errorMessage);
        throw new Error(errorMessage);
      }

      // OTP verified successfully
      setShowOtpModal(false);
      setOtp('');
      setConnectionSuccess(true);
      
      // Stop Yes/No polling if active
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
      
      // Refresh account status with email if available
      const accountEmail = currentCheckpointAccount?.email || email;
      await checkLinkedInConnection(accountEmail);
      
      // Close connection modal after a short delay
      setTimeout(() => {
        setShowConnectionModal(false);
        setEmail('');
        setPassword('');
        setLiAtCookie('');
        setLiACookie('');
      }, 2000);
      
    } catch (error) {
      console.error('Error verifying OTP:', error);
      setOtpError(error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSolveYesNoCheckpoint = async (answer: 'YES' | 'NO') => {
    setVerifyingOtp(true);
    setOtpError(null);

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/social-integration/linkedin/solve-checkpoint`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          answer,
          account_id: currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Failed to submit ${answer} answer`;
        setOtpError(errorMessage);
        throw new Error(errorMessage);
      }

      // Checkpoint solved successfully
      setShowOtpModal(false);
      setConnectionSuccess(true);
      
      // Stop Yes/No polling if active
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
      
      // Refresh account status with email if available
      const accountEmail = currentCheckpointAccount?.email || email;
      await checkLinkedInConnection(accountEmail);
      
      // Close connection modal after a short delay
      setTimeout(() => {
        setShowConnectionModal(false);
        setEmail('');
        setPassword('');
        setLiAtCookie('');
        setLiACookie('');
      }, 2000);
      
    } catch (error) {
      console.error('Error solving checkpoint:', error);
      setOtpError(error instanceof Error ? error.message : `Failed to submit ${answer} answer`);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const disconnectLinkedIn = async (connectionId?: string, email?: string) => {
    const confirmMessage = connectionId 
      ? `Are you sure you want to disconnect this LinkedIn account (${email || 'this account'})?`
      : 'Are you sure you want to disconnect your LinkedIn account?';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    const disconnectKey = connectionId || 'default';
    setDisconnecting(prev => ({ ...prev, [disconnectKey]: true }));

    try {
      const url = connectionId 
        ? `${getApiBaseUrl()}/api/social-integration/linkedin/disconnect?connection_id=${connectionId}`
        : `${getApiBaseUrl()}/api/social-integration/linkedin/disconnect`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect LinkedIn');
      }

      // Remove the disconnected connection from the list
      if (connectionId) {
        setLinkedInConnections(prev => prev.filter(conn => conn.id !== connectionId));
      } else {
        setLinkedInConnections([]);
      }

      alert('LinkedIn account disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting LinkedIn:', error);
      alert('Failed to disconnect LinkedIn account');
    } finally {
      setDisconnecting(prev => ({ ...prev, [disconnectKey]: false }));
    }
  };

  const reconnectLinkedIn = async (useModal = false) => {
    // If useModal is true, open the connection modal for user to enter credentials
    if (useModal) {
      setShowConnectionModal(true);
      return;
    }

    setReconnecting(true);
    setConnectionError(null);

    try {
      // Try to reconnect with stored credentials/cookies first
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      
      const response = await fetch(`${getApiBaseUrl()}/api/social-integration/linkedin/reconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_agent: userAgent }), // Will use stored credentials if available
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to reconnect LinkedIn account';
        setConnectionError(errorMessage);
        
        // If reconnect fails and needs credentials, show modal
        if (errorMessage.includes('provide') || errorMessage.includes('credentials') || errorMessage.includes('password')) {
          // Don't show error, just open modal
          setShowConnectionModal(true);
          setConnectionError(null);
        }
        return;
      }

      // Success - refresh status
      setConnectionSuccess(true);
      await checkLinkedInConnection();
      
      setTimeout(() => {
        setConnectionSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Error reconnecting LinkedIn:', error);
      setConnectionError(error instanceof Error ? error.message : 'Failed to reconnect LinkedIn account');
      // Open modal if error suggests credentials needed
      if (error instanceof Error && (error.message.includes('provide') || error.message.includes('credentials'))) {
        setShowConnectionModal(true);
        setConnectionError(null);
      }
    } finally {
      setReconnecting(false);
    }
  };

  const getStatusDisplay = (accountStatus?: string, isConnected?: boolean) => {
    const status = accountStatus || (isConnected ? 'connected' : 'disconnected');
    
    switch (status) {
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-500',
          icon: CheckCircle2,
          text: 'Connected',
          showPulse: true
        };
      case 'disconnected':
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          icon: AlertCircle,
          text: 'Disconnected',
          showPulse: false
        };
      case 'stopped':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500',
          icon: AlertCircle,
          text: 'Stopped',
          showPulse: false
        };
      case 'checkpoint':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-500',
          icon: AlertCircle,
          text: 'Checkpoint Required',
          showPulse: false
        };
      case 'unknown':
      case 'error':
      default:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-500',
          icon: AlertCircle,
          text: 'Error',
          showPulse: false
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Linkedin className="h-6 w-6 text-blue-700" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">LinkedIn</h3>
              <p className="text-sm text-gray-600">
                Connect your LinkedIn account for automated lead enrichment and outreach
              </p>
            </div>
          </div>
          
          <div className="flex items-center">
            {(() => {
              const hasConnected = linkedInConnections.some(conn => conn.connected);
              const primaryStatus = linkedInConnections.length > 0 
                ? linkedInConnections[0].status || (linkedInConnections[0].connected ? 'connected' : 'disconnected')
                : 'disconnected';
              const statusDisplay = getStatusDisplay(primaryStatus, hasConnected);
              const StatusIcon = statusDisplay.icon;
              return (
                <div className={`flex items-center px-3 py-1.5 rounded-full border-2 ${
                  statusDisplay.color === 'text-green-600' ? 'bg-green-50 border-green-200' :
                  statusDisplay.color === 'text-gray-400' ? 'bg-gray-50 border-gray-200' :
                  statusDisplay.color === 'text-yellow-600' ? 'bg-yellow-50 border-yellow-200' :
                  statusDisplay.color === 'text-orange-600' ? 'bg-orange-50 border-orange-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  {statusDisplay.showPulse && (
                    <div className={`h-2.5 w-2.5 ${statusDisplay.bgColor} rounded-full mr-2 animate-pulse`}></div>
                  )}
                  <StatusIcon className={`h-4 w-4 mr-2 ${statusDisplay.color}`} />
                  <span className={`font-semibold text-sm ${statusDisplay.color}`}>
                    {linkedInConnections.length > 0 ? `${linkedInConnections.length} Account${linkedInConnections.length > 1 ? 's' : ''}` : statusDisplay.text}
                  </span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Display all connected LinkedIn accounts */}
        {linkedInConnections.length > 0 && (
          <div className="mb-6 space-y-3">
            <h4 className="font-medium text-gray-900 text-sm mb-2">
              Connected Accounts ({linkedInConnections.length})
            </h4>
            {linkedInConnections.map((account, index) => {
              const accountStatusDisplay = getStatusDisplay(account.status, account.connected);
              const AccountStatusIcon = accountStatusDisplay.icon;
              const accountNumber = index + 1;
              return (
                <div key={account.id || account.email || `account-${index}`} className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-white bg-blue-600 px-3 py-1 rounded-md shadow-sm">
                            Account {accountNumber}
                          </span>
                          <p className="font-medium text-gray-900">{account.profileName || account.email || 'LinkedIn Account'}</p>
                        </div>
                        <div className={`flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          accountStatusDisplay.color === 'text-green-600' ? 'bg-green-100 text-green-700' :
                          accountStatusDisplay.color === 'text-gray-400' ? 'bg-gray-100 text-gray-600' :
                          accountStatusDisplay.color === 'text-yellow-600' ? 'bg-yellow-100 text-yellow-700' :
                          accountStatusDisplay.color === 'text-orange-600' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {accountStatusDisplay.showPulse && (
                            <div className={`h-1.5 w-1.5 ${accountStatusDisplay.bgColor} rounded-full mr-1.5 animate-pulse`}></div>
                          )}
                          <AccountStatusIcon className={`h-3 w-3 mr-1 ${accountStatusDisplay.color}`} />
                          <span>{accountStatusDisplay.text}</span>
                        </div>
                      </div>
                      {account.email && (
                        <p className="text-sm text-gray-600">{account.email}</p>
                      )}
                      {account.profileUrl && (
                        <a
                          href={account.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center mt-1"
                        >
                          View Profile
                          <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                      {account.connectedAt && (
                        <p className="text-xs text-gray-500 mt-2">
                          Connected on {new Date(account.connectedAt).toLocaleDateString()}
                        </p>
                      )}
                      {account.status && account.status !== 'connected' && (
                        <div className={`mt-3 p-2 rounded-md text-xs ${
                          account.status === 'disconnected' ? 'bg-gray-100 text-gray-700' :
                          account.status === 'stopped' ? 'bg-yellow-100 text-yellow-700' :
                          account.status === 'checkpoint' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {account.status === 'disconnected' && '⚠️ Account is disconnected. Please reconnect to continue using LinkedIn features.'}
                          {account.status === 'stopped' && '⏸️ Account is stopped. Click reconnect to resume.'}
                          {account.status === 'checkpoint' && '🔒 LinkedIn requires verification. Please reconnect with your credentials.'}
                          {account.status === 'unknown' && '❓ Unable to determine account status. Please check your connection.'}
                          {account.status === 'error' && '❌ Error checking account status. Please try reconnecting.'}
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => disconnectLinkedIn(account.id, account.email)}
                        disabled={disconnecting[account.id || 'default']}
                        className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed transition-colors"
                      >
                        {disconnecting[account.id || 'default'] ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="space-y-4">
          <div className="border-t border-gray-200 pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Features</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Automatically enrich leads with LinkedIn profile data</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Extract decision maker information and contact details</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Access to company employee lists and org charts</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Send automated connection requests and messages</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                <span>Track engagement and response rates</span>
              </li>
            </ul>
          </div>

          <div className="border-t border-gray-200 pt-4 space-y-3">
            {/* Always show "Add Account" button to allow multiple connections */}
            <button
              onClick={() => setShowConnectionModal(true)}
              className="w-full bg-blue-700 text-white py-2 px-4 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center"
            >
              <Linkedin className="h-4 w-4 mr-2" />
              {linkedInConnections.length > 0 ? 'Add Another LinkedIn Account' : 'Connect LinkedIn Account'}
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 mr-3 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">Important Note</p>
                <p>
                  LinkedIn has strict rate limits and usage policies. Automated actions should be used 
                  responsibly to avoid account restrictions. We recommend limiting connection requests 
                  to 50-100 per day.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Modal */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded">
                  <Linkedin className="h-6 w-6 text-blue-700" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Sign in to LinkedIn</h2>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Choose Method */}
              <div className="mb-6">
                <h3 className="text-center text-2xl font-semibold text-gray-700 mb-4">Choose a method</h3>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setAuthMethod('credentials')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      authMethod === 'credentials'
                        ? 'bg-gray-100 text-gray-900 border-2 border-gray-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Credentials
                  </button>
                  <button
                    onClick={() => setAuthMethod('cookies')}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      authMethod === 'cookies'
                        ? 'bg-white text-gray-900 border-2 border-gray-300'
                        : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    Cookies
                  </button>
                </div>
              </div>

              {/* Credentials Form */}
              {authMethod === 'credentials' && (
                <div className="space-y-4">
                  <div>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Cookies Form */}
              {authMethod === 'cookies' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-gray-700 mb-1">
                      Copy your LinkedIn cookies.{' '}
                      <button
                        onClick={() => setShowCookieHelp(!showCookieHelp)}
                        className="text-blue-600 hover:text-blue-700 underline"
                      >
                        How to find them?
                      </button>
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Your cookies need to be collected in the same browser as this page.
                    </p>
                  </div>

                  {showCookieHelp && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                      <h4 className="font-semibold text-gray-900 mb-3">How to find my cookies?</h4>
                      <div className="text-sm text-gray-700 space-y-2">
                        <p className="font-medium">Follow the steps to find your linkedin cookies (not available on mobile)</p>
                        <ol className="list-decimal list-inside space-y-1 ml-2">
                          <li>Open linkedin in a new tab (or click here: <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">linkedin</a>).</li>
                          <li>Log in to your account.</li>
                          <li>Open your browser&apos;s developer console (F12 for Chrome and Firefox, option + command + I for Safari) then go to the &quot;application&quot; or &quot;storage&quot; tab.</li>
                          <li>Open the cookies folder and click on the one called &quot;https://www.linkedin.com&quot;.</li>
                          <li>Copy the values for &quot;li_at&quot; into the field below, then click on the connect button</li>
                        </ol>
                      </div>
                    </div>
                  )}

                  <div>
                    <input
                      type="text"
                      placeholder="Enter your li_at value"
                      value={liAtCookie}
                      onChange={(e) => setLiAtCookie(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <p className="text-gray-700 mb-2">
                      If your account has Recruiter or Sales Navigator subscription, copy the li_a too.
                    </p>
                    <input
                      type="text"
                      placeholder="Enter your li_a value (optional)"
                      value={liACookie}
                      onChange={(e) => setLiACookie(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              )}

              {/* Optional Settings */}
              <div className="mt-6">
                <button
                  onClick={() => setShowOptionalSettings(!showOptionalSettings)}
                  className="flex items-center text-gray-700 hover:text-gray-900 font-medium"
                >
                  {showOptionalSettings ? (
                    <ChevronUp className="h-5 w-5 mr-1" />
                  ) : (
                    <ChevronDown className="h-5 w-5 mr-1" />
                  )}
                  Optional settings
                </button>
                
                {showOptionalSettings && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600">
                      Additional configuration options will be available here for advanced users.
                    </p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {connectionError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Connection Failed</p>
                      <p className="text-sm text-red-700 mt-1">{connectionError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {connectionSuccess && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-green-800">Connection Successful!</p>
                      <p className="text-sm text-green-700 mt-1">Your LinkedIn account has been connected successfully.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-8">
                <button
                  onClick={() => {
                    setShowConnectionModal(false);
                    setEmail('');
                    setPassword('');
                    setLiAtCookie('');
                    setLiACookie('');
                    setConnectionError(null);
                    setConnectionSuccess(false);
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={connecting || (authMethod === 'credentials' ? !email || !password : !liAtCookie)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    connectionSuccess
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : connectionError
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-slate-800 text-white hover:bg-slate-900 disabled:bg-gray-300 disabled:cursor-not-allowed'
                  }`}
                >
                  {connecting ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Connecting...
                    </span>
                  ) : connectionSuccess ? (
                    <span className="flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Connected!
                    </span>
                  ) : connectionError ? (
                    'Retry'
                  ) : (
                    'Login'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkpoint Verification Modal (OTP or Yes/No) */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            {/* Header */}
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Linkedin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {currentCheckpointAccount?.checkpoint?.is_yes_no ? 'Verify Identity' : 'Verify OTP'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {currentCheckpointAccount?.checkpoint?.is_yes_no 
                      ? 'LinkedIn requires identity verification to complete the connection'
                      : 'LinkedIn requires OTP verification to complete the connection'}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {currentCheckpointAccount?.checkpoint?.message || 
                   (currentCheckpointAccount?.checkpoint?.is_yes_no
                     ? 'On your phone, LinkedIn shows Yes/No. What did you tap?'
                     : 'Please check your email or phone for the OTP code sent by LinkedIn.')}
                </p>
              </div>

              {/* Auto-resolving indicator for Yes/No */}
              {currentCheckpointAccount?.checkpoint?.is_yes_no && autoResolving && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 mr-2" />
                    <p className="text-sm text-blue-800">
                      <strong>Monitoring...</strong> We detected you clicked Yes on your phone. Completing connection...
                    </p>
                  </div>
                </div>
              )}

              {/* Yes/No Checkpoint */}
              {currentCheckpointAccount?.checkpoint?.is_yes_no ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-700 text-center">
                    Did you tap <strong>Yes</strong> or <strong>No</strong> on your phone?
                  </p>
                  
                  {/* Show monitoring message if polling is active */}
                  {yesNoPolling && !autoResolving && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-xs text-blue-700 text-center">
                        <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                        Monitoring Unipile... Click Yes on your phone and we'll detect it automatically.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSolveYesNoCheckpoint('YES')}
                      disabled={verifyingOtp || autoResolving}
                      className={`flex-1 px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
                        verifyingOtp || autoResolving
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {verifyingOtp || autoResolving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                          Processing...
                        </>
                      ) : (
                        'YES'
                      )}
                    </button>
                    <button
                      onClick={() => handleSolveYesNoCheckpoint('NO')}
                      disabled={verifyingOtp || autoResolving}
                      className={`flex-1 px-6 py-4 rounded-lg font-semibold text-lg transition-colors ${
                        verifyingOtp || autoResolving
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-red-600 text-white hover:bg-red-700'
                      }`}
                    >
                      {verifyingOtp || autoResolving ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin inline-block mr-2" />
                          Processing...
                        </>
                      ) : (
                        'NO'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* OTP Checkpoint */
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP Code
                  </label>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(value);
                      setOtpError(null);
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the 6-digit code sent to your email or phone
                  </p>
                </div>
              )}

              {/* Error Message */}
              {otpError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800">Verification Failed</p>
                      <p className="text-sm text-red-700 mt-1">{otpError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons for OTP */}
              {!currentCheckpointAccount?.checkpoint?.is_yes_no && (
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowOtpModal(false);
                      setOtp('');
                      setOtpError(null);
                      setShowConnectionModal(false);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    disabled={verifyingOtp || otp.length !== 6}
                    className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                      verifyingOtp || otp.length !== 6
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {verifyingOtp ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </button>
                </div>
              )}

              {/* Cancel button for Yes/No */}
              {currentCheckpointAccount?.checkpoint?.is_yes_no && (
                <div className="mt-6">
                  <button
                    onClick={() => {
                      setShowOtpModal(false);
                      setOtpError(null);
                      setShowConnectionModal(false);
                      // Stop polling
                      if (yesNoPolling) {
                        clearInterval(yesNoPolling);
                        setYesNoPolling(null);
                      }
                    }}
                    className="w-full px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
