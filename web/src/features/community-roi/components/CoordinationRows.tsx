'use client';

/**
 * The per-member coordination rows and the send panel.
 *
 * Each member gets TWO rows — one per coordination day — each with a dropdown
 * defaulting to the pair the recommender chose for that day. The admin can
 * override with any member not already spoken for on that day; taken members
 * are shown but disabled, with who took them, so the constraint explains
 * itself rather than being discovered as a 409.
 *
 * A pick is persisted the moment it changes (it used to live in the page and
 * vanish on reload). Sending a day seeds the remaining generated pairs into
 * selections in one call, shows what that did, and only then sends.
 */
import React, { useMemo, useState } from 'react';
import { Send, AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import type {
  CoordinationSelection, DaySlot, SeedSummary, SendSummary,
} from '@lad/frontend-features/community-roi';

function initials(name: string): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981','#3B82F6','#EF4444','#14B8A6'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' }> = ({ name, size = 'md' }) => (
  <div
    className={`rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white ${size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-[11px]'}`}
    style={{ backgroundColor: avatarColor(name) }}
    title={name}
  >
    {initials(name)}
  </div>
);

const IndustryTag: React.FC<{ industry?: string }> = ({ industry }) => {
  if (!industry) return null;
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium truncate max-w-[120px]">
      {industry}
    </span>
  );
};

export const DAY_LABEL: Record<DaySlot, string> = { 1: 'Wednesday', 2: 'Friday' };
export const DAY_SLOTS: DaySlot[] = [1, 2];

export interface Pair {
  recommendation_id?: string | null;
  member_a_id?: string | null;
  member_b_id?: string | null;
  day_slot?: number | null;
  member_a: string;
  member_b: string;
  industry_a?: string;
  industry_b?: string;
  score: number;
  reason: string;
  combination_type: number;
}

export interface MemberLite { id: string; name: string; industry?: string | null }

/** The selection on `day` that involves `memberId`, if any. */
export function selectionFor(
  selections: CoordinationSelection[], memberId: string, day: DaySlot,
): CoordinationSelection | undefined {
  return selections.find(
    (s) => s.day_slot === day && (s.member_a_id === memberId || s.member_b_id === memberId),
  );
}

export function partnerOf(sel: CoordinationSelection, memberId: string): { id: string; name: string } {
  return sel.member_a_id === memberId
    ? { id: sel.member_b_id, name: sel.member_b_name }
    : { id: sel.member_a_id, name: sel.member_a_name };
}

const StatusChip: React.FC<{ sel?: CoordinationSelection }> = ({ sel }) => {
  if (!sel) return null;
  const map: Record<CoordinationSelection['status'], { icon: typeof Clock; cls: string; text: string }> = {
    pending: { icon: Clock, cls: 'text-slate-500 bg-slate-100', text: 'selected' },
    sent:    { icon: CheckCircle2, cls: 'text-emerald-700 bg-emerald-50', text: 'sent' },
    skipped: { icon: AlertTriangle, cls: 'text-amber-700 bg-amber-50', text: `skipped${sel.skip_reason ? ` · ${sel.skip_reason}` : ''}` },
    failed:  { icon: XCircle, cls: 'text-red-700 bg-red-50', text: `failed${sel.skip_reason ? ` · ${sel.skip_reason}` : ''}` },
  };
  const m = map[sel.status] ?? map.pending;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded ${m.cls}`} title={m.text}>
      <Icon className="w-3 h-3" /> {m.text}
    </span>
  );
};

interface DayRowProps {
  member: MemberLite;
  day: DaySlot;
  generated?: Pair;                       // the recommender's pair for this member on this day
  selection?: CoordinationSelection;      // the persisted pick, if any
  takenBy: Map<string, string>;           // memberId -> name of who they are paired with, this day
  allMembers: MemberLite[];
  saving: boolean;
  onPick: (partnerId: string | null) => void;
}

const DayRow: React.FC<DayRowProps> = ({ member, day, generated, selection, takenBy, allMembers, saving, onPick }) => {
  const generatedPartnerId = generated
    ? (generated.member_a_id === member.id ? generated.member_b_id : generated.member_a_id) ?? null
    : null;
  const current = selection ? partnerOf(selection, member.id).id : (generatedPartnerId ?? '');
  const locked = !!selection && selection.status !== 'pending';

  // Everyone but self, sorted; the generated partner first so the default is
  // visible at the top even when the list is long.
  const options = useMemo(() => {
    const rest = allMembers.filter((m) => m.id !== member.id && m.id !== generatedPartnerId)
      .sort((a, b) => a.name.localeCompare(b.name));
    const gen = allMembers.find((m) => m.id === generatedPartnerId);
    return gen ? [gen, ...rest] : rest;
  }, [allMembers, member.id, generatedPartnerId]);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-slate-500 w-20 flex-shrink-0">{DAY_LABEL[day]}</span>
      <select
        value={current}
        disabled={saving || locked}
        onChange={(e) => onPick(e.target.value || null)}
        title={locked ? 'Already coordinated — the members have the message' : undefined}
        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 hover:border-indigo-300 focus:outline-none focus:border-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 cursor-pointer disabled:cursor-not-allowed"
      >
        <option value="">— no meeting this day —</option>
        {options.map((m) => {
          const takenWith = takenBy.get(m.id);
          const isCurrent = m.id === current;
          const isGenerated = m.id === generatedPartnerId;
          // A member paired with THIS member is not "taken" from our point of view.
          const disabled = !!takenWith && !isCurrent && takenWith !== member.name;
          return (
            <option key={m.id} value={m.id} disabled={disabled}>
              {m.name}
              {isGenerated && generated ? ` (${generated.score})${generated.combination_type === 2 ? ' ⭐' : ''}` : ''}
              {disabled ? ` — taken (with ${takenWith})` : ''}
            </option>
          );
        })}
      </select>
      <div className="w-36 flex-shrink-0 text-right"><StatusChip sel={selection} /></div>
    </div>
  );
};

export interface MemberCoordinationCardProps {
  index: number;
  member: MemberLite;
  generatedByDay: Partial<Record<DaySlot, Pair>>;
  selections: CoordinationSelection[];
  takenByDay: Record<DaySlot, Map<string, string>>;
  allMembers: MemberLite[];
  saving: boolean;
  onPick: (day: DaySlot, partnerId: string | null) => void;
}

export const MemberCoordinationCard: React.FC<MemberCoordinationCardProps> = ({
  index, member, generatedByDay, selections, takenByDay, allMembers, saving, onPick,
}) => (
  <div className="flex items-start gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:border-indigo-200 hover:shadow-sm transition-all">
    <span className="text-xs font-bold text-slate-300 w-5 flex-shrink-0 text-center pt-2">{index + 1}</span>
    <div className="flex items-center gap-2 flex-shrink-0 min-w-[180px] pt-0.5">
      <Avatar name={member.name} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 truncate">{member.name}</p>
        <IndustryTag industry={member.industry ?? undefined} />
      </div>
    </div>
    <div className="flex-1 flex flex-col gap-2">
      {DAY_SLOTS.map((day) => (
        <DayRow
          key={day}
          member={member}
          day={day}
          generated={generatedByDay[day]}
          selection={selectionFor(selections, member.id, day)}
          takenBy={takenByDay[day]}
          allMembers={allMembers}
          saving={saving}
          onPick={(partnerId) => onPick(day, partnerId)}
        />
      ))}
    </div>
  </div>
);

// ── Send panel ────────────────────────────────────────────────────────────────

export interface SendCoordinationPanelProps {
  weekNumber: number;
  generatedCount: Record<DaySlot, number>;
  selections: CoordinationSelection[];
  isSeeding: boolean;
  isSending: boolean;
  onSeed: (day: DaySlot) => Promise<SeedSummary>;
  onSend: (day: DaySlot) => Promise<SendSummary>;
  onClose: () => void;
}

/**
 * Seed, show what that did, THEN send. Two steps on purpose: an admin sees
 * "42 pairs, 2 skipped because you already overrode them" and can stop
 * before a single message leaves.
 */
export const SendCoordinationPanel: React.FC<SendCoordinationPanelProps> = ({
  weekNumber, generatedCount, selections, isSeeding, isSending, onSeed, onSend, onClose,
}) => {
  const [day, setDay] = useState<DaySlot>(1);
  const [seedResult, setSeedResult] = useState<SeedSummary | null>(null);
  const [sendResult, setSendResult] = useState<SendSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const forDay = selections.filter((s) => s.day_slot === day);
  const pending = forDay.filter((s) => s.status === 'pending').length;
  const sent = forDay.filter((s) => s.status === 'sent').length;

  const pickDay = (d: DaySlot) => { setDay(d); setSeedResult(null); setSendResult(null); setError(null); };

  const doSeed = async () => {
    setError(null);
    try { setSeedResult(await onSeed(day)); } catch (e) { setError((e as Error).message); }
  };
  const doSend = async () => {
    setError(null);
    try { setSendResult(await onSend(day)); } catch (e) { setError((e as Error).message); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-base font-bold text-slate-900">Coordinate 1-2-1s — week {weekNumber}</h3>
        <p className="text-xs text-slate-500 mt-1">
          Sends each member a slot offer for their pick that day and opens the negotiation. Members reply with a time; partners confirm.
        </p>

        <div className="flex gap-2 mt-4">
          {DAY_SLOTS.map((d) => (
            <button key={d} onClick={() => pickDay(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${day === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
              {DAY_LABEL[d]} <span className="opacity-70 text-xs">· {generatedCount[d] ?? 0} pairs</span>
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{generatedCount[day] ?? 0}</p><p className="text-[10px] text-slate-500">generated pairs</p></div>
          <div className="bg-slate-50 rounded-lg p-2"><p className="text-lg font-bold text-slate-800">{pending}</p><p className="text-[10px] text-slate-500">selected, not sent</p></div>
          <div className="bg-emerald-50 rounded-lg p-2"><p className="text-lg font-bold text-emerald-700">{sent}</p><p className="text-[10px] text-emerald-600">already sent</p></div>
        </div>

        {/* Step 1 — seed */}
        {!seedResult && !sendResult && (
          <button onClick={doSeed} disabled={isSeeding}
            className="mt-4 w-full px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60">
            {isSeeding ? 'Preparing…' : `Prepare ${DAY_LABEL[day]} — turn generated pairs into selections`}
          </button>
        )}

        {/* Step 2 — review, then send */}
        {seedResult && !sendResult && (
          <div className="mt-4 space-y-3">
            <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
              <p><strong>{seedResult.created}</strong> new selection{seedResult.created === 1 ? '' : 's'} created,
                {' '}<strong>{seedResult.alreadySelected}</strong> already there.</p>
              {seedResult.skippedConflict > 0 && (
                <p className="text-amber-700 mt-1">
                  <AlertTriangle className="inline w-3.5 h-3.5 mr-1" />
                  {seedResult.skippedConflict} generated pair{seedResult.skippedConflict === 1 ? '' : 's'} skipped — a member in them is already spoken for on {DAY_LABEL[day]} (your override stands).
                </p>
              )}
            </div>
            <p className="text-xs text-slate-500">
              This will message <strong>{pending + seedResult.created}</strong> member{pending + seedResult.created === 1 ? '' : 's'} on WhatsApp. Already-sent pairs are not re-sent.
            </p>
            <button onClick={doSend} disabled={isSending}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-60">
              <Send className="w-4 h-4" /> {isSending ? 'Sending…' : `Send ${DAY_LABEL[day]} slot offers`}
            </button>
          </div>
        )}

        {/* Done */}
        {sendResult && (
          <div className="mt-4 text-sm text-slate-700 bg-emerald-50 rounded-lg p-3 space-y-1">
            <p><CheckCircle2 className="inline w-4 h-4 text-emerald-600 mr-1" /><strong>{sendResult.notified}</strong> slot offer{sendResult.notified === 1 ? '' : 's'} delivered, <strong>{sendResult.proposed}</strong> negotiation{sendResult.proposed === 1 ? '' : 's'} opened.</p>
            {sendResult.skipped > 0 && <p className="text-amber-700">{sendResult.skipped} skipped (a live negotiation already exists, or no bookable slots).</p>}
            {sendResult.failed > 0 && <p className="text-red-700">{sendResult.failed} failed — see each row&apos;s status.</p>}
            {sendResult.cappedOut > 0 && <p className="text-amber-700">{sendResult.cappedOut} left pending by the send cap — send again to continue.</p>}
            {sendResult.proposed > sendResult.notified && (
              <p className="text-amber-700">{sendResult.proposed - sendResult.notified} opened but not yet delivered — the coordinator retries those automatically.</p>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200">
            {sendResult ? 'Done' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};
