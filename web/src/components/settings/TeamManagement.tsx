'use client';
import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronDown,
  Eye, EyeOff,
  X,
  Phone,
  Mail,
  MoreHorizontal,
  User,
  Shield,
  Eye as EyeIcon,
  Check
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogActions,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { safeStorage } from '@lad/shared/storage';
import { TeamManagementSkeleton } from '../skeletons';
import { getApiBaseUrl } from '@/lib/api-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  avatar?: string;
  phoneNumber?: string;
  capabilities?: string[];
  created_at?: string;
  maskPhoneNumber?: boolean;
  metadata?: { mask_phone_number?: boolean; [key: string]: unknown };
}

const PAGE_CAPABILITIES = [
  { key: 'view_overview', label: 'Overview' },
  { key: 'view_conversations', label: 'Conversations' },
  { key: 'view_followup', label: 'Follow-up' },
  { key: 'view_community_roi', label: 'Community ROI' },
  { key: 'view_scraper', label: 'Scraper' },
  { key: 'view_make_call', label: 'Make a Call' },
  { key: 'view_call_logs', label: 'Call Logs' },
  { key: 'view_pipeline', label: 'Pipeline' },
  { key: 'view_pricing', label: 'Pricing' },
  { key: 'view_settings', label: 'Settings' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Manager / Sales Rep' },
  { value: 'viewer', label: 'Viewer' },
];

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

export const TeamManagement: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Private workspaces. One tenant_features flag, read by the backend and by the
  // conversation service; this is just a second door onto it for the people who
  // actually run the workspace.
  const [privacy, setPrivacy] = useState<{ enabled: boolean; canEdit: boolean } | null>(null);
  const [privacySaving, setPrivacySaving] = useState(false);
  const [privacyNote, setPrivacyNote] = useState<string>('');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'member',
    phoneNumber: '',
    capabilities: [] as string[],
    maskPhoneNumber: false,
  });

  useEffect(() => {
    fetchUsers();
    void fetchPrivacy();
  }, []);

  const fetchPrivacy = async () => {
    try {
      const token = safeStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${getApiBaseUrl()}/api/users/team-privacy`, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data?.success) setPrivacy({ enabled: !!data.enabled, canEdit: !!data.canEdit });
    } catch {
      // Leave it null — the card simply does not render rather than showing a
      // switch whose position we cannot vouch for. A toggle that displays "off"
      // when we failed to read it is a lie about who can see what.
    }
  };

  const setPrivacyEnabled = async (enabled: boolean) => {
    setPrivacySaving(true);
    setPrivacyNote('');
    const previous = privacy;
    setPrivacy((p) => (p ? { ...p, enabled } : p));   // optimistic
    try {
      const token = safeStorage.getItem('token');
      const res = await fetch(`${getApiBaseUrl()}/api/users/team-privacy`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Could not save');
      setPrivacy((p) => (p ? { ...p, enabled: !!data.enabled } : p));
      setPrivacyNote(data.note || '');
    } catch (err) {
      setPrivacy(previous);   // put the switch back where it was
      setError(err instanceof Error ? err.message : 'Could not change this setting');
    } finally {
      setPrivacySaving(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.capabilities-dropdown')) {
        setShowCapabilitiesDropdown(false);
      }
    };
    if (showCapabilitiesDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showCapabilitiesDropdown]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = safeStorage.getItem('token');
      if (!token) {
        const redirect = encodeURIComponent('/settings?tab=team');
        router.push(`/login?redirect_url=${redirect}`);
        return;
      }
      const response = await fetch(`${getApiBaseUrl()}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        if (response.status === 401) {
          const redirect = encodeURIComponent('/settings?tab=team');
          router.push(`/login?redirect_url=${redirect}`);
          return;
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      const rawData: any[] = await response.json();
      const mapped = (Array.isArray(rawData) ? rawData : []).map((u: any) => ({
        ...u,
        maskPhoneNumber: !!(u.mask_phone_number ?? u.metadata?.mask_phone_number),
      }));
      setUsers(mapped);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to load team members');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newUser),
      });
      if (response.ok) {
        setShowAddModal(false);
        setNewUser({ name: '', email: '', password: '', role: 'member', phoneNumber: '', capabilities: [], maskPhoneNumber: false });
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  const toggleCapability = async (userId: string, capabilityKey: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const currentCapabilities = user.capabilities || [];
    const newCapabilities = currentCapabilities.includes(capabilityKey)
      ? currentCapabilities.filter(c => c !== capabilityKey)
      : [...currentCapabilities, capabilityKey];
    try {
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/capabilities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ capabilities: newCapabilities }),
      });
      if (response.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, capabilities: newCapabilities } : u
        ));
      }
    } catch (error) {
      console.error('Error updating capabilities:', error);
    }
  };

  const toggleMaskPhone = async (userId: string, current: boolean) => {
    try {
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/mask-phone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ maskPhoneNumber: !current }),
      });
      if (response.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, maskPhoneNumber: !current } : u
        ));
      }
    } catch (err) {
      console.error('Error toggling phone masking:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':  return 'bg-purple-50 text-purple-700 border border-purple-200 dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:!text-purple-400';
      case 'admin':  return 'bg-blue-50 text-blue-700 border border-blue-200 dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:!text-sky-400';
      case 'member': return 'bg-green-50 text-green-700 border border-green-200 dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:!text-emerald-400';
      case 'viewer': return 'bg-gray-50 text-gray-700 border border-gray-200 dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:!text-zinc-400';
      default:       return 'bg-gray-50 text-gray-700 border border-gray-200 dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!font-extrabold dark:!text-zinc-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="pl-6 pr-4 sm:px-8 pt-4 pb-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Team Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold leading-relaxed">
            Manage team members and their granular page permissions
          </p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-12 px-6 mr-3 sm:mr-4 lg:mr-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] dark:text-white dark:hover:bg-blue-700 rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Team Member
        </Button>
      </div>

      {/* Private workspaces */}
      {privacy && (
        <div className="mx-6 sm:mx-8 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100">Private workspaces</h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Each team member sees only their own campaigns, their own connected
                WhatsApp and LinkedIn accounts, and their own conversations. Company
                details and credits stay shared across the workspace. Owners and
                admins continue to see everything.
              </p>
              {privacy.enabled && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 leading-relaxed">
                  A member with no connected account of their own will see an empty
                  inbox until they connect one.
                </p>
              )}
              {privacyNote && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{privacyNote}</p>
              )}
              {!privacy.canEdit && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Only a workspace owner or admin can change this.
                </p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={privacy.enabled}
              aria-label="Private workspaces"
              disabled={!privacy.canEdit || privacySaving}
              onClick={() => setPrivacyEnabled(!privacy.enabled)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
                privacy.enabled ? 'bg-[#0B1957] dark:bg-blue-600' : 'bg-gray-300 dark:bg-zinc-700',
                (!privacy.canEdit || privacySaving) && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                  privacy.enabled ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 dark:bg-red-950/20 dark:border-red-900/30 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/50">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-red-700 dark:text-red-400 font-bold">Error loading team</p>
            <p className="text-red-600/80 dark:text-red-400/60 text-sm mt-0.5">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="rounded-xl border-red-200 dark:border-zinc-800 text-red-700 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-950/50"
          >
            Try Again
          </Button>
        </div>
      )}

      {loading && users.length === 0 ? (
        <TeamManagementSkeleton />
      ) : (
        <div className="bg-white mx-6 dark:bg-[#071131] rounded-2xl border border-slate-200 dark:border-blue-950/40 shadow-sm overflow-hidden text-slate-800 dark:text-slate-100">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full min-w-[700px]">
              <thead className="bg-slate-50/50 dark:bg-transparent border-b border-slate-200 dark:border-blue-950/40">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Team Member</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Role &amp; Status</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Permissions</th>
                  <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Privacy</th>
                  <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-blue-950/30">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-slate-100 dark:bg-[#030a21] mb-4 border border-slate-200 dark:border-blue-950/40">
                          <UserPlus className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">No team members</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs">Start by adding your first team member to collaborate on conversations.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                      {/* Team Member */}
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-[#030a21] border border-slate-200 dark:border-blue-900/40 flex items-center justify-center text-slate-800 dark:text-white font-bold text-sm shrink-0">
                            {(user.name || user.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">{user.name || '-'}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 opacity-60 text-slate-400" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Role & Status */}
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-2.5">
                          {user.role === 'owner' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-800/40 w-fit">
                              Owner
                            </span>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(val) => handleUpdateRole(user.id, val)}
                            >
                              <SelectTrigger className="h-9 w-fit min-w-[140px] bg-slate-50 dark:bg-[#030a21] border border-slate-200 dark:border-[#1e293b] text-blue-600 dark:text-blue-400 font-semibold text-xs rounded-xl px-3.5 shadow-none focus:ring-0">
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                                {ROLE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs focus:bg-blue-600 focus:text-white cursor-pointer">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase pl-0.5">
                            <span className={cn("h-1.5 w-1.5 rounded-full", user.status === 'inactive' ? "bg-rose-500" : "bg-emerald-500 dark:bg-emerald-400")} />
                            <span className={user.status === 'inactive' ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}>
                              {user.status || 'ACTIVE'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Permissions List */}
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                          {PAGE_CAPABILITIES.map((page) => {
                            const isChecked = user.capabilities?.includes(page.key);
                            return (
                              <label key={page.key} className="flex items-center gap-2.5 cursor-pointer group w-fit">
                                <div
                                  className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0",
                                    isChecked
                                      ? "border-blue-500 bg-blue-500 shadow-sm shadow-blue-500/50"
                                      : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-[#030a21] group-hover:border-slate-400 dark:group-hover:border-slate-500"
                                  )}
                                >
                                  {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                  {page.label}
                                </span>
                                <input
                                  type="checkbox"
                                  className="hidden"
                                  checked={isChecked || false}
                                  onChange={() => toggleCapability(user.id, page.key)}
                                />
                              </label>
                            );
                          })}
                        </div>
                      </td>

                      {/* Privacy Toggle */}
                      <td className="px-6 py-6">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                            className={cn(
                              "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              user.maskPhoneNumber ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-800"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                user.maskPhoneNumber ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                            {user.maskPhoneNumber ? 'Phone Masked' : 'Phone Visible'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-6 text-right">
                        <button className="p-2 rounded-xl bg-slate-100 dark:bg-[#030a21] border border-slate-200 dark:border-blue-950/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="w-full max-h-[85vh] sm:max-h-[90vh] sm:w-[90vw] sm:max-w-5xl flex flex-col p-0 overflow-hidden bg-white dark:bg-[#000724] border border-slate-200 dark:border-[#262831] rounded-xl sm:rounded-2xl my-auto">
          {/* Synchronized Header Row UI */}
          <DialogHeader className="p-4 md:p-6 border-b border-slate-100 dark:border-[#262831] dark:bg-[#0e1a3a]/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-500 text-blue-600 dark:text-blue-950 border border-blue-100 dark:border-transparent shadow-sm flex items-center justify-center w-10 h-10 shrink-0">
                <UserPlus className="h-5 w-5" />
              </div>
              <DialogTitle className="dark:text-white text-[#0b1957] text-left font-semibold text-lg leading-tight">
                Add Team Member
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6 space-y-5 md:space-y-6 custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 md:gap-y-6">
              <div className="space-y-1">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Name</label>
                <Input
                  placeholder="John Doe"
                  className="h-11 rounded-xl bg-gray-50/50 dark:text-white dark:placeholder-zinc-600 dark:autofill:shadow-[inset_0_0_0_1000px_#000724] dark:autofill:[text-fill-color:white] dark:autofill:[-webkit-text-fill-color:white]"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Email</label>
                <Input
                  type="email"
                  placeholder="admin@techiemaya.com"
                  className="h-11 rounded-xl bg-gray-50/50 dark:text-white dark:placeholder-zinc-600 dark:autofill:shadow-[inset_0_0_0_1000px_#000724] dark:autofill:[text-fill-color:white] dark:autofill:[-webkit-text-fill-color:white]"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="h-11 rounded-xl bg-gray-50/50 dark:text-white dark:placeholder-zinc-600 dark:autofill:shadow-[inset_0_0_0_1000px_#000724] dark:autofill:[text-fill-color:white] dark:autofill:[-webkit-text-fill-color:white]"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-zinc-300 cursor-pointer border-none bg-transparent outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Phone Number <span className="text-red-500">*</span></label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="h-11 rounded-xl bg-gray-50/50 dark:text-white dark:placeholder-zinc-600 dark:autofill:shadow-[inset_0_0_0_1000px_#000724] dark:autofill:[text-fill-color:white] dark:autofill:[-webkit-text-fill-color:white]"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Role</label>
                <Select
                  value={newUser.role}
                  onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50/50 dark:text-white">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#000c3b] border border-slate-200 dark:border-[#262831] rounded-xl shadow-xl">
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value} className="cursor-pointer">
                        {opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 relative capabilities-dropdown">
                <label className="text-xs md:text-sm font-medium text-gray-700 dark:text-zinc-300">Page Access</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCapabilitiesDropdown(!showCapabilitiesDropdown)}
                    className="w-full h-11 px-4 rounded-xl border border-input bg-gray-50/50 dark:bg-slate-900/50 dark:border-[#1c2c4e] flex items-center justify-between text-sm transition-colors hover:bg-gray-100/50 dark:hover:bg-[#1a2a43] dark:text-white cursor-pointer outline-none"
                  >
                    <span className={newUser.capabilities.length ? 'text-foreground dark:text-white font-medium' : 'text-muted-foreground dark:text-slate-400 font-medium'}>
                      {newUser.capabilities.length
                        ? `${newUser.capabilities.length} pages selected`
                        : 'Select pages...'}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 opacity-50 dark:text-zinc-400 transition-transform duration-200", showCapabilitiesDropdown && "rotate-180")} />
                  </button>

                  {showCapabilitiesDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#000724] border border-[#E2E8F0] dark:border-[#262831] rounded-xl shadow-xl z-[60] max-h-48 overflow-y-auto p-2 custom-scrollbar">
                      {PAGE_CAPABILITIES.map(page => (
                        <label key={page.key} className="flex items-center px-3 py-2 hover:bg-slate-100 dark:hover:bg-[#1a2a43] rounded-lg cursor-pointer transition-colors group">
                          <input
                            type="checkbox"
                            className="h-[18px] w-[18px] shrink-0 rounded-[5px] border-2 border-blue-500/80 dark:border-blue-500/50 bg-transparent text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 cursor-pointer appearance-none checked:bg-primary checked:border-primary relative checked:after:content-[''] checked:after:absolute checked:after:left-[5px] checked:after:top-[1px] checked:after:w-[4px] checked:after:h-[8px] checked:after:border-white checked:after:border-r-2 checked:after:border-b-2 checked:after:rotate-45 transition-all"
                            checked={newUser.capabilities.includes(page.key)}
                            onChange={() => {
                              const current = [...newUser.capabilities];
                              if (current.includes(page.key)) {
                                setNewUser({ ...newUser, capabilities: current.filter(id => id !== page.key) });
                              } else {
                                setNewUser({ ...newUser, capabilities: [...current, page.key] });
                              }
                            }}
                          />
                          <span className="ml-3 text-sm text-gray-700 dark:text-zinc-300 font-medium group-hover:text-gray-900 dark:group-hover:text-white">{page.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-row items-start justify-between p-4 md:p-6 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-[#1c2c4e] gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <label className="text-sm font-bold text-gray-900 dark:text-white">Mask Phone Numbers</label>
                <span className="text-xs text-gray-500 dark:text-zinc-400 leading-normal">Hide lead phone numbers from this team member for privacy (e.g. ••••3456)</span>
              </div>
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, maskPhoneNumber: !newUser.maskPhoneNumber })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none mt-1 outline-none",
                  newUser.maskPhoneNumber ? "bg-[#0B1957] dark:bg-blue-500" : "bg-gray-200 dark:bg-zinc-800"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    newUser.maskPhoneNumber ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 border-t border-slate-100 dark:border-[#262831] shrink-0">
            <Button
              onClick={handleAddUser}
              disabled={loading || !newUser.name || !newUser.email || !newUser.password}
              className="w-full sm:w-auto bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-500 rounded-xl h-11 px-8 font-bold shadow-sm transition-all cursor-pointer border-none outline-none"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
