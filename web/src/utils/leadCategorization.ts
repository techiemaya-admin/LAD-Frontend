/**
 * Lead categorization logic for call logs
 * Determines lead temperature (Hot/Warm/Cold) based on call characteristics
 */

export type LeadTag = "hot" | "warm" | "cold";

export interface LeadTagConfig {
  tag: LeadTag;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}

const TAG_CONFIGS: Record<LeadTag, LeadTagConfig> = {
  hot: {
    tag: "hot",
    label: "Hot",
    bgColor: "bg-red-100",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
  warm: {
    tag: "warm",
    label: "Warm",
    bgColor: "bg-amber-100",
    textColor: "text-amber-700",
    borderColor: "border-amber-300",
  },
  cold: {
    tag: "cold",
    label: "Cold",
    bgColor: "bg-blue-100",
    textColor: "text-blue-700",
    borderColor: "border-blue-300",
  },
};

interface CallLogForCategorization {
  status?: string;
  duration?: number;
  type?: string;
  // Can be extended with additional fields from API
  lead_temperature?: string;
  engagement_score?: number;
}

/**
 * Categorize a lead based on call characteristics
 * Logic: 
 * - Hot: Completed/Ended calls with duration > 60s = engaged conversation
 * - Warm: Completed calls with duration 10-60s = brief interaction
 * - Cold: Failed, short, or no meaningful engagement
 */
export function categorizeLead(
  callLog: CallLogForCategorization
): LeadTag {
  // If API provides explicit categorization, use it
  if (callLog.lead_temperature) {
    const temp = callLog.lead_temperature.toLowerCase();
    if (temp === "hot" || temp === "warm" || temp === "cold") {
      return temp as LeadTag;
    }
  }

  const status = (callLog.status || "").toLowerCase();
  const duration = callLog.duration || 0;

  // Hot: Call was completed with substantial engagement (>60s)
  if (
    (status.includes("ended") || status.includes("completed")) &&
    duration > 60
  ) {
    return "hot";
  }

  // Warm: Call was completed with some engagement (10-60s)
  if (
    (status.includes("ended") || status.includes("completed")) &&
    duration >= 10
  ) {
    return "warm";
  }

  // Cold: Failed, no answer, or minimal engagement
  return "cold";
}

export function getTagConfig(tag: LeadTag): LeadTagConfig {
  return TAG_CONFIGS[tag];
}

export function getAllTagConfigs(): Record<LeadTag, LeadTagConfig> {
  return TAG_CONFIGS;
}

/**
 * Normalize API lead_category to LeadTag type
 * Handles values like "Hot Lead", "hot", "HOT" and converts to "hot"
 */
export function normalizeLeadCategory(apiValue?: string): LeadTag | null {
  if (!apiValue) return null;
  
  const normalized = apiValue.toLowerCase().replace(/\s+lead\s*/i, '').trim();
  
  if (normalized === 'hot') return 'hot';
  if (normalized === 'warm') return 'warm';
  if (normalized === 'cold') return 'cold';
  
  return null;
}
