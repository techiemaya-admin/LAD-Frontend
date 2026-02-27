'use client';

import React, { useState } from 'react';
import {
  useRelationshipScore,
  useMemberRelationships,
  useTopRelationships,
  useListMembers,
} from '@lad/frontend-features/community-roi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * Relationships Test Panel
 * Tests: Relationship Score, Member Relationships, Top Relationships
 */
export default function RelationshipsTestPanel() {
  const [member1Id, setMember1Id] = useState('');
  const [member2Id, setMember2Id] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [activeTab, setActiveTab] = useState<'score' | 'member' | 'top'>('score');

  const { data: members } = useListMembers({ tenantId: typeof window !== 'undefined' ? localStorage.getItem('tenantId') as any : null });
  const { data: relationshipScore, isLoading: isLoadingScore } = member1Id && member2Id && member1Id !== member2Id
    ? useRelationshipScore(member1Id, member2Id)
    : { data: null, isLoading: false };
  const { data: memberRelationships, isLoading: isLoadingMemberRels } = selectedMemberId
    ? useMemberRelationships(selectedMemberId)
    : { data: null, isLoading: false };
  const { data: topRelationships, isLoading: isLoadingTop } = useTopRelationships(10);

  return (
    <div className="space-y-6">
      {/* Member Selection for Score */}
      {activeTab === 'score' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👥</span> Select Two Members
            </CardTitle>
            <CardDescription>Compare relationship between two members</CardDescription>
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
      )}

      {/* Member Selection for Relationships */}
      {activeTab === 'member' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>👤</span> Select Member
            </CardTitle>
            <CardDescription>View all relationships for a member</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((m: any) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {['score', 'member', 'top'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 font-semibold transition ${
              activeTab === tab
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab === 'score' && '📊 Compare Score'}
            {tab === 'member' && '🔗 All Relationships'}
            {tab === 'top' && '⭐ Top Network'}
          </button>
        ))}
      </div>

      {/* Relationship Score */}
      {activeTab === 'score' && (
        <div>
          {!member1Id || !member2Id ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="h-4 w-4" />
                  Please select both members
                </div>
              </CardContent>
            </Card>
          ) : isLoadingScore ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading relationship score...
                </div>
              </CardContent>
            </Card>
          ) : relationshipScore ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Overall Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Overall Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-6xl font-bold text-orange-600">
                    {relationshipScore.score.toFixed(1)}
                    <span className="text-2xl text-slate-600">/10</span>
                  </div>
                </CardContent>
              </Card>

              {/* Score Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Score Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                    <span className="text-sm font-semibold text-blue-900">Meetings</span>
                    <span className="text-lg font-bold text-blue-600">{relationshipScore.meeting_score}/5</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                    <span className="text-sm font-semibold text-purple-900">Referrals</span>
                    <span className="text-lg font-bold text-purple-600">{relationshipScore.referral_score}/3</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                    <span className="text-sm font-semibold text-green-900">Business</span>
                    <span className="text-lg font-bold text-green-600">{relationshipScore.business_score}/2</span>
                  </div>
                </CardContent>
              </Card>

              {/* Metrics */}
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Relationship Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-xs text-slate-600 uppercase">Total Meetings</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {relationshipScore.total_meetings || 0}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-xs text-slate-600 uppercase">Referrals</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {relationshipScore.total_referrals || 0}
                    </div>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded">
                    <div className="text-xs text-slate-600 uppercase">Business Value</div>
                    <div className="text-2xl font-bold text-slate-900">
                      {relationshipScore.total_business_value || 0}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </div>
      )}

      {/* Member Relationships */}
      {activeTab === 'member' && (
        <div>
          {!selectedMemberId ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <AlertCircle className="h-4 w-4" />
                  Please select a member
                </div>
              </CardContent>
            </Card>
          ) : isLoadingMemberRels ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading relationships...
                </div>
              </CardContent>
            </Card>
          ) : memberRelationships && memberRelationships.length > 0 ? (
            <div className="space-y-3">
              {memberRelationships.map((rel: any) => (
                <Card key={rel.related_member_id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-slate-900">{rel.related_member_name}</div>
                        <div className="text-sm text-slate-600">
                          {rel.total_meetings || 0} meetings • {rel.total_referrals || 0} referrals
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          {rel.score.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-600">/10</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-slate-600">
                No relationships found
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Relationships */}
      {activeTab === 'top' && (
        <div>
          {isLoadingTop ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading top relationships...
                </div>
              </CardContent>
            </Card>
          ) : topRelationships && topRelationships.length > 0 ? (
            <div className="space-y-3">
              {topRelationships.map((rel: any, idx: number) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl font-bold text-slate-400">#{idx + 1}</div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {rel.member1_name} ↔ {rel.member2_name}
                          </div>
                          <div className="text-sm text-slate-600">
                            {rel.total_meetings || 0} meetings • {rel.total_referrals || 0} referrals •{' '}
                            {rel.total_business_value || 0} AED
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          {rel.score.toFixed(1)}
                        </div>
                        <div className="text-xs text-slate-600">/10</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-slate-600">
                No top relationships found
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
