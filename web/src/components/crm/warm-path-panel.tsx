'use client';
// Warm Path panel - privacy-preserving. The requester never sees who the matched
// members are: the graph shows the *number* of members who can introduce them and
// the *route type* (strong / mutual / customer reference / shared employer) only.
// Requesting a warm intro spends one bounty credit and broadcasts an anonymous
// request to every matched member; a member's identity is revealed only once that
// member accepts. Mirrors the Community Referral Network state machine
// (ISSUED → BROADCAST → ACCEPTED). Collapsible; expanding reveals an interactive,
// draggable SVG graph. Re-themed to the LAD navy palette.
//
// NOT wired to a live source yet (R18). The interaction below runs on local state.
// To wire live: source `credits` from the billing/credits hook, and replace the
// request()/withdraw() bodies with a mutation in sdk/features/prospects
// (e.g. useRequestWarmIntro) hitting a new BFF route
// POST /api/prospects/[id]/warm-intro (proxy → LAD_backend → Referral Network).

import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Route, RouteOff, ChevronUp, ChevronDown, RotateCcw, Move, Lock, Send, Undo2,
  Gem, ShieldCheck, UsersRound, Award, BriefcaseBusiness,
} from 'lucide-react';
import { LadCard, LadCardHeader, T, initialsOf } from './shared';
import type { ProspectFixture, WarmPath } from './data';

type RouteKind = 'primary' | 'mutual' | 'customer' | 'employer';
type Phase = 'idle' | 'requested' | 'accepted';

interface MatchDef {
  id: string;
  x: number;
  y: number;
  route: RouteKind;
  routeLabel: string;
  color: string;
  darkColor?: string; // dark-mode override token for node legibility on the deep navy canvas
  big?: boolean;
  confidence?: number;
  /** Real identity - only surfaced to the UI once this member accepts. */
  reveal?: { name: string; sub: string };
}

interface Pos {
  x: number;
  y: number;
}

interface WarmPathPanelProps {
  wp: WarmPath;
  prospect: ProspectFixture;
  open: boolean;
  onToggle: () => void;
  /** Show the match count as a privacy-preserving range (e.g. "3+") rather than
   *  the exact number, per the small-community leakage guard. Default true. */
  bucketed?: boolean;
  /** Bounty credits available to spend. Seeded locally until wired to billing. */
  initialCredits?: number;
}

const W = 720;
const H = 320;
const CENTER = { x: W / 2, y: 150 };

const ROUTE_LABEL: Record<RouteKind, string> = {
  primary: 'Strong route',
  mutual: 'Mutual connection',
  customer: 'Customer reference',
  employer: 'Shared employer',
};
const EMPLOYER_COLOR = '#0369a1';

function bucketLabel(n: number): string {
  if (n <= 0) return '0';
  if (n <= 2) return '1-2';
  return '3+';
}

export default function WarmPathPanel({
  wp, prospect, open, onToggle, bucketed = true, initialCredits = 5,
}: WarmPathPanelProps) {
  // Anonymised match nodes derived from wp. We deliberately DO NOT pass names,
  // headlines, titles or company through to the rendered graph - only route type
  // and confidence. The real identity is stashed in `reveal` and shown only after
  // that member accepts.
  const matchDefs = useMemo<MatchDef[]>(() => {
    if (!wp?.top_connection) return [];
    const out: MatchDef[] = [];
    out.push({
      id: 'm-strong', x: 150, y: 150, route: 'primary', routeLabel: ROUTE_LABEL.primary,
      color: T.primary, darkColor: '#3b82f6', big: true, confidence: wp.top_connection.confidence,
      reveal: { name: wp.top_connection.name, sub: wp.top_connection.headline.split(',')[0] },
    });
    (wp.mutual_connections || []).slice(0, 3).forEach((m, i, arr) => {
      const angles = arr.length === 1 ? [0] : arr.length === 2 ? [-25, 25] : [-35, 0, 35];
      const ang = (angles[i] * Math.PI) / 180;
      out.push({
        id: `m-mutual-${i}`,
        x: CENTER.x + Math.cos(ang) * 250,
        y: CENTER.y + Math.sin(ang) * 90,
        route: 'mutual', routeLabel: ROUTE_LABEL.mutual, color: T.linkedin, darkColor: '#60a5fa', confidence: m.confidence,
        reveal: { name: m.name, sub: m.title },
      });
    });
    if (wp.customer_reference) {
      out.push({
        id: 'm-customer', x: CENTER.x, y: 44, route: 'customer', routeLabel: ROUTE_LABEL.customer,
        color: T.success, darkColor: '#4ade80', confidence: wp.customer_reference.confidence,
        reveal: { name: wp.customer_reference.via, sub: 'Mr LAD customer' },
      });
    }
    if (wp.shared_employer) {
      out.push({
        id: 'm-employer', x: 150, y: 260, route: 'employer', routeLabel: ROUTE_LABEL.employer,
        color: EMPLOYER_COLOR, darkColor: '#38bdf8', confidence: wp.shared_employer.confidence,
        reveal: { name: wp.shared_employer.company, sub: wp.shared_employer.overlap },
      });
    }
    return out;
  }, [wp]);

  const matchCount = matchDefs.length;
  const countText = bucketed ? bucketLabel(matchCount) : String(matchCount);

  const [positions, setPositions] = useState<Record<string, Pos>>({});
  const [kidsExpanded, setKidsExpanded] = useState(true);
  const [hoverId, setHoverId] = useState<string | null>(null);

  // Request lifecycle (local prototype state - see file header for live wiring).
  const [phase, setPhase] = useState<Phase>('idle');
  const [credits, setCredits] = useState(initialCredits);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPositions({});
    setKidsExpanded(true);
    setPhase('idle');
    setCredits(initialCredits);
    setRevealed({});
  }, [matchDefs, initialCredits]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{ id: string; rect: DOMRect; scaleX: number; scaleY: number; ox: number; oy: number } | null>(null);

  const request = () => {
    if (phase !== 'idle' || credits <= 0) return;
    setCredits((c) => c - 1);
    setPhase('requested');
    // TODO(live): useRequestWarmIntro().mutate({ prospectId: prospect.id })
  };
  const withdraw = () => {
    if (phase !== 'requested') return;
    // Demo refunds the credit. Per the CRN rules a bounty is only refundable
    // *before* broadcast; once broadcast the credit is consumed - enforce
    // server-side when wired.
    setCredits((c) => c + 1);
    setPhase('idle');
    setRevealed({});
  };
  const simulateAccept = () => {
    if (phase !== 'requested') return;
    setPhase('accepted');
    setRevealed((r) => ({ ...r, 'm-strong': true })); // strongest route accepts first
  };

  if (!wp?.top_connection) {
    return (
      <LadCard>
        <LadCardHeader title="Warm Path" subtitle="Members of the network who can introduce you" />
        <div className="grid place-items-center h-32 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
          <div className="text-center">
            <RouteOff className="w-5 h-5 mx-auto mb-2 opacity-50" />
            No members can introduce you yet.
          </div>
        </div>
      </LadCard>
    );
  }

  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const startDrag = (id: string) => (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation();
    e.preventDefault();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const def = matchDefs.find((d) => d.id === id);
    if (!def) return;
    const cur = positions[id] || { x: def.x, y: def.y };
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;
    dragRef.current = { id, rect, scaleX, scaleY, ox: px - cur.x, oy: py - cur.y };
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };
  const onMove = (e: React.PointerEvent<SVGGElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const x = (e.clientX - d.rect.left) * d.scaleX - d.ox;
    const y = (e.clientY - d.rect.top) * d.scaleY - d.oy;
    setPositions((p) => ({ ...p, [d.id]: { x: clamp(x, 36, W - 36), y: clamp(y, 36, H - 36) } }));
  };
  const endDrag = (e: React.PointerEvent<SVGGElement>) => {
    try {
      (e.currentTarget as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    dragRef.current = null;
  };

  const getPos = (def: MatchDef): Pos => positions[def.id] || { x: def.x, y: def.y };
  const linkPath = (a: Pos, b: Pos) => {
    const mx = (a.x + b.x) / 2;
    return `M${a.x},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.x},${b.y}`;
  };
  const linkStyleFor = (t: RouteKind) =>
    ({
      primary:  { stroke: 'url(#ladLink)',        sw: 3,   dash: '' },
      mutual:   { stroke: 'url(#ladLinkBlue)',    sw: 2,   dash: '3 3' },
      customer: { stroke: 'rgba(34,197,94,0.55)', sw: 2,   dash: '2 4' },
      employer: { stroke: 'rgba(3,105,161,0.45)', sw: 1.5, dash: '' },
    } as const)[t];

  const firstName = prospect.full_name.split(' ')[0];

  return (
    <LadCard>
      <LadCardHeader
        title="Warm Path"
        subtitle="Members who can introduce you · identities stay private until one accepts"
        action={
          <div className="flex items-center gap-1.5">
            {open && Object.keys(positions).length > 0 && (
              <button
                onClick={() => setPositions({})}
                className="h-7 px-2.5 rounded-full text-[11.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <button
              onClick={onToggle}
              className="inline-flex items-center justify-center gap-1 whitespace-nowrap text-[11.5px] transition-all disabled:pointer-events-none disabled:opacity-50 active:scale-95 select-none h-7 px-2.5 rounded-full font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-blue-600 dark:text-white dark:hover:bg-blue-700 outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {open ? 'Collapse' : 'Open graph'}
              {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        }
      />

      {!open ? (
        <button
          onClick={onToggle}
          className="w-full text-left rounded-2xl ring-1 ring-slate-200 dark:ring-[#262831] hover:ring-[#0B1957]/40 dark:hover:ring-[#3b4b7a] transition p-4 flex items-center gap-4 bg-gradient-to-r from-[#f1f3fb] to-white dark:from-[#0b142e] dark:to-[#040a1f]"
        >
          <div className="shrink-0 w-10 h-10 rounded-xl grid place-items-center" style={{ background: T.badgeBg }}>
            <Route className="w-5 h-5" style={{ color: T.primary }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] text-[#172560] dark:text-white">
              <span className="font-semibold">{countText}</span>{' '}
              {matchCount === 1 ? 'member' : 'members'} in your network can introduce you to{' '}
              {firstName}
              <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-[#7a8ba3]">
                <Lock className="w-3 h-3" /> identities hidden
              </span>
            </p>
            <div className="mt-1 flex items-center gap-3 text-[11.5px] text-slate-600 dark:text-[#7a8ba3]">
              <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3 h-3" style={{ color: T.primary }} /> Strong route</span>
              {wp.mutual_connections?.length > 0 && (
                <span className="inline-flex items-center gap-1"><UsersRound className="w-3 h-3" /> {wp.mutual_connections.length} mutual</span>
              )}
              {wp.customer_reference && (
                <span className="inline-flex items-center gap-1"><Award className="w-3 h-3" /> customer ref</span>
              )}
              {wp.shared_employer && (
                <span className="inline-flex items-center gap-1"><BriefcaseBusiness className="w-3 h-3" /> shared employer</span>
              )}
            </div>
          </div>
          <span className="text-[11.5px] font-semibold inline-flex items-center gap-1 text-[#0B1957] dark:text-blue-400">
            Open graph <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </button>
      ) : (
        <div>
          {/* count headline */}
          <div className="flex items-baseline gap-2 mb-1">
            <span
              className="text-[26px] font-extrabold tracking-tight tabular-nums text-[#172560] dark:text-white"
              style={{ fontFamily: '"Space Grotesk", system-ui' }}
              title={`${matchCount} members matched`}
            >
              {countText}
            </span>
            <span className="text-[13px] font-medium text-[#172560] dark:text-white">
              {matchCount === 1 ? 'member' : 'members'} can introduce you
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-slate-500 dark:text-[#7a8ba3]">
              <Lock className="w-3 h-3" /> identities hidden
            </span>
          </div>

          <div className="relative">
            <div className="absolute top-1 right-1 z-10 text-[10.5px] text-slate-500 dark:text-[#7a8ba3] bg-white/80 dark:bg-[#000724]/80 backdrop-blur px-2 py-0.5 rounded-full ring-1 ring-slate-200/70 dark:ring-[#262831] inline-flex items-center gap-1">
              <Move className="w-3 h-3" /> drag nodes · click {firstName} to {kidsExpanded ? 'collapse' : 'expand'}
            </div>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              className="w-full h-auto touch-none select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                <linearGradient id="ladLink" x1="0" x2="1">
                  <stop offset="0%" stopColor={T.primary} stopOpacity="0.7" />
                  <stop offset="100%" stopColor={T.primary} stopOpacity="0.15" />
                </linearGradient>
                <linearGradient id="ladLinkBlue" x1="0" x2="1">
                  <stop offset="0%" stopColor={T.linkedin} stopOpacity="0.1" />
                  <stop offset="100%" stopColor={T.linkedin} stopOpacity="0.6" />
                </linearGradient>
                <radialGradient id="ladHalo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={T.primary} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={T.primary} stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx={CENTER.x} cy={CENTER.y} r={kidsExpanded ? 60 : 80} fill="url(#ladHalo)" style={{ transition: 'r 200ms ease' }} />

              {kidsExpanded &&
                matchDefs.map((def) => {
                  const p = getPos(def);
                  const s = linkStyleFor(def.route);
                  return (
                    <g key={`l-${def.id}`} style={{ opacity: hoverId && hoverId !== def.id ? 0.35 : 1, transition: 'opacity 150ms' }}>
                      <path d={linkPath(p, CENTER)} stroke={s.stroke} strokeWidth={s.sw} fill="none" strokeDasharray={s.dash} />
                      {def.route === 'primary' && def.confidence != null && (
                        <text
                          x={(p.x + CENTER.x) / 2}
                          y={(p.y + CENTER.y) / 2 - 2}
                          textAnchor="middle"
                          className="fill-[#0B1957] dark:fill-[#60a5fa]"
                          style={{ fontSize: 11, fontWeight: 600, pointerEvents: 'none' }}
                        >
                          {Math.round(def.confidence * 100)}%
                        </text>
                      )}
                    </g>
                  );
                })}

              {kidsExpanded &&
                matchDefs.map((def) => {
                  const p = getPos(def);
                  const isRevealed = !!revealed[def.id];
                  const nodeState: NodeState =
                    isRevealed ? 'accepted' : phase !== 'idle' ? 'pending' : 'locked';
                  return (
                    <GraphNode
                      key={def.id}
                      x={p.x}
                      y={p.y}
                      color={def.color}
                      darkColor={def.darkColor}
                      big={!!def.big}
                      draggable
                      isHover={hoverId === def.id}
                      state={nodeState}
                      name={isRevealed && def.reveal ? def.reveal.name : def.routeLabel}
                      sub={
                        isRevealed && def.reveal
                          ? def.reveal.sub
                          : nodeState === 'pending'
                            ? 'request sent'
                            : 'identity hidden'
                      }
                      badge={isRevealed && def.reveal ? initialsOf(def.reveal.name) : ''}
                      onPointerDown={startDrag(def.id)}
                      onPointerMove={onMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onPointerEnter={() => setHoverId(def.id)}
                      onPointerLeave={() => setHoverId(null)}
                    />
                  );
                })}

              <GraphNode
                x={CENTER.x}
                y={CENTER.y}
                name={firstName}
                sub={kidsExpanded ? 'Click to collapse' : 'Click to expand'}
                color={T.primary}
                badge={initialsOf(prospect.full_name)}
                big
                isProspect
                clickable
                collapsed={!kidsExpanded}
                state="target"
                onClick={() => setKidsExpanded((v) => !v)}
              />
            </svg>

            <div className="px-1 pt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 dark:text-[#7a8ba3]">
              <Legend color={T.primary} label="Strong route" />
              <Legend color={T.linkedin} label="Mutual" dashed />
              <Legend color={T.success} label="Customer reference" dashed />
              <Legend color={EMPLOYER_COLOR} label="Shared employer" />
            </div>
          </div>

          {/* action bar: wallet + request / withdraw / status */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-[#1a1c24] flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
              <Gem className="w-4 h-4" style={{ color: T.linkedin }} />
              <span className="tabular-nums font-semibold text-[15px] text-[#172560] dark:text-white">{credits}</span>
              intro credits
            </span>
            <div className="flex-1 min-w-[8px]" />

            {phase === 'idle' && (
              <button
                onClick={request}
                disabled={credits <= 0}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-[11px] text-[13px] font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition hover:brightness-110"
                style={{ background: T.primary }}
              >
                <Send className="w-4 h-4" /> Request warm intro
                <span className="font-medium opacity-75">· 1 credit</span>
              </button>
            )}

            {phase === 'requested' && (
              <>
                <div className="flex items-start gap-2 text-[12.5px] text-[#172560] dark:text-[#c9d4ee] bg-slate-50 dark:bg-[#0e1a3a] ring-1 ring-slate-200 dark:ring-[#262831] rounded-[11px] px-3 py-2 flex-1 min-w-[260px]">
                  <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: T.linkedin }} />
                  <span>
                    <b>Request sent anonymously to {matchCount} {matchCount === 1 ? 'member' : 'members'}.</b>{' '}
                    1 credit used · {credits} left. Identities are revealed only when a member accepts.
                  </span>
                </div>
                <button
                  onClick={withdraw}
                  className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[11px] text-[12.5px] font-medium text-slate-600 dark:text-[#7a8ba3] ring-1 ring-slate-200 dark:ring-[#262831] hover:bg-slate-100 dark:hover:bg-[#1a2a43]"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Withdraw
                </button>
                {/* demo affordance - remove once live */}
                <button
                  onClick={simulateAccept}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-[11px] text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] ring-1 ring-dashed ring-slate-300 dark:ring-[#324061] hover:bg-slate-50 dark:hover:bg-[#111a30]"
                  title="Prototype only: simulate a member accepting"
                >
                  Simulate acceptance ▸
                </button>
              </>
            )}

            {phase === 'accepted' && (
              <div className="flex items-start gap-2 text-[12.5px] text-[#172560] dark:text-[#c9d4ee] bg-emerald-50 dark:bg-[#0d2a1e] ring-1 ring-emerald-200 dark:ring-[#1e4634] rounded-[11px] px-3 py-2 flex-1 min-w-[260px]">
                <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" style={{ color: T.success }} />
                <span>
                  <b>1 member accepted.</b> They can now introduce you to {firstName} - the intro is drafted by
                  their agent. {matchCount - 1} {matchCount - 1 === 1 ? 'request' : 'requests'} still pending.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </LadCard>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-3 rounded"
        style={
          dashed
            ? { height: '2px', backgroundImage: `linear-gradient(to right, ${color} 50%, transparent 50%)`, backgroundSize: '4px 100%' }
            : { height: '2px', background: color }
        }
      ></span>
      {label}
    </span>
  );
}

type NodeState = 'target' | 'locked' | 'pending' | 'accepted';

interface GraphNodeProps {
  x: number;
  y: number;
  name: string;
  sub?: string;
  color: string;
  darkColor?: string;
  big?: boolean;
  isProspect?: boolean;
  badge: string;
  state: NodeState;
  clickable?: boolean;
  collapsed?: boolean;
  isHover?: boolean;
  draggable?: boolean;
  onPointerDown?: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerMove?: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerUp?: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<SVGGElement>) => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
  onClick?: () => void;
}

function GraphNode({
  x, y, name, sub, color, darkColor, big = false, isProspect = false, badge, state,
  draggable, clickable, collapsed, isHover,
  onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerEnter, onPointerLeave, onClick,
}: GraphNodeProps) {
  const r = big ? 26 : 18;
  const cursor = draggable ? 'grab' : clickable ? 'pointer' : 'default';
  const showLock = state === 'locked';
  const ls = big ? 1.15 : 0.9; // lock scale
  // Prefer the brighter dark-mode token for foreground legibility on the deep navy canvas.
  const nodeColor =
    typeof window !== 'undefined' && document.documentElement.classList.contains('dark')
      ? darkColor || color
      : color;
  return (
    <g
      transform={`translate(${x} ${y})`}
      style={{ cursor, transition: draggable && !isHover ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onClick={clickable ? onClick : undefined}
    >
      <circle r={r + 14} fill="transparent" />
      <circle r={r + 4} fill="white" className="dark:fill-[#000724]" />
      <circle r={r} fill={color} className="dark:!fill-[var(--node-color)]" style={{ transition: 'opacity 150ms', ['--node-color' as any]: darkColor || color}}  opacity={isHover ? 0.22 : 0.12}/>
      <circle
        r={r}
        fill="white"
        className="dark:fill-[#0e1a3a]"
        stroke={color}
        strokeWidth={isProspect ? 2.5 : isHover ? 2 : 1.5}
        style={{ transition: 'stroke-width 150ms', stroke: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? (darkColor || color) : color}}
      />

      {showLock ? (
        <g transform="translate(0 -1)" style={{ pointerEvents: 'none' }}>
          <path
            d={`M${-5 * ls},0 v${-3.4 * ls} a${5 * ls},${5 * ls} 0 0 1 ${10 * ls},0 v${3.4 * ls}`}
            fill="none" stroke={nodeColor} strokeWidth={2 * ls} strokeLinecap="round"
          />
          <rect x={-7 * ls} y={0} width={14 * ls} height={10 * ls} rx={2.6 * ls} fill={nodeColor} />
        </g>
      ) : (
        <text
          textAnchor="middle"
          y={4}
          style={{ fontSize: big ? 13 : 10, fontWeight: 700, pointerEvents: 'none', fill: nodeColor, fontFamily: '"Space Grotesk", system-ui' }}
        >
          {badge}
        </text>
      )}

      {isProspect && (
        <g transform={`translate(${r - 6} ${-r + 6})`} style={{ pointerEvents: 'none' }}>
          <circle r="7" fill={color} />
          <text textAnchor="middle" y="3" fill="white" style={{ fontSize: 11, fontWeight: 700 }}>
            {collapsed ? '+' : '−'}
          </text>
        </g>
      )}
      {state === 'pending' && (
        <g transform={`translate(${r - 5} ${-r + 5})`} style={{ pointerEvents: 'none' }}>
          <circle r="7" fill={T.warning} />
          <text textAnchor="middle" y="1" fill="white" style={{ fontSize: 11, fontWeight: 800 }}>…</text>
        </g>
      )}
      {state === 'accepted' && (
        <g transform={`translate(${r - 5} ${-r + 5})`} style={{ pointerEvents: 'none' }}>
          <circle r="7.5" fill={T.success} />
          <text textAnchor="middle" y="3.5" fill="white" style={{ fontSize: 10, fontWeight: 800 }}>✓</text>
        </g>
      )}

      <g transform={`translate(0 ${r + 14})`} style={{ pointerEvents: 'none' }}>
        <text
          textAnchor="middle"
          style={{ fontSize: 11.5, fontWeight: 600, fontFamily: '"Space Grotesk", system-ui' }}
          className="fill-[#172560] dark:fill-white"
        >
          {name}
        </text>
        {sub && (
          <text textAnchor="middle" y={13} className="fill-slate-500 dark:fill-[#7a8ba3]" style={{ fontSize: 10 }}>
            {sub}
          </text>
        )}
      </g>
    </g>
  );
}
