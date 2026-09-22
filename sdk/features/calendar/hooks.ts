/**
 * Calendar feature — React Query hooks.
 *
 * The queries return the raw result on purpose: a screen tells "nothing there"
 * from "we could not read it" by checking `data === undefined`, not `isError`
 * (which `keepPreviousData` suppresses).
 */
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  calendarKeys,
  cancelReminder,
  deleteCalendarSource,
  listCalendarAccounts,
  listCalendarSources,
  listMeetings,
  listReminders,
  replanMeeting,
  saveCalendarSource,
  syncCalendarSource,
} from './api';
import type { MeetingsQuery, RemindersQuery } from './types';

export function useCalendarSources(enabled = true) {
  return useQuery({
    queryKey: calendarKeys.sources(),
    queryFn: listCalendarSources,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

/** The connected mailboxes and whether each one may read its calendar yet. */
export function useCalendarAccounts(enabled = true) {
  return useQuery({
    queryKey: calendarKeys.accounts(),
    queryFn: listCalendarAccounts,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

/** Everything calendar-shaped refreshes after a write: sources, accounts, meetings, reminders. */
function useCalendarMutation<TData, TVars>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}

export function useSaveCalendarSource() {
  return useCalendarMutation(saveCalendarSource);
}

export function useDeleteCalendarSource() {
  return useCalendarMutation(deleteCalendarSource);
}

export function useSyncCalendarSource() {
  return useCalendarMutation(syncCalendarSource);
}

export function useMeetings(q: MeetingsQuery = {}, enabled = true) {
  return useQuery({
    queryKey: calendarKeys.meetings(q),
    queryFn: () => listMeetings(q),
    staleTime: 30_000,
    retry: 1,
    enabled,
  });
}

export function useReminders(q: RemindersQuery = {}, enabled = true) {
  return useQuery({
    queryKey: calendarKeys.reminders(q),
    queryFn: () => listReminders(q),
    staleTime: 30_000,
    retry: 1,
    enabled,
  });
}

export function useCancelReminder() {
  return useCalendarMutation(cancelReminder);
}

export function useReplanMeeting() {
  return useCalendarMutation(replanMeeting);
}
