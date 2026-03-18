'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

const GHL_API = '/api/social-integration/gohighlevel';

interface GHLAccount {
  connected: boolean;
  location_id?: string;
  connected_at?: string;
  last_synced?: string;
  contacts_count?: number;
}

interface CRMContact {
  id: string;
  source_id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  tags: string[];
  profile_photo: string | null;
  country: string | null;
  synced_at: string;
}

export const GoHighLevelIntegration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<GHLAccount | null>(null);
  const [token, setToken] = useState('');
  const [locationId, setLocationId] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{ contacts?: number; success: boolean; message?: string } | null>(null);

  // Sync & contacts state
  const [syncing, setSyncing] = useState(false);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTenant(`${GHL_API}/status`);
      if (res.ok) {
        const data = await res.json();
        setAccount(data?.data || null);
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Load contacts from local DB
  const loadContacts = useCallback(async (page = 1, search = '') => {
    setContactsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '100' });
      if (search) params.set('search', search);
      const res = await fetchWithTenant(`${GHL_API}/contacts/local?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.data || []);
        setContactsTotal(data.total || 0);
        setContactsPage(data.page || 1);
      }
    } catch {
      // ignore
    } finally {
      setContactsLoading(false);
    }
  }, []);

  // Save token
  const handleConnect = async () => {
    if (!token.trim()) {
      setError('Please enter your GoHighLevel Private Integration Token');
      return;
    }
    if (!locationId.trim()) {
      setError('Please enter your GoHighLevel Location ID');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithTenant(`${GHL_API}/connect`, {
        method: 'POST',
        body: JSON.stringify({ access_token: token.trim(), location_id: locationId.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('GoHighLevel connected successfully!');
        setAccount(data.data);
        setToken('');
        setLocationId('');
      } else {
        setError(data.error || 'Failed to connect. Please check your token.');
      }
    } catch {
      setError('Failed to connect to GoHighLevel.');
    } finally {
      setSaving(false);
    }
  };

  // Test connection
  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetchWithTenant(`${GHL_API}/test`);
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, contacts: data.data?.contacts_count, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Test failed' });
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to reach GoHighLevel API' });
    } finally {
      setTesting(false);
    }
  };

  // Sync contacts from GHL to local DB
  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithTenant(`${GHL_API}/contacts/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(`Synced ${data.data?.synced || 0} contacts from GoHighLevel.`);
        checkStatus();
        if (contactsExpanded) loadContacts(1, contactsSearch);
      } else {
        setError(data.error || 'Sync failed.');
      }
    } catch {
      setError('Failed to sync contacts.');
    } finally {
      setSyncing(false);
    }
  };

  // Disconnect
  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetchWithTenant(`${GHL_API}/disconnect`, { method: 'POST' });
      if (res.ok) {
        setAccount(null);
        setSuccess(null);
        setTestResult(null);
        setContacts([]);
        setContactsTotal(0);
        setContactsExpanded(false);
      }
    } catch {
      setError('Failed to disconnect.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Handle contacts search with debounce
  const handleContactsSearch = (value: string) => {
    setContactsSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      loadContacts(1, value);
    }, 400);
  };

  // Toggle contacts section
  const handleToggleContacts = () => {
    const next = !contactsExpanded;
    setContactsExpanded(next);
    if (next && contacts.length === 0) loadContacts(1, '');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.ceil(contactsTotal / 100);
  const showFrom = contactsTotal > 0 ? (contactsPage - 1) * 100 + 1 : 0;
  const showTo = Math.min(contactsPage * 100, contactsTotal);

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                GoHighLevel CRM
                {account?.connected && (
                  <Badge variant="default" className="bg-green-600 text-[10px]">Connected</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Connect your GoHighLevel account to sync contacts, deals, and automate workflows.
              </CardDescription>
            </div>
            {account?.connected && (
              <Button variant="outline" size="sm" onClick={checkStatus} className="h-8">
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {account?.connected ? (
            <>
              {/* Connected account info */}
              <div className="rounded-lg border border-green-200 bg-green-50/50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Connected to GoHighLevel</span>
                </div>
                {account.location_id && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5" />
                    <span>Location: {account.location_id}</span>
                  </div>
                )}
                {account.contacts_count !== undefined && account.contacts_count > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="h-3.5 w-3.5" />
                    <span>{account.contacts_count.toLocaleString()} contacts synced</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {account.connected_at && (
                    <span>Connected {new Date(account.connected_at).toLocaleDateString()}</span>
                  )}
                  {account.last_synced && (
                    <span>Last synced {new Date(account.last_synced).toLocaleString()}</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="flex-1"
                >
                  {syncing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {syncing ? 'Syncing...' : 'Sync Contacts'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTest}
                  disabled={testing}
                >
                  {testing ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  {disconnecting ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Disconnect
                </Button>
              </div>

              {/* Test result */}
              {testResult && (
                <div className={`rounded-lg border p-3 text-sm ${
                  testResult.success
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}>
                  {testResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        API connection working.
                        {testResult.contacts !== undefined && ` Found ${testResult.contacts.toLocaleString()} contacts.`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Connect form */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Private Integration Token
                  </label>
                  <div className="relative">
                    <Input
                      type={showToken ? 'text' : 'password'}
                      placeholder="Enter your GoHighLevel API token..."
                      value={token}
                      onChange={(e) => { setToken(e.target.value); setError(null); }}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken(!showToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Find your token in GoHighLevel &rarr; Settings &rarr; Business Profile &rarr; API Keys, or create a Private Integration in the Marketplace.
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground block mb-1.5">
                    Location ID
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your GoHighLevel Location ID..."
                    value={locationId}
                    onChange={(e) => { setLocationId(e.target.value); setError(null); }}
                  />
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Find your Location ID in GoHighLevel &rarr; Settings &rarr; Business Profile. It usually starts with a random string.
                  </p>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={saving || !token.trim() || !locationId.trim()}
                  className="w-full"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect GoHighLevel'
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Error / Success messages */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              {success}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Synced Contacts Card */}
      {account?.connected && (
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={handleToggleContacts}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Synced Contacts
                {contactsTotal > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{contactsTotal.toLocaleString()}</Badge>
                )}
              </CardTitle>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${contactsExpanded ? 'rotate-90' : ''}`} />
            </div>
          </CardHeader>

          {contactsExpanded && (
            <CardContent className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search contacts..."
                  value={contactsSearch}
                  onChange={(e) => handleContactsSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>

              {/* Contacts list */}
              {contactsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading contacts...</span>
                </div>
              ) : contacts.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  {contactsSearch ? 'No contacts match your search.' : 'No contacts synced yet. Click "Sync Contacts" to import from GoHighLevel.'}
                </div>
              ) : (
                <>
                  <ScrollArea className="h-[360px]">
                    <div className="space-y-1">
                      {contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          {/* Avatar */}
                          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-medium flex-shrink-0">
                            {contact.profile_photo ? (
                              <img src={contact.profile_photo} alt="" className="h-9 w-9 rounded-full object-cover" />
                            ) : (
                              (contact.name || contact.email || '?')[0]?.toUpperCase()
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {contact.name || contact.email || contact.phone || 'Unknown'}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {contact.email && (
                                <span className="flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3" />
                                  {contact.email}
                                </span>
                              )}
                              {contact.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {contact.phone}
                                </span>
                              )}
                              {contact.company_name && (
                                <span className="flex items-center gap-1 truncate">
                                  <Building2 className="h-3 w-3" />
                                  {contact.company_name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tags */}
                          {contact.tags && contact.tags.length > 0 && (
                            <div className="flex gap-1 flex-shrink-0">
                              {contact.tags.slice(0, 2).map((tag) => (
                                <Badge key={tag} variant="outline" className="text-[9px] px-1.5 py-0">
                                  {tag}
                                </Badge>
                              ))}
                              {contact.tags.length > 2 && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  +{contact.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Pagination */}
                  {contactsTotal > 100 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-xs text-muted-foreground">
                        Showing {showFrom}-{showTo} of {contactsTotal.toLocaleString()}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          disabled={contactsPage <= 1 || contactsLoading}
                          onClick={() => loadContacts(contactsPage - 1, contactsSearch)}
                        >
                          <ChevronLeft className="h-3.5 w-3.5" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2"
                          disabled={contactsPage >= totalPages || contactsLoading}
                          onClick={() => loadContacts(contactsPage + 1, contactsSearch)}
                        >
                          Next
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* API Info Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">API Reference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground space-y-1.5">
            <p>GoHighLevel API v2 is used for contact sync, pipeline management, and workflow automation.</p>
            <p>Base URL: <code className="bg-muted px-1 py-0.5 rounded">https://services.leadconnectorhq.com</code></p>
            <p>API Version: <code className="bg-muted px-1 py-0.5 rounded">2021-07-28</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
