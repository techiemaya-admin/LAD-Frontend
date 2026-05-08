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
  User,
  Shield,
  Eye as EyeIcon
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
  { key: 'view_overview', label: 'View Overview' },
  { key: 'view_conversations', label: 'View Conversations' },
  { key: 'view_followup', label: 'View Follow-up' },
  { key: 'view_community_roi', label: 'View Community ROI' },
  { key: 'view_scraper', label: 'View Scraper' },
  { key: 'view_make_call', label: 'View Make a Call' },
  { key: 'view_call_logs', label: 'View Call Logs' },
  { key: 'view_pipeline', label: 'View Pipeline' },
  { key: 'view_pricing', label: 'View Pricing' },
  { key: 'view_settings', label: 'View Settings' },
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
  }, []);

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
      case 'owner':  return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'admin':  return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'member': return 'bg-green-50 text-green-700 border-green-100';
      case 'viewer': return 'bg-gray-50 text-gray-700 border-gray-100';
      default:       return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Team Management</h2>
          <p className="text-gray-500 mt-1 font-medium">Manage team members and their granular page permissions</p>
        </div>
        <Button
          onClick={() => setShowAddModal(true)}
          className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
        >
          <UserPlus className="w-5 h-5" />
          Add Team Member
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex items-center gap-4">
          <div className="p-2 rounded-xl bg-red-100">
            <XCircle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="text-red-700 font-bold">Error loading team</p>
            <p className="text-red-600/80 text-sm mt-0.5">{error}</p>
          </div>
          <Button 
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="rounded-xl border-red-200 text-red-700 hover:bg-red-100/50"
          >
            Try Again
          </Button>
        </div>
      )}

      {loading && users.length === 0 ? (
        <TeamManagementSkeleton />
      ) : (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100/50 border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Team Member</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Role & Status</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Permissions</th>
                  <th className="px-8 py-5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Privacy</th>
                  <th className="px-8 py-5 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="flex flex-col items-center">
                        <div className="p-4 rounded-full bg-gray-50 mb-4">
                          <UserPlus className="h-8 w-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">No team members</h3>
                        <p className="text-gray-500 text-sm mt-1 max-w-xs">Start by adding your first team member to collaborate on conversations.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[#0B1957] flex items-center justify-center text-white font-bold shadow-sm">
                            {(user.name || user.email || '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">{user.name || '—'}</span>
                            <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 opacity-60" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-3">
                          {user.role === 'owner' ? (
                            <Badge className={cn("w-fit px-3 py-1 rounded-lg font-bold text-[10px] uppercase tracking-wider", getRoleBadgeColor(user.role))}>
                              Owner
                            </Badge>
                          ) : (
                            <Select
                              value={user.role}
                              onValueChange={(val) => handleUpdateRole(user.id, val)}
                            >
                              <SelectTrigger className={cn("h-8 w-fit min-w-[160px] border-none shadow-none text-xs font-bold rounded-lg px-3", getRoleBadgeColor(user.role))}>
                                <SelectValue placeholder="Select role" />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs font-medium">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-green-600 pl-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            {user.status || 'Active'}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                          {PAGE_CAPABILITIES.map(page => {
                            const isChecked = user.capabilities?.includes(page.key);
                            return (
                              <label key={page.key} className="flex items-center gap-2 cursor-pointer group w-fit">
                                <div className={cn(
                                  "w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors",
                                  isChecked ? "bg-[#0B1957] border-[#0B1957]" : "border-gray-300 group-hover:border-[#0B1957]"
                                )}>
                                  {isChecked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                </div>
                                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
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
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1.5">
                          <button
                            onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                            className={cn(
                              "relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                              user.maskPhoneNumber ? "bg-orange-500" : "bg-gray-200"
                            )}
                          >
                            <span
                              className={cn(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                user.maskPhoneNumber ? "translate-x-5" : "translate-x-0"
                              )}
                            />
                          </button>
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                            {user.maskPhoneNumber ? 'Phone Masked' : 'Phone Visible'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-900">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteUser(user.id)}
                            className="h-9 w-9 p-0 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
        <DialogContent className="sm:w-[90vw] sm:max-w-5xl flex flex-col p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            <div className="grid grid-cols-2 gap-x-12 gap-y-6">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  placeholder="John Doe"
                  className="h-11 rounded-xl bg-gray-50/50"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  type="email"
                  placeholder="admin@techiemaya.com"
                  className="h-11 rounded-xl bg-gray-50/50"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>

              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••••••"
                    className="h-11 rounded-xl bg-gray-50/50 pr-10"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Phone Number <span className="text-red-500">*</span></label>
                <Input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="h-11 rounded-xl bg-gray-50/50"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Select
                  value={newUser.role}
                  onValueChange={(val) => setNewUser({ ...newUser, role: val })}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-gray-50/50">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 relative">
                <label className="text-sm font-medium text-gray-700">Page Access</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCapabilitiesDropdown(!showCapabilitiesDropdown)}
                    className="w-full h-11 px-4 rounded-xl border border-input bg-gray-50/50 flex items-center justify-between text-sm transition-colors hover:bg-gray-100/50"
                  >
                    <span className={newUser.capabilities.length ? 'text-foreground' : 'text-muted-foreground'}>
                      {newUser.capabilities.length 
                        ? `${newUser.capabilities.length} pages selected`
                        : 'Select pages...'}
                    </span>
                    <ChevronDown className={cn("w-4 h-4 opacity-50", showCapabilitiesDropdown && "rotate-180")} />
                  </button>

                  {showCapabilitiesDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-xl shadow-xl z-[60] max-h-60 overflow-y-auto p-2">
                      {PAGE_CAPABILITIES.map(page => (
                        <label key={page.key} className="flex items-center px-3 py-2 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-[#0B1957] focus:ring-[#0B1957]"
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
                          <span className="ml-3 text-sm text-gray-700 font-medium group-hover:text-gray-900">{page.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-gray-900">Mask Phone Numbers</label>
                <span className="text-xs text-gray-500">Hide lead phone numbers from this team member for privacy (e.g. ••••3456)</span>
              </div>
              <button
                type="button"
                onClick={() => setNewUser({ ...newUser, maskPhoneNumber: !newUser.maskPhoneNumber })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  newUser.maskPhoneNumber ? "bg-[#0B1957]" : "bg-gray-200"
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
          </div>

          <DialogActions>
            <Button
              onClick={handleAddUser}
              disabled={loading || !newUser.name || !newUser.email || !newUser.password}
              className="bg-[#0B1957] hover:bg-[#0B1957]/90 text-white rounded-xl h-11 px-8 font-bold shadow-sm transition-all"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamManagement;
