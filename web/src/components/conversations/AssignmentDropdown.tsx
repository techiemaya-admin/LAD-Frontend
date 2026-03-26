import { memo, useState, useEffect } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Loader2,
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  active_count?: number;
  total_count?: number;
}

interface AssignmentDropdownProps {
  conversationId: string;
  onAssign?: () => void;
  trigger?: React.ReactNode;
}

export const AssignmentDropdown = memo(function AssignmentDropdown({
  conversationId,
  onAssign,
  trigger,
}: AssignmentDropdownProps) {
  // State
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState('both');
  const [assignmentReason, setAssignmentReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Load team members
  const loadTeamMembers = async () => {
    if (teamMembers.length > 0) return; // Already loaded

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithTenant('/api/team/workload');

      if (!response.ok) {
        throw new Error('Failed to load team members');
      }

      const workload = await response.json();
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
      setError(err instanceof Error ? err.message : 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  // Handle assignment
  const handleAssign = async () => {
    if (!selectedUserId) {
      setError('Please select a team member');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetchWithTenant(
        `/api/threads/${conversationId}/assign`,
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
          errorData.detail || 'Failed to assign conversation'
        );
      }

      // Reset and close
      setSelectedUserId(null);
      setAssignmentReason('');
      setPopoverOpen(false);
      setDropdownOpen(false);
      onAssign?.();
    } catch (err) {
      console.error('Error assigning conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign conversation');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter members by search query
  const filteredMembers = teamMembers.filter((member) =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        {trigger ? (
          <div onClick={() => setDropdownOpen(true)}>{trigger}</div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => loadTeamMembers()}
          >
            <Users className="h-3 w-3 mr-1.5" />
            Assign
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {/* Error message */}
        {error && (
          <div className="px-2 py-2 bg-destructive/10 border border-destructive/20 rounded mx-2 mb-2">
            <div className="flex gap-2">
              <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-destructive">{error}</p>
            </div>
          </div>
        )}

        <DropdownMenuLabel className="text-xs">
          Assign to Team Member
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Search */}
        <div className="px-2 py-2">
          <div className="relative">
            <Search className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-7 h-7 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => loadTeamMembers()}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-4 flex items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs text-muted-foreground">No team members found</p>
          </div>
        ) : (
          <>
            {filteredMembers.map((member) => (
              <DropdownMenuItem
                key={member.user_id}
                className="flex items-center gap-2 py-2 cursor-pointer"
                onClick={() => {
                  setSelectedUserId(member.user_id);
                  setPopoverOpen(true);
                  setDropdownOpen(false);
                }}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                    {member.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {member.email}
                  </p>
                </div>
                {member.active_count !== undefined && (
                  <Badge variant="secondary" className="text-[8px] h-4">
                    {member.active_count}
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>

      {/* Assignment Details Popover */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div style={{ display: 'none' }} />
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-4">
          <div>
            <h3 className="font-medium text-sm">Confirm Assignment</h3>
            {selectedUserId && (
              <p className="text-xs text-muted-foreground">
                {
                  teamMembers.find((m) => m.user_id === selectedUserId)
                    ?.name
                }
              </p>
            )}
          </div>

          {/* Delivery mode selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Delivery Mode
            </label>
            <Select
              value={selectedDeliveryMode}
              onValueChange={setSelectedDeliveryMode}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">
                  <div className="flex items-center gap-2">
                    <span>WhatsApp Direct</span>
                  </div>
                </SelectItem>
                <SelectItem value="inbox">
                  <span>In-app Inbox</span>
                </SelectItem>
                <SelectItem value="both">
                  <span>Both</span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {selectedDeliveryMode === 'whatsapp' &&
                'Messages will be sent directly to team member\'s phone'}
              {selectedDeliveryMode === 'inbox' &&
                'Messages will appear in LAD app inbox'}
              {selectedDeliveryMode === 'both' &&
                'Messages will be sent to both phone and inbox'}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Reason (optional)
            </label>
            <Textarea
              placeholder="Why are you assigning this conversation?"
              className="min-h-[60px] text-xs"
              value={assignmentReason}
              onChange={(e) => setAssignmentReason(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => {
                setPopoverOpen(false);
                setDropdownOpen(true);
              }}
              disabled={submitting}
            >
              Back
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs"
              onClick={handleAssign}
              disabled={!selectedUserId || submitting}
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
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </DropdownMenu>
  );
});
