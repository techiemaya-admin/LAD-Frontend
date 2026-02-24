'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, Plus, Calendar } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useListMembers, useLogInteraction, useLogReferral, useInteractionsBetween } from '@lad/frontend-features/community-roi'

export default function InteractionsTestPanel() {
  const [activeMode, setActiveMode] = useState<'meeting' | 'referral'>('meeting')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMemberId2, setSelectedMemberId2] = useState('')
  const [referralTargetId, setReferralTargetId] = useState('')
  const { control, handleSubmit, reset } = useForm()

  // API Hooks
  const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null
  const { data: members, isLoading: membersLoading } = useListMembers({ tenantId: tenantId as any })
  const { mutate: logInteraction, isPending: interactionPending } = useLogInteraction()
  const { mutate: logReferral, isPending: referralPending } = useLogReferral()
  const { data: interactions } = useInteractionsBetween(selectedMemberId as any, selectedMemberId2 as any)

  const membersList = Array.isArray(members) ? members : []
  const interactionsList = Array.isArray(interactions?.data) ? interactions.data : []

  const handleLogInteraction = (data: any) => {
    if (!selectedMemberId || !selectedMemberId2) return
    logInteraction(
      {
        fromMemberId: selectedMemberId,
        toMemberId: selectedMemberId2,
        type: 'MEETING',
        date: new Date(data.meetingDate).toISOString(),
        count: parseInt(data.meetingCount) || 1,
      },
      {
        onSuccess: () => {
          reset()
          setSelectedMemberId('')
          setSelectedMemberId2('')
        },
      }
    )
  }

  const handleLogReferral = (data: any) => {
    if (!selectedMemberId || !referralTargetId) return
    logReferral(
      {
        fromMemberId: selectedMemberId,
        toMemberId: referralTargetId,
        status: data.referralStatus || 'pending',
        aedValue: parseFloat(data.aedValue) || 0,
      },
      {
        onSuccess: () => {
          reset()
          setSelectedMemberId('')
          setReferralTargetId('')
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Mode Tabs */}
      <div className="flex gap-2">
        <Button
          variant={activeMode === 'meeting' ? 'default' : 'outline'}
          onClick={() => setActiveMode('meeting')}
          className="gap-2"
        >
          <Calendar className="w-4 h-4" />
          Log Meeting
        </Button>
        <Button
          variant={activeMode === 'referral' ? 'default' : 'outline'}
          onClick={() => setActiveMode('referral')}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Referral
        </Button>
      </div>

      {/* Forms */}
      {activeMode === 'meeting' && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Log Meeting</CardTitle>
            <CardDescription>Record meetings between members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleLogInteraction)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Select Member 1</label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
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
              <div>
                <label className="text-sm font-medium">Select Member 2</label>
                <Select value={selectedMemberId2} onValueChange={setSelectedMemberId2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {membersList
                      .filter((m: any) => m.id !== selectedMemberId)
                      .map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Meeting Date</label>
                  <Input type="date" {...control.register('meetingDate')} />
                </div>
                <div>
                  <label className="text-sm font-medium">Count</label>
                  <Input type="number" placeholder="1" min="1" {...control.register('meetingCount')} />
                </div>
              </div>
              <Button type="submit" disabled={!selectedMemberId || !selectedMemberId2 || interactionPending} className="w-full">
                {interactionPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Meeting
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {activeMode === 'referral' && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle>Log Referral</CardTitle>
            <CardDescription>Record referrals between members</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleLogReferral)} className="space-y-4">
              <div>
                <label className="text-sm font-medium">From Member</label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
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
              <div>
                <label className="text-sm font-medium">To Member</label>
                <Select value={referralTargetId} onValueChange={setReferralTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {membersList
                      .filter((m: any) => m.id !== selectedMemberId)
                      .map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim()}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <Select {...control.register('referralStatus')}>
                    <SelectTrigger>
                      <SelectValue placeholder="pending" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">AED Value</label>
                  <Input type="number" placeholder="0" step="0.01" {...control.register('aedValue')} />
                </div>
              </div>
              <Button type="submit" disabled={!selectedMemberId || !referralTargetId || referralPending} className="w-full">
                {referralPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Log Referral
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Interaction History */}
      {selectedMemberId && (
        <Card>
          <CardHeader>
            <CardTitle>Interaction History</CardTitle>
            <CardDescription>All interactions for the selected member</CardDescription>
          </CardHeader>
          <CardContent>
            {interactionsList.length === 0 ? (
              <p className="text-slate-600 text-center py-8">No interactions recorded yet</p>
            ) : (
              <div className="space-y-3">
                {interactionsList.map((interaction: any) => (
                  <div key={interaction.id} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{interaction.type === 'MEETING' ? '📅 Meeting' : '🔗 Referral'}</p>
                        <p className="text-sm text-slate-600">
                          {new Date(interaction.date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {interaction.type === 'MEETING' ? `${interaction.count} meetings` : `AED ${interaction.aedValue}`}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">
                      Status: <Badge className="ml-1">{interaction.status}</Badge>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
