'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Loader2, TrendingUp } from 'lucide-react'
import { useListMembers, useRelationshipScore, useMemberRelationships, useTopRelationships } from '@lad/frontend-features/community-roi'

export default function RelationshipsTestPanel() {
  const [member1Id, setMember1Id] = useState('')
  const [member2Id, setMember2Id] = useState('')
  const [selectedMemberId, setSelectedMemberId] = useState('')

  // API Hooks
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null
  const { data: members, isLoading: membersLoading } = useListMembers({ tenantId: tenantId as any })
  const { data: scoreData, isLoading: scoreLoading } = useRelationshipScore(member1Id, member2Id)
  const { data: memberRelationships } = useMemberRelationships(selectedMemberId)
  const { data: topPairs } = useTopRelationships()

  const membersList = Array.isArray(members) ? members : []
  const relationshipsList = Array.isArray(memberRelationships) ? memberRelationships : []
  const topPairsList = Array.isArray(topPairs) ? topPairs : []

  return (
    <div className="space-y-6">
      {/* Score Comparison */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Relationship Score Comparison
          </CardTitle>
          <CardDescription>Compare relationship strength between two members</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Member 1</label>
              <Select value={member1Id} onValueChange={setMember1Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {membersList.map((member: any) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-center">
              <div className="text-2xl font-bold text-purple-600">VS</div>
            </div>
            <div>
              <label className="text-sm font-medium">Member 2</label>
              <Select value={member2Id} onValueChange={setMember2Id}>
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {membersList
                    .filter((m: any) => m.id !== member1Id)
                    .map((member: any) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {scoreLoading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          )}

          {scoreData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-white p-6 rounded-lg border border-purple-100">
                <div className="text-center">
                  <p className="text-sm text-slate-600 mb-2">Relationship Score</p>
                  <div className="text-5xl font-bold text-purple-600 mb-2">
                    {scoreData.score?.toFixed(1) || 0}
                    <span className="text-2xl text-slate-500">/10</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: `${(scoreData.score || 0) * 10}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-purple-100 space-y-3">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Meetings Score</span>
                    <Badge variant="outline">{scoreData.scores?.meetingScore?.toFixed(1) || 0}/5</Badge>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${((scoreData.scores?.meetingScore || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Referral Score</span>
                    <Badge variant="outline">{scoreData.scores?.referralScore?.toFixed(1) || 0}/3</Badge>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${((scoreData.scores?.referralScore || 0) / 3) * 100}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Business Score</span>
                    <Badge variant="outline">{scoreData.scores?.businessScore?.toFixed(1) || 0}/2</Badge>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${((scoreData.scores?.businessScore || 0) / 2) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Member Relationships */}
      <Card>
        <CardHeader>
          <CardTitle>Member Relationships</CardTitle>
          <CardDescription>View all relationship connections for a member</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member" />
            </SelectTrigger>
            <SelectContent>
              {membersList.map((member: any) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {relationshipsList.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No relationships found</p>
          ) : (
            <div className="space-y-2 mt-4">
              {relationshipsList.map((rel: any) => (
                <div key={rel.id} className="p-4 border rounded-lg flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-medium">{rel.targetMemberName}</p>
                    <p className="text-sm text-slate-600">{rel.targetMemberEmail}</p>
                  </div>
                  <Badge className="bg-gradient-to-r from-blue-500 to-purple-600">
                    Score: {rel.score?.toFixed(1) || 0}/10
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Relationship Pairs */}
      <Card>
        <CardHeader>
          <CardTitle>Top Relationship Pairs</CardTitle>
          <CardDescription>Strongest relationships in the network</CardDescription>
        </CardHeader>
        <CardContent>
          {topPairsList.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No relationships recorded yet</p>
          ) : (
            <div className="space-y-2">
              {topPairsList.map((pair: any, idx: number) => (
                <div key={idx} className="p-4 border rounded-lg flex justify-between items-center bg-gradient-to-r from-slate-50 to-slate-100">
                  <div>
                    <p className="font-medium">#{idx + 1} Connection</p>
                    <p className="text-sm text-slate-600">
                      {pair.member1Name} ↔ {pair.member2Name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-600">
                      {pair.score?.toFixed(1) || 0}/10
                    </Badge>
                    <p className="text-xs text-slate-600 mt-1">{pair.meetingCount || 0} meetings</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
