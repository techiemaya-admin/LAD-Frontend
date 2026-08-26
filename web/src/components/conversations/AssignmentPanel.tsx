"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { fetchWithTenant } from "@/lib/fetch-with-tenant";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Users,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  X,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  /** Number of open conversations currently assigned */
  workload?: number;
  isOnline?: boolean;
}

interface AssignmentRecord {
  id: string;
  assignedTo: TeamMember | null;
  assignedBy: TeamMember | null;
  assignedAt: string;
  note?: string;
}

interface AssignmentHistory {
  current: AssignmentRecord | null;
  history: AssignmentRecord[];
}

/**
 * Raw assignment row as returned by the Python service
 * (GET /threads/:id/assignment): flat user IDs, no display names.
 */
interface RawAssignment {
  id: string;
  assigned_to_user_id?: string | null;
  assigned_by_user_id?: string | null;
  assigned_at?: string | null;
}

/**
 * The Python service returns flat user IDs with no names. Map them into the
 * nested AssignmentRecord shape the UI expects, resolving names from the loaded
 * team-member list when available (falls back to a neutral placeholder).
 */
function normalizeAssignmentHistory(
  raw: { current?: RawAssignment | null; history?: RawAssignment[] } | null,
  members: TeamMember[]
): AssignmentHistory {
  const byId = new Map(members.map((m) => [m.id, m]));
  const resolve = (userId?: string | null): TeamMember | null =>
    userId
      ? byId.get(userId) ?? { id: userId, name: "Team member", email: "" }
      : null;
  const toRecord = (a?: RawAssignment | null): AssignmentRecord | null =>
    a
      ? {
          id: a.id,
          assignedTo: resolve(a.assigned_to_user_id),
          assignedBy: resolve(a.assigned_by_user_id),
          assignedAt: a.assigned_at ?? new Date().toISOString(),
        }
      : null;
  return {
    current: toRecord(raw?.current),
    history: Array.isArray(raw?.history)
      ? raw.history
          .map(toRecord)
          .filter((r): r is AssignmentRecord => r !== null)
      : [],
  };
}

interface AssignmentPanelProps {
  conversationId: string;
  channel?: "waba" | "personal";
  /** Called after a successful (un)assignment so the parent can refresh */
  onAssigned?: (member: TeamMember | null) => void;
  className?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 800;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch wrapper with automatic retry on transient network/5xx errors.
 * Does NOT retry 4xx (client errors) - those should surface immediately.
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetchWithTenant(url, options);

      // Retry on server errors (5xx) or 429 rate-limit
      if ((res.status >= 500 || res.status === 429) && attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
        continue;
      }

      return res;
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw lastError ?? new Error("Network request failed");
}

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string" && d.error.trim()) return d.error;
    if (typeof d.message === "string" && d.message.trim()) return d.message;
  }
  return fallback;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemberAvatar({
  member,
  size = "md",
}: {
  member: TeamMember;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const text = size === "sm" ? "text-[10px]" : "text-xs";
  return (
    <div className="relative inline-block">
      <Avatar className={cn(dim, "shrink-0")}>
        <AvatarImage src={member.avatar} alt={member.name} />
        <AvatarFallback className={text}>
          {member.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      {member.isOnline !== undefined && (
        <span
          className={cn(
            "absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background",
            member.isOnline ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
          )}
        />
      )}
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-3 py-2.5 text-xs text-red-700 dark:text-red-300">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 leading-relaxed">{message}</span>
      <div className="flex items-center gap-1 shrink-0">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded px-1.5 py-0.5 font-medium underline underline-offset-2 hover:no-underline transition-colors"
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss error"
            title="Dismiss error"
            className="rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AssignmentPanel({
  conversationId,
  channel = "waba",
  onAssigned,
  className,
}: AssignmentPanelProps) {
  // ── State ────────────────────────────────────────────────────────────────
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  // Mirror of teamMembers readable inside callbacks without re-creating them  - 
  // used to resolve assignee display names when normalising assignment data.
  const teamMembersRef = useRef<TeamMember[]>([]);
  useEffect(() => {
    teamMembersRef.current = teamMembers;
  }, [teamMembers]);
  const [assignment, setAssignment] = useState<AssignmentHistory | null>(null);

  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const [membersError, setMembersError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Debounce success banner auto-dismiss
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Data fetching ────────────────────────────────────────────────────────

  /**
   * Loads the current assignment + history for this conversation.
   * Errors are surfaced in `assignmentError` - the panel stays mounted
   * and usable even when this call fails.
   */
  const loadAssignment = useCallback(async () => {
    if (!conversationId) return;

    setLoadingAssignment(true);
    setAssignmentError(null);

    try {
      const res = await fetchWithRetry(
        `/api/threads/${conversationId}/assignment?channel=${channel}`
      );

      if (res.status === 404) {
        // Conversation has no assignment yet - treat as empty, not an error
        setAssignment({ current: null, history: [] });
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(body, `Failed to load assignment (${res.status})`)
        );
      }

      // Python returns flat { current, history } rows keyed by user ID rather
      // than nested TeamMember objects - map them into the UI's shape.
      const raw = await res.json();
      setAssignment(normalizeAssignmentHistory(raw, teamMembersRef.current));
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load assignment";

      // Don't surface network errors as blocking - the panel is still usable
      // for assigning even if history can't be fetched.
      setAssignmentError(msg);

      // Preserve any previously loaded data so the UI doesn't go blank
      setAssignment((prev) => prev ?? { current: null, history: [] });
    } finally {
      setLoadingAssignment(false);
    }
  }, [conversationId, channel]);

  /**
   * Loads the team member list + their current workload.
   * Falls back to an empty list on error so the dropdown still opens,
   * but shows an inline error so the user knows data is stale.
   */
  const loadTeamMembers = useCallback(async () => {
    setLoadingMembers(true);
    setMembersError(null);

    try {
      const res = await fetchWithRetry(
        `/api/team/workload?channel=${channel}`
      );

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          getApiErrorMessage(body, `Failed to load team members (${res.status})`)
        );
      }

      const raw = await res.json();

      // The /threads/team/workload endpoint returns rows shaped as
      // { user_id, name, email, active_count, total_count, last_assigned_at }.
      // Normalise to the TeamMember contract so `member.id` (used as the React
      // key AND the assign payload) and `member.workload` are populated instead
      // of silently undefined.
      const members: TeamMember[] = Array.isArray(raw)
        ? raw
            .map((m: {
              user_id?: string;
              id?: string;
              name?: string | null;
              email?: string | null;
              active_count?: number;
            }) => ({
              id: m.user_id ?? m.id ?? "",
              name: m.name ?? m.email ?? "Unknown",
              email: m.email ?? "",
              workload: m.active_count,
            }))
            .filter((m) => m.id) // drop any row without a usable id
        : [];

      setTeamMembers(members);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to load team members";

      setMembersError(msg);

      // Keep stale data if we had it; otherwise leave as empty array so
      // the dropdown renders an empty state instead of crashing.
      setTeamMembers((prev) => prev);
    } finally {
      setLoadingMembers(false);
    }
  }, [channel]);

  // ── Assign / unassign ────────────────────────────────────────────────────

  const handleAssign = useCallback(
    async (member: TeamMember | null) => {
      if (assigning) return;

      setAssigning(true);
      setActionError(null);
      setActionSuccess(null);

      try {
        // Assign and unassign are distinct endpoints on the Python service:
        //   assign   → POST /threads/:id/assign    body { user_id }
        //   unassign → POST /threads/:id/unassign  body { reason? }
        const res = await fetchWithRetry(
          member
            ? `/api/threads/${conversationId}/assign?channel=${channel}`
            : `/api/threads/${conversationId}/unassign?channel=${channel}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(member ? { user_id: member.id } : {}),
          }
        );

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(
            getApiErrorMessage(
              body,
              member
                ? `Failed to assign to ${member.name}`
                : "Failed to unassign conversation"
            )
          );
        }

        // Optimistically update local state before re-fetching
        setAssignment((prev) => {
          const newRecord: AssignmentRecord = {
            id: `temp-${Date.now()}`,
            assignedTo: member,
            assignedBy: null, // server will fill this in on re-fetch
            assignedAt: new Date().toISOString(),
          };
          return {
            current: member ? newRecord : null,
            history: prev
              ? [newRecord, ...prev.history].slice(0, 10)
              : [newRecord],
          };
        });

        const label = member ? member.name : "Unassigned";
        setActionSuccess(
          member ? `Assigned to ${label}` : "Conversation unassigned"
        );

        if (successTimerRef.current) clearTimeout(successTimerRef.current);
        successTimerRef.current = setTimeout(() => setActionSuccess(null), 3000);

        onAssigned?.(member);
        setIsDropdownOpen(false);

        // Re-fetch in background for authoritative data
        loadAssignment();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : member
            ? `Failed to assign to ${member.name}`
            : "Failed to unassign";

        setActionError(msg);
      } finally {
        setAssigning(false);
      }
    },
    [assigning, conversationId, channel, onAssigned, loadAssignment]
  );

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    loadAssignment();
  }, [loadAssignment]);

  // Load team members lazily when the dropdown is first opened
  useEffect(() => {
    if (isDropdownOpen && teamMembers.length === 0 && !loadingMembers) {
      loadTeamMembers();
    }
  }, [isDropdownOpen, teamMembers.length, loadingMembers, loadTeamMembers]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────

  // The assignment payload only carries the user ID; upgrade to the full
  // team-member record (name/role) once the member list has loaded.
  const rawCurrentAssignee = assignment?.current?.assignedTo ?? null;
  const currentAssignee = rawCurrentAssignee
    ? teamMembers.find((m) => m.id === rawCurrentAssignee.id) ?? rawCurrentAssignee
    : null;
  const recentHistory = assignment?.history?.slice(0, 5) ?? [];
  const isLoading = loadingAssignment && !assignment;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider delayDuration={150}>
      <div className={cn("flex flex-col gap-3", className)}>

        {/* ── Current assignee + picker ── */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : currentAssignee ? (
              <>
                <MemberAvatar member={currentAssignee} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {currentAssignee.name}
                  </p>
                  {currentAssignee.role && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {currentAssignee.role}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-9 h-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <span className="text-sm">Unassigned</span>
              </div>
            )}
          </div>

          {/* Assign / Reassign dropdown */}
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label={
                  assigning
                    ? "Assigning…"
                    : currentAssignee
                    ? "Reassign conversation"
                    : "Assign conversation"
                }
                title={
                  assigning
                    ? "Assigning…"
                    : currentAssignee
                    ? "Reassign conversation"
                    : "Assign conversation"
                }
                className="h-8 text-xs gap-1.5 shrink-0 border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/50 dark:bg-zinc-800/40 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-zinc-700 dark:text-zinc-200 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-500/40 transition-all"
                disabled={assigning}
              >
                {assigning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                ) : (
                  <>
                    {currentAssignee ? "Reassign" : "Assign"}
                    <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
                  </>
                )}
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-64 max-h-80 overflow-y-auto bg-white dark:bg-[#161717] border border-zinc-200 dark:border-zinc-800/80 shadow-lg text-zinc-900 dark:text-[#d1d7db] rounded-xl p-1.5 [&_[role=menuitem]]:transition-colors"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuLabel className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 font-medium px-2 py-1.5">
                <span>Assign to</span>
                {loadingMembers && (
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                )}
                {!loadingMembers && teamMembers.length > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Refresh workload"
                        title="Refresh workload"
                        onClick={(e) => {
                          e.stopPropagation();
                          loadTeamMembers();
                        }}
                        className="rounded p-1 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-[10px]">
                      Refresh workload
                    </TooltipContent>
                  </Tooltip>
                )}
              </DropdownMenuLabel>

              {/* Members error - non-blocking */}
              {membersError && (
                <div className="px-1 py-1">
                  <div className="flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-950/30 px-2 py-1.5 text-[10px] text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span className="flex-1">
                      Couldn&apos;t load workload data
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        loadTeamMembers();
                      }}
                      className="underline underline-offset-1 font-medium hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              )}

              <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/60 my-1" />

              {/* Unassign option */}
              {currentAssignee && (
                <>
                  <DropdownMenuItem
                    onClick={() => handleAssign(null)}
                    className="gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/30 focus:text-rose-700 dark:focus:text-rose-300"
                  >
                    <div className="w-6 h-6 rounded-full border border-dashed border-rose-300 dark:border-rose-700/60 flex items-center justify-center shrink-0 bg-rose-50/50 dark:bg-rose-950/20">
                      <X className="h-3 w-3" />
                    </div>
                    <span className="text-xs font-medium">Unassign</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800/60 my-1" />
                </>
              )}

              {/* Loading skeleton */}
              {loadingMembers && teamMembers.length === 0 && (
                <div className="flex flex-col gap-1 px-1 py-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-2 py-1.5 animate-pulse"
                    >
                      <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-2.5 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4" />
                        <div className="h-2 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state */}
              {!loadingMembers && teamMembers.length === 0 && !membersError && (
                <div className="px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
                  <Users className="h-6 w-6 mx-auto mb-2 opacity-40 text-zinc-400" />
                  No team members available
                </div>
              )}

              {/* Member list */}
              {teamMembers.map((member) => {
                const isCurrent = currentAssignee?.id === member.id;
                return (
                  <DropdownMenuItem
                    key={member.id}
                    onClick={() => !isCurrent && handleAssign(member)}
                    className={cn(
                      "gap-2.5 cursor-pointer rounded-lg px-2 py-1.5 transition-colors",
                      "focus:bg-zinc-100 dark:focus:bg-zinc-800/80 focus:text-zinc-900 dark:focus:text-zinc-100",
                      isCurrent &&
                        "bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-medium cursor-default focus:bg-emerald-50/80 dark:focus:bg-emerald-950/40"
                    )}
                    disabled={isCurrent}
                  >
                    <MemberAvatar member={member} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium truncate">
                          {member.name}
                        </span>
                        {isCurrent && (
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      {member.workload !== undefined && (
                        <span
                          className={cn(
                            "text-[10px]",
                            isCurrent
                              ? "text-emerald-700/80 dark:text-emerald-400/80"
                              : "text-zinc-400 dark:text-zinc-500"
                          )}
                        >
                          {member.workload} open
                          {member.workload !== 1 ? " chats" : " chat"}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Action feedback ── */}
        {actionSuccess && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800/40 dark:bg-emerald-950/20 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {actionSuccess}
          </div>
        )}

        {actionError && (
          <ErrorBanner
            message={actionError}
            onRetry={() => {
              setActionError(null);
              // The last action's member state is gone, so just reload
              loadAssignment();
            }}
            onDismiss={() => setActionError(null)}
          />
        )}

        {assignmentError && !isLoading && (
          <ErrorBanner
            message="Assignment history couldn't be loaded"
            onRetry={() => {
              setAssignmentError(null);
              loadAssignment();
            }}
            onDismiss={() => setAssignmentError(null)}
          />
        )}

        {/* ── Assignment history ── */}
        {recentHistory.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              History
            </p>
            <div className="flex flex-col gap-1">
              {recentHistory.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-2 text-[11px] text-muted-foreground"
                >
                  {record.assignedTo ? (
                    <MemberAvatar member={record.assignedTo} size="sm" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <span className="flex-1 truncate">
                    {record.assignedTo?.name ?? "Unassigned"}
                    {record.assignedBy && (
                      <span className="opacity-60">
                        {" "}
                        by {record.assignedBy.name}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 opacity-60">
                    {formatRelativeTime(record.assignedAt)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default AssignmentPanel;