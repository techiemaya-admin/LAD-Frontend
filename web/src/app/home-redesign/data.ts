import { Icon, type IconComponent } from "./components/icons";

/**
 * Static content for the LAD home redesign.
 * Ported from the Claude Design handoff (app.jsx) and made type-safe.
 *
 * NOTE: Capability labels are intentionally generic and tenant-facing  - 
 * no internal data-provider / vendor names are surfaced here.
 */

export type ToolId = "find" | "meet" | "research" | "relationships" | "media";

export interface ToolDef {
  icon: IconComponent;
  label: string;
  /** Accent tint (hex) used for the tool pill + menu icon. */
  tint: string;
  desc: string;
  /** Placeholder shown when this tool is the active (last-selected) one. */
  ph: string;
}

export const TOOLS: Record<ToolId, ToolDef> = {
  find: {
    icon: Icon.target,
    label: "Find leads",
    tint: "#4f46e5",
    desc: "Discover accounts matching your ICP",
    ph: "Describe the leads you want: role, industry, geography…",
  },
  meet: {
    icon: Icon.calendar,
    label: "Book meetings",
    tint: "#10b981",
    desc: "Turn intent into booked calls",
    ph: "Who do you want to book meetings with this week?",
  },
  research: {
    icon: Icon.compass,
    label: "Deep Research",
    tint: "#2563eb",
    desc: "Search the web & professional networks",
    ph: "What should LAD research across the web & professional networks?",
  },
  relationships: {
    icon: Icon.heart,
    label: "Relationships",
    tint: "#f97316",
    desc: "Nurture & re-engage clients",
    ph: "Which clients should we nurture or re-engage?",
  },
  media: {
    icon: Icon.image,
    label: "Create media",
    tint: "#a855f7",
    desc: "Emails, posts & creative, on brand",
    ph: "Describe the email, post, or image to generate…",
  },
};

export const TOOL_ORDER: ToolId[] = ["find", "meet", "research", "relationships", "media"];

export interface Suggestion {
  icon: IconComponent;
  t: string;
  tool?: ToolId;
}

export const SUGG: Record<"default" | ToolId, Suggestion[]> = {
  default: [
    { icon: Icon.building, t: "Founders in trading in UAE", tool: "find" },
    { icon: Icon.calendar, t: "Book meetings with HVAC managers", tool: "meet" },
    { icon: Icon.users, t: "VP of Sales in UK SaaS, 50-200 staff", tool: "find" },
    { icon: Icon.heart, t: "Strengthen client relationships", tool: "relationships" },
  ],
  find: [
    { icon: Icon.building, t: "Founders in trading in UAE", tool: "find" },
    { icon: Icon.users, t: "VP of Sales in UK SaaS, 50-200 staff", tool: "find" },
    { icon: Icon.target, t: "Get leads from my active ICP", tool: "find" },
  ],
  meet: [
    { icon: Icon.calendar, t: "Book meetings with HVAC managers", tool: "meet" },
    { icon: Icon.mail, t: "Re-engage 12 stalled opportunities", tool: "meet" },
    { icon: Icon.clock, t: "Fill my calendar for next week", tool: "meet" },
  ],
  research: [
    { icon: Icon.globe, t: "Map the UK fintech buying committee", tool: "research" },
    { icon: Icon.trend, t: "Who's hiring SDRs in MENA right now?", tool: "research" },
    { icon: Icon.building, t: "Find lookalikes of my best 3 accounts", tool: "research" },
  ],
  relationships: [
    { icon: Icon.heart, t: "Strengthen client relationships", tool: "relationships" },
    { icon: Icon.users, t: "Check in with my top 5 clients", tool: "relationships" },
    { icon: Icon.mail, t: "Draft a quarterly update to accounts", tool: "relationships" },
  ],
  media: [
    { icon: Icon.mail, t: "Cold email sequence for UAE founders", tool: "media" },
    { icon: Icon.image, t: "LinkedIn carousel from our case study", tool: "media" },
    { icon: Icon.doc, t: "One-pager for the HVAC vertical", tool: "media" },
  ],
};

export type ModelId = "agent" | "flash" | "reason";

export interface ModelDef {
  id: ModelId;
  name: string;
  sub: string;
  icon: IconComponent;
}

export const MODELS: ModelDef[] = [
  { id: "agent", name: "LAD Agent", sub: "Autonomous - plans & runs multi-step tasks", icon: Icon.agent },
  { id: "flash", name: "LAD 2.5 Flash", sub: "Fast answers for quick lookups", icon: Icon.bolt },
  { id: "reason", name: "LAD Reasoning", sub: "Deeper analysis for complex ICPs", icon: Icon.sparkle },
];

export type RecentKind = "ICP" | "search" | "draft";

export interface RecentItem {
  kind: RecentKind;
  icon: IconComponent;
  badge: string;
  title: string;
  meta: [string, string][];
  accent: string;
}

export const RECENTS: RecentItem[] = [
  {
    kind: "ICP",
    icon: Icon.target,
    badge: "Active ICP",
    title: "VP of Sales · UK SaaS",
    meta: [
      ["1,240", "matched"],
      ["38", "new this week"],
    ],
    accent: "#0b1957",
  },
  {
    kind: "search",
    icon: Icon.search,
    badge: "Recent search",
    title: "Founders in trading in UAE",
    meta: [
      ["312", "results"],
      ["2d", "ago"],
    ],
    accent: "#16a34a",
  },
  {
    kind: "draft",
    icon: Icon.doc,
    badge: "Draft campaign",
    title: "HVAC outreach sequence",
    meta: [
      ["60%", "complete"],
      ["5", "steps"],
    ],
    accent: "#d97706",
  },
];

export interface RailEntry {
  icon: IconComponent;
  label: string;
  active?: boolean;
}

export const RAIL: RailEntry[] = [
  { icon: Icon.home, label: "Home", active: true },
  { icon: Icon.compass, label: "Discover" },
  { icon: Icon.users, label: "Leads" },
  { icon: Icon.inbox, label: "Campaigns" },
  { icon: Icon.image, label: "Media" },
  { icon: Icon.layers, label: "Library" },
];
