'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useListMembers,
  useMember,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useTopContributors,
} from '@lad/frontend-features/community-roi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Members Test Panel
 * Tests: List, Create, Update, Delete, Search, Get Single, Engagement Score, Recommendations
 */
export default function MembersTestPanel() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries
  const { data: allMembers, isLoading: isLoadingList, error: listError } = useListMembers({ tenantId: typeof window !== 'undefined' ? localStorage.getItem('tenantId') as any : null });
  const { data: member, isLoading: isLoadingMember } = selectedMemberId 
    ? useMember(selectedMemberId as any)
    : { data: null, isLoading: false };
  const { data: recommendations, isLoading: isLoadingRecs } = useTopContributors(5);

  // Client-side search filtering
  const filteredMembers = searchQuery && allMembers
    ? allMembers.filter((m: any) => 
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  // Mutations
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();
  const deleteMutation = useDeleteMember();

  const { register: registerCreate, handleSubmit: handleCreateSubmit, reset: resetCreate } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      industry: '',
      role: '',
    },
  });

  const { register: registerUpdate, handleSubmit: handleUpdateSubmit, reset: resetUpdate } = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onCreateMember = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      resetCreate();
      alert('Member created successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const onUpdateMember = async (data: any) => {
    if (!selectedMemberId) {
      alert('Please select a member first');
      return;
    }
    try {
      await updateMutation.mutateAsync({ memberId: selectedMemberId, data });
      resetUpdate();
      alert('Member updated successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const onDeleteMember = async () => {
    if (!selectedMemberId) {
      alert('Please select a member first');
      return;
    }
    if (!confirm('Are you sure you want to delete this member?')) return;
    try {
      await deleteMutation.mutateAsync(selectedMemberId);
      setSelectedMemberId('');
      alert('Member deleted successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Member Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>➕</span> Create New Member
          </CardTitle>
          <CardDescription>Add a new community member to the network</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateSubmit(onCreateMember)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Name *"
                {...registerCreate('name')}
                required
                disabled={createMutation.isPending}
              />
              <Input
                placeholder="Email"
                type="email"
                {...registerCreate('email')}
                disabled={createMutation.isPending}
              />
              <Input
                placeholder="Phone"
                {...registerCreate('phone')}
                disabled={createMutation.isPending}
              />
              <Input
                placeholder="Industry"
                {...registerCreate('industry')}
                disabled={createMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Member
            </Button>
            {createMutation.isSuccess && (
              <div className="flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Created successfully!
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* List & Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔍</span> Search & List Members
          </CardTitle>
          <CardDescription>View all members or search by name</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search members by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredMembers && filteredMembers.length > 0 && (
            <div className="space-y-2">
              {filteredMembers.map((m: any) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedMemberId(m.id)}
                  className={`p-3 rounded-lg cursor-pointer transition ${
                    selectedMemberId === m.id
                      ? 'bg-blue-100 border-2 border-blue-500'
                      : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className="font-semibold text-slate-900">{m.name}</div>
                  <div className="text-sm text-slate-600">{m.email || 'No email'}</div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold text-slate-900 mb-3">All Members</h4>
            {isLoadingList && <div className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading...</div>}
            {allMembers && allMembers.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {allMembers.map((m: any) => (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`p-2 rounded cursor-pointer text-sm transition ${
                      selectedMemberId === m.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {m.name}
                  </div>
                ))}
              </div>
            )}
            {listError && <div className="flex items-center gap-2 text-red-600 text-sm"><AlertCircle className="h-4 w-4" />Error loading members</div>}
          </div>
        </CardContent>
      </Card>

      {/* Selected Member Details */}
      {selectedMemberId && member && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👤</span> Member Details
            </CardTitle>
            <CardDescription>{member.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Member Info */}
            <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded">
              <div>
                <div className="text-xs text-slate-600 uppercase">Name</div>
                <div className="font-semibold text-slate-900">{member.name}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 uppercase">Email</div>
                <div className="font-semibold text-slate-900">{member.email || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 uppercase">Phone</div>
                <div className="font-semibold text-slate-900">{member.phone || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-600 uppercase">Industry</div>
                <div className="font-semibold text-slate-900">{member.industry || '—'}</div>
              </div>
            </div>

            {/* Top Contributors / Recommendations */}
            {isLoadingRecs && <div className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Loading top contributors...</div>}
            {recommendations && recommendations.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 uppercase font-semibold">Top Contributors in Network</div>
                {recommendations.slice(0, 5).map((rec: any) => (
                  <div key={rec.id} className="p-2 bg-green-50 rounded text-sm">
                    <div className="font-semibold text-green-900">{rec.name}</div>
                    <div className="text-green-700">Contribution Score: {rec.contribution_score}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Update Form */}
            <form onSubmit={handleUpdateSubmit(onUpdateMember)} className="space-y-3 border-t pt-4">
              <h4 className="font-semibold text-slate-900">Update Member</h4>
              <Input
                placeholder="Update name"
                {...registerUpdate('name')}
                disabled={updateMutation.isPending}
              />
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update
                </Button>
                <Button 
                  type="button" 
                  variant="destructive"
                  onClick={onDeleteMember}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
