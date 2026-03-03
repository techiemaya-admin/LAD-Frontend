'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  useLogMeeting,
  useLogReferral,
  useGetInteractionHistory,
  useListMembers,
} from '@lad/frontend-features/community-roi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Interactions Test Panel
 * Tests: Log Meeting, Log Referral, Get Interaction History
 */
export default function InteractionsTestPanel() {
  const [member1Id, setMember1Id] = useState('');
  const [member2Id, setMember2Id] = useState('');
  const [activeTab, setActiveTab] = useState<'meeting' | 'referral' | 'history'>('meeting');

  const { data: members } = useListMembers({ tenantId: typeof window !== 'undefined' ? localStorage.getItem('tenantId') as any : null });
  const { data: history, isLoading: isLoadingHistory } = member1Id && member2Id
    ? useGetInteractionHistory(member1Id, member2Id)
    : { data: null, isLoading: false };

  // Mutations
  const meetingMutation = useLogMeeting();
  const referralMutation = useLogReferral();

  const { register: registerMeeting, handleSubmit: handleMeetingSubmit, reset: resetMeeting } = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      meeting_count: 1,
    },
  });

  const { register: registerReferral, handleSubmit: handleReferralSubmit, reset: resetReferral } = useForm({
    defaultValues: {
      status: 'active',
      value_aed: 0,
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onLogMeeting = async (data: any) => {
    if (!member1Id || !member2Id) {
      alert('Please select both members');
      return;
    }
    if (member1Id === member2Id) {
      alert('Members must be different');
      return;
    }
    try {
      await meetingMutation.mutateAsync({
        member_a_id: member1Id,
        member_b_id: member2Id,
        date: data.date,
        meeting_count: parseInt(data.meeting_count),
      });
      resetMeeting();
      alert('Meeting logged successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const onLogReferral = async (data: any) => {
    if (!member1Id || !member2Id) {
      alert('Please select both members');
      return;
    }
    if (member1Id === member2Id) {
      alert('Members must be different');
      return;
    }
    try {
      await referralMutation.mutateAsync({
        referred_by_id: member1Id,
        referred_to_id: member2Id,
        status: data.status,
        value_aed: parseFloat(data.value_aed),
        date: data.date,
      });
      resetReferral();
      alert('Referral logged successfully!');
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Member Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>👥</span> Select Members
          </CardTitle>
          <CardDescription>Choose two members for interaction</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Select value={member1Id} onValueChange={setMember1Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select first member" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={member2Id} onValueChange={setMember2Id}>
              <SelectTrigger>
                <SelectValue placeholder="Select second member" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['meeting', 'referral', 'history'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'meeting' && '🤝 Log Meeting'}
            {tab === 'referral' && '📝 Log Referral'}
            {tab === 'history' && '📊 View History'}
          </button>
        ))}
      </div>

      {/* Log Meeting Tab */}
      {activeTab === 'meeting' && (
        <Card>
          <CardHeader>
            <CardTitle>Log Meeting</CardTitle>
            <CardDescription>Record a meeting between two members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleMeetingSubmit(onLogMeeting)} className="space-y-4">
              <Input
                type="date"
                {...registerMeeting('date')}
                disabled={meetingMutation.isPending}
              />
              <Input
                type="number"
                placeholder="Number of meetings"
                min="1"
                {...registerMeeting('meeting_count')}
                disabled={meetingMutation.isPending}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={meetingMutation.isPending || !member1Id || !member2Id}
              >
                {meetingMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Meeting
              </Button>
              {meetingMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Meeting logged successfully!
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Log Referral Tab */}
      {activeTab === 'referral' && (
        <Card>
          <CardHeader>
            <CardTitle>Log Referral</CardTitle>
            <CardDescription>Record a referral between two members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleReferralSubmit(onLogReferral)} className="space-y-4">
              <Input
                type="date"
                {...registerReferral('date')}
                disabled={referralMutation.isPending}
              />
              <Select defaultValue="active">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Value in AED"
                min="0"
                step="0.01"
                {...registerReferral('value_aed')}
                disabled={referralMutation.isPending}
              />
              <Button 
                type="submit" 
                className="w-full"
                disabled={referralMutation.isPending || !member1Id || !member2Id}
              >
                {referralMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Log Referral
              </Button>
              {referralMutation.isSuccess && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  Referral logged successfully!
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Interaction History Tab */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <CardTitle>Interaction History</CardTitle>
            <CardDescription>View all interactions between selected members</CardDescription>
          </CardHeader>
          <CardContent>
            {!member1Id || !member2Id ? (
              <div className="flex items-center gap-2 text-slate-600">
                <AlertCircle className="h-4 w-4" />
                Please select both members
              </div>
            ) : isLoadingHistory ? (
              <div className="flex items-center gap-2 text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : history && (history.meetings.length > 0 || history.referrals.length > 0) ? (
              <div className="space-y-6">
                {/* Meetings */}
                {history.meetings.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">🤝 Meetings ({history.meetings.length})</h4>
                    <div className="space-y-2">
                      {history.meetings.map((m: any) => (
                        <div key={m.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                          <div className="text-sm text-slate-700">
                            {m.meeting_count} meeting(s) on {m.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Referrals */}
                {history.referrals.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">📝 Referrals ({history.referrals.length})</h4>
                    <div className="space-y-2">
                      {history.referrals.map((r: any) => (
                        <div key={r.id} className="p-3 bg-purple-50 rounded border border-purple-200">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {r.value_aed} AED
                              </div>
                              <div className="text-xs text-slate-600">Status: {r.status}</div>
                            </div>
                            <div className="text-xs text-slate-600">{r.date}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                No interactions found between these members
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
