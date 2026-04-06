'use client';
import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  CheckCircle,
  XCircle,
  ChevronDown,
  Eye, EyeOff 
} from 'lucide-react';
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
          router.push(`/login?redirect_url=${encodeURIComponent('/settings?tab=team')}`);
          return;
        }
        throw new Error('Failed to load team members');
      }
      const rawData = await response.json();
      const mapped = (Array.isArray(rawData) ? rawData : []).map((u: any) => ({
        ...u,
        maskPhoneNumber: !!(u.mask_phone_number ?? u.metadata?.mask_phone_number),
      }));
      setUsers(mapped);
    } catch (error: any) {
      setError(error.message || 'Failed to load team members');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
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
      const token = safeStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/api/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) fetchUsers();
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
        setUsers(users.map(u => u.id === userId ? { ...u, capabilities: newCapabilities } : u));
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
        setUsers(users.map(u => u.id === userId ? { ...u, maskPhoneNumber: !current } : u));
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
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) fetchUsers();
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600 mt-1">Manage team members and their page access permissions</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Team Member</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchUsers} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">Try Again</button>
        </div>
      )}

      {loading ? (
        <TeamManagementSkeleton />
      ) : (
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {!Array.isArray(users) || users.length === 0 ? (
              <div className="bg-white rounded-lg p-8 text-center text-gray-500 border border-gray-200">
                No team members found.
              </div>
            ) : (
              users.map((user) => (
                <div key={user.id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.status === 'active' ? 'active' : 'inactive'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Role</div>
                      <div className="mt-1">
                        <div className="relative inline-block w-full">
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            disabled={user.role === 'admin'}
                            className={`w-full px-2 py-1 rounded-md text-sm font-medium appearance-none pr-7 ${getRoleBadgeColor(user.role)} ${
                              user.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
                            }`}
                          >
                            {ROLE_OPTIONS.map(role => (
                              <option key={role.value} value={role.value}>{role.label}</option>
                            ))}
                          </select>
                          {user.role !== 'admin' && (
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none text-gray-500" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 uppercase font-semibold">Phone Masking</div>
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            user.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'
                          }`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${user.maskPhoneNumber ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                        <span className="text-xs text-gray-600">{user.maskPhoneNumber ? 'On' : 'Off'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-500 uppercase font-semibold mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-2">
                      {PAGE_CAPABILITIES.map(cap => (user.capabilities || []).includes(cap.key) && (
                        <span key={cap.key} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] whitespace-nowrap">{cap.label}</span>
                      ))}
                      {(user.capabilities || []).length === 0 && <span className="text-xs text-gray-400 italic">No access</span>}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    {user.role !== 'admin' && (
                      <button onClick={() => handleDeleteUser(user.id)} className="text-sm text-red-600 flex items-center gap-1.5"><Trash2 size={16}/> Remove</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                  {users.length === 0 ? (
                    <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-500">No team members found.</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block">
                            <select
                              value={user.role}
                              onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                              disabled={user.role === 'admin'}
                              className={`px-3 py-1.5 rounded-md text-sm font-medium appearance-none pr-8 ${getRoleBadgeColor(user.role)} ${user.role === 'admin' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {ROLE_OPTIONS.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
                            </select>
                            {user.role !== 'admin' && <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <ul className="text-xs space-y-0.5">
                            {PAGE_CAPABILITIES.map(cap => (user.capabilities || []).includes(cap.key) && <li key={cap.key}>• {cap.label}</li>)}
                          </ul>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleMaskPhone(user.id, !!user.maskPhoneNumber)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${user.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${user.maskPhoneNumber ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {user.role !== 'admin' && <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800"><Trash2 size={16}/></button>}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Assignments */}
      <div className="space-y-4 mt-8">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Conversation Assignments</h3>
          <p className="text-sm text-gray-600 mt-1">View team member workload</p>
        </div>
        {loading ? <p className="text-gray-500">Loading...</p> : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {users.filter(u => u.role !== 'viewer').map(user => (
                <div key={user.id} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center">
                  <div>
                    <div className="font-bold">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Active</div>
                    <div className="font-semibold text-blue-600">0</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr><th className="px-6 py-3 text-left">Member</th><th className="px-6 py-3 text-left">Active</th><th className="px-6 py-3 text-left">Total</th><th className="px-6 py-3 text-left">Status</th></tr>
                </thead>
                <tbody className="divide-y">
                  {users.filter(u => u.role !== 'viewer').map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4"><div>{user.name}</div><div className="text-xs text-gray-500">{user.email}</div></td>
                      <td className="px-6 py-4">0</td><td className="px-6 py-4">0</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">Available</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add Team Member</h3>
            </div>
            
            <div className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="john@example.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                >
                  {ROLE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between py-2 border-t border-gray-100">
                <div>
                  <label className="text-sm font-medium text-gray-700">Mask Phone Numbers</label>
                  <p className="text-xs text-gray-500">User will see masked phone numbers</p>
                </div>
                <button
                  onClick={() => setNewUser({ ...newUser, maskPhoneNumber: !newUser.maskPhoneNumber })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newUser.maskPhoneNumber ? 'bg-blue-600' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${newUser.maskPhoneNumber ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="space-y-2 border-t border-gray-100 pt-2">
                <label className="block text-sm font-medium text-gray-700">Page Access</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAGE_CAPABILITIES.map(cap => (
                    <label key={cap.key} className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={newUser.capabilities.includes(cap.key)}
                        onChange={(e) => {
                          const caps = e.target.checked 
                            ? [...newUser.capabilities, cap.key]
                            : newUser.capabilities.filter(c => c !== cap.key);
                          setNewUser({ ...newUser, capabilities: caps });
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className="text-xs text-gray-600 group-hover:text-gray-900">{cap.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300 bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email || !newUser.password}
                className="px-6 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
