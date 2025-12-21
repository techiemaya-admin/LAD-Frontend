'use client';

import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  Edit2, 
  Trash2, 
  CheckCircle,
  XCircle,
  ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { safeStorage } from '../../utils/storage';
import { LoadingSpinner } from '../LoadingSpinner';
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
}

const PAGE_CAPABILITIES = [
  { key: 'view_overview', label: 'View Overview' },
  { key: 'view_scraper', label: 'View Scraper' },
  { key: 'view_make_call', label: 'View Make a Call' },
  { key: 'view_call_logs', label: 'View Call Logs' },
  { key: 'view_pipeline', label: 'View Pipeline' },
  { key: 'view_pricing', label: 'View Pricing' },
  { key: 'view_settings', label: 'View Settings' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'co_admin', label: 'Co Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'sales_rep', label: 'Sales Representative' },
  { value: 'viewer', label: 'Viewer' },
];

export const TeamManagement: React.FC = () => {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCapabilitiesDropdown, setShowCapabilitiesDropdown] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sales_rep',
    phoneNumber: '',
    capabilities: [] as string[],
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
      
      console.log('[TeamManagement] Checking authentication:', {
        hasToken: !!token,
        tokenLength: token?.length || 0,
        tokenSource: safeStorage.getItem('token') ? 'token' : safeStorage.getItem('auth_token') ? 'auth_token' : 'none'
      });
      
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
      
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
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
        setNewUser({ name: '', email: '', password: '', role: 'sales_rep', phoneNumber: '', capabilities: [] });
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
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
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
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

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
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
      case 'admin': return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'co_admin': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'manager': return 'bg-green-50 text-green-700 border border-green-200';
      case 'sales_rep': return 'bg-orange-50 text-orange-700 border border-orange-200';
      case 'viewer': return 'bg-gray-50 text-gray-700 border border-gray-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
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

      {/* Users Table */}
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12">
                    <LoadingSpinner size="md" message="Loading team members..." />
                  </td>
                </tr>
              ) : !Array.isArray(users) || users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900">Add Team Member</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={newUser.phoneNumber}
                  onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ROLE_OPTIONS.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative capabilities-dropdown">
                <label className="block text-sm font-medium text-gray-700 mb-2">Page Access</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowCapabilitiesDropdown(!showCapabilitiesDropdown)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-700">
                      {newUser.capabilities.length === 0
                        ? 'Select pages...'
                        : `${newUser.capabilities.length} page${newUser.capabilities.length !== 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </button>
                  {showCapabilitiesDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 space-y-1">
                        {PAGE_CAPABILITIES.map(cap => (
                          <label key={cap.key} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors">
                            <input
                              type="checkbox"
                              checked={newUser.capabilities.includes(cap.key)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewUser({ ...newUser, capabilities: [...newUser.capabilities, cap.key] });
                                } else {
                                  setNewUser({ ...newUser, capabilities: newUser.capabilities.filter(c => c !== cap.key) });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">{cap.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email || !newUser.password}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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

// Component already exported inline above
