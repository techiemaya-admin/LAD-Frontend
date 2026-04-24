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
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';
import { safeStorage } from '@lad/shared/storage';  
import { TeamManagementSkeleton } from '../skeletons';
import { getApiBaseUrl } from '@/lib/api-utils';
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
// Valid tenant_role enum values in database: owner, admin, member, viewer
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Manager / Sales Rep' },
  { value: 'viewer', label: 'Viewer' },
];

// Maps UI labels back to valid DB enum values (for display)
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
    role: 'sales_rep',
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      console.debug('[TeamManagement] Token source:', safeStorage.getItem('token') ? 'token' : safeStorage.getItem('token') ? 'token' : 'none');
      if (!token) {
        // Redirect to login instead of showing error
        console.warn('[TeamManagement] No token found, redirecting to login');
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
        // If 401, redirect to login
        if (response.status === 401) {
          const redirect = encodeURIComponent('/settings?tab=team');
          router.push(`/login?redirect_url=${redirect}`);
          return;
        }
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMsg = errorData.details ? `${errorData.error}: ${errorData.details}` : (errorData.error || `HTTP ${response.status}`);
        throw new Error(errorMsg);
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
      const token = safeStorage.getItem('token')
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
        setNewUser({ name: '', email: '', password: '', role: 'sales_rep', phoneNumber: '', capabilities: [], maskPhoneNumber: false });
        fetchUsers();
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to add user');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Failed to add user');
    }
  };
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/capabilities`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ capabilities: newCapabilities }),
      });
      if (response.ok) {
        // Update local state immediately for better UX
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('token');
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
      case 'owner':  return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'admin':  return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'member': return 'bg-green-50 text-green-700 border border-green-200';
      case 'viewer': return 'bg-gray-50 text-gray-700 border border-gray-200';
      default:       return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600 mt-1">Manage team members and their page access permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          Add Team Member
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <TeamManagementSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Capabilities</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone Masking</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!Array.isArray(users) || users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {error ? 'Unable to load team members.' : 'No team members found. Add your first team member to get started.'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            disabled={user.role === 'admin'}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium appearance-none pr-8 ${getRoleBadgeColor(user.role)} ${
                              user.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                            }`}
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          {user.role !== 'admin' && (
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status === 'active' ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ul className="text-sm text-gray-700 space-y-1">
                          {PAGE_CAPABILITIES.map(cap => {
                            const hasCapability = (user.capabilities || []).includes(cap.key);
                            return (
                              <li key={cap.key} className="flex items-start gap-2">
                                <button
                                  onClick={() => user.role !== 'admin' && toggleCapability(user.id, cap.key)}
                                  disabled={user.role === 'admin'}
                                  className={`flex items-start gap-2 text-sm ${
                                    user.role === 'admin' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:text-blue-600'
                                  }`}
                                >
                                  <span className="mt-0.5 w-4 h-4 flex items-center justify-center">
                                    {hasCapability ? '•' : '○'}
                                  </span>
                                  <span>{cap.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                          title={user.maskPhoneNumber ? 'Phone numbers are masked — click to unmask' : 'Phone numbers are visible — click to mask'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            user.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              user.maskPhoneNumber ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <p className="text-xs text-gray-500 mt-1">{user.maskPhoneNumber ? 'Masked' : 'Visible'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Conversation Assignments Section */}
      <div className="space-y-4 mt-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conversation Assignments</h3>
          <p className="text-sm text-gray-600 mt-1">View team member workload and active assignments</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">Loading workload data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Team Member</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Active Assignments</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Assignments</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(users) && users.length > 0 ? (
                    users
                      .filter(user => user.role !== 'viewer')
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-blue-600">0</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">0</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                              Available
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No team members to display. Add a team member first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            onClick={fetchUsers}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <TeamManagementSkeleton />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Capabilities</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone Masking</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {!Array.isArray(users) || users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      {error ? 'Unable to load team members.' : 'No team members found. Add your first team member to get started.'}
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{user.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            disabled={user.role === 'admin'}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium appearance-none pr-8 ${getRoleBadgeColor(user.role)} ${
                              user.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                            }`}
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          {user.role !== 'admin' && (
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-gray-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {user.status === 'active' ? 'active' : 'inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <ul className="text-sm text-gray-700 space-y-1">
                          {PAGE_CAPABILITIES.map(cap => {
                            const hasCapability = (user.capabilities || []).includes(cap.key);
                            return (
                              <li key={cap.key} className="flex items-start gap-2">
                                <button
                                  onClick={() => user.role !== 'admin' && toggleCapability(user.id, cap.key)}
                                  disabled={user.role === 'admin'}
                                  className={`flex items-start gap-2 text-sm ${
                                    user.role === 'admin' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:text-blue-600'
                                  }`}
                                >
                                  <span className="mt-0.5 w-4 h-4 flex items-center justify-center">
                                    {hasCapability ? '•' : '○'}
                                  </span>
                                  <span>{cap.label}</span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                          title={user.maskPhoneNumber ? 'Phone numbers are masked — click to unmask' : 'Phone numbers are visible — click to mask'}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            user.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              user.maskPhoneNumber ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <p className="text-xs text-gray-500 mt-1">{user.maskPhoneNumber ? 'Masked' : 'Visible'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-gray-600 hover:text-red-600"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Conversation Assignments Section */}
      <div className="space-y-4 mt-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conversation Assignments</h3>
          <p className="text-sm text-gray-600 mt-1">View team member workload and active assignments</p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg p-8 text-center">
            <p className="text-gray-500">Loading workload data...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Team Member</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Active Assignments</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Total Assignments</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {Array.isArray(users) && users.length > 0 ? (
                    users
                      .filter(user => user.role !== 'viewer')
                      .map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-blue-600">0</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600">0</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                              Available
                            </span>
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                        No team members to display. Add a team member first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-5xl sm:w-[90vw] sm:h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-xl font-bold text-gray-900">Add Team Member</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  placeholder="John Doe"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="admin@techiemaya-admin.com"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none pr-10"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="Admin">Admin</option>
                  <option value="Manager / Sales Rep">Manager / Sales Rep</option>
                </select>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Access</label>
                <button
                  type="button"
                  onClick={() => setShowCapabilitiesDropdown(!showCapabilitiesDropdown)}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none flex items-center justify-between bg-white"
                >
                  <span className={newUser.capabilities.length ? 'text-gray-900' : 'text-gray-400'}>
                    {newUser.capabilities.length 
                      ? `${newUser.capabilities.length} pages selected`
                      : 'Select pages...'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCapabilitiesDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showCapabilitiesDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] max-h-60 overflow-y-auto p-2">
                    {PAGE_CAPABILITIES.map(page => (
                      <label key={page.key} className="flex items-center p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
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
                        <span className="ml-3 text-sm text-gray-700">{page.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2 flex items-center justify-between py-2 border-t border-gray-50 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mask Phone Numbers</label>
                  <p className="text-xs text-gray-500 mt-0.5">When enabled, this user will see contact phone numbers masked (e.g. ••••3456)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNewUser({ ...newUser, maskPhoneNumber: !newUser.maskPhoneNumber })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    newUser.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      newUser.maskPhoneNumber ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 flex gap-3 justify-end flex-shrink-0">
            <button
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddUser}
              disabled={loading || !newUser.name || !newUser.email || !newUser.password || !newUser.phoneNumber}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
