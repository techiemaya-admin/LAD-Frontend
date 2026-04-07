import { memo, useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  History,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface AssignmentPanelProps {
  conversationId: string;
  onAssignmentChange?: () => void;
  /** Backend channel for this conversation — controls which service handles assignment */
  channel?: 'personal' | 'waba';
}

interface Assignment {
  id: string;
  conversation_id: string;
  assigned_to_user_id: string;
  assigned_by_user_id: string;
  assigned_at: string;
  unassigned_at: string | null;
  delivery_mode: string;
  is_active: boolean;
  reason?: string;
  metadata: Record<string, any>;
}

interface AssignmentHistory {
  current: Assignment | null;
  history: Assignment[];
}

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  active_count?: number;
  total_count?: number;
}

export const AssignmentPanel = memo(function AssignmentPanel({
  conversationId,
  onAssignmentChange,
  channel = 'waba',
}: AssignmentPanelProps) {
  // Assignment state
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [assignmentHistory, setAssignmentHistory] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assignment UI state
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUnassignDialog, setShowUnassignDialog] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<string>('both');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Load assignment data
  const loadAssignment = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTenant(
        `/api/threads/${conversationId}/assignment?channel=${channel}`
      );

      if (!response.ok) {
        throw new Error('Failed to load assignment');
      }

      const data: AssignmentHistory = await response.json();
      setAssignment(data.current);
      setAssignmentHistory(data.history);
    } catch (err) {
      console.error('Error loading assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Load team members
  const loadTeamMembers = useCallback(async () => {
    try {
      const response = await fetchWithTenant(`/api/threads/team/workload?channel=${channel}`);

      if (!response.ok) {
        throw new Error('Failed to load team members');
      }

      const workload = await response.json();
      // Transform workload data to team member format
      const members: TeamMember[] = workload.map((item: any) => ({
        user_id: item.user_id,
        name: item.name || `User ${item.user_id.substring(0, 8)}`,
        email: item.email || '',
        active_count: item.active_count,
        total_count: item.total_count,
      }));
      setTeamMembers(members);
    } catch (err) {
      console.error('Error loading team members:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAssignment();
    loadTeamMembers();
  }, [loadAssignment, loadTeamMembers]);

  // Handle assignment
  const handleAssign = useCallback(async () => {
    if (!selectedUserId) {
      setError('Please select a team member');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetchWithTenant(
        `/api/threads/${conversationId}/assign?channel=${channel}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: selectedUserId,
            delivery_mode: selectedDeliveryMode,
            reason: assignmentReason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Failed to assign conversation (${response.status})`
        );
      }

      // Reload data
      await loadAssignment();
      setShowAssignDialog(false);
      setSelectedUserId('');
      setAssignmentReason('');
      onAssignmentChange?.();
    } catch (err) {
      console.error('Error assigning conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign conversation');
    } finally {
      setSubmitting(false);
    }
  }, [conversationId, selectedUserId, selectedDeliveryMode, assignmentReason, loadAssignment, onAssignmentChange]);

  // Handle unassignment
  const handleUnassign = useCallback(async () => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetchWithTenant(
        `/api/threads/${conversationId}/unassign?channel=${channel}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: assignmentReason,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unassign conversation');
      }

      // Reload data
      await loadAssignment();
      setShowUnassignDialog(false);
      setAssignmentReason('');
      onAssignmentChange?.();
    } catch (err) {
      console.error('Error unassigning conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to unassign conversation');
    } finally {
      setSubmitting(false);
    }
  }, [conversationId, assignmentReason, loadAssignment, onAssignmentChange]);

  // Handle delivery mode change
  const handleChangeDeliveryMode = useCallback(async (newMode: string) => {
    try {
      setSubmitting(true);
      setError(null);

      const response = await fetchWithTenant(
        `/api/threads/${conversationId}/assignment/delivery-mode`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delivery_mode: newMode,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update delivery mode');
      }

      // Reload data
      await loadAssignment();
      onAssignmentChange?.();
    } catch (err) {
      console.error('Error changing delivery mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to update delivery mode');
    } finally {
      setSubmitting(false);
    }
  }, [conversationId, loadAssignment, onAssignmentChange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const assignedUser = assignment
    ? teamMembers.find((m) => m.user_id === assignment.assigned_to_user_id)
    : null;

  return (
    <div className="space-y-4">
      {/* Error message */}
      {error && (
        <div className="flex gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
          <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      {/* Current Assignment */}
      {assignment && assignment.is_active ? (
        <div className="bg-gradient-to-br from-primary/5 to-transparent p-4 rounded-lg border border-primary/10 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {assignedUser?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {assignedUser?.name || 'Unknown User'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {assignedUser?.email}
                </p>
              </div>
            </div>
            <Badge variant="default" className="ml-2">
              Assigned
            </Badge>
          </div>

          {/* Assignment details */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Assigned:</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(assignment.assigned_at), { addSuffix: true })}
              </span>
            </div>

            {assignedUser?.active_count !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active Assignments:</span>
                <span className="font-medium">{assignedUser.active_count}</span>
              </div>
            )}
          </div>

          {/* Delivery mode selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Delivery Mode
            </label>
            <Select value={assignment.delivery_mode} onValueChange={handleChangeDeliveryMode} disabled={submitting}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp Direct</SelectItem>
                <SelectItem value="inbox">In-app Inbox</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason */}
          {assignment.reason && (
            <div className="p-2 bg-muted/50 rounded text-xs">
              <p className="text-muted-foreground mb-1">Reason:</p>
              <p>{assignment.reason}</p>
            </div>
          )}

          {/* Assignment history button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="h-3 w-3 mr-1.5" />
            History ({assignmentHistory.length})
            <ChevronDown className={`h-3 w-3 ml-auto transition-transform ${showHistory ? 'rotate-180' : ''}`} />
          </Button>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setShowUnassignDialog(true)}
              disabled={submitting}
            >
              <XCircle className="h-3 w-3 mr-1.5" />
              Release
            </Button>
          </div>
        </div>
      ) : (
        // No assignment - show assign button
        <div className="bg-muted/50 p-4 rounded-lg border border-muted text-center space-y-4">
          <div className="text-center">
            <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Not Assigned</p>
            <p className="text-xs text-muted-foreground">
              Messages will be handled by AI
            </p>
          </div>

          <Button
            className="w-full text-xs"
            onClick={() => setShowAssignDialog(true)}
          >
            <User className="h-3 w-3 mr-1.5" />
            Assign to Team Member
          </Button>
        </div>
      )}

      {/* Assignment History */}
      {showHistory && assignmentHistory.length > 0 && (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground px-1">History</p>
          {assignmentHistory.map((h, idx) => {
            const historyUser = teamMembers.find((m) => m.user_id === h.assigned_to_user_id);
            const duration = h.unassigned_at
              ? Math.round(
                  (new Date(h.unassigned_at).getTime() - new Date(h.assigned_at).getTime()) /
                    (1000 * 60)
                )
              : null;

            return (
              <div key={h.id} className="p-2.5 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                      {historyUser?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{historyUser?.name || 'Unknown'}</span>
                  {h.unassigned_at && (
                    <Badge variant="secondary" className="text-[9px] h-5">
                      {duration} min
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground text-[10px]">
                  {formatDistanceToNow(new Date(h.assigned_at), { addSuffix: true })}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>Assign Conversation</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Team Member</label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {member.active_count !== undefined && (
                            <span className="text-[11px] text-muted-foreground">
                              ({member.active_count} active)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Delivery Mode</label>
                <Select value={selectedDeliveryMode} onValueChange={setSelectedDeliveryMode}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp Direct</SelectItem>
                    <SelectItem value="inbox">In-app Inbox</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium">Reason (optional)</label>
                <Textarea
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder="Why are you assigning this conversation?"
                  className="min-h-[70px] text-xs"
                />
              </div>
            </div>
          </AlertDialogDescription>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs"
              disabled={!selectedUserId || submitting}
              onClick={handleAssign}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                  Assign
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unassign Confirmation Dialog */}
      <AlertDialog open={showUnassignDialog} onOpenChange={setShowUnassignDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>Release Conversation</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p className="text-sm">
                This will release the conversation back to the AI. Messages will no longer be routed to the assigned user.
              </p>

              <div className="space-y-2">
                <label className="text-xs font-medium">Reason (optional)</label>
                <Textarea
                  value={assignmentReason}
                  onChange={(e) => setAssignmentReason(e.target.value)}
                  placeholder="Why are you releasing this conversation?"
                  className="min-h-[70px] text-xs"
                />
              </div>
            </div>
          </AlertDialogDescription>

          <div className="flex gap-2 justify-end">
            <AlertDialogCancel className="text-xs">Keep Assigned</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs bg-destructive hover:bg-destructive/90"
              disabled={submitting}
              onClick={handleUnassign}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  Releasing...
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3 mr-1.5" />
                  Release
                </>
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
