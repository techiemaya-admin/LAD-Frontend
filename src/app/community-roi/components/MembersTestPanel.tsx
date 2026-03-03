'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Loader2, Plus, Search, Star, Trash2, Edit2 } from 'lucide-react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useListMembers, useCreateMember, useUpdateMember, useDeleteMember, useTopContributors } from '@lad/frontend-features/community-roi'

export default function MembersTestPanel() {
  const [createMode, setCreateMode] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRecommendations, setShowRecommendations] = useState(false)
  const { control, handleSubmit, reset, setValue } = useForm()

  const user = useSelector((state: RootState) => state.auth.user);
  const tenantId = user?.tenant_id || '';

  // API Hooks
  const { data: members, isLoading: membersLoading, error: membersError } = useListMembers({ tenantId })
  const { mutate: createMember, isPending: createPending } = useCreateMember()
  const { mutate: updateMember, isPending: updatePending } = useUpdateMember()
  const { mutate: deleteMember, isPending: deletePending } = useDeleteMember()
  const { data: topContributors } = useTopContributors(5)

  const handleCreateOrUpdate = (data: any) => {
    if (editingId) {
      updateMember({ id: editingId, data }, { onSuccess: () => { reset(); setEditingId(null) } })
    } else {
      createMember(data, { onSuccess: () => reset() })
    }
  }

  const handleEdit = (member: any) => {
    setEditingId(member.id)
    setValue('name', member.name)
    setValue('email', member.email)
  }

  const handleCancel = () => {
    reset()
    setEditingId(null)
    setCreateMode(false)
  }

  // Filter members client-side
  const membersList = Array.isArray(members) ? members : []
  const filteredMembers = membersList.filter((member: any) =>
    (member.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (member.email || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={() => setCreateMode(!createMode)}
          className="gap-2"
          variant={createMode ? 'outline' : 'default'}
        >
          <Plus className="w-4 h-4" />
          {createMode ? 'Cancel' : 'Add Member'}
        </Button>
        <Button
          onClick={() => setShowRecommendations(!showRecommendations)}
          variant="outline"
          className="gap-2"
        >
          <Star className="w-4 h-4" />
          Top Recommendations
        </Button>
      </div>

      {/* Create/Edit Form */}
      {createMode && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg">{editingId ? 'Update Member' : 'Create New Member'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(handleCreateOrUpdate)} className="space-y-4">
              <Input placeholder="Name" {...control.register('name')} />
              <Input type="email" placeholder="Email" {...control.register('email')} />
              <div className="flex gap-2">
                <Button type="submit" disabled={createPending || updatePending} className="flex-1">
                  {(createPending || updatePending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? 'Update' : 'Create'} Member
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search members by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Error State */}
      {membersError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load members</AlertDescription>
        </Alert>
      )}

      {/* Recommendations Panel */}
      {showRecommendations && topContributors && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-600" />
              Top Contributors
            </CardTitle>
            <CardDescription>Members with highest contribution scores</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.isArray(topContributors) && topContributors.map((contributor: any) => (
                <div key={contributor.id} className="flex justify-between items-center p-3 bg-white rounded border border-amber-100">
                  <div>
                    <p className="font-medium">{contributor.member?.name || contributor.name}</p>
                    <p className="text-sm text-slate-600">{contributor.member?.email || contributor.email}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="bg-amber-100">
                      Score: {contributor.contributionScore?.toFixed(1) || 0}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Members List</CardTitle>
          <CardDescription>{filteredMembers.length} total members</CardDescription>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600">No members found. Create your first member to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMembers.map((member: any) => (
                <div key={member.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50 transition">
                  <div className="flex-1">
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-slate-600">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge variant="secondary" className="mb-1">
                        Engagement: {member.engagementScore?.toFixed(1) || 0}/100
                      </Badge>
                      {member.isDeleted && <Badge variant="destructive">Deleted</Badge>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(member)}
                        disabled={member.isDeleted}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteMember(member.id)}
                        disabled={deletePending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
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
