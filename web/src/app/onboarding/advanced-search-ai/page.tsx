'use client';

import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Sparkles, Gem, Upload, FileSpreadsheet, Download, CheckCircle2, Pencil, Trash2, ChevronDown, ChevronLeft, ChevronRight, X, MessageSquare, Users, Zap, Plus, Image as ImageIcon, Video, Loader2, Mic, Globe, Newspaper, UserPlus, Check, History, Volume2, ArrowLeft, Mail, Phone as PhoneIcon, MapPin, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProfileSummaryDialog } from '@/components/campaigns';
import AgentVisualizer from '@/components/ui/AgentVisualizer';
import { useOnboardingStore } from '@/store/onboardingStore';
import { deriveConfig, applyConfig, type SyncStep } from '@/components/onboarding/workflow/configStepsSync';
import WorkflowPreviewPanel from '@/components/onboarding/WorkflowPreviewPanel';
import { MediaGenerationModal } from '@/components/voice-agent/MediaGenerationModal';
import { useMediaBuilder } from "@/hooks/voice-agent/useMediaBuilder";
import { AgentBuilderTextInput } from "@/components/voice-agent/playground/builder-steps/AgentBuilderTextInput";
import { AgentBuilderMCQ } from "@/components/voice-agent/playground/builder-steps/AgentBuilderMCQ";
import { AgentBuilderImageOutput } from "@/components/voice-agent/playground/builder-steps/AgentBuilderImageOutput";
import { AgentBuilderVideoConfirm } from "@/components/voice-agent/playground/builder-steps/AgentBuilderVideoConfirm";
import { AgentBuilderVideoOutput } from "@/components/voice-agent/playground/builder-steps/AgentBuilderVideoOutput";
import { AgentBuilderGallery } from "@/components/voice-agent/playground/builder-steps/AgentBuilderGallery";
import { AgentBuilderScriptConfirm } from "@/components/voice-agent/playground/builder-steps/AgentBuilderScriptConfirm";
import { AgentBuilderWorkflowChoice } from "@/components/voice-agent/playground/builder-steps/AgentBuilderWorkflowChoice";
import { AgentBuilderVideoProgress } from "@/components/voice-agent/playground/builder-steps/AgentBuilderVideoProgress";
import { AgentBuilderKeyframesConfirm } from "@/components/voice-agent/playground/builder-steps/AgentBuilderKeyframesConfirm";
import { AgentBuilderBrandDNA } from "@/components/voice-agent/playground/builder-steps/AgentBuilderBrandDNA";
import { useAuth } from '@/contexts/AuthContext';
import CustomWorkflowBuilder from '@/components/campaigns/CustomWorkflowBuilder';
import {
    WORKFLOW_TEMPLATES, WorkflowTemplate,
    templateWizardInputs, splitWizardAnswers, templateSearchQuery, templateToPreviewSteps,
} from '@/components/campaigns/workflowTemplates';
import type { TemplateInput } from '@/components/campaigns/workflowTemplates';
import { TemplateIcon } from '@/components/campaigns/TemplateIcon';
import { useEmailTemplates, useCreateEmailTemplate } from '@lad/frontend-features/email-templates';
import { useConnectedEmailSenders } from '@lad/frontend-features/email-senders';
import {
    useLinkedInSearch,
    useRunSearch,
    useAIChat,
    useCampaignCreation,
    useVoiceAgent,
    useBilling,
    useBusinessProfile,
    computeCompleteness,
    type BusinessProfile,
} from '@lad/frontend-features/ai-icp-assistant';
import { getCampaign, updateCampaign, updateCampaignSteps, startCampaign } from '@lad/frontend-features/campaigns';

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */
interface LeadTargeting {
    job_titles: string[];
    industries: string[];
    locations: string[];
    keywords: string[];
    profile_language?: string[];
    functions?: string[];
    seniority?: string[];
    company_headcount?: string[];
    company_names?: string[];
    decision_maker_nationality?: string[];
    decision_maker_experience_level?: string[];
    company_size?: string[];
    company_age?: string[];
    decision_maker_education?: string[];
    decision_maker_skills?: string[];
    posted_recently?: boolean; // true = only show leads who posted on LinkedIn in the last 3 months
    nationality_filter?: string[]; // nationalities extracted by AI from chat (e.g. ["Indian"])
}

interface LeadProfile {
    id: string;
    name: string;
    first_name: string;
    last_name: string;
    headline: string;
    location: string;
    current_company: string;
    profile_url: string;
    profile_picture: string;
    industry: string;
    network_distance: string;
    locked?: boolean;
    phone?: string;
    email?: string;
    icp_score?: number;
    match_level?: 'strong' | 'moderate' | 'weak';
    icp_reasoning?: string;
    enriched_profile?: {
        summary: string | null;
        experience: { title: string; company: string; is_current: boolean }[];
        education: { school: string; degree: string; field_of_study: string }[];
        skills: string[];
    };
    inferred?: Record<string, any>;
    inferred_nationality?: string;
    nationality_confidence?: number;
}

interface ParsedInboundLead {
    firstName: string;
    lastName: string;
    companyName: string;
    linkedinProfile: string;
    email: string;
    whatsapp: string;
    phone: string;
    website: string;
    notes: string;
    // Role/title target(s) — e.g. a "Target Contacts" or "Job Title" column. May hold
    // several titles ("COO; HR Director"); the backend router splits + fans these out.
    title: string;
    // Optional location/geo (city/country/region) to geo-target the title discovery.
    location: string;
    // LinkedIn profile photo (DP) for discovered people.
    profilePicture: string;
}

// ── Specific-person query detection ─────────────────────────────────────────
// "Karen Lundquist, Association Manager at Impact Association Management" is one
// fully-identified person, not an audience. Broad search + ICP scoring cannot
// serve that query (the ICP is literally one person's name, so every candidate
// scores ~0 and the campaign launches with zero leads). Detect this shape and
// route it through the inbound waterfall pipeline instead, which resolves the
// exact person once and attaches them to the campaign directly.
// Conservative on purpose: false negatives just fall back to normal search.
const PERSON_AUDIENCE_WORDS = /\b(founders?|co-?founders?|owners?|managers?|directors?|heads?|chiefs?|leads?|executives?|officers?|presidents?|professionals?|specialists?|consultants?|engineers?|developers?|designers?|marketers?|recruiters?|analysts?|advisors?|partners?|investors?|agents?|brokers?|people|teams?|companies|startups?|businesses|smes?|ceos?|c[tfmo]os?|cxos?|vps?)\b/i;
function detectSpecificPersonQuery(t: LeadTargeting | null | undefined): { name: string; title: string; company: string; location: string } | null {
    if (!t) return null;
    const kw = (t.keywords || []).join(' ').replace(/\s+/g, ' ').trim();
    const words = kw.split(' ').filter(Boolean);
    // A person name: 2–4 name-cased words with no audience/role vocabulary.
    if (words.length < 2 || words.length > 4) return null;
    if (PERSON_AUDIENCE_WORDS.test(kw)) return null;
    if (!words.every(w => /^[A-Z][A-Za-z'’.-]*$/.test(w))) return null;
    // Require a company anchor — that's what the person-resolution waterfall keys on.
    const company = (t.company_names && t.company_names[0]) || '';
    if (!company) return null;
    return {
        name: kw,
        title: (t.job_titles && t.job_titles[0]) || '',
        company,
        location: (t.locations && t.locations[0]) || '',
    };
}

interface ChatMsg {
    id: string;
    role: 'user' | 'ai';
    text: string;
    ts: Date;
    targeting?: LeadTargeting;
    loading?: boolean;
    options?: { label: string; value: string }[];
    /** Rich "Accelerators" wizard card (template pipelines launched from chat). */
    roleCard?: { key: string; stage: 'intro' | 'question' | 'summary' | 'file'; qIdx?: number; nudge?: boolean; answers?: Record<string, string> };
    leads?: LeadProfile[];
    inboundAction?: 'download' | 'upload' | 'summary';
    inboundSummary?: { total: number; linkedin: number; email: number; whatsapp: number; phone: number; website: number };
    webSearchResult?: boolean;
    sources?: Array<{ title: string; url: string }>;
    leadDetailForm?: boolean;
    outreach_journey?: OutreachStep[];
}

/**
 * A lead source this wizard has no UI for (today: the recurring Zoho CRM
 * import). Read off the saved campaign on edit hydration and written straight
 * back out at save time so editing the outreach steps here never rewrites which
 * system the campaign pulls leads from.
 */
interface PersistedLeadSource {
    /** lead_generation step config.source — e.g. 'zoho_contacts'. */
    source: string;
    /** Campaign-level config.data_source mirror. */
    data_source?: string;
    /** Zoho-specific: which modules to import ('contacts' | 'contacts_leads'). */
    zoho_modules?: string;
    /** Zoho-specific: only import records carrying this tag. */
    zoho_tag?: string;
}

interface OutreachStep {
    channel: 'linkedin' | 'email' | 'whatsapp' | 'voice';
    label: string;
    action: string;
    reason: string;
    recommended: boolean;
}

/* ═══════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════ */

function toArr(v: any): string[] {
    if (Array.isArray(v)) return v.filter((x: any) => typeof x === 'string' && x.trim());
    if (typeof v === 'string' && v.trim()) return [v];
    return [];
}

const ICP_LEADS_PROMPT = 'Get leads from my active ICP';
const isIcpLeadsPrompt = (s: string) => s.trim().toLowerCase() === ICP_LEADS_PROMPT.toLowerCase();

/** Synthetic stand-in names the pipeline can produce for a lead whose real name
 *  wasn't resolved ("Lead 1", "Prospect 3", "Unknown"). Mirrors the backend
 *  core/utils/nameSafety.js — kept in sync so a placeholder is never shown as a
 *  person nor persisted (via initial_leads) as one. */
const PLACEHOLDER_NAME_RE = /^(?:(?:lead|prospect|contact)(?:\s*\d+)?|unknown|n\/?a|none|null|undefined)$/i;
function isPlaceholderName(s?: string | null): boolean {
    const t = (s ?? '').trim();
    return t === '' || PLACEHOLDER_NAME_RE.test(t);
}

/** Read a discovered/imported person's name tolerantly across camelCase and
 *  snake_case. The import/save (and enrichment) responses carry a mix — reading
 *  both is what stops the resolved name being dropped on a casing mismatch. */
function readLeadName(r: any): { firstName: string; lastName: string; name: string } {
    let firstName = String(r?.firstName ?? r?.first_name ?? '').trim();
    let lastName = String(r?.lastName ?? r?.last_name ?? '').trim();
    const name = String(r?.name ?? `${firstName} ${lastName}`).trim();
    // Fall back to splitting a combined `name` when first/last aren't provided
    // (e.g. enrich-inbound results carry only `name`) — otherwise the panel,
    // which renders `[firstName, lastName]`, shows "Unknown" despite a real name.
    if (!firstName && !lastName && name) {
        const parts = name.split(/\s+/).filter(Boolean);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
    }
    return { firstName, lastName, name };
}

/** Best human-facing DISPLAY label for a lead — a real name when we have one,
 *  else the company or headline, and only "Lead N" as a last resort. Never shows
 *  a synthetic placeholder as if it were a person. For DISPLAY only; the persisted
 *  lead name must stay empty when unknown (see the launch payload). */
function leadDisplayLabel(
    parts: { firstName?: string; lastName?: string; name?: string; company?: string; headline?: string },
    idx: number,
): string {
    const full = (parts.name || `${parts.firstName || ''} ${parts.lastName || ''}`).trim();
    if (full && !isPlaceholderName(full)) return full;
    const company = (parts.company || '').trim();
    if (company) return company;
    const headline = (parts.headline || '').trim();
    if (headline) return headline;
    return `Lead ${idx + 1}`;
}

/** Map SearchDispatcher candidates (ProspectCandidate) → the page's LeadProfile shape,
 *  so an ICP-discovery run drops into the same leads list/panel the LinkedIn search uses. */
function candidatesToLeadProfiles(candidates: any[]): LeadProfile[] {
    return (candidates || []).map((c, i) => {
        const fullName = String(c.full_name || '').trim();
        const parts = fullName.split(/\s+/).filter(Boolean);
        const email = c.email && !String(c.email).startsWith('email_not_unlocked@') ? c.email : undefined;
        const conf = typeof c.source_confidence === 'number' ? c.source_confidence : 0;
        const match: 'strong' | 'moderate' | 'weak' = conf >= 0.8 ? 'strong' : conf >= 0.5 ? 'moderate' : 'weak';
        return {
            id: String(c.apollo_id || c.linkedin_url || `icp-${i}`),
            name: fullName || c.company_name || `Prospect ${i + 1}`,
            first_name: parts[0] || '',
            last_name: parts.slice(1).join(' ') || '',
            headline: c.headline || c.job_title || '',
            location: c.company_country || '',
            current_company: c.company_name || '',
            profile_url: c.linkedin_url || '',
            profile_picture: '',
            industry: c.company_industry || '',
            network_distance: '',
            email,
            phone: c.phone_e164 || undefined,
            icp_score: Math.round(conf * 100),
            match_level: match,
            icp_reasoning: `${match[0].toUpperCase()}${match.slice(1)} match to your ICP`,
        };
    });
}

function buildOutreachJourney(leads: LeadProfile[], targeting: LeadTargeting | null): OutreachStep[] {
    const hasEmail = leads.some(l => l.email);
    const hasPhone = leads.some(l => l.phone);
    const hasLi = leads.some(l => l.profile_url?.startsWith('http'));
    const locs = (targeting?.locations || []).map(l => l.toLowerCase());
    const isGCC = locs.some(l => ['uae', 'dubai', 'saudi', 'gcc', 'qatar', 'kuwait', 'bahrain', 'oman', 'riyadh', 'abu dhabi'].some(g => l.includes(g)));
    const isEnterprise = (targeting?.company_size || []).some(s => s.includes('1000'));

    return [
        {
            channel: 'linkedin',
            label: 'LinkedIn',
            action: 'Visit profile → Connect → Message',
            reason: hasLi ? 'LinkedIn profiles found — warm up with a connection request first.' : 'Start with LinkedIn to build familiarity before reaching out.',
            recommended: true,
        },
        {
            channel: 'email',
            label: 'Email',
            action: 'Personalised cold email + follow-up sequence',
            reason: hasEmail ? 'Email addresses available — follow up 3–5 days after LinkedIn connect.' : 'Enrich emails via enrichment tools after LinkedIn connection is accepted.',
            recommended: true,
        },
        {
            channel: 'whatsapp',
            label: 'WhatsApp',
            action: 'Direct message, broadcast + follow-up sequence',
            reason: isGCC ? 'GCC region — WhatsApp has very high open rates (98%). Use after email.' : 'Add WhatsApp as a follow-up channel for warm leads.',
            recommended: true,
        },
        {
            channel: 'voice',
            label: 'Voice Call',
            action: 'AI-powered voice call with script',
            reason: isEnterprise ? 'Enterprise deals benefit from a personal call to qualify intent.' : 'Reserve voice calls for high-priority leads who haven\'t responded.',
            recommended: true,
        },
    ];
}

function avatarColor(name: string): string {
    const colors = ['#0b1957', '#ec4899', '#2563eb', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
}

/**
 * Resolve the best LinkedIn profile URL from an API result item.
 * Priority:
 *  1. profile_url (already normalised by backend to public_profile_url when available)
 *  2. public_profile_url (explicit standard LinkedIn URL)
 *  3. linkedin_url (alternative field name)
 *  4. Constructed from public_identifier (slug)
 * Only keeps URLs that point to a real LinkedIn profile (linkedin.com/in/).
 */
function resolveProfileUrl(item: any): string {
    const candidates = [
        item.profile_url,
        item.public_profile_url,
        item.linkedin_url,
    ].filter((u): u is string => typeof u === 'string' && u.startsWith('http'));

    // Prefer standard linkedin.com/in/ URLs over sales/lead/ URLs
    const standard = candidates.find(u => u.includes('linkedin.com/in/'));
    if (standard) return standard;
    // Fallback: any http URL (covers Sales Nav URLs too)
    if (candidates.length > 0) return candidates[0];
    // Last resort: construct from public_identifier slug
    if (item.public_identifier && typeof item.public_identifier === 'string') {
        return `https://www.linkedin.com/in/${item.public_identifier}`;
    }
    return '';
}

/**
 * Compute the display match level from the actual icp_score.
 * Gemini's match_level label can be inconsistent (e.g. 'weak' for score 52).
 * Using the score directly ensures the badge colour reflects what the user sees.
 */
function scoreToMatchLevel(score: number | undefined): 'strong' | 'moderate' {
    if ((score ?? 0) >= 70) return 'strong';
    return 'moderate'; // yellow for everything else — never show red on lead badges
}

function initials(name: string): string {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const LinkedInIcon = ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
);

/* ═══════════════════════════════════════════════
   INBOUND CSV UTILITIES
   ═══════════════════════════════════════════════ */
function downloadInboundTemplate() {
    const hdrs = ['First Name', 'Last Name', 'Company Name', 'LinkedIn Profile URL', 'Email', 'WhatsApp Number', 'Phone Number', 'Website', 'Notes'];
    const exRow = ['John', 'Doe', 'DELETE THIS ROW - Example Corp', 'https://linkedin.com/in/johndoe', 'example@example.com', "'+1234567890", "'+1234567890", 'https://example.com', 'DELETE THIS ROW - Remove before uploading'];
    const instRow = ['Lead first name', 'Lead last name', 'INSTRUCTIONS: Format phone as TEXT', '', '', "Start with ' (apostrophe)", "Example: '+919087654321", '', 'Delete example rows before upload'];
    const emptyRows = Array(10).fill(hdrs.map(() => ''));
    const csv = [hdrs.join(','), exRow.map(c => `"${c}"`).join(','), instRow.map(c => `"${c}"`).join(','), ...emptyRows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'inbound_leads_template.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

function parseCSVText(text: string): string[][] {
    const rows: string[][] = []; let row: string[] = []; let cell = ''; let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i], n = text[i + 1];
        if (c === '"') { if (inQ && n === '"') { cell += '"'; i++; } else inQ = !inQ; }
        else if (c === ',' && !inQ) { row.push(cell.trim()); cell = ''; }
        else if ((c === '\n' || (c === '\r' && n === '\n')) && !inQ) { row.push(cell.trim()); if (row.some(x => x)) rows.push(row); row = []; cell = ''; if (c === '\r') i++; }
        else if (c !== '\r') cell += c;
    }
    if (cell || row.length) { row.push(cell.trim()); if (row.some(x => x)) rows.push(row); }
    return rows;
}

function fixPhone(v: string): string {
    if (!v) return '';
    let c = v.replace(/[\s\-\(\)]/g, '');
    if (/^\d+\.?\d*e\+?\d+$/i.test(c)) c = parseFloat(c).toFixed(0);
    if (c && !c.startsWith('+') && c.length > 10) c = '+' + c;
    return c;
}

async function parseInboundCSV(file: File): Promise<ParsedInboundLead[]> {
    return new Promise((resolve, reject) => {
        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

        if (isExcel) {
            // Handle Excel files with ExcelJS
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const { Workbook } = await import('exceljs');
                    const arrayBuffer = e.target?.result as ArrayBuffer;
                    const workbook = new Workbook();
                    await workbook.xlsx.load(arrayBuffer);

                    // Get first worksheet
                    const worksheet = workbook.worksheets[0];
                    if (!worksheet) {
                        reject(new Error('No worksheets found in Excel file'));
                        return;
                    }

                    // Convert Excel rows to string array format
                    const rows: string[][] = [];
                    worksheet.eachRow((row, rowNum) => {
                        const rowData = row.values as any[];
                        // Skip the first element (row index) and convert to strings
                        const strRow = rowData.slice(1).map(v => (v === null || v === undefined) ? '' : String(v).trim());
                        rows.push(strRow);
                    });

                    if (rows.length <= 1) {
                        reject(new Error('File is empty or only has headers.'));
                        return;
                    }

                    // Parse using the same logic as CSV
                    parseRows(rows, resolve, reject);
                } catch (err: any) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        } else {
            // Handle CSV files with text parsing
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const rows = parseCSVText(text);
                    if (rows.length <= 1) {
                        reject(new Error('File is empty or only has headers.'));
                        return;
                    }
                    parseRows(rows, resolve, reject);
                } catch (err: any) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        }
    });
}

// Helper function to parse rows with column mapping
function parseRows(rows: string[][], resolve: (leads: ParsedInboundLead[]) => void, reject: (err: Error) => void) {
    try {
        const h = rows[0];
        const ci = {
            firstName: h.findIndex(x => x.toLowerCase().includes('first') && x.toLowerCase().includes('name')),
            lastName: h.findIndex(x => x.toLowerCase().includes('last') && x.toLowerCase().includes('name')),
            company: h.findIndex(x => x.toLowerCase().includes('company')),
            linkedin: h.findIndex(x => x.toLowerCase().includes('linkedin')),
            email: h.findIndex(x => x.toLowerCase().includes('email')),
            whatsapp: h.findIndex(x => x.toLowerCase().includes('whatsapp')),
            phone: h.findIndex(x => x.toLowerCase().includes('phone')),
            website: h.findIndex(x => x.toLowerCase().includes('website')),
            notes: h.findIndex(x => x.toLowerCase().includes('notes')),
            // Role/title target(s): "Target Contacts", "Job Title", "Title", "Role", "Designation", "Position".
            title: h.findIndex(x => {
                const s = x.toLowerCase();
                return s.includes('title') || s.includes('target') || s.includes('role')
                    || s.includes('designation') || s.includes('position');
            }),
            // Location/geo: "Location", "City", "Country", "Region", "Geo".
            location: h.findIndex(x => {
                const s = x.toLowerCase();
                return s.includes('location') || s.includes('city') || s.includes('country')
                    || s.includes('region') || s.includes('geo');
            }),
        };
        const leads = rows.slice(1).map(r => ({
            firstName: (ci.firstName >= 0 ? r[ci.firstName] : '') || '',
            lastName: (ci.lastName >= 0 ? r[ci.lastName] : '') || '',
            companyName: (ci.company >= 0 ? r[ci.company] : '') || '',
            linkedinProfile: (ci.linkedin >= 0 ? r[ci.linkedin] : '') || '',
            email: (ci.email >= 0 ? r[ci.email] : '') || '',
            whatsapp: fixPhone((ci.whatsapp >= 0 ? r[ci.whatsapp] : '') || ''),
            phone: fixPhone((ci.phone >= 0 ? r[ci.phone] : '') || ''),
            website: (ci.website >= 0 ? r[ci.website] : '') || '',
            notes: (ci.notes >= 0 ? r[ci.notes] : '') || '',
            title: (ci.title >= 0 ? r[ci.title] : '') || '',
            location: (ci.location >= 0 ? r[ci.location] : '') || '',
            profilePicture: '',
        })).filter(l => {
            const isExample = l.companyName.toLowerCase().includes('delete this') || l.notes.toLowerCase().includes('delete this') || l.email.toLowerCase().includes('example.com');
            const hasData = (l.companyName && l.companyName.trim().length > 1) || (l.email && l.email.includes('@')) || (l.linkedinProfile && l.linkedinProfile.includes('linkedin.com'));
            return !isExample && hasData;
        });
        if (leads.length === 0) {
            reject(new Error('No valid leads found. Please add your lead data.'));
            return;
        }
        resolve(leads);
    } catch (err: any) {
        reject(err);
    }
}

function isInboundIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return /\b(i have leads|i have .* data|upload.*leads|inbound|import.*leads|have.*csv|have.*excel|already have.*leads|my leads|upload.*file|have.*spreadsheet|bulk.*upload)\b/i.test(lower);
}

/** Returns true when the user's reply is a confirmation of a search preview. */
function isConfirmation(text: string): boolean {
    return /^\s*(yes|yeah|yep|yup|ok|okay|sure|go|proceed|correct|right|confirm|search it|search|find them|do it|go ahead|looks (good|right|correct)|that'?s? (right|correct|good|it)|sounds good|perfect|absolutely|definitely)\s*[!.]*\s*$/i.test(text.trim());
}

/**
 * Detect whether a user query is a generic COMPANY-TYPE search
 * (e.g. "decision makers in hotels with swimming pools in Dubai")
 * rather than a direct LinkedIn role/industry/location search.
 *
 * When true, the query is routed to the enriched prospect discovery pipeline
 * (Claude company discovery → Serper → Unipile → Apollo → ICP scoring)
 * instead of searching LinkedIn directly.
 */
function isGenericCompanySearchQuery(text: string): boolean {
    const lower = text.toLowerCase();

    // Must contain a company category noun
    const hasCompanyType = /\b(hotel|resort|hospital|clinic|pharmacy|school|university|college|bank|restaurant|cafe|coffee\s*shop|salon|spa|gym|fitness\s*(studio|center|club)|mall|shopping\s*(center|centre)|construction\s*(firm|company|compan)|real\s*estate|property\s*(developer|management|firm)|law\s*firm|accounting\s*firm|insurance\s*(compan|firm|broker)|retail(er|er|\s*store|\s*shop|\s*chain)?|supermarket|car\s*(dealership|showroom)|automotive|manufactur|factory|factories|startup|tech\s*compan|software\s*compan|recruitment\s*agenc|staffing\s*agenc|advertising\s*agenc|marketing\s*agenc|logistics\s*compan|travel\s*agenc|tourism\s*compan)\b/i.test(text);
    if (!hasCompanyType) return false;

    // Must contain a location reference
    const hasLocation = /\b(in|from|across|based in|located in|around|within)\s+\w+/i.test(text)
        || /\b(dubai|uae|abu dhabi|sharjah|ajman|riyadh|jeddah|saudi|ksa|qatar|doha|kuwait|bahrain|oman|muscat|london|uk|new york|usa|singapore|india|mumbai|delhi|cairo|egypt|beirut|jordan|istanbul|turkey|australia|canada|germany|france|paris)\b/i.test(lower);
    if (!hasLocation) return false;

    // Attribute qualifier: "which have", "with pools", "having", "that offer" etc.
    const hasAttributeQualifier = /\b(with\b|having\b|which\s+(have|has|had|contain|offer|provide|include|feature)|that\s+(have|has|had|offer|provide|sell|serve|include|feature|contain|are|is)|featuring\b|equipped\s+with|known\s+for|famous\s+for|speciali[sz]ing\s+in|\d+[-\s]?star|5[-\s]?star|luxury\b|boutique\b|premium\b|high[-\s]end)\b/i.test(text);
    if (hasAttributeQualifier) return true;

    // Generic company plural nouns
    if (/\b(companies|businesses|firms|agencies|stores|establishments|outlets|chains|brands|operators|venues|properties|facilities)\b/i.test(lower)) return true;

    // Decision maker + company type (strongly indicates generic company search)
    if (/\b(decision[\s-]?maker|gm\b|general\s*manager|managing\s*director|md\b|ceo\b|owner\b|proprietor|director\s+of|head\s+of|vp\s+of|vice\s*president|operations\s*manager)\b/i.test(lower)) return true;

    return false;
}

/* ═══════════════════════════════════════════════
   TARGETING FILTER OPTIONS (CONSTANTS)
   ═══════════════════════════════════════════════ */
const NATIONALITIES = [
    'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia',
    'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium',
    'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei',
    'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon', 'Canada', 'Cape Verde',
    'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo',
    'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Czechia', 'Denmark',
    'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador',
    'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland',
    'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
    'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hong Kong',
    'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
    'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Korea',
    'Kosovo', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
    'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Macao', 'Madagascar', 'Malawi',
    'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
    'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco',
    'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand',
    'Nicaragua', 'Niger', 'Nigeria', 'North Macedonia', 'Norway', 'Oman', 'Pakistan',
    'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
    'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis',
    'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino',
    'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles',
    'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
    'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan',
    'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania',
    'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
    'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
    'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam',
    'Yemen', 'Zambia', 'Zimbabwe'
];

const EXPERIENCE_LEVELS = ['Entry Level (0-3 yrs)', 'Mid-Level (3-8 yrs)', 'Senior (8-15 yrs)', 'Executive (15+ yrs)'];
const COMPANY_SIZES = ['1-50 employees', '51-250 employees', '251-1000 employees', '1000+ employees'];
const COMPANY_AGES = ['Startup (<1 year)', 'Growth (1-5 years)', 'Established (5-10 years)', 'Mature (10+ years)'];
const EDUCATION_OPTIONS = ['MBA', 'Bachelor\'s', 'Master\'s', 'PhD', 'Bootcamp', 'Other'];

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function AdvancedSearchAIPage() {
    const router = useRouter();

    // Initialize SDK hooks
    const linkedInSearch = useLinkedInSearch();
    const icpSearch = useRunSearch();
    const aiChat = useAIChat();
    const campaignCreation = useCampaignCreation();
    const { fetchLeadSummaryPreview, saveProspectFeedback, generateProspectSummary } = campaignCreation;
    const voiceAgent = useVoiceAgent(false);
    // Connected email senders — loaded on mount so "Let Agent Deal" can detect the
    // email channel synchronously (the child also calls this; React Query dedupes).
    const { data: connectedSendersParent = [] } = useConnectedEmailSenders();
    const billing = useBilling(false);

    // Unified single-screen mode - always show chat interface
    // const [screen, setScreen] = useState<'landing' | 'chat'>('landing');
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    // Edit mode: set when "Edit Accelerator" routes here with ?campaignId=<id>.
    const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
    const editHydratedRef = useRef(false);
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [recognitionInstance, setRecognitionInstance] = useState<any>(null);
    const [beautifying, setBeautifying] = useState(false);
    const [busy, setBusy] = useState(false);
    const [typedPlaceholder, setTypedPlaceholder] = useState('');
    useEffect(() => {
        if (messages.length > 0) { setTypedPlaceholder(''); return; }
        const suggestions = [
            'Connect me with founders in trading companies in UAE',
            'Connect me with CFO in Goldman Sachs in USA',
            'Schedule sales meetings with procurement managers in HVAC in UAE',
            'Find VP of Sales in SaaS companies in UK',
            'Reach out to HR directors in manufacturing in Germany',
            'Strengthen my relationship with existing clients',
        ];
        let sIdx = 0, cIdx = 0, deleting = false;
        let timer: ReturnType<typeof setTimeout>;
        const tick = () => {
            const current = suggestions[sIdx];
            if (!deleting) {
                cIdx++;
                setTypedPlaceholder(current.slice(0, cIdx));
                if (cIdx === current.length) { deleting = true; timer = setTimeout(tick, 1800); return; }
                timer = setTimeout(tick, 50);
            } else {
                cIdx--;
                setTypedPlaceholder(current.slice(0, cIdx));
                if (cIdx === 0) { deleting = false; sIdx = (sIdx + 1) % suggestions.length; timer = setTimeout(tick, 400); return; }
                timer = setTimeout(tick, 25);
            }
        };
        timer = setTimeout(tick, 600);
        return () => clearTimeout(timer);
    }, [messages.length]);



    const [targeting, setTargeting] = useState<LeadTargeting | null>(null);
    const [leads, setLeads] = useState<LeadProfile[]>([]);
    const [filteredLeads, setFilteredLeads] = useState<LeadProfile[]>([]);   // below ICP threshold
    const [showFilteredLeads, setShowFilteredLeads] = useState(false);        // toggle "Show all"
    // True between "leads rendered" and "ICP scores arrived" when the search ran
    // with defer_icp. Drives the pulsing dot that stands in for the score chip.
    const [icpScoringPending, setIcpScoringPending] = useState(false);
    // Per-lead selection: which prospects the user has checked to enroll into the
    // campaign. The list now spans the full ICP range (0–100); the user picks the
    // exact prospects rather than relying on a score cutoff. Keyed by lead.id.
    const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
    const [showPanel, setShowPanel] = useState<false | 'leads' | 'workflow'>(false);
    const setWorkflowPreview = useOnboardingStore(s => s.setWorkflowPreview);
    // Activity tracking for SearchingThinker
    const [activities, setActivities] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    // Checkpoint form state (inline in chat)
    const [pendingContact, setPendingContact] = useState<any>(null); // detected contact from phone/email outreach
    const [cpStep, setCpStep] = useState(-1); // -1 = not started, 0-6 = steps
    const [agentDealLoading, setAgentDealLoading] = useState(false); // "Let Agent Deal" one-click build
    const [isMobile, setIsMobile] = useState(false);
    const [chatBlocked, setChatBlocked] = useState(false);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth <= 768);
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            const lastMsg = messages[messages.length - 1];
            if (lastMsg.role === 'ai' && lastMsg.targeting) {
                setChatBlocked(true);
            }
        }
    }, [messages]);

    const [cpIcpThreshold, setCpIcpThreshold] = useState('75');
    const [cpConnMsg, setCpConnMsg] = useState('');
    const [cpFollowMsg, setCpFollowMsg] = useState('');
    const [cpEnableDailyWebPresence, setCpEnableDailyWebPresence] = useState(false);
    const [cpEnableDailyPosts, setCpEnableDailyPosts] = useState(false);
    const [cpEnableAiPersonalization, setCpEnableAiPersonalization] = useState(false);
    const [cpEnableAiConnectionPersonalization, setCpEnableAiConnectionPersonalization] = useState(false);
    const [cpEnableAiFollowupPersonalization, setCpEnableAiFollowupPersonalization] = useState(false);

    // ── Config ⇄ Workflow: single source of truth ────────────────────────────
    // The onboarding store's `workflowPreview` steps array is canonical. The
    // structural config the guided checkpoints collect — LinkedIn actions,
    // follow-up channels, trigger condition — is DERIVED from it here, and the
    // setters below reconcile edits back into it. So the guided toggles and the
    // Workflow Builder canvas stay in sync in BOTH directions in real time
    // (this replaces the old one-way, destructive derive-and-overwrite effect,
    // which also silently dropped LinkedIn actions and clobbered canvas edits).
    const workflowPreview = useOnboardingStore(s => s.workflowPreview);
    const _cpCfg = useMemo(() => deriveConfig(workflowPreview as unknown as SyncStep[]), [workflowPreview]);
    const cpActions = _cpCfg.actions;                     // ['connect','message','profile_view'] subset
    const cpNextChannels = _cpCfg.nextChannels;           // ['email','whatsapp','voice_call'] subset
    const cpTriggerCondition = _cpCfg.triggerCondition;   // '' | 'connection_accepted' | …

    // The lead-search node is the campaign's lead SOURCE, only relevant when leads
    // are discovered via LinkedIn search. For direct-contact / inbound-import
    // campaigns (leads provided directly) it must be omitted from the canvas so it
    // matches what actually launches. Kept in a ref (updated each render below,
    // once inboundMode/pendingContact are in scope) so the reconcile callbacks read
    // the latest value without a stale closure or a temporal-dead-zone reference.
    const includeLeadSourceRef = useRef(true);

    // The campaign's REAL lead source, when it is something this form has no UI
    // for — today a recurring Zoho import (source:'zoho_contacts', built in the
    // Custom Workflow Builder or the /crm/zoho modal). This form only ever emits
    // source:'linkedin_search', and saving does a destructive step replace, so
    // without this an edit here silently converts a Zoho-sourced campaign into a
    // LinkedIn search: the daily import stops and no new CRM contact is ever
    // enrolled again. Captured on edit hydration, re-emitted verbatim on save.
    // State, not a ref: the launch payload is built inside CheckpointFormInline,
    // so this has to reach the child as a prop and re-render it once hydration
    // resolves the source.
    const [persistedLeadSource, setPersistedLeadSource] = useState<PersistedLeadSource | null>(null);
    const _applyCpCfg = useCallback((patch: Partial<{ actions: string[]; nextChannels: string[]; triggerCondition: string }>) => {
        const cur = useOnboardingStore.getState().workflowPreview as unknown as SyncStep[];
        setWorkflowPreview(applyConfig(cur, patch, { includeLeadSource: includeLeadSourceRef.current }) as any);
    }, [setWorkflowPreview]);

    // These keep the exact React.Dispatch<SetStateAction<string[]>> shape the
    // CheckpointFormInline props expect, so the guided toggles need no changes —
    // they just reconcile the shared steps array instead of local state.
    const setCpActions = useCallback((a: string[] | ((p: string[]) => string[])) => {
        const cur = deriveConfig(useOnboardingStore.getState().workflowPreview as unknown as SyncStep[]).actions;
        _applyCpCfg({ actions: typeof a === 'function' ? a(cur) : a });
    }, [_applyCpCfg]);
    const setCpNextChannels = useCallback((a: string[] | ((p: string[]) => string[])) => {
        const cur = deriveConfig(useOnboardingStore.getState().workflowPreview as unknown as SyncStep[]).nextChannels;
        _applyCpCfg({ nextChannels: typeof a === 'function' ? a(cur) : a });
    }, [_applyCpCfg]);
    const setCpTriggerCondition = useCallback((v: string) => {
        _applyCpCfg({ triggerCondition: v });
    }, [_applyCpCfg]);

    // Seed a clean base (Lead Search only) when the shared steps array is empty,
    // so a first-ever load starts sensibly. A non-empty array (edit-mode
    // hydration or a persisted session) is left untouched.
    useEffect(() => {
        const cur = useOnboardingStore.getState().workflowPreview as unknown as SyncStep[];
        if (!cur || cur.length === 0) setWorkflowPreview(applyConfig([], {}, { includeLeadSource: includeLeadSourceRef.current }) as any);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const [cpDays, setCpDays] = useState('30');
    const [cpChannelConfigStep, setCpChannelConfigStep] = useState(0); // Tracks which channel we're configuring (0-based)
    const [cpChannelDelays, setCpChannelDelays] = useState<Record<string, { days: string; hours: string }>>({}); // Delays per channel
    const [cpName, setCpName] = useState('');
    const [cpGenLoading, setCpGenLoading] = useState(false);
    const [cpLaunching, setCpLaunching] = useState(false);
    // Voice agent config (populated when voice_call channel selected)
    const [cpVoiceAgents, setCpVoiceAgents] = useState<any[]>([]);
    const [cpVoiceNumbers, setCpVoiceNumbers] = useState<any[]>([]);
    const [cpSelectedAgentId, setCpSelectedAgentId] = useState('');
    const [cpSelectedVoiceId, setCpSelectedVoiceId] = useState('');
    const [cpSelectedFromNumber, setCpSelectedFromNumber] = useState('');
    // Email config (populated when email channel selected)
    const [cpEmailSubject, setCpEmailSubject] = useState('');
    const [cpEmailBody, setCpEmailBody] = useState('');
    // cpEmailTemplates removed — loaded via useEmailTemplates SDK hook inside CheckpointFormInline
    const [cpSelectedEmailTemplateId, setCpSelectedEmailTemplateId] = useState('');
    const [cpSaveTemplateMode, setCpSaveTemplateMode] = useState(false);
    const [cpSaveTemplateName, setCpSaveTemplateName] = useState('');
    const [cpEmailGenLoading, setCpEmailGenLoading] = useState(false);
    const [cpEmailFromAddress, setCpEmailFromAddress] = useState(''); // selected sender email
    const [cpEmailProvider, setCpEmailProvider] = useState('');       // 'google' | 'microsoft'

    // ── "Let Agent Deal" ──────────────────────────────────────────────────────
    // One click builds the full outreach sequence across EVERY channel the tenant
    // has connected, with market-standard delays, then opens the config panel at
    // the channels step. LinkedIn is always the primary channel (the lead source);
    // Email / WhatsApp / Voice are appended only when connected. Message templates
    // for email/WhatsApp remain the user's choice (the inline panels ask for them);
    // LinkedIn + follow-up copy is generated per-lead at send time via the AI
    // personalization flags we enable here.
    const letAgentDeal = async () => {
        setAgentDealLoading(true);
        try {
            // Detect connected channels. Email senders are already loaded (hook);
            // voice agents + WhatsApp accounts are fetched here (both return arrays).
            let voiceAgents: any[] = [];
            let waAccts: any[] = [];
            const [vRes, wRes] = await Promise.allSettled([
                voiceAgent.fetchAgents(),
                fetch('/api/social-integration/whatsapp/accounts', { credentials: 'include' }).then(r => r.json()),
            ]);
            if (vRes.status === 'fulfilled' && Array.isArray(vRes.value)) voiceAgents = vRes.value;
            if (wRes.status === 'fulfilled' && wRes.value?.success && Array.isArray(wRes.value.accounts)) waAccts = wRes.value.accounts;

            const hasEmail = (connectedSendersParent as any[]).length > 0;
            const hasWhatsApp = waAccts.length > 0;
            const hasVoice = voiceAgents.length > 0;

            // Channel sequence — LinkedIn primary, then each connected follow-up in
            // market-standard order (LinkedIn → Email → WhatsApp → Voice).
            const channels = ['linkedin'];
            if (hasEmail) channels.push('email');
            if (hasWhatsApp) channels.push('whatsapp');
            if (hasVoice) channels.push('voice_call');

            // Market-standard cadence (delay BEFORE each channel's step).
            setCpChannelDelays({
                linkedin: { days: '0', hours: '0' },   // starts immediately
                email: { days: '2', hours: '0' },      // 2 days after the LinkedIn touch
                whatsapp: { days: '2', hours: '0' },   // 2 days after email
                voice_call: { days: '3', hours: '0' }, // 3 days after WhatsApp
            });

            // Structural build. Order matters: channels first (so 'linkedin' is
            // present), then LinkedIn actions materialise, then the trigger.
            setCpNextChannels(channels);
            setCpActions(['profile_view', 'connect', 'message']);
            setCpTriggerCondition('connection_accepted');

            // Daily + per-lead AI personalization — the agent tailors each message.
            setCpEnableDailyWebPresence(true);
            setCpEnableDailyPosts(true);              // fetch each lead's recent LinkedIn posts
            setCpEnableAiPersonalization(true);
            setCpEnableAiConnectionPersonalization(true);
            setCpEnableAiFollowupPersonalization(true);

            // Pre-fill the first connected email account + voice agent (WhatsApp
            // account auto-selects inside the config panel when the channel mounts).
            if (hasEmail) {
                setCpEmailFromAddress((connectedSendersParent as any[])[0].email);
                setCpEmailProvider((connectedSendersParent as any[])[0].provider || '');
            }
            if (hasVoice) setCpSelectedAgentId(voiceAgents[0].agent_id || voiceAgents[0].id || '');

            // Open the config panel at the channels step so the built pipeline is
            // visible and the user can pick templates + launch.
            setCpStep(1);
        } finally {
            setAgentDealLoading(false);
        }
    };

    // WhatsApp config (populated when whatsapp channel selected)
    const [cpWaBody, setCpWaBody] = useState('');
    const [cpWaFromNumber, setCpWaFromNumber] = useState('');
    const [cpWaGenLoading, setCpWaGenLoading] = useState(false);

    // Targeting form state (inline in chat)
    const [tgStep, setTgStep] = useState(-1); // -1 = not started, 0-7 = steps
    const [tgNationality, setTgNationality] = useState<string[]>([]);
    const [tgExperienceLevel, setTgExperienceLevel] = useState<string[]>([]);
    const [tgCompanySize, setTgCompanySize] = useState<string[]>([]);
    const [tgCompanyAge, setTgCompanyAge] = useState<string[]>([]);
    const [tgEducation, setTgEducation] = useState<string[]>([]);
    const [tgSkills, setTgSkills] = useState<string[]>([]);
    const [tgPostedRecently, setTgPostedRecently] = useState<boolean>(false); // posted on LinkedIn in last 3 months

    // convId — stable UUID that identifies this browser session's conversation.
    // Initialised once on mount; reset when the user clicks "New search".
    const [convId, setConvId] = useState<string>(() => crypto.randomUUID());
    const [msgCount, setMsgCount] = useState(0);
    const [pendingIntent, setPendingIntent] = useState<string | null>(null);
    // Rolling conversation summary — WhatsApp-style bullet list of what was discussed.
    // Sent to the backend each turn so the AI retains context beyond the short history window.
    const [conversationSummary, setConversationSummary] = useState<string>('');
    // Pending search confirmation: stores the parsed intent for the user to confirm before search runs
    const [pendingSearchConfirmation, setPendingSearchConfirmation] = useState<{ intent: LeadTargeting; originalQuery: string } | null>(null);
    // Pending location request: stores intent+query for ABM searches missing a location, awaiting user input
    const [pendingLocationRequest, setPendingLocationRequest] = useState<{ intent: LeadTargeting; originalQuery: string; abmType: string; personName?: string; companyName?: string } | null>(null);
    // Import paused awaiting an in-chat location answer (role-based sheet with no location column)
    const [pendingImportLocation, setPendingImportLocation] = useState<{ parsed: ParsedInboundLead[] } | null>(null);

    // Generic prospect search (company-type intent queries)
    // ── lastSearchType: distinguishes LinkedIn search from generic prospect search ──
    const [lastSearchType, setLastSearchType] = useState<'linkedin' | 'generic_prospect'>('linkedin');
    // ── seenProspectIds: LinkedIn URLs / provider IDs already returned so "Get More" deduplicates ──
    const [seenProspectIds, setSeenProspectIds] = useState<string[]>([]);
    // ── lastProspectQuery: the original natural-language query for "Get More" re-runs ──
    const [lastProspectQuery, setLastProspectQuery] = useState<string>('');

    // Premium (Sales Navigator) search toggle
    const [useSalesNav, setUseSalesNav] = useState(false);

    // Inbound CSV upload state
    const [inboundMode, setInboundMode] = useState(false);
    // Keep the lead-source gate current (read by the reconcile callbacks above via
    // includeLeadSourceRef). Direct-contact (a pending contact with no LinkedIn
    // URL) and inbound-import campaigns provide leads directly, so they omit the
    // LinkedIn lead-search node — matching the launch builder.
    includeLeadSourceRef.current = !inboundMode && !(pendingContact && !pendingContact.linkedin_url);
    const [inboundLeads, setInboundLeads] = useState<ParsedInboundLead[]>([]);
    const [inboundLeadIds, setInboundLeadIds] = useState<string[]>([]); // Real UUIDs from leads table (CSV/image)
    const [directContactLeadIds, setDirectContactLeadIds] = useState<string[]>([]); // Real UUIDs for chat-entered direct contacts
    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaFileInputRef = useRef<HTMLInputElement>(null);

    // Contact picker modal state
    const [showContactPicker, setShowContactPicker] = useState(false);
    const [cpPickerStep, setCpPickerStep] = useState<'source' | 'contacts'>('source');
    const [cpSourceKey, setCpSourceKey] = useState<string>('');
    const [cpSearch, setCpSearch] = useState('');
    const [cpContacts, setCpContacts] = useState<any[]>([]);
    const [cpLoading, setCpLoading] = useState(false);
    const [cpSelected, setCpSelected] = useState<Set<string>>(new Set());
    const cpSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Contact source definitions (mirrors ChatGroupManager)
    const CP_SOURCES = [
        {
            key: 'crm', label: 'CRM Contacts', color: '#3b82f6', icon: 'crm', fetchContacts: async (search: string) => {
                const params = new URLSearchParams({ page: '1', limit: '100' }); if (search) params.set('search', search);
                const res = await fetch(`/api/social-integration/gohighlevel/contacts/local?${params}`, { credentials: 'include' });
                const data = await res.json();
                return (data.data || []).map((c: any, i: number) => ({ id: String(c.id || c.source_id || c.phone || `crm-${i}`), name: c.name || '', phone: c.phone || '', email: c.email || '', company: c.company_name || '' }));
            }
        },
        {
            key: 'zoho', label: 'Zoho CRM', color: '#e42527', icon: 'zoho', fetchContacts: async (search: string) => {
                const params = new URLSearchParams({ type: 'contacts', page: '1', limit: '100' }); if (search) params.set('search', search);
                const res = await fetch(`/api/social-integration/zoho/records/local?${params}`, { credentials: 'include' });
                const data = await res.json();
                return (data.data || []).map((c: any, i: number) => ({ id: String(c.id || c.source_id || `zoho-${i}`), name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || '', phone: c.phone || '', email: c.email || '', company: c.company_name || '' }));
            }
        },
        {
            key: 'personal_wa', label: 'WAPA', color: '#25D366', icon: 'personal_wa', fetchContacts: async (search: string) => {
                const params = new URLSearchParams({ page: '1', limit: '100' }); if (search) params.set('search', search);
                const res = await fetch(`/api/personal-whatsapp/contacts?${params}`, { credentials: 'include' });
                const data = await res.json();
                return (data.data || []).map((c: any, i: number) => ({ id: String(c.id || c.phone || `pwa-${i}`), name: c.name || '', phone: c.phone || '', email: '', company: '' }));
            }
        },
        {
            key: 'waba', label: 'WA Business', color: '#128C7E', icon: 'waba', fetchContacts: async (search: string) => {
                const params = new URLSearchParams({ limit: '100', offset: '0', channel: 'waba' }); if (search) params.set('search', search);
                const res = await fetch(`/api/whatsapp-conversations/conversations?${params}`, { credentials: 'include' });
                const data = await res.json();
                return (data.conversations || data.data || []).map((c: any, i: number) => ({ id: String(c.id || `waba-${i}`), name: c.lead_name || c.contact_name || c.name || '', phone: c.lead_phone || c.phone || '', email: c.lead_email || c.email || '', company: '' }));
            }
        },
        { key: 'google', label: 'Google Contacts', color: '#ea4335', icon: 'google', fetchContacts: async () => [] },
        { key: 'microsoft', label: 'Microsoft Contacts', color: '#00a4ef', icon: 'microsoft', fetchContacts: async () => [] },
    ];

    // ── AI Playground state ──────────────────────────────────────────────────
    // ── AI Playground (chat-based business profiling) ────────────────────────
    const [showPlayground, setShowPlayground] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('open_icp') === 'true') {
                setShowPlayground(true);
            }
        }
    }, []);

    const [showMediaModal, setShowMediaModal] = useState(false);
    // Custom Accelerator builder (node graph) — full-screen takeover opened from the "+" menu.
    const [showCustomWorkflow, setShowCustomWorkflow] = useState(false);
    // "Roles" — prebuilt pipeline templates launched from chat. The wizard asks
    // each template's inputs in the chat thread, then hands off to the embedded
    // CustomWorkflowBuilder (initialTemplateKey/initialSourceCfg/autoLaunch) so
    // the launch path is the builder's own — no duplicated payload logic.
    const [builderTemplate, setBuilderTemplate] = useState<{ key: string; sourceCfg: Record<string, string>; nodeCfg: Record<string, any>; autoLaunch: boolean } | null>(null);
    const roleWizardRef = useRef<{ key: string; idx: number; answers: Record<string, string> } | null>(null);
    /** Audience preview for the pending Accelerator — keyed off the summary card's CTA. */
    const [rolePreviewing, setRolePreviewing] = useState(false);

    interface MediaChatMsg {
        id: string;
        role: 'user' | 'ai';
        text: string;
        description?: string;
        step?: string;
        payload?: any;
        timestamp: Date;
        loading?: boolean;
    }

    const [mediaMode, setMediaMode] = useState(false);
    const [mediaMessages, setMediaMessages] = useState<Array<MediaChatMsg>>([]);
    const mb = useMediaBuilder();
    const [brandDnaRequestedChanges, setBrandDnaRequestedChanges] = useState(false);
    const [isHydrated, setIsHydrated] = useState(false);
    const lastRestoredSessionIdRef = useRef<string>("");

    // Save states to localStorage to prevent page refresh loss
    useEffect(() => {
        if (!isHydrated || typeof window === 'undefined') return;
        if (mediaMode && mb.sessionId) {
            localStorage.setItem('mrlad_media_mode', 'true');
            localStorage.setItem('mrlad_active_media_session_id', mb.sessionId);
            localStorage.setItem('mrlad_media_messages', JSON.stringify(mediaMessages));
            localStorage.setItem('mrlad_chat_messages', JSON.stringify(messages));
            localStorage.setItem('mrlad_cp_step', String(cpStep));
        } else {
            if (!mediaMode) {
                localStorage.removeItem('mrlad_media_mode');
                localStorage.removeItem('mrlad_active_media_session_id');
                localStorage.removeItem('mrlad_media_messages');
                localStorage.removeItem('mrlad_chat_messages');
                localStorage.removeItem('mrlad_cp_step');
            }
        }
    }, [mediaMode, mb.sessionId, mediaMessages, messages, cpStep, isHydrated]);

    // Hydrate state from localStorage on mount and validate session
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const cachedMediaMode = localStorage.getItem('mrlad_media_mode') === 'true';
        const cachedSessionId = localStorage.getItem('mrlad_active_media_session_id');
        const cachedMediaMessages = localStorage.getItem('mrlad_media_messages');
        const cachedChatMessages = localStorage.getItem('mrlad_chat_messages');
        const cachedCpStep = localStorage.getItem('mrlad_cp_step');

        if (cachedMediaMode && cachedSessionId) {
            console.warn(`[SessionHydrate] Re-hydrating cached session: ${cachedSessionId}`);
            mb.loadSession(cachedSessionId).then(() => {
                setMediaMode(true);
                if (cachedMediaMessages) {
                    try { setMediaMessages(JSON.parse(cachedMediaMessages)); } catch (e) { console.error(e); }
                }
                if (cachedChatMessages) {
                    try { setMessages(JSON.parse(cachedChatMessages)); } catch (e) { console.error(e); }
                }
                if (cachedCpStep) {
                    setCpStep(Number(cachedCpStep));
                }
                setIsHydrated(true);
            }).catch((err) => {
                console.error("[SessionHydrate] Cached session validation failed, discarding cache", err);
                localStorage.removeItem('mrlad_media_mode');
                localStorage.removeItem('mrlad_active_media_session_id');
                localStorage.removeItem('mrlad_media_messages');
                localStorage.removeItem('mrlad_chat_messages');
                localStorage.removeItem('mrlad_cp_step');
                setIsHydrated(true);
            });
        } else {
            setIsHydrated(true);
        }
    }, []);

    // Overwrite mediaMessages if backend returns history (during GCS re-hydration / load or dropdown switch)
    useEffect(() => {
        if (mb.uiPayload?.history && mb.sessionId && lastRestoredSessionIdRef.current !== mb.sessionId) {
            console.warn("[SessionHydrate] Restoring messages list from session history payload for:", mb.sessionId);
            lastRestoredSessionIdRef.current = mb.sessionId;
            const restoredHistory = mb.uiPayload.history.map((m: any) => {
                let mappedPayload = m.payload;
                if (m.payload) {
                    mappedPayload = {
                        ...m.payload,
                        step: m.payload.step || m.payload.step_type,
                        question: m.payload.question || m.payload.title,
                        description: m.payload.description,
                        phase: m.payload.phase
                    };
                }
                return {
                    id: m.id || `msg-${Math.random()}`,
                    role: m.role,
                    text: m.text,
                    description: m.description,
                    step: m.step,
                    payload: mappedPayload,
                    timestamp: new Date(m.timestamp || Date.now())
                };
            });
            setMediaMessages(restoredHistory);
        }
    }, [mb.uiPayload?.history, mb.sessionId]);

    const hasOptionsOpen = mediaMode && (
        mb.step === "welcome" || 
        (mb.step === "builder-mcq-few" && mb.uiPayload?.options && mb.uiPayload.options.length > 0) ||
        (mb.step === "builder-text" && mb.uiPayload?.enable_upload) ||
        (mb.step === "builder-image-output" && (mb.references.length > 0 || mb.isUploading || mb.error)) ||
        mb.step === "builder-video-confirm" ||
        mb.step === "builder-video-output" ||
        ((mb.step === "builder-script-confirm" || mb.step === "builder-workflow-choice") && mb.uiPayload?.options && mb.uiPayload.options.length > 0)
    );

    const isSplitScreenStep = mediaMode && (
        mb.step === "builder-brand-dna" ||
        mb.step === "builder-video-progress" ||
        mb.step === "builder-keyframes-confirm"
    );

    const [mediaPlaceholder, setMediaPlaceholder] = useState('Ask Mr LAD / type response...');
    useEffect(() => {
        if (!mediaMode) return;

        const hasOptions = (mb.step === "builder-mcq-few" && mb.uiPayload?.options && mb.uiPayload.options.length > 0) ||
                           ((mb.step === "builder-script-confirm" || mb.step === "builder-workflow-choice") && mb.uiPayload?.options && mb.uiPayload.options.length > 0);

        const isBrandDnaSplit = mb.step === "builder-brand-dna" && !brandDnaRequestedChanges;
        const isBrandDnaChanges = mb.step === "builder-brand-dna" && brandDnaRequestedChanges;

        if (!hasOptions && !isBrandDnaChanges && !isBrandDnaSplit && mb.step !== "builder-video-confirm") {
            setMediaPlaceholder('Ask Mr LAD / type response...');
            return;
        }

        const targetText = mb.step === "builder-video-confirm"
            ? "Ask for changes in prompt here..."
            : isBrandDnaChanges 
                ? "What changes do you want?" 
                : isBrandDnaSplit 
                    ? "Review & select options on right" 
                    : "Something else / refinements type here .....";

        let cIdx = 0;
        setMediaPlaceholder('');
        let timer: ReturnType<typeof setInterval>;

        const startTyping = () => {
            timer = setInterval(() => {
                cIdx++;
                setMediaPlaceholder(targetText.slice(0, cIdx));
                if (cIdx >= targetText.length) {
                    clearInterval(timer);
                }
            }, 60);
        };

        const initialDelay = setTimeout(startTyping, 300);

        return () => {
            clearTimeout(initialDelay);
            clearInterval(timer);
        };
    }, [mediaMode, mb.step, mb.uiPayload?.options, brandDnaRequestedChanges]);

    const [pgChatHistory, setPgChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string; card?: any }>>([]);


    useEffect(() => {
        if (mediaMode && mb.step !== "builder-brand-dna") {
            setBrandDnaRequestedChanges(false);
        }
    }, [mediaMode, mb.step]);

    useEffect(() => {
        if (brandDnaRequestedChanges) {
            setTimeout(() => {
                taRef.current?.focus();
            }, 150);
        }
    }, [brandDnaRequestedChanges]);
    const [pgInput, setPgInput] = useState('');
    const [pgBusy, setPgBusy] = useState(false);
    const [pgCurrentCard, setPgCurrentCard] = useState<any>(null);
    const [pgCardValues, setPgCardValues] = useState<Record<string, any>>({});  // working values for active card
    const [pgTagInput, setPgTagInput] = useState('');  // tag input buffer
    const [pgIsComplete, setPgIsComplete] = useState(false);
    const [pgSuggesting, setPgSuggesting] = useState(false);  // AI suggestion loading
    const pgMessagesEndRef = useRef<HTMLDivElement>(null);
    // The 22-key business profile (14 required + 8 optional). Persisted
    // server-side by /api/ai-playground/chat on every turn — the hook handles
    // the initial load + exposes the shared completeness math used by Settings
    // and the wizard's Company step.
    //
    // This map is also the hydration allow-list (see the effect below, which
    // iterates Object.keys) — any canonical key missing here is silently
    // dropped on load even when the server has it. Keep it in sync with
    // BUSINESS_PROFILE_ALL_FIELDS.
    const { profile: loadedProfile, loading: profileLoading } = useBusinessProfile();
    const [businessProfile, setBusinessProfile] = useState<Record<string, string>>({
        companyName: '', industry: '', website: '', companyDescription: '',
        productsServices: '', targetCustomers: '', icpJobTitles: '',
        icpCompanySize: '', icpLocations: '', icpPainPoints: '',
        sampleConversation: '', operatingHours: '', timezone: '',
        geographicFocus: '', valueProposition: '', competitors: '', campaignTone: '',
        // Agent identity, CTA link and the tenant's own contact details. The
        // chat now asks for these (flow steps 15-16 of the playground prompt);
        // before they were absent here AND from the prompt, so they could never
        // be captured or displayed by this surface.
        personaName: '', personaTitle: '', bookingLink: '',
        contactEmail: '', contactPhone: '',
    });
    const [bpHydrated, setBpHydrated] = useState(false);
    const [openSummaries, setOpenSummaries] = useState<Set<number>>(new Set());
    const toggleSummary = (idx: number) => setOpenSummaries((prev) => {
        const next = new Set(prev);
        if (next.has(idx)) next.delete(idx); else next.add(idx);
        return next;
    });
    // Hydrate local state once when the hook's initial load completes.
    // We keep `businessProfile` as a local Record<string, string> because the
    // chat continues to mutate it through many setBusinessProfile calls — the
    // backend persists each turn via /api/ai-playground/chat, no client write
    // needed here.
    useEffect(() => {
        if (!profileLoading && !bpHydrated) {
            const next: Record<string, string> = {};
            for (const k of Object.keys(businessProfile)) {
                const v = (loadedProfile as Record<string, unknown>)[k];
                if (typeof v === 'string') next[k] = v;
            }
            if (Object.keys(next).length > 0) {
                setBusinessProfile(prev => ({ ...prev, ...next }));
            }
            setBpHydrated(true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileLoading, bpHydrated, loadedProfile]);

    // Auto-scroll playground chat — also fires when busy clears (card widget appears)
    useEffect(() => {
        pgMessagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
    }, [pgChatHistory, pgBusy]);

    /** Send a message to the AI Playground chat endpoint */
    const pgSendMessage = useCallback(async (msg: string) => {
        if (!msg.trim() || pgBusy) return;
        setPgBusy(true);
        setPgCurrentCard(null);
        const newHistory = [...pgChatHistory, { role: 'user' as const, content: msg }];
        setPgChatHistory(newHistory);
        setPgInput('');
        try {
            const res = await fetch('/api/ai-playground/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: msg }),
            });
            const data = await res.json();
            if (data.success) {
                setPgChatHistory(prev => [...prev, { role: 'assistant', content: data.reply, card: data.card }]);
                if (data.card) {
                    setPgCurrentCard(data.card);
                    // Pre-populate card value from existing profile
                    if (data.card.field && businessProfile[data.card.field]) {
                        const existingVal = businessProfile[data.card.field];
                        if (data.card.type === 'tags') {
                            setPgCardValues({ [data.card.field]: existingVal.split(',').map((s: string) => s.trim()).filter(Boolean) });
                        } else {
                            setPgCardValues({ [data.card.field]: existingVal });
                        }
                    } else {
                        setPgCardValues({});
                    }
                }
                if (data.profile) {
                    // Persistence is handled server-side by /api/ai-playground/chat
                    // — no client write needed. The hook will re-fetch on demand
                    // (Settings / wizard refresh).
                    setBusinessProfile(prev => ({ ...prev, ...data.profile }));
                }
                if (data.isComplete) {
                    setPgIsComplete(true);
                    // The final profile is already persisted by the chat endpoint's
                    // own upsertIcpProfile call — no duplicate POST here.
                }
            }
        } catch { }
        setPgBusy(false);
    }, [pgBusy, pgChatHistory, businessProfile]);

    /** Submit a card value */
    const pgSubmitCard = useCallback(async () => {
        if (!pgCurrentCard) return;
        const { field, type } = pgCurrentCard;
        let value = pgCardValues[field];
        if (type === 'tags') {
            // Flush any pending tag input (supports comma-separated like "CEO, VP of Sales")
            const committed = Array.isArray(value) ? [...value] : [];
            if (pgTagInput.trim()) {
                const pending = pgTagInput.split(',').map((s: string) => s.trim()).filter(Boolean);
                pending.forEach((t: string) => { if (!committed.includes(t)) committed.push(t); });
                setPgTagInput('');
            }
            value = committed.join(', ');
        } else if (type === 'chips') {
            value = Array.isArray(value) ? value.join(', ') : (value || '');
        }
        // Update profile immediately
        setBusinessProfile(prev => ({ ...prev, [field]: String(value || '') }));
        // Send as a card submission message
        const cardMsg = `[Card submission: field=${field} value=${value}]`;
        await pgSendMessage(cardMsg);
    }, [pgCurrentCard, pgCardValues, pgTagInput, setPgTagInput, pgSendMessage]);

    /** Generate an AI suggestion for the current card field */
    const pgGenerateSuggestion = useCallback(async () => {
        if (!pgCurrentCard || pgSuggesting) return;
        setPgSuggesting(true);
        try {
            const res = await fetch('/api/ai-playground/suggest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    field: pgCurrentCard.field,
                    label: pgCurrentCard.label,
                    placeholder: pgCurrentCard.placeholder,
                    profile: businessProfile,
                }),
            });
            const data = await res.json();
            if (data.success && data.suggestion) {
                setPgCardValues(prev => ({ ...prev, [pgCurrentCard.field]: data.suggestion }));
            }
        } catch { }
        setPgSuggesting(false);
    }, [pgCurrentCard, pgSuggesting, businessProfile]);

    /** Start or restart the playground conversation */
    const pgStartConversation = useCallback(async () => {
        setPgChatHistory([]);
        setPgCurrentCard(null);
        setPgIsComplete(false);
        setPgCardValues({});
        setPgBusy(true);
        // Reset history on backend
        await fetch('/api/ai-playground/reset', { method: 'POST', credentials: 'include' }).catch(() => { });
        // Bootstrap: get AI greeting without showing a user message bubble
        try {
            const res = await fetch('/api/ai-playground/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ message: '__init__' }),
            });
            const data = await res.json();
            if (data.success && data.reply) {
                setPgChatHistory([{ role: 'assistant', content: data.reply, card: data.card }]);
                if (data.profile) {
                    setBusinessProfile((prev: Record<string, string>) => ({ ...prev, ...data.profile }));
                }
            }
        } catch { }
        setPgBusy(false);
    }, []);

    // Build seller context from business profile — only describes WHAT we sell,
    // NOT who to target (targetCustomers / icpJobTitles / icpPainPoints are excluded
    // because they reflect a previous ICP setup and would override the current search query).
    const getBusinessContext = () => {
        const p = businessProfile;
        const parts: string[] = [];
        if (p.companyDescription) parts.push(`Seller Company: ${p.companyDescription}`);
        if (p.productsServices) parts.push(`Product/Service Being Sold: ${p.productsServices}`);
        if (p.valueProposition) parts.push(`Value Proposition: ${p.valueProposition}`);
        // Deliberately NOT including targetCustomers, icpJobTitles, icpPainPoints, geographicFocus
        // — those are set via the current search query and targeting filters, not the business profile.
        return parts.join('\n');
    };

    // Landing attach menu & web search state
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const [showChatAttachMenu, setShowChatAttachMenu] = useState(false);
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);

    // Close attach menu when clicking outside
    useEffect(() => {
        if (!showAttachMenu) return;
        const handler = () => setShowAttachMenu(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [showAttachMenu]);

    // Close chat attach menu when clicking outside
    useEffect(() => {
        if (!showChatAttachMenu) return;
        const handler = () => setShowChatAttachMenu(false);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [showChatAttachMenu]);

    // Search history (persisted in localStorage)
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_search_history');
            if (stored) setSearchHistory(JSON.parse(stored));
        } catch { }
    }, []);
    const addToHistory = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setSearchHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, 10);
            try { localStorage.setItem('lad_search_history', JSON.stringify(updated)); } catch { }
            return updated;
        });
    };

    // Lead feedback state (persisted in localStorage)
    const [leadFeedback, setLeadFeedback] = useState<Record<string, 'good' | 'bad'>>({});
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_lead_feedback');
            if (stored) setLeadFeedback(JSON.parse(stored));
        } catch { }
    }, []);

    // Comments attached to bad-feedback ratings
    const [leadFeedbackComments, setLeadFeedbackComments] = useState<Record<string, string>>({});
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_lead_feedback_comments');
            if (stored) setLeadFeedbackComments(JSON.parse(stored));
        } catch { }
    }, []);

    // Popup state for bad-feedback comment collection
    const [badFeedbackPopup, setBadFeedbackPopup] = useState<{ leadId: string; leadName: string } | null>(null);
    const [badFeedbackDraft, setBadFeedbackDraft] = useState('');
    const [lastModuleUsed, setLastModuleUsed] = useState<string>('advanced_search');

    const toggleFeedback = (leadId: string, rating: 'good' | 'bad', leadName?: string) => {
        if (rating === 'bad') {
            // If already marked bad — toggle it off directly
            if (leadFeedback[leadId] === 'bad') {
                setLeadFeedback(prev => {
                    const updated = { ...prev };
                    delete updated[leadId];
                    try { localStorage.setItem('lad_lead_feedback', JSON.stringify(updated)); } catch { }
                    return updated;
                });
                setLeadFeedbackComments(prev => {
                    const updated = { ...prev };
                    delete updated[leadId];
                    try { localStorage.setItem('lad_lead_feedback_comments', JSON.stringify(updated)); } catch { }
                    return updated;
                });
            } else {
                // Show comment popup before saving
                setBadFeedbackDraft('');
                setBadFeedbackPopup({ leadId, leadName: leadName || 'this lead' });
            }
            return;
        }
        setLeadFeedback(prev => {
            const updated = { ...prev };
            if (updated[leadId] === rating) { delete updated[leadId]; } else { updated[leadId] = rating; }
            try { localStorage.setItem('lad_lead_feedback', JSON.stringify(updated)); } catch { }
            return updated;
        });

        // Persist feedback to backend (non-blocking)
        const feedbackLead = leads.find(l => l.id === leadId);
        if (feedbackLead) {
            saveProspectFeedback({
                sessionId: convId,
                moduleUsed: lastModuleUsed,
                lead: feedbackLead as any,
                feedback: rating,
            }).catch(() => { });
        }
    };

    // ── Lead selection (checkbox) helpers ───────────────────────────────────
    // The checkbox is the authoritative include signal: only checked leads are
    // enrolled into the campaign at launch (see CheckpointFormInline.launchCampaign).
    // Set as soon as the user touches a checkbox. Deferred ICP scoring re-seeds
    // the default selection when scores land; without this it would stomp on any
    // picking the user did during the couple of seconds scoring was still running.
    const selectionTouchedRef = useRef(false);
    const toggleLeadSelection = (leadId: string) => {
        selectionTouchedRef.current = true;
        setSelectedLeadIds(prev => {
            const next = new Set(prev);
            if (next.has(leadId)) next.delete(leadId); else next.add(leadId);
            return next;
        });
    };
    const selectAllLeads = () => {
        selectionTouchedRef.current = true;
        setSelectedLeadIds(new Set(leads.map(l => l.id)));
    };
    const clearLeadSelection = () => {
        selectionTouchedRef.current = true;
        setSelectedLeadIds(new Set());
    };
    // Seed default selection (leads scoring >= 50 pre-checked) for a fresh result
    // set, replacing any prior selection. Used when a new search populates `leads`.
    // `respectUserEdits` is passed by the deferred-ICP re-seed, which must not
    // overwrite picks the user already made while scoring was in flight.
    const seedDefaultSelection = (list: LeadProfile[], respectUserEdits = false) => {
        if (respectUserEdits && selectionTouchedRef.current) return;
        // A single-result search is almost always the specific person the user
        // asked for — check them regardless of ICP score so launch never
        // discards the only lead found (an ICP of "one person's name" scores
        // every candidate near zero, which used to yield zero-lead campaigns).
        if (list.length === 1) {
            setSelectedLeadIds(new Set(list.map(l => l.id)));
            return;
        }
        setSelectedLeadIds(new Set(
            list.filter(l => (l.icp_score ?? 0) >= 50).map(l => l.id)
        ));
    };
    // Merge default selection for newly appended leads ("Get More") without
    // disturbing the user's existing manual checks/unchecks.
    const mergeDefaultSelection = (appended: LeadProfile[]) => {
        setSelectedLeadIds(prev => {
            const next = new Set(prev);
            appended.forEach(l => { if ((l.icp_score ?? 0) >= 50) next.add(l.id); });
            return next;
        });
    };

    // Build a natural-language enrichment string from the Targeting card form values
    // and any bad-feedback comments — sent to the backend LLM to generate sharper keywords.
    const buildSearchEnrichment = (): string | undefined => {
        const parts: string[] = [];
        if (targeting) {
            // Note: nationality, experience_level, and company_size go into targeting_filters
            // (structured filter), NOT here. Only free-text feedback goes here.
            if (targeting.decision_maker_skills?.length)
                parts.push(`Required skills: ${targeting.decision_maker_skills.join(', ')}`);
            if (targeting.decision_maker_education?.length)
                parts.push(`Required education: ${targeting.decision_maker_education.join(', ')}`);
            if (targeting.company_age?.length)
                parts.push(`Target company age: ${targeting.company_age.join(', ')}`);
        }
        const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
        const comments = badLeads.map(l => leadFeedbackComments[l.id]).filter(Boolean);
        if (comments.length > 0)
            parts.push(`Avoid profiles matching these issues: ${comments.join('; ')}`);
        return parts.length > 0 ? parts.join('\n') : undefined;
    };

    const confirmBadFeedback = (comment: string) => {
        if (!badFeedbackPopup) return;
        const { leadId } = badFeedbackPopup;
        setLeadFeedback(prev => {
            const updated = { ...prev, [leadId]: 'bad' as const };
            try { localStorage.setItem('lad_lead_feedback', JSON.stringify(updated)); } catch { }
            return updated;
        });
        // A rejected lead must not remain selected for enrollment.
        setSelectedLeadIds(prev => {
            if (!prev.has(leadId)) return prev;
            const next = new Set(prev);
            next.delete(leadId);
            return next;
        });
        if (comment.trim()) {
            setLeadFeedbackComments(prev => {
                const updated = { ...prev, [leadId]: comment.trim() };
                try { localStorage.setItem('lad_lead_feedback_comments', JSON.stringify(updated)); } catch { }
                return updated;
            });
        }
        setBadFeedbackPopup(null);
        setBadFeedbackDraft('');
    };

    // Search sessions (persisted in localStorage for campaign context)
    const [searchSessions, setSearchSessions] = useState<{ query: string; targeting: LeadTargeting | null; icp_description: string; timestamp: string }[]>([]);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_search_sessions');
            if (stored) setSearchSessions(JSON.parse(stored));
        } catch { }
    }, []);
    const addSearchSession = (query: string, tgt: LeadTargeting | null, icpDesc: string) => {
        setSearchSessions(prev => {
            const entry = { query, targeting: tgt, icp_description: icpDesc, timestamp: new Date().toISOString() };
            const updated = [entry, ...prev].slice(0, 20);
            try { localStorage.setItem('lad_search_sessions', JSON.stringify(updated)); } catch { }
            return updated;
        });
    };

    // Pagination & count state
    const [leadCount, setLeadCount] = useState(10);
    const [searchPage, setSearchPage] = useState(1);
    const [totalResults, setTotalResults] = useState(0);
    const [searchCursor, setSearchCursor] = useState<string | null>(null);
    const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]); // cursors per page
    const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
    const [lastIcpDescription, setLastIcpDescription] = useState<string>('');
    const [lastTargeting, setLastTargeting] = useState<LeadTargeting | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const [noMoreLeads, setNoMoreLeads] = useState(false);
    const [targetingFiltersActive, setTargetingFiltersActive] = useState(false); // true when targeting card filters applied

    // Credits & unlock state
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [creditBalance, setCreditBalance] = useState<number | null>(null);

    const endRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const mediaInputWrapRef = useRef<HTMLDivElement>(null);
    const [mediaInputWrapHeight, setMediaInputWrapHeight] = useState(120);

    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [profileSummary, setProfileSummary] = useState<string | null>(null);
    const [profileWebPresence, setProfileWebPresence] = useState<any | null>(null);
    const [profileRecentPosts, setProfileRecentPosts] = useState<any[] | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [summaryDataAgeDays, setSummaryDataAgeDays] = useState<number | null>(null);
    const [summaryRefreshLoading, setSummaryRefreshLoading] = useState(false);
    const [selectedSummaryLead, setSelectedSummaryLead] = useState<any | null>(null);

    // Edit inbound lead state
    const [editingLeadIndex, setEditingLeadIndex] = useState<number | null>(null);
    const [editFormData, setEditFormData] = useState<ParsedInboundLead | null>(null);
    const [savingLead, setSavingLead] = useState(false);

    // Delete confirmation state
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ index: number; name: string } | null>(null);
    const [deletingLead, setDeletingLead] = useState(false);

    // Which imported-lead card is expanded to show the full profile summary
    const [expandedInboundIdx, setExpandedInboundIdx] = useState<number | null>(null);

    // ── Restore persisted targeting_filters from localStorage (saved up to 7 days) ─
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_targeting_filters');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Only restore if saved within the last 7 days
                const savedAt = parsed.saved_at ? new Date(parsed.saved_at).getTime() : 0;
                const ageMs = Date.now() - savedAt;
                const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
                if (ageMs < sevenDaysMs) {
                    if (parsed.nationality?.length) setTgNationality(parsed.nationality);
                    if (parsed.experience_level?.length) setTgExperienceLevel(parsed.experience_level);
                    if (parsed.company_size?.length) setTgCompanySize(parsed.company_size);
                    if (parsed.company_age?.length) setTgCompanyAge(parsed.company_age);
                    if (parsed.education?.length) setTgEducation(parsed.education);
                    if (parsed.skills?.length) setTgSkills(parsed.skills);
                    // posted_recently is intentionally NOT restored — it must be explicitly set each session
                    // Restore into targeting state so searches automatically include filters
                    if (parsed.nationality?.length || parsed.experience_level?.length || parsed.company_size?.length) {
                        setTargeting(prev => ({
                            job_titles: prev?.job_titles || [],
                            industries: prev?.industries || [],
                            locations: prev?.locations || [],
                            keywords: prev?.keywords || [],
                            ...(prev || {}),
                            decision_maker_nationality: parsed.nationality?.length ? parsed.nationality : prev?.decision_maker_nationality,
                            decision_maker_experience_level: parsed.experience_level?.length ? parsed.experience_level : prev?.decision_maker_experience_level,
                            company_size: parsed.company_size?.length ? parsed.company_size : prev?.company_size,
                            company_age: parsed.company_age?.length ? parsed.company_age : prev?.company_age,
                            decision_maker_education: parsed.education?.length ? parsed.education : prev?.decision_maker_education,
                            decision_maker_skills: parsed.skills?.length ? parsed.skills : prev?.decision_maker_skills,
                            // posted_recently not restored from localStorage — must be set explicitly
                        }));
                    }
                } else {
                    // Expired — clean up
                    localStorage.removeItem('lad_targeting_filters');
                }
            }
        } catch { }
         
    }, []); // Run once on mount

    // ── Clear / Restart campaign setup ──────────────────────────────────────
    const clearChat = useCallback(() => {
        // Core chat
        setMessages([]); setInput(''); setBusy(false);
        // Campaign data
        setTargeting(null); setLeads([]); setShowPanel(false);
        setActivities([]); setIsSearching(false);
        // Checkpoint form
        setCpStep(-1); setCpIcpThreshold('75'); setCpActions([]); setCpConnMsg(''); setCpFollowMsg('');
        setCpNextChannels([]); setCpTriggerCondition(''); setCpDays('30'); setCpName('');
        setCpGenLoading(false); setCpLaunching(false);
        setCpSelectedAgentId(''); setCpSelectedVoiceId(''); setCpSelectedFromNumber('');
        setCpEmailSubject(''); setCpEmailBody(''); setCpSelectedEmailTemplateId('');
        setCpSaveTemplateMode(false); setCpSaveTemplateName('');
        setCpEmailGenLoading(false); setCpEmailFromAddress(''); setCpEmailProvider('');
        setCpWaBody(''); setCpWaFromNumber(''); setCpWaGenLoading(false);
        // Targeting form
        setTgStep(-1); setTgNationality([]); setTgExperienceLevel([]); setTgCompanySize([]);
        setTgCompanyAge([]); setTgEducation([]); setTgSkills([]); setTgPostedRecently(false);
        // Conversation meta
        setConvId(crypto.randomUUID()); setMsgCount(0); setPendingIntent(null);
        setPendingSearchConfirmation(null); setPendingLocationRequest(null); setPendingContact(null);
        setConversationSummary('');
        // Inbound / upload
        setInboundMode(false); setInboundLeads([]); setInboundLeadIds([]); setDirectContactLeadIds([]);
        // Search / leads state
        setLeadFeedback({}); setSearchSessions([]); setSearchHistory([]);
        setLeadCount(10); setSearchPage(1); setTotalResults(0);
        setSearchCursor(null); setLastSearchQuery(''); setLastIcpDescription('');
        setLastTargeting(null); setLoadingMore(false); setNoMoreLeads(false);
        setFilteredLeads([]); setShowFilteredLeads(false);
        setWebSearchEnabled(false);
    }, []);  

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Scroll to bottom whenever a form is opened from the card/button clicks
    useEffect(() => { if (cpStep >= 0) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [cpStep]);
    useEffect(() => { if (tgStep >= 0) endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [tgStep]);

    // ── Edit mode: hydrate the setup flow from an existing campaign ──────────────
    // "Edit Accelerator" routes here with ?campaignId=<id>. The setup flow already
    // persists the chat (config.conversation_history) and the config-step
    // selections (config.checkpoint_selections), so we reload them and open the
    // checkpoint form pre-filled. Saving then updates THIS campaign (gated in
    // CheckpointFormInline via editingCampaignId). The normal create flow (no
    // campaignId) is untouched. Read-once via the ref guard.
    useEffect(() => {
        if (editHydratedRef.current) return;
        const cid = typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('campaignId')
            : null;
        if (!cid) return;
        editHydratedRef.current = true;
        (async () => {
            try {
                const camp: any = await getCampaign(cid);
                const cfg = camp?.config || {};
                // Campaigns built in the Custom Workflow Builder are not
                // expressible in the chat checkpoint form — its fields cover the
                // guided flow's steps, not arbitrary builder nodes. Hydrating
                // them here left the user on the search screen with the campaign
                // apparently gone, so hand straight over to the builder instead.
                if (cfg.builder === 'custom_workflow') {
                    setEditingCampaignId(cid);
                    setBuilderTemplate(null);
                    setShowCustomWorkflow(true);
                    return;
                }
                // Capture a lead source this form can't express (recurring Zoho
                // import) BEFORE hydrating, so the save path can re-emit it
                // instead of overwriting it with a LinkedIn search. Campaigns
                // from the /crm/zoho modal carry no `builder` flag, so they fall
                // through the handoff above and land here. Step config can come
                // back as a JSON string, so parse defensively.
                {
                    const rawLeadGen = (camp?.steps || []).find((s: any) => (s.type || s.step_type) === 'lead_generation')?.config;
                    let leadGenCfg: any = rawLeadGen;
                    if (typeof rawLeadGen === 'string') {
                        try { leadGenCfg = JSON.parse(rawLeadGen); } catch { leadGenCfg = null; }
                    }
                    const persistedSource = leadGenCfg?.source || cfg.data_source;
                    // 'linkedin_search' is what this form itself emits, and
                    // direct-contact / csv_import campaigns are already handled by
                    // isDirectContact / inboundMode — only carry sources beyond those.
                    if (persistedSource && !['linkedin_search', 'direct_contact', 'csv_import'].includes(persistedSource)) {
                        setPersistedLeadSource({
                            source: persistedSource,
                            data_source: cfg.data_source || persistedSource,
                            zoho_modules: leadGenCfg?.zoho_modules || cfg.zoho_modules || undefined,
                            zoho_tag: leadGenCfg?.zoho_tag || cfg.zoho_tag || undefined,
                        });
                    }
                }
                const cs = cfg.checkpoint_selections || {};
                // Restore the chat thread.
                const hist = Array.isArray(cfg.conversation_history) ? cfg.conversation_history : [];
                if (hist.length) {
                    setMessages(hist.map((m: any, i: number) => ({
                        id: `hist-${i}`,
                        role: m.role === 'user' ? 'user' : 'assistant',
                        text: m.text || '',
                        ts: m.ts || Date.now(),
                    })) as ChatMsg[]);
                }
                // Restore the config-step selections (connection/follow-up messages, actions, etc.).
                if (cs.icp_threshold != null) setCpIcpThreshold(String(cs.icp_threshold));
                // LinkedIn actions: prefer the saved checkpoint selection, else derive from
                // the persisted steps (the workflow is the source of truth) so the action
                // checkboxes re-check even for campaigns missing checkpoint_selections.
                const liActions: string[] = Array.isArray(cs.linkedin_actions) ? [...cs.linkedin_actions] : [];
                if (liActions.length === 0 && Array.isArray(camp?.steps)) {
                    const stepTypes = camp.steps.map((s: any) => s.type || s.step_type);
                    if (stepTypes.includes('linkedin_visit')) liActions.push('profile_view');
                    if (stepTypes.includes('linkedin_connect')) liActions.push('connect');
                    if (stepTypes.includes('linkedin_message')) liActions.push('message');
                }
                setCpConnMsg(cs.connection_message ?? cfg.connection_message ?? '');
                setCpFollowMsg(cs.followup_message ?? cfg.followup_message ?? '');
                // Reconcile the whole structural config (LinkedIn actions + channels
                // + trigger) into the canonical steps in ONE shot, so the
                // linkedin↔actions coupling is order-independent: LinkedIn actions
                // only materialise when 'linkedin' is a selected channel, so include
                // it whenever we restored any LinkedIn action.
                {
                    const curCfg = deriveConfig(useOnboardingStore.getState().workflowPreview as unknown as SyncStep[]);
                    const hydChannels = Array.isArray(cs.next_channels) ? [...cs.next_channels] : [...curCfg.nextChannels];
                    if (liActions.length && !hydChannels.includes('linkedin')) hydChannels.unshift('linkedin');
                    const hydrated = applyConfig(
                        useOnboardingStore.getState().workflowPreview as unknown as SyncStep[],
                        { actions: liActions, nextChannels: hydChannels, triggerCondition: cs.trigger_condition ?? cfg.trigger_condition ?? '' },
                        { includeLeadSource: includeLeadSourceRef.current },
                    ) as any[];
                    // Restore the AI Media node (preserved type — survives later
                    // toggle reconciles). Source: checkpoint_selections.media_step,
                    // else a persisted media_generation step row.
                    const ms = cs.media_step
                        || (camp?.steps || []).find((s: any) => (s.type || s.step_type) === 'media_generation')?.config;
                    if (ms && !hydrated.some((s: any) => s.type === 'media_generation')) {
                        hydrated.push({
                            id: 'media-gen', type: 'media_generation', title: 'AI Media', channel: 'media',
                            description: 'Generate brand media to attach to outreach',
                            mediaUrl: ms.media_url || '', mediaType: ms.media_type || '',
                            mediaFilename: ms.media_filename || '', mimeType: ms.mime_type || '',
                            mediaPrompt: ms.prompt || '',
                        });
                    }
                    setWorkflowPreview(hydrated as any);
                }
                if (cs.campaign_days != null) setCpDays(String(cs.campaign_days));
                setCpName(cs.campaign_name ?? camp?.name ?? '');
                if (typeof cs.enable_daily_web_presence === 'boolean') setCpEnableDailyWebPresence(cs.enable_daily_web_presence);
                if (typeof cs.enable_daily_posts === 'boolean') setCpEnableDailyPosts(cs.enable_daily_posts);
                if (typeof cs.enable_ai_personalization === 'boolean') setCpEnableAiPersonalization(cs.enable_ai_personalization);
                if (typeof cs.enable_ai_connection_personalization === 'boolean') setCpEnableAiConnectionPersonalization(cs.enable_ai_connection_personalization);
                if (typeof cs.enable_ai_followup_personalization === 'boolean') setCpEnableAiFollowupPersonalization(cs.enable_ai_followup_personalization);
                setEditingCampaignId(cid);
                // Open the checkpoint/config form, pre-filled, so the user edits steps + messages.
                setCpStep(0);
            } catch (e) {
                editHydratedRef.current = false; // allow a retry on next mount
                // eslint-disable-next-line no-console
                console.error('[EditWorkflow] Failed to load campaign for editing', e);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync credit balance from billing hook
    useEffect(() => {
        if (billing.wallet?.availableBalance !== undefined) {
            setCreditBalance(billing.wallet.availableBalance ?? billing.wallet.currentBalance ?? 0);
        } else if (billing.error) {
            setCreditBalance(0);
        }
    }, [billing.wallet, billing.error]);

    // Auto-unlock search results when the tenant has any credit balance. Unlocking is a
    // pure client-side flag flip (locked = CSS blur only — no data withheld, no charge).
    // The leads.some(locked) guard prevents re-render loops and also covers late-arriving
    // "Get More Leads" pages, which are constructed with locked: idx >= 5.
    useEffect(() => {
        if (creditBalance !== null && creditBalance >= 1 && leads.some(l => l.locked)) {
            setLeads(prev => prev.map(l => ({ ...l, locked: false })));
        }
    }, [creditBalance, leads]);

    // Sync voice agent hook data → cpVoiceAgents/cpVoiceNumbers state
    // so CheckpointFormInline receives them as pre-populated props
    useEffect(() => {
        if (voiceAgent.agents && voiceAgent.agents.length > 0 && cpVoiceAgents.length === 0) {
            const agents = voiceAgent.agents.map((a: any) => ({
                ...a,
                id: a.agent_id || a.id || '',
                name: a.agent_name || a.name || '',
            }));
            setCpVoiceAgents(agents);
            if (agents.length > 0 && !cpSelectedAgentId) {
                setCpSelectedAgentId(agents[0].id);
                setCpSelectedVoiceId(agents[0].voice_id || '');
            }
        }
        if (voiceAgent.numbers && voiceAgent.numbers.length > 0 && cpVoiceNumbers.length === 0) {
            const numbers = voiceAgent.numbers.map((n: any) => {
                let num = n.phone_number || '';
                if (!num || num === '+' || num.includes('null')) {
                    num = (n.country_code && n.base_number) ? `+${n.country_code}${n.base_number}` : '';
                }
                return { ...n, phone_number: num };
            }).filter((n: any) => n.phone_number && n.phone_number !== '+');
            setCpVoiceNumbers(numbers);
            if (numbers.length > 0 && !cpSelectedFromNumber) {
                setCpSelectedFromNumber(numbers[0].phone_number);
            }
        }
    }, [voiceAgent.agents, voiceAgent.numbers]);

    // Lazy-fetch voice agent data only when the campaign checkpoint form first opens
    const voiceAgentFetchedRef = useRef(false);
    useEffect(() => {
        if (cpStep >= 0 && !voiceAgentFetchedRef.current) {
            voiceAgentFetchedRef.current = true;
            voiceAgent.fetchAll().catch(err => console.warn('Failed to lazy-fetch voice config:', err));
        }
    }, [cpStep, voiceAgent.fetchAll]);

    // Lazy-fetch billing wallet on the user's first chat message
    const billingFetchedRef = useRef(false);
    useEffect(() => {
        if (messages.some(m => m.role === 'user') && !billingFetchedRef.current) {
            billingFetchedRef.current = true;
            billing.fetchWallet().catch(err => console.warn('Failed to lazy-fetch wallet:', err));
        }
    }, [messages, billing.fetchWallet]);

    /**
     * Shared summary loader — used by both initial open and force-refresh.
     * @param lead        The lead to summarise
     * @param forceRefresh  When true bypasses the 7-day cache and runs full research
     */
    const _loadSummary = async (lead: any, forceRefresh = false) => {
        try {
            const data = await generateProspectSummary({
                sessionId: convId,
                moduleUsed: lastModuleUsed,
                lead: lead as any,
                force_refresh: forceRefresh,
            } as any);

            if (data?.success) {
                // Set age (null means freshly researched right now)
                setSummaryDataAgeDays(
                    forceRefresh ? null : (typeof data.data_age_days === 'number' ? data.data_age_days : null)
                );

                // Tracks whether we actually produced usable summary text — drives
                // the AI-preview fallback below.
                let summaryText = '';

                // ── 1. Build rich text summary ─────────────────────────────────
                if (data.profile_summary) {
                    const ps = data.profile_summary as any;
                    const parts: string[] = [];
                    const aboutText = ps.summary || ps.about || ps.description || '';
                    if (aboutText) parts.push(aboutText);
                    const currentExp = (ps.experience || []).find((e: any) => e.is_current) || (ps.experience || [])[0];
                    if (currentExp?.title && currentExp?.company) {
                        parts.push(`\n📋 ${currentExp.title} at ${currentExp.company}${currentExp.duration ? ` · ${currentExp.duration}` : ''}`);
                    }
                    const pastExp = (ps.experience || []).filter((e: any) => !e.is_current).slice(0, 2);
                    if (pastExp.length) {
                        const lines = pastExp.map((e: any) =>
                            `• ${e.title || e.position || ''} at ${e.company || ''}${e.duration ? ` (${e.duration})` : ''}`
                        ).join('\n');
                        parts.push(`\n💼 Previous Roles:\n${lines}`);
                    }
                    const skills: any[] = ps.skills || ps.top_skills || [];
                    if (skills.length) {
                        const names = skills.slice(0, 10).map((s: any) => s.name || s).filter(Boolean).join(', ');
                        if (names) parts.push(`\n🔧 Skills: ${names}`);
                    }
                    const certs: any[] = ps.certifications || [];
                    if (certs.length) {
                        const names = certs.slice(0, 3).map((c: any) => c.name || c).filter(Boolean).join(', ');
                        if (names) parts.push(`\n🎓 Certifications: ${names}`);
                    }
                    const langs: any[] = ps.languages || [];
                    if (langs.length) {
                        const names = langs.map((l: any) => l.name || l).filter(Boolean).join(', ');
                        if (names) parts.push(`\n🌐 Languages: ${names}`);
                    }
                    const richSummary = parts.join('\n').trim();
                    if (richSummary) { setProfileSummary(richSummary); summaryText = richSummary; }
                } else if (data.company_profile) {
                    const companyText = (
                        data.company_profile.overview ||
                        data.company_profile.description ||
                        `${lead.current_company || 'Company'} — ${data.company_profile.industry || ''} ${data.company_profile.company_size_range ? `· ${data.company_profile.company_size_range} employees` : ''}`
                    ).trim();
                    if (companyText) { setProfileSummary(companyText); summaryText = companyText; }
                }

                // ── 2. Web presence ────────────────────────────────────────────
                if (data.web_presence) setProfileWebPresence(data.web_presence);

                // ── 3. Recent posts ────────────────────────────────────────────
                if (data.recent_posts?.length) setProfileRecentPosts(data.recent_posts);

                // ── 4. Fallback ────────────────────────────────────────────────
                // Run the AI preview whenever no usable summary text was produced —
                // including a thin LinkedIn profile object (name/headline only, no
                // about/experience), which previously rendered blank AND skipped this.
                if (!summaryText) {
                    const fallback = await campaignCreation.fetchLeadSummaryPreview({
                        profileData: { name: lead.name, title: lead.headline || '', company: lead.current_company || '', linkedin_url: lead.profile_url || '' }
                    });
                    if (fallback?.summary) setProfileSummary(fallback.summary);
                    if (fallback?.web_presence) setProfileWebPresence(fallback.web_presence);
                    setProfileRecentPosts(fallback?.recent_posts?.length ? fallback.recent_posts : null);
                }

                // ── 5. Mark lead as good match ─────────────────────────────────
                if (!forceRefresh) {
                    setLeadFeedback(prev => ({ ...prev, [lead.id]: 'good' as const }));
                }
            } else {
                throw new Error(data?.error || 'Failed to generate summary');
            }
        } catch (err: any) {
            setSummaryError(err.message || 'Failed to generate profile summary');
        }
    };

    const handleViewSummary = async (lead: LeadProfile) => {
        setSelectedSummaryLead(lead);
        setSelectedEmployee({
            id: 'temp',
            name: lead.name,
            title: lead.headline || lead.current_company || '',
            photo_url: lead.profile_picture || '',
        });
        setSummaryDialogOpen(true);
        setProfileSummary(null);
        setProfileWebPresence(lead.inferred?.web_presence || null);
        setProfileRecentPosts(null);
        setSummaryError(null);
        setSummaryDataAgeDays(null);
        setSummaryLoading(true);

        await _loadSummary(lead, false);
        setSummaryLoading(false);
    };

    /** Force-refresh: bypass cache, run full research, update dialog in-place. */
    const handleRefreshSummary = async () => {
        if (!selectedSummaryLead) return;
        setSummaryRefreshLoading(true);
        setSummaryError(null);
        // Clear existing data so fresh data replaces it cleanly
        setProfileSummary(null);
        setProfileWebPresence(null);
        setProfileRecentPosts(null);
        setSummaryDataAgeDays(null);
        await _loadSummary(selectedSummaryLead, true);
        setSummaryRefreshLoading(false);
    };

    const handleCloseSummaryDialog = () => {
        setSummaryDialogOpen(false);
        setSelectedEmployee(null);
        setProfileSummary(null);
        setProfileWebPresence(null);
        setProfileRecentPosts(null);
        setSummaryError(null);
    };

    // Recompute per-channel counts for the "Leads Ready" summary card from the current lead set
    const computeInboundCounts = (list: ParsedInboundLead[]) => ({
        total: list.length,
        linkedin: list.filter(l => l.linkedinProfile).length,
        email: list.filter(l => l.email).length,
        whatsapp: list.filter(l => l.whatsapp).length,
        phone: list.filter(l => l.phone).length,
        website: list.filter(l => l.website).length,
    });

    // Keep the in-chat "Leads Ready" summary card(s) in sync after a lead is edited or removed —
    // the counts are baked into the message at import time and won't update on their own.
    const syncInboundSummary = (list: ParsedInboundLead[]) => {
        const counts = computeInboundCounts(list);
        setMessages(p => p.map(m =>
            m.inboundAction === 'summary' && m.inboundSummary
                ? { ...m, inboundSummary: counts }
                : m
        ));
    };

    // Edit inbound lead handlers
    const openEditLead = (index: number) => {
        setEditingLeadIndex(index);
        setEditFormData({ ...inboundLeads[index] });
    };

    const closeEditLead = () => {
        setEditingLeadIndex(null);
        setEditFormData(null);
    };

    const updateEditField = (field: keyof ParsedInboundLead, value: string) => {
        if (editFormData) {
            setEditFormData({ ...editFormData, [field]: value });
        }
    };

    const saveEditedLead = async () => {
        if (editingLeadIndex === null || !editFormData) return;

        setSavingLead(true);
        try {
            // Update the inbound leads in state
            const updatedLeads = [...inboundLeads];
            updatedLeads[editingLeadIndex] = editFormData;
            setInboundLeads(updatedLeads);
            syncInboundSummary(updatedLeads);

            // Save to database via API
            const response = await fetch('/api/campaigns/leads/import/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    leads: [editFormData],
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save lead');
            }

            // Update the leads panel display
            const updatedPanelLeads: LeadProfile[] = updatedLeads.map((l, i) => ({
                id: `inbound-${i}`,
                name: leadDisplayLabel({ firstName: l.firstName, lastName: l.lastName, company: l.companyName }, i),
                first_name: l.firstName,
                last_name: l.lastName,
                headline: l.companyName ? `at ${l.companyName}` : '',
                location: '',
                current_company: l.companyName,
                profile_url: l.linkedinProfile,
                profile_picture: '',
                industry: '',
                network_distance: '',
                locked: false,
            }));
            setLeads(updatedPanelLeads);

            closeEditLead();
            setMessages(p => [...p, {
                id: `a-${Date.now()}`,
                role: 'ai',
                text: `✅ Lead updated successfully!`,
                ts: new Date()
            }]);
        } catch (error: any) {
            setMessages(p => [...p, {
                id: `a-${Date.now()}`,
                role: 'ai',
                text: `❌ Error saving lead: ${error.message}`,
                ts: new Date()
            }]);
        } finally {
            setSavingLead(false);
        }
    };

    // Delete inbound lead handlers
    const openDeleteConfirmation = (index: number) => {
        const name = leadDisplayLabel({
            firstName: inboundLeads[index].firstName,
            lastName: inboundLeads[index].lastName,
            company: inboundLeads[index].companyName,
        }, index);
        setDeleteConfirmation({ index, name });
    };

    const closeDeleteConfirmation = () => {
        setDeleteConfirmation(null);
    };

    const confirmDeleteLead = async () => {
        if (deleteConfirmation === null) return;

        setDeletingLead(true);
        try {
            const { index } = deleteConfirmation;
            const leadToDelete = inboundLeads[index];

            // Remove from inbound leads state
            const updatedLeads = inboundLeads.filter((_, i) => i !== index);
            setInboundLeads(updatedLeads);
            syncInboundSummary(updatedLeads);

            // Update the leads panel display
            const updatedPanelLeads: LeadProfile[] = updatedLeads.map((l, i) => ({
                id: `inbound-${i}`,
                name: leadDisplayLabel({ firstName: l.firstName, lastName: l.lastName, company: l.companyName }, i),
                first_name: l.firstName,
                last_name: l.lastName,
                headline: l.companyName ? `at ${l.companyName}` : '',
                location: '',
                current_company: l.companyName,
                profile_url: l.linkedinProfile,
                profile_picture: '',
                industry: '',
                network_distance: '',
                locked: false,
            }));
            setLeads(updatedPanelLeads);

            // Update targeting count
            if (updatedLeads.length > 0) {
                const inboundTargeting: LeadTargeting = {
                    job_titles: [], industries: [], locations: [],
                    keywords: [`${updatedLeads.length} Inbound Lead${updatedLeads.length > 1 ? 's' : ''}`],
                };
                setTargeting(inboundTargeting);
            }

            // Optionally delete from database
            if (leadToDelete.email || leadToDelete.phone) {
                try {
                    await fetch('/api/campaigns/leads/import/delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: leadToDelete.email,
                            phone: leadToDelete.phone,
                        }),
                    });
                } catch (err) {
                    console.warn('Failed to delete lead from database:', err);
                    // Don't show error to user since UI was already updated
                }
            }

            closeDeleteConfirmation();
            setMessages(p => [...p, {
                id: `a-${Date.now()}`,
                role: 'ai',
                text: `🗑️ Lead removed successfully!`,
                ts: new Date()
            }]);
        } catch (error: any) {
            setMessages(p => [...p, {
                id: `a-${Date.now()}`,
                role: 'ai',
                text: `❌ Error removing lead: ${error.message}`,
                ts: new Date()
            }]);
        } finally {
            setDeletingLead(false);
        }
    };

    /* ── Landing submit ── */
    // ── ICP discovery (SearchDispatcher) — runs Apollo + Sales Nav on the active ICP,
    //    maps results into the same `leads` list so the existing campaign flow works. ──
    const handleIcpLeadsSearch = useCallback(async (promptText: string) => {
        const uid = `u-${Date.now()}`;
        const lid = `l-${Date.now()}`;
        setMessages(p => [...p,
            { id: uid, role: 'user', text: promptText, ts: new Date() },
            { id: lid, role: 'ai', text: '', ts: new Date(), loading: true },
        ]);
        setBusy(true);
        setMsgCount(c => c + 1);
        setIsSearching(true);
        setActivities([]);
        try {
            const res = await icpSearch.run({ maxResults: 25, triggeredBy: 'manual' });
            setIsSearching(false);
            if (!res || res.success === false || res.error === 'no_active_icp') {
                const msg = res?.error === 'no_active_icp'
                    ? "You don't have an active ICP yet. Define one in Settings → ICP Search Strategy, then run this again."
                    : `ICP search couldn't complete${res?.error ? `: ${res.error}` : ''}.`;
                setMessages(p => p.map(m => m.id === lid ? { ...m, loading: false, text: msg } : m));
                return;
            }
            const mapped = candidatesToLeadProfiles(res.candidates || []);
            const n = mapped.length;
            // Summarise the result set so the campaign card (gated by msg.targeting) and
            // the outreach-journey preview render exactly like a normal search.
            const icpTargeting: LeadTargeting = {
                job_titles: [...new Set(mapped.map(l => l.headline).filter(Boolean))].slice(0, 6),
                industries: [...new Set(mapped.map(l => l.industry).filter(Boolean))].slice(0, 6),
                locations: [...new Set(mapped.map(l => l.location).filter(Boolean))].slice(0, 6),
                keywords: [],
                profile_language: [],
            };
            setLeads(mapped);
            setFilteredLeads([]);
            setTargeting(n > 0 ? icpTargeting : null);
            setMessages(p => p.map(m => m.id === lid ? {
                ...m,
                loading: false,
                text: n > 0
                    ? `Found ${n} prospect${n === 1 ? '' : 's'} matching your active ICP. Review them and create your outreach campaign.`
                    : 'No prospects matched your active ICP on this run. Try widening the ICP or raising the result cap in your search strategy.',
                leads: n > 0 ? mapped.slice(0, 3) : undefined,
                targeting: n > 0 ? icpTargeting : undefined,
                outreach_journey: n > 0 ? buildOutreachJourney(mapped, icpTargeting) : undefined,
            } : m));
            if (n > 0) setTimeout(() => setShowPanel('leads'), 300);
        } catch (e: any) {
            setIsSearching(false);
            setMessages(p => p.map(m => m.id === lid ? { ...m, loading: false, text: `ICP search failed: ${e?.message || 'unknown error'}` } : m));
        } finally {
            setBusy(false);
        }
    }, [icpSearch]);

    const handleStartMediaGeneration = useCallback(() => {
        setMediaMode(true);
        setMediaMessages([
            {
                id: "welcome-msg",
                role: "ai",
                text: "AI Media Generation",
                description: "Generate high-converting image concepts or premium videos for your outreach campaigns. Media generations are saved to your asset vault.",
                step: "welcome",
                timestamp: new Date()
            }
        ]);
        mb.startFlow();
    }, [mb]);

    const submitMediaInput = useCallback((text: string, valueToSend?: string | string[], customReferences?: { path: string, thumbnail: string }[]) => {
        const finalRefs = customReferences || (mb.references && mb.references.length > 0 ? [...mb.references] : undefined);
        const displayText = text || (finalRefs && finalRefs.length > 0 ? `Uploaded ${finalRefs.length} reference${finalRefs.length > 1 ? 's' : ''}` : "");
        setMediaMessages(prev => [
            ...prev.filter(m => !m.loading),
            {
                id: `user-${Date.now()}`,
                role: "user",
                text: displayText,
                references: finalRefs,
                timestamp: new Date()
            }
        ]);
        mb.advanceStep(valueToSend !== undefined ? valueToSend : text);
    }, [mb]);

    const startImageCreation = useCallback(() => {
        setMediaMessages(prev => [
            ...prev,
            {
                id: `user-${Date.now()}`,
                role: "user",
                text: "Image Creation",
                timestamp: new Date()
            }
        ]);
        mb.selectImageCreation();
    }, [mb]);

    const startVideoGeneration = useCallback(() => {
        setMediaMessages(prev => [
            ...prev,
            {
                id: `user-${Date.now()}`,
                role: "user",
                text: "Video Generation",
                timestamp: new Date()
            }
        ]);
        mb.selectVideoGeneration();
    }, [mb]);

    const handleMediaBack = useCallback(() => {
        if (mb.step === "welcome") {
            setMediaMode(false);
            setMediaMessages([]);
            lastRestoredSessionIdRef.current = "";
        } else {
            mb.undoStep();
        }
    }, [mb]);


    const renderOptionsExtension = () => {
        if (!mediaMode) return null;

        const hasOptions = mb.step === "welcome" || 
                           (mb.step === "builder-mcq-few" && mb.uiPayload?.options && mb.uiPayload.options.length > 0) ||
                           (mb.step === "builder-text" && mb.uiPayload?.enable_upload) ||
                           (mb.step === "builder-image-output" && (mb.references.length > 0 || mb.isUploading || mb.error)) ||
                           mb.step === "builder-video-confirm" ||
                           ((mb.step === "builder-script-confirm" || mb.step === "builder-workflow-choice") && mb.uiPayload?.options && mb.uiPayload.options.length > 0);

        if (!hasOptions) return null;

        if (mb.step === "welcome") {
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-3">Select Journey</div>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={startImageCreation}
                            className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#0b1957] hover:bg-slate-50 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                            <div className="p-2 bg-blue-50 rounded-lg text-[#0b1957]">
                                <ImageIcon className="size-5" />
                            </div>
                            <div>
                                <div className="text-[13px] font-bold text-[#0b1957]">Image Creation</div>
                                <div className="text-[10px] text-slate-500 font-medium">Create &amp; edit custom brand designs or ICP target graphics.</div>
                            </div>
                        </button>
                        <button
                            onClick={startVideoGeneration}
                            className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-[#0b1957] hover:bg-slate-50 transition-all flex items-start gap-3 group cursor-pointer"
                        >
                            <div className="p-2 bg-slate-100 rounded-lg text-slate-400 group-hover:text-[#0b1957]">
                                <Video className="size-5" />
                            </div>
                            <div>
                                <div className="text-[13px] font-bold text-slate-400 group-hover:text-[#0b1957]">Video Generation</div>
                                <div className="text-[10px] text-slate-400 font-medium">Generate personalized video ads for outbound leads.</div>
                            </div>
                        </button>
                        <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                            <button
                                onClick={() => {
                                    mb.fetchGallery();
                                }}
                                className="text-xs font-bold text-[#0b1957] hover:underline cursor-pointer"
                            >
                                View Asset Vault / Gallery
                            </button>
                            <span className="text-[10px] text-slate-400">Generations save to your vault</span>
                        </div>
                    </div>
                </div>
            );
        }

        if (mb.step === "builder-mcq-few" && mb.uiPayload?.options) {
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Options</div>
                    <div className="flex flex-wrap gap-2 justify-start max-h-48 overflow-y-auto scrollbar-thin w-full">
                        {mb.uiPayload.options.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => submitMediaInput(opt.label, opt.label)}
                                className="bg-white border border-slate-200 hover:border-[#0b1957] rounded-xl px-4 py-2 text-xs font-semibold text-[#0b1957] hover:bg-slate-50 transition-all duration-300 ease-in-out cursor-pointer shadow-sm text-left max-w-full truncate max-h-[34px] hover:max-h-[200px] hover:whitespace-normal hover:break-words"
                                title={opt.label}
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            onClick={() => submitMediaInput("Skip", "")}
                            className="border border-dashed border-slate-300 rounded-full px-6 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            Skip
                        </button>
                    </div>
                </div>
            );
        }

        if (mb.step === "builder-text" && mb.uiPayload?.enable_upload) {
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Upload References (Optional)</div>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                        {mb.references.map((ref) => (
                            <div key={ref.path} className="relative size-12 border border-slate-200 rounded-lg overflow-hidden group">
                                <img src={ref.thumbnail} className="object-cover size-full" />
                                <button
                                    onClick={() => mb.removeReference(ref.path)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                        {mb.references.length < 5 && (
                            <label className="size-12 border border-dashed border-slate-300 hover:border-[#0b1957] rounded-lg flex items-center justify-center cursor-pointer text-slate-400 hover:text-[#0b1957] transition-all">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) mb.uploadReference(f);
                                    }}
                                />
                                <span className="text-base font-semibold">+</span>
                            </label>
                        )}
                    </div>
                    {mb.isUploading && <div className="text-[10px] text-slate-500 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Uploading image...</div>}
                    {mb.error && <div className="text-[10px] text-red-500">{mb.error}</div>}
                </div>
            );
        }

        if (mb.step === "builder-image-output") {
            if (mb.references.length === 0 && !mb.isUploading && !mb.error) {
                return null;
            }
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Attached References</div>
                    <div className="flex flex-wrap gap-2 items-center mb-2">
                        {mb.references.map((ref) => (
                            <div key={ref.path} className="relative size-12 border border-slate-200 rounded-lg overflow-hidden group">
                                <img src={ref.thumbnail} className="object-cover size-full" />
                                <button
                                    onClick={() => mb.removeReference(ref.path)}
                                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="size-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {mb.isUploading && <div className="text-[10px] text-slate-500 flex items-center gap-1"><Loader2 className="size-3 animate-spin" /> Uploading image...</div>}
                    {mb.error && <div className="text-[10px] text-red-500">{mb.error}</div>}
                </div>
            );
        }

        if (mb.step === "builder-video-confirm") {
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Actions</div>
                    <div className="flex gap-2 justify-start">
                        <button
                            onClick={() => submitMediaInput("Confirm and Generate Video", "Yes, generate video")}
                            className="py-2 px-6 bg-gradient-to-r from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] text-white rounded-full text-xs font-bold shadow-md hover:shadow-lg transition-all active:scale-95 text-center cursor-pointer"
                        >
                            Confirm &amp; Generate Video
                        </button>
                        <button
                            onClick={() => mb.undoStep()}
                            className="py-2 px-6 bg-white border border-slate-200 hover:border-red-500 text-slate-500 hover:text-red-500 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer"
                        >
                            Cancel / Go Back
                        </button>
                    </div>
                </div>
            );
        }

        if (mb.step === "builder-video-output") {
            const handleDownload = async () => {
                const videoUrl = mb.uiPayload?.video || "";
                if (!videoUrl) return;
                try {
                    const response = await fetch(videoUrl);
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    a.download = "animated-concept.mp4";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(blobUrl);
                } catch (err) {
                    console.warn("Direct blob download failed, falling back to navigation:", err);
                    const a = document.createElement("a");
                    a.href = videoUrl;
                    a.target = "_blank";
                    a.click();
                }
            };

            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Actions</div>
                    <div className="flex flex-col gap-2 w-full">
                        {/* Primary action button: Add Dialogues */}
                        <button
                            type="button"
                            onClick={() => submitMediaInput("Add Dialogues (AI Voiceover)", "[ADD_DIALOGUES]")}
                            className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 text-white font-bold text-xs rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Volume2 className="size-4" />
                            Add Dialogues (AI Voiceover)
                        </button>

                        {/* Secondary action buttons: Back, Extend, Download */}
                        <div className="flex gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => submitMediaInput("Back to Gallery", "[SHOW_GALLERY]")}
                                className="flex-1 py-2 px-4 border border-slate-200 hover:bg-slate-50 text-[#0b1957] font-bold text-[10px] rounded-full transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1"
                            >
                                <ArrowLeft className="size-3" />
                                Back to Gallery
                            </button>
                            <button
                                type="button"
                                onClick={() => submitMediaInput("Extend Video", "[EXTEND_VIDEO]")}
                                className="flex-1 py-2 px-4 border border-blue-200 hover:bg-blue-50/50 text-blue-700 bg-blue-50/25 font-bold text-[10px] rounded-full transition-all active:scale-95 cursor-pointer text-center flex items-center justify-center gap-1 shadow-sm hover:shadow"
                            >
                                <Sparkles className="size-3 text-amber-500" />
                                Extend Video
                            </button>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="flex-1 py-2 px-4 bg-gradient-to-br from-[#0b1957] to-[#1e293b] hover:from-[#0b1957] hover:to-[#0b1957] text-white font-bold text-[10px] rounded-full transition-all active:scale-95 shadow-md hover:shadow-lg cursor-pointer text-center flex items-center justify-center gap-1"
                            >
                                <Download className="size-3" />
                                Download
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        if (mb.step === "builder-script-confirm" || mb.step === "builder-workflow-choice") {
            return (
                <div className="adv-options-extension fadeUp">
                    <div className="text-[11px] font-bold text-[#0b1957]/50 uppercase tracking-wider mb-2">Choose Script / Workflow</div>
                    <div className="flex flex-wrap gap-2 justify-start items-center max-h-40 overflow-y-auto scrollbar-thin">
                        {mb.uiPayload?.options?.map((opt) => (
                            <button
                                key={opt.id}
                                onClick={() => submitMediaInput(opt.label, opt.label)}
                                className="bg-white border border-slate-200 hover:border-[#0b1957] rounded-lg px-4 py-2 text-left text-xs font-semibold text-[#0b1957] hover:bg-slate-50 transition-all cursor-pointer"
                            >
                                {opt.label}
                            </button>
                        ))}
                        <button
                            onClick={() => mb.undoStep()}
                            className="border border-dashed border-slate-300 rounded-lg px-4 py-2 text-center text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            );
        }



        return null;
    };

    // Sync mediaMessages with mb hook state transitions
    useEffect(() => {
        if (!mediaMode) return;

        // 1. Handle Welcome Step
        if (mb.step === "welcome") {
            setMediaMessages([
                {
                    id: "welcome-msg",
                    role: "ai",
                    text: "AI Media Generation",
                    description: "Generate high-converting image concepts or premium videos for your outreach campaigns. Media generations are saved to your asset vault.",
                    step: "welcome",
                    timestamp: new Date()
                }
            ]);
            return;
        }

        // 2. Handle Real Steps with Payloads
        if (mb.step !== "loading" && !mb.generating && mb.uiPayload) {
            setMediaMessages(prev => {
                // Check if this step already exists in history (for undo truncation)
                const existingIndex = prev.findIndex(m => {
                    const isStepTypeMatch = m.step === mb.step;
                    const mPhase = m.payload?.phase || m.payload?.phase_label;
                    const uiPhase = mb.uiPayload?.phase;
                    const isPhaseMatch = mPhase === uiPhase;
                    const mQuestion = m.payload?.question || m.payload?.title || m.text;
                    const uiQuestion = mb.uiPayload?.question || mb.uiPayload?.title;
                    const isQuestionMatch = mQuestion === uiQuestion;
                    return isStepTypeMatch && isPhaseMatch && isQuestionMatch;
                });

                if (existingIndex !== -1) {
                    return prev.slice(0, existingIndex + 1);
                }

                // Avoid duplicate additions of the current active step, but update its payload with the latest data
                const lastMsg = prev[prev.length - 1];
                const isLastMsgMatch = lastMsg && (() => {
                    const isStepTypeMatch = lastMsg.step === mb.step;
                    const mPhase = lastMsg.payload?.phase || lastMsg.payload?.phase_label;
                    const uiPhase = mb.uiPayload?.phase;
                    const isPhaseMatch = mPhase === uiPhase;
                    const mQuestion = lastMsg.payload?.question || lastMsg.payload?.title || lastMsg.text;
                    const uiQuestion = mb.uiPayload?.question || mb.uiPayload?.title;
                    const isQuestionMatch = mQuestion === uiQuestion;
                    return isStepTypeMatch && isPhaseMatch && isQuestionMatch;
                })();

                if (isLastMsgMatch) {
                    return prev.map((m, idx) => idx === prev.length - 1 ? {
                        ...m,
                        text: mb.uiPayload?.question || m.text,
                        description: mb.uiPayload?.description || m.description,
                        payload: mb.uiPayload
                    } : m);
                }

                const stableId = `ai-${mb.step}-${mb.uiPayload?.phase || ''}-${mb.uiPayload?.question ? mb.uiPayload.question.substring(0, 16) : ''}`;
                return [
                    ...prev,
                    {
                        id: stableId,
                        role: "ai",
                        text: mb.uiPayload?.question || "",
                        description: mb.uiPayload?.description,
                        step: mb.step,
                        payload: mb.uiPayload,
                        timestamp: new Date()
                    }
                ];
            });
        }
    }, [mb.step, mb.uiPayload, mb.generating, mediaMode]);

    // Auto-scroll when mediaMessages or options step/state updates
    useEffect(() => {
        if (mediaMode) {
            const timer = setTimeout(() => {
                endRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [mediaMessages, mediaMode, mb.step, mb.uiPayload?.options, hasOptionsOpen]);

    // Measure input wrap height dynamically to adjust scroll padding
    useEffect(() => {
        if (!mediaMode || !mediaInputWrapRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setMediaInputWrapHeight(entry.target.clientHeight);
            }
        });

        observer.observe(mediaInputWrapRef.current);
        return () => observer.disconnect();
    }, [mediaMode, mb.step, mb.uiPayload?.options, hasOptionsOpen]);

    const onLandingSubmit = useCallback(() => {
        if (!input.trim()) return;
        addToHistory(input.trim());
        // setScreen('chat'); // Single-screen mode - no screen switching
        setTimeout(() => doSend(input.trim()), 100);
        setInput('');
    }, [input]);

    /* ── Contact Picker handlers ── */
    const fetchCpContacts = useCallback(async (sourceKey: string, q: string) => {
        const source = CP_SOURCES.find(s => s.key === sourceKey);
        if (!source) { setCpContacts([]); return; }
        setCpLoading(true);
        try {
            const results = await source.fetchContacts(q);
            setCpContacts(results);
        } catch {
            setCpContacts([]);
        }
        setCpLoading(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openContactPicker = useCallback(() => {
        setShowContactPicker(true);
        setCpPickerStep('source');
        setCpSourceKey('');
        setCpSearch('');
        setCpSelected(new Set());
        setCpContacts([]);
    }, []);

    const selectCpSource = useCallback(async (key: string) => {
        setCpSourceKey(key);
        setCpPickerStep('contacts');
        setCpSearch('');
        setCpSelected(new Set());
        await fetchCpContacts(key, '');
    }, [fetchCpContacts]);

    const handleCpSearch = useCallback((q: string) => {
        setCpSearch(q);
        if (cpSearchTimer.current) clearTimeout(cpSearchTimer.current);
        cpSearchTimer.current = setTimeout(() => fetchCpContacts(cpSourceKey, q), 350);
    }, [fetchCpContacts, cpSourceKey]);

    const toggleCpContact = useCallback((id: string) => {
        setCpSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }, []);

    const toggleCpSelectAll = useCallback(() => {
        setCpSelected(prev =>
            prev.size === cpContacts.length
                ? new Set()
                : new Set(cpContacts.map((c: any) => c.id))
        );
    }, [cpContacts]);

    /* ── Finish an inbound import: save (+ role discovery) → enrich → summary ──
       Split out of handleInboundFile so the import can PAUSE on an in-chat location
       question (role-based sheets with no location column) and resume here with the
       user's answer. Pass existingProcessingId to reuse an already-shown loading
       bubble (the caller then owns the busy flag); omit it to run standalone. */
    const finishInboundImport = useCallback(async (parsed: ParsedInboundLead[], finalLocation: string, existingProcessingId?: string) => {
        const processingId = existingProcessingId || `l-${Date.now()}`;
        if (!existingProcessingId) {
            setMessages(p => [...p, { id: processingId, role: 'ai', text: '', ts: new Date(), loading: true }]);
            setBusy(true);
        }
        try {
            const counts = computeInboundCounts(parsed);
            const inboundTargeting: LeadTargeting = {
                job_titles: [], industries: [],
                locations: finalLocation ? [finalLocation] : [],
                keywords: [`${counts.total} Inbound Leads`],
            };
            setTargeting(inboundTargeting);

            // ── SAVE LEADS TO DATABASE ──
            // Convert to save format and persist to campaign_leads table
            const leadsForSave = parsed.map(l => ({
                first_name: l.firstName,
                last_name: l.lastName,
                email: l.email,
                phone: l.phone || l.whatsapp,
                company: l.companyName,
                linkedin_url: l.linkedinProfile,
                website: l.website,
                notes: l.notes,
                // Role/title target(s) — the backend router splits multi-role cells and
                // fans out one lead per title, then discovers people for each role.
                title: l.title,
            }));

            try {
                const saveResponse = await fetch('/api/campaigns/leads/import/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leads: leadsForSave,
                        location: finalLocation || undefined,
                        detectedChannels: {
                            email: counts.email > 0,
                            whatsapp: counts.whatsapp > 0,
                            phone: counts.phone > 0,
                            linkedin: counts.linkedin > 0,
                            website: counts.website > 0,
                        },
                    }),
                });

                if (saveResponse.ok) {
                    const saveData = await saveResponse.json();
                    // Store real lead UUIDs so campaign creation can link to leads table
                    if (saveData.leadIds && saveData.leadIds.length > 0) {
                        setInboundLeadIds(saveData.leadIds);
                        // Default-select every imported lead so the panel checkboxes
                        // show checked (launch already enrolls all inbound ids when
                        // nothing is selected — this makes the UI reflect that).
                        // Fan-out branches below re-seed with the discovered ids.
                        setSelectedLeadIds(new Set(saveData.leadIds));

                        // Use the backend's saved/discovered leads as the source of truth for
                        // BOTH the panel and enrollment whenever it returns any — the created
                        // leads carry the real names + LinkedIn URLs (and their real UUIDs, kept
                        // index-aligned below). Gating on `> parsed.length` silently kept the
                        // client-parsed "Unknown" rows whenever discovery returned the same count
                        // or fewer (e.g. a throttled company+title run that fell back to placeholders).
                        const savedLeads: any[] = Array.isArray(saveData.leads) ? saveData.leads : [];
                        if (savedLeads.length > 0) {
                            const rebuiltInbound: ParsedInboundLead[] = savedLeads.map((r) => {
                                const { firstName, lastName } = readLeadName(r);
                                return {
                                    firstName,
                                    lastName,
                                    companyName: r.company || '',
                                    linkedinProfile: r.linkedin_url || '',
                                    email: '', whatsapp: '', phone: '', website: '', notes: '',
                                    title: r.headline || r.title || r.target_title || '',
                                    location: r.location || '',
                                    profilePicture: r.profile_picture || '',
                                };
                            });
                            setInboundLeads(rebuiltInbound);
                            const rebuiltPanel: LeadProfile[] = savedLeads.map((r, i) => {
                                const { firstName, lastName, name } = readLeadName(r);
                                return {
                                    id: r.id || `inbound-${i}`,
                                    name: leadDisplayLabel({ name, company: r.company, headline: r.headline || r.title || r.target_title }, i),
                                    first_name: firstName,
                                    last_name: lastName,
                                    headline: r.headline || r.title || r.target_title || (r.company ? `at ${r.company}` : ''),
                                    location: r.location || '',
                                    current_company: r.company || '',
                                    profile_url: r.linkedin_url || '',
                                    profile_picture: r.profile_picture || '',
                                    industry: '',
                                    network_distance: '',
                                    locked: false,
                                };
                            });
                            setLeads(rebuiltPanel);
                            // Keep ids aligned 1:1 with the rebuilt list (checkboxes map by index).
                            setInboundLeadIds(savedLeads.map((r) => r.id).filter(Boolean));
                            // Default-select every discovered person (user can uncheck any).
                            setSelectedLeadIds(new Set(savedLeads.map((r) => r.id).filter(Boolean)));
                            counts.total = savedLeads.length;
                            counts.linkedin = savedLeads.filter((r) => r.linkedin_url).length;
                        }

                        // ── FULL INBOUND ENRICHMENT (Google + Gemini + Unipile) ──
                        try {
                            const enrichRes = await fetch('/api/campaigns/leads/enrich-inbound', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    leadIds: saveData.leadIds,
                                    icpProfile: businessProfile || null,
                                }),
                            });
                            if (enrichRes.ok) {
                                const enrichData = await enrichRes.json();
                                if (enrichData.success && enrichData.results?.length > 0) {
                                    const results = enrichData.results as any[];
                                    // When the backend fanned out a company+title row into multiple
                                    // DISCOVERED people, the saved leads no longer map 1:1 to the
                                    // uploaded rows — rebuild the panel from the discovered people so
                                    // they actually show (instead of the single "Unknown/Ripple" row).
                                    const fannedOut = results.length > parsed.length;
                                    if (fannedOut) {
                                        const rebuiltInbound: ParsedInboundLead[] = results.map((r) => {
                                            const { firstName, lastName } = readLeadName(r);
                                            return {
                                                firstName,
                                                lastName,
                                                companyName: r.company || '',
                                                linkedinProfile: r.linkedin_url || '',
                                                email: r.email || '',
                                                whatsapp: '',
                                                phone: r.phone || '',
                                                website: '',
                                                notes: r.background_summary || '',
                                                title: r.job_title || '',
                                                location: '',
                                                profilePicture: r.profile_picture || '',
                                            };
                                        });
                                        setInboundLeads(rebuiltInbound);
                                        setInboundLeadIds(results.map((r) => r.leadId));
                                        // Default-select every discovered person (user can uncheck any).
                                        setSelectedLeadIds(new Set(results.map((r) => r.leadId).filter(Boolean)));
                                        const rebuiltPanel: LeadProfile[] = results.map((r, i) => {
                                            const { firstName, lastName, name } = readLeadName(r);
                                            return {
                                                id: `inbound-${i}`,
                                                name: leadDisplayLabel({ name, company: r.company, headline: r.job_title }, i),
                                                first_name: firstName,
                                                last_name: lastName,
                                                headline: r.job_title || (r.company ? `at ${r.company}` : ''),
                                                location: '',
                                                current_company: r.company || '',
                                                profile_url: r.linkedin_url || '',
                                                profile_picture: '',
                                                industry: r.industry || '',
                                                network_distance: '',
                                                locked: false,
                                            };
                                        });
                                        setLeads(rebuiltPanel);
                                        counts.total = results.length;
                                        counts.linkedin = results.filter((r) => r.linkedin_url).length;
                                    } else {
                                        // 1:1 imports — merge enrichment into the uploaded rows (keeps
                                        // any email/phone the sheet provided).
                                        const enrichedIds: string[] = saveData.leadIds;
                                        const enrichMap: Record<string, any> = {};
                                        results.forEach((r) => { enrichMap[r.leadId] = r; });
                                        setInboundLeads(prev => prev.map((lead, idx) => {
                                            const lid = enrichedIds[idx];
                                            const enriched = lid ? enrichMap[lid] : null;
                                            if (!enriched) return lead;
                                            return {
                                                ...lead,
                                                linkedinProfile: lead.linkedinProfile || enriched.linkedin_url || lead.linkedinProfile,
                                                notes: enriched.background_summary
                                                    ? `${enriched.background_summary}${lead.notes ? '\n' + lead.notes : ''}`
                                                    : lead.notes,
                                            };
                                        }));
                                        const newLinkedIn = results.filter((r) => r.linkedin_url && !parsed[enrichedIds.indexOf(r.leadId)]?.linkedinProfile).length;
                                        if (newLinkedIn > 0) counts.linkedin = (counts.linkedin || 0) + newLinkedIn;
                                        // Surface waterfall-resolved LinkedIn URLs on the panel cards
                                        // too — the panel was built from the raw rows before enrichment
                                        // ran, so resolved profiles would otherwise not be clickable.
                                        // Panel cards are index-aligned with enrichedIds for 1:1 imports.
                                        setLeads(prev => prev.map((pl, idx) => {
                                            const enriched = enrichedIds[idx] ? enrichMap[enrichedIds[idx]] : null;
                                            if (!enriched?.linkedin_url || pl.profile_url) return pl;
                                            return { ...pl, profile_url: enriched.linkedin_url };
                                        }));
                                    }
                                }
                            }
                        } catch (enrichErr) {
                            console.warn('[Lead Import] Inbound enrichment error:', enrichErr);
                        }
                    }
                } else {
                    console.warn('Failed to save leads to database');
                }
            } catch (saveErr) {
                console.warn('Error saving leads:', saveErr);
            }

            let summaryText = `**${counts.total} lead${counts.total !== 1 ? 's' : ''} successfully imported.**\n\n**Contact data detected:**\n`;
            if (counts.linkedin > 0) summaryText += `\n• LinkedIn: ${counts.linkedin} profile${counts.linkedin !== 1 ? 's' : ''}`;
            if (counts.email > 0) summaryText += `\n• Email: ${counts.email} address${counts.email !== 1 ? 'es' : ''}`;
            if (counts.whatsapp > 0) summaryText += `\n• WhatsApp: ${counts.whatsapp} number${counts.whatsapp !== 1 ? 's' : ''}`;
            if (counts.phone > 0) summaryText += `\n• Phone: ${counts.phone} number${counts.phone !== 1 ? 's' : ''}`;
            if (counts.website > 0) summaryText += `\n• Website: ${counts.website} URL${counts.website !== 1 ? 's' : ''}`;
            if (finalLocation) summaryText += `\n\n📍 Search location: **${finalLocation}**`;
            summaryText += `\n\nBuilding profiles in the background — searching Google and LinkedIn for additional context on each lead.\n\nWhen ready, click **"Create Outreach Journey"** below to configure your campaign.`;

            setMessages(p => p.filter(m => m.id !== processingId).concat({
                id: `a-${Date.now()}`, role: 'ai', text: summaryText, ts: new Date(),
                targeting: inboundTargeting, inboundAction: 'summary', inboundSummary: counts,
            }));
            setTimeout(() => setShowPanel('leads'), 500);
        } catch (err: any) {
            setMessages(p => p.filter(m => m.id !== processingId).concat({
                id: `a-${Date.now()}`, role: 'ai', text: `⚠️ **Error importing leads:** ${err.message}`, ts: new Date(),
            }));
        } finally {
            if (!existingProcessingId) setBusy(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [businessProfile]);

    /* ── Contact-picker confirm: route picked contacts (Zoho/GHL/WA/…) through
       the SAME inbound-import pipeline as file uploads. That saves them to the
       leads table and runs enrichment — including Unipile LinkedIn profile
       resolution from name+company — so CRM contacts without a stored LinkedIn
       URL still light up the LinkedIn channel. (Defined AFTER finishInboundImport
       to avoid a TDZ reference.) ── */
    const confirmContactPicker = useCallback(async () => {
        const selected = cpContacts.filter((c: any) => cpSelected.has(c.id));
        if (!selected.length) return;

        const asInbound: ParsedInboundLead[] = selected.map((c: any) => ({
            firstName: c.first_name || (typeof c.name === 'string' ? c.name.split(' ')[0] : '') || '',
            lastName: c.last_name || (typeof c.name === 'string' ? c.name.split(' ').slice(1).join(' ') : '') || '',
            companyName: c.company || c.company_name || '',
            linkedinProfile: c.linkedin_url || '',
            email: c.email || '',
            whatsapp: c.phone || '',
            phone: c.phone || '',
            website: c.website || '',
            notes: c.notes || '',
            title: c.title || c.job_title || c.headline || '',
            location: c.location || '',
            profilePicture: c.profile_picture || c.photo || '',
        }));

        setInboundLeads(asInbound);
        setInboundMode(true);
        setShowContactPicker(false);

        const sourceName = CP_SOURCES.find(s => s.key === cpSourceKey)?.label || 'Contacts';
        setMessages(p => [...p,
        { id: `u-${Date.now()}`, role: 'user', text: `👥 Selected ${asInbound.length} contact${asInbound.length !== 1 ? 's' : ''} from ${sourceName}`, ts: new Date() },
        ]);

        // Save + enrich (LinkedIn waterfall) — posts its own summary bubble with
        // the resolved channel counts when done.
        await finishInboundImport(asInbound, '');

        // Auto-start campaign checkpoint flow with the enriched channel set.
        setTimeout(() => setCpStep(0), 300);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cpContacts, cpSelected, cpSourceKey, finishInboundImport]);

    /* ── Core send logic ── */
    /* ── Inbound file handler ── */
    const handleInboundFile = useCallback(async (file: File) => {
        setBusy(true);
        const processingId = `l-${Date.now()}`;
        setMessages(p => [...p, { id: `u-${Date.now()}`, role: 'user', text: `📎 Uploaded: ${file.name}`, ts: new Date() }, { id: processingId, role: 'ai', text: '', ts: new Date(), loading: true }]);
        try {
            let parsed: ParsedInboundLead[] = [];

            // Check if file is an image
            const isImage = file.type.startsWith('image/');

            if (isImage) {
                // Use backend API for image extraction
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/campaigns/leads/import', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to extract leads from image');
                }

                const apiResult = await response.json();

                if (!apiResult.success || !apiResult.data?.leads) {
                    throw new Error(apiResult.error || 'No leads found in image');
                }

                // Convert API response to ParsedInboundLead format
                parsed = apiResult.data.leads.map((lead: any) => ({
                    firstName: lead.first_name || '',
                    lastName: lead.last_name || '',
                    companyName: lead.company || '',
                    linkedinProfile: lead.linkedin_url || '',
                    email: lead.email || '',
                    whatsapp: lead.phone || '',
                    phone: lead.phone || '',
                    website: lead.website || '',
                    notes: lead.notes || '',
                    title: lead.title || lead.job_title || '',
                    location: lead.location || '',
                    profilePicture: lead.profile_picture || '',
                }));
            } else {
                // Use local CSV parsing for spreadsheet files
                parsed = await parseInboundCSV(file);
            }

            setInboundLeads(parsed);
            setInboundMode(true);

            const counts = computeInboundCounts(parsed);

            // Convert inbound leads to LeadProfile format for the panel
            const panelLeads: LeadProfile[] = parsed.map((l, i) => ({
                id: `inbound-${i}`,
                name: leadDisplayLabel({ firstName: l.firstName, lastName: l.lastName, company: l.companyName }, i),
                first_name: l.firstName,
                last_name: l.lastName,
                headline: l.companyName ? `at ${l.companyName}` : '',
                location: '',
                current_company: l.companyName,
                profile_url: l.linkedinProfile,
                profile_picture: '',
                industry: '',
                network_distance: '',
                locked: false,
            }));
            setLeads(panelLeads);

            // Set a default targeting so the leads panel shows
            const inboundTargeting: LeadTargeting = {
                job_titles: [], industries: [], locations: [],
                keywords: [`${counts.total} Inbound Leads`],
            };
            setTargeting(inboundTargeting);

            // ── LOCATION GATE ──
            // Role-based rows (company + title, no person name) search LinkedIn globally
            // unless we narrow by location. If the sheet has no location column, ask in
            // the chat — with a quick option to search worldwide — and resume the import
            // in doSend → finishInboundImport with the user's answer.
            const sheetLocation = parsed.find(l => l.location && l.location.trim())?.location?.trim() || '';
            const hasTitleRows = parsed.some(l => (l.title && l.title.trim()) && !l.firstName && !l.lastName && (l.companyName && l.companyName.trim()));
            if (!sheetLocation && hasTitleRows) {
                setPendingImportLocation({ parsed });
                setMessages(p => p.filter(m => m.id !== processingId).concat({
                    id: `a-${Date.now()}`, role: 'ai', ts: new Date(),
                    text: `📋 Your file has **role-based targets** (company + job titles) rather than named people — I'll search LinkedIn to find the right person for each role.\n\n📍 **Which location should I focus the search on?**\n\nType a city, country or region (e.g. **Dubai**, **UAE**, **MEA**) — or search worldwide.`,
                    options: [{ label: '🌍 Search worldwide', value: 'worldwide' }],
                }));
                return; // finally{} clears busy; the reply resumes the import
            }

            await finishInboundImport(parsed, sheetLocation, processingId);
        } catch (err: any) {
            setMessages(p => p.filter(m => m.id !== processingId).concat({
                id: `a-${Date.now()}`, role: 'ai', text: `⚠️ **Error parsing file:** ${err.message}\n\nTry uploading:\n• Images with business card or contact information\n• CSV/Excel files with structured lead data`,
                ts: new Date(), inboundAction: 'upload',
            }));
        } finally { setBusy(false); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finishInboundImport]);

    const doSend = useCallback(async (text: string, opts?: { targetingOverride?: LeadTargeting }) => {
        if (!text.trim() || busy) return;
        // ICP chip sentinel → run the SearchDispatcher (Apollo + Sales Nav on the active
        // ICP), not the LinkedIn pipeline. Placed here so every submit path is covered
        // (landing onLandingSubmit + chat onChatSend both funnel through doSend).
        if (isIcpLeadsPrompt(text)) { await handleIcpLeadsSearch(text); return; }
        // Enforce 10-message limit only when user has no credits
        if (creditBalance !== null && creditBalance <= 0 && msgCount >= 10) return;
        const uid = `u-${Date.now()}`;
        const lid = `l-${Date.now()}`;
        setMessages(p => [...p, { id: uid, role: 'user', text, ts: new Date() }, { id: lid, role: 'ai', text: '', ts: new Date(), loading: true }]);
        setBusy(true);
        setMsgCount(c => c + 1);

        // ── PRIORITY -2: Import location answer ──
        // If we asked which location to use for an imported role-based sheet
        // (company + job titles), treat this reply as the answer and resume the
        // import: save → discover people per role → enrich. Must run before every
        // other intent handler so short replies like "Dubai" aren't misrouted.
        if (pendingImportLocation) {
            const reply = text.trim();
            const isGlobal = /^(🌍\s*)?(worldwide|search worldwide|global(ly)?|everywhere|anywhere|skip|no)$/i.test(reply);
            const parsedLeads = pendingImportLocation.parsed;
            setPendingImportLocation(null);
            await finishInboundImport(parsedLeads, isGlobal ? '' : reply, lid);
            setBusy(false);
            return;
        }

        // ── PRIORITY -1a: Existing client / relationship-building intent ──
        const isRelationshipIntent = /existing client|strengthen.*relation|strengthen.*client|client relation|re.engage.*client|re-engage.*client/i.test(text);
        if (isRelationshipIntent) {
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: lid, role: 'ai', ts: new Date(),
                text: `Excellent goal. To strengthen client relationships, import their existing data like company name, email, LinkedIn URL, phone etc., and complete the next steps (campaign setup).`,
            }));
            setBusy(false);
            return;
        }

        // ── PRIORITY -1: Outreach / phone / email direct-contact commands ──
        // "Hey LAD outreach to +971...", "+971506341191", "reach out to john@x.com", etc.
        const hasPhone = /\+?\d[\d\s\-().]{8,}\d/.test(text);
        const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
        // Require explicit "outreach to" / "reach out to" followed by a contact identifier
        // (phone starting with +, email address, or linkedin.com URL).
        // Must NOT match generic phrases like "outreach by reducing costs" or "outreach to SME owners".
        const hasOutreachKeyword = /\b(outreach|reach out)\s+to\s+(\+\d|[\w.+-]+@|https?:\/\/(?:www\.)?linkedin\.com)/i.test(text);
        if (hasPhone || hasEmail || hasOutreachKeyword) {
            try {
                const parseRes = await fetch('/api/campaigns/leads/parse-chat-input', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ message: text, conversationHistory: [] }),
                });
                const parseData = await parseRes.json();
                const lead = parseData.detectedLeads?.[0];
                if (lead) {
                    setPendingContact(lead); // store for Start Campaign Setup
                    const details: string[] = [];
                    if (lead.phone) details.push(`📞 **Phone:** ${lead.phone}`);
                    if (lead.email) details.push(`📧 **Email:** ${lead.email}`);
                    if (lead.first_name) details.push(`👤 **Name:** ${lead.first_name}${lead.last_name ? ' ' + lead.last_name : ''}`);
                    if (lead.company) details.push(`🏢 **Company:** ${lead.company}`);
                    const channels = lead.phone ? 'WhatsApp or Voice Call' : lead.email ? 'Email' : 'outreach';
                    setMessages(p => p.filter(m => m.id !== lid).concat({
                        id: `a-${Date.now()}`, role: 'ai',
                        text: `📱 **Contact detected!**\n\n${details.join('\n')}\n\nReady to set up a **${channels} campaign** for this contact.`,
                        ts: new Date(),
                        options: [
                            { label: '🚀 Start Campaign Setup', value: '__start_campaign__' },
                            { label: '✏️ Input more details', value: '__more_details__' },
                        ],
                    }));
                } else {
                    setMessages(p => p.filter(m => m.id !== lid).concat({
                        id: `a-${Date.now()}`, role: 'ai',
                        text: `📱 **Ready to set up outreach!**\n\nI detected a contact in your message. To create a campaign:\n• **WhatsApp / Voice Call** — just a phone number is enough\n• **Email outreach** — provide an email address\n• **LinkedIn outreach** — provide a LinkedIn URL or name + company`,
                        ts: new Date(),
                        options: [
                            { label: '🚀 Start Campaign Setup', value: '__start_campaign__' },
                            { label: '✏️ Input more details', value: '__more_details__' },
                        ],
                    }));
                }
            } catch {
                setMessages(p => p.filter(m => m.id !== lid).concat({
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `📱 I see you want to reach out to a contact. Please use the **"I Have Leads Data"** option to import contacts and set up your outreach campaign.`,
                    ts: new Date(),
                }));
            }
            setBusy(false);
            return;
        }

        // ── INBOUND INTENT DETECTION (before API call) ──
        if (isInboundIntent(text)) {
            setInboundMode(true);
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai',
                text: `📋 **Great! Let\'s import your leads.**\n\nHere\'s how it works:\n1. **Download** the CSV template below\n2. **Fill in** your leads data (name, email, LinkedIn, phone, etc.)\n3. **Upload** the filled file back here\n\nI\'ll analyze your data and help you create a campaign! 🚀`,
                ts: new Date(), inboundAction: 'download',
            }));
            setBusy(false);
            return;
        }

        // ── INBOUND FOLLOW-UP: Context-aware responses when leads are already uploaded ──
        if (inboundMode && inboundLeads.length > 0) {
            const lower = text.toLowerCase();
            const isFollowUp = /\b(next step|what.*(next|do|now)|how to|help me|uploaded|create campaign|start campaign|launch|what can|guide|instructions|how does|proceed|continue)\b/i.test(lower);
            const isRefine = /\b(refine|filter|remove|edit|change|modify|update|replace)\b/i.test(lower);
            const isQuestion = /\b(how many|count|total|which|what.*leads|show me|list)\b/i.test(lower);

            if (isFollowUp) {
                const leadsCount = inboundLeads.length;
                const linkedinCount = inboundLeads.filter(l => l.linkedinProfile).length;
                const emailCount = inboundLeads.filter(l => l.email).length;
                setMessages(p => p.filter(m => m.id !== lid).concat({
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `🎯 **Great question! Here's your next steps:**\n\nYou have **${leadsCount} leads** uploaded and ready to go${linkedinCount > 0 ? ` (${linkedinCount} with LinkedIn profiles)` : ''}${emailCount > 0 ? ` (${emailCount} with emails)` : ''}.\n\n**To create your campaign:**\n1. Click **"Create Outreach Journey"** button above\n2. Select your **outreach actions** (Connect, Message, Follow-up)\n3. Set up your **message templates** (AI can generate them for you! ✨)\n4. Choose **campaign duration**\n5. **Name & launch** your campaign 🚀\n\n👉 Click the **"Create Outreach Journey"** button to get started!`,
                    ts: new Date(),
                    targeting: targeting || undefined,
                }));
                setBusy(false);
                return;
            }

            if (isRefine) {
                setMessages(p => p.filter(m => m.id !== lid).concat({
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `✏️ **Want to refine your leads?**\n\nHere's what you can do:\n• **Remove leads** — Click the 🗑️ icon next to any lead in the panel\n• **Upload new file** — Upload a different CSV to replace your current leads\n• **View leads** — Click on the leads panel to review all your uploaded contacts\n\nYou currently have **${inboundLeads.length}** leads loaded. Once you're happy with the list, click **"Create Outreach Journey"** to set up your campaign!`,
                    ts: new Date(),
                    targeting: targeting || undefined,
                }));
                setBusy(false);
                return;
            }

            if (isQuestion) {
                const counts = {
                    total: inboundLeads.length,
                    linkedin: inboundLeads.filter(l => l.linkedinProfile).length,
                    email: inboundLeads.filter(l => l.email).length,
                    whatsapp: inboundLeads.filter(l => l.whatsapp).length,
                    phone: inboundLeads.filter(l => l.phone).length,
                    website: inboundLeads.filter(l => l.website).length,
                };
                const summaryParts = [`📊 **Your uploaded leads summary:**\n\n• **Total Leads:** ${counts.total}`];
                if (counts.linkedin > 0) summaryParts.push(`• **LinkedIn Profiles:** ${counts.linkedin}`);
                if (counts.email > 0) summaryParts.push(`• **Email Addresses:** ${counts.email}`);
                if (counts.whatsapp > 0) summaryParts.push(`• **WhatsApp Numbers:** ${counts.whatsapp}`);
                if (counts.phone > 0) summaryParts.push(`• **Phone Numbers:** ${counts.phone}`);
                if (counts.website > 0) summaryParts.push(`• **Websites:** ${counts.website}`);
                summaryParts.push(`\n👉 Ready to create a campaign? Click **"Create Outreach Journey"**!`);
                setMessages(p => p.filter(m => m.id !== lid).concat({
                    id: `a-${Date.now()}`, role: 'ai',
                    text: summaryParts.join('\n'),
                    ts: new Date(),
                    targeting: targeting || undefined,
                }));
                setBusy(false);
                return;
            }
        }

        // ── ABM INTENT DETECTION ──
        // Intercept company research / insight queries and route to ABM pipeline.
        // Must run BEFORE web-search and lead-chat so it gets first priority.
        const ABM_INTENT_PATTERNS = [
            /(?:get\s+me\s+|give\s+me\s+|provide\s+|show\s+me\s+)?(?:detailed\s+)?insights?\s+(?:about|on|for|of)\s+(.+)/i,
            /(?:detailed\s+)?(?:company\s+)?(?:insights?|intelligence|analysis|profile|overview|details?|information|info)\s+(?:about|on|for|of|regarding)\s+(.+)/i,
            /research\s+(?:the\s+company\s+)?(?:called\s+)?(.+?)(?:\s*,|\s*$)/i,
            /(?:account[\s-]based|abm)\s+(?:research|insights?|intelligence|analysis)\s+(?:on|for|about)\s+(.+)/i,
            /(?:prospect|target)\s+company\s+(?:research|analysis|profile)\s+(?:for|on|about)?\s*(.+)/i,
        ];
        const isABMQuery = ABM_INTENT_PATTERNS.some(p => p.test(text));

        if (isABMQuery) {
            try {
                const abmRes = await fetch('/api/abm/research', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ query: text }),
                });
                const abmData = await abmRes.json();

                if (abmData.success && abmData.data) {
                    const c = abmData.data;
                    const actions: any[] = abmData.next_best_actions || [];

                    // Build structured chat response
                    const parts: string[] = [`# Detailed Insights: ${c.company_name}\n`];

                    if (c.company_overview) parts.push(`**Who They Are:**\n${c.company_overview}\n`);

                    const firmoParts: string[] = [];
                    if (c.industry) firmoParts.push(`**Industry:** ${c.industry}`);
                    if (c.headquarters) firmoParts.push(`**HQ:** ${c.headquarters}`);
                    if (c.founded_year) firmoParts.push(`**Founded:** ${c.founded_year}`);
                    if (c.company_size_range) firmoParts.push(`**Size:** ${c.company_size_range} employees`);
                    if (c.funding_stage) firmoParts.push(`**Funding:** ${c.funding_stage}`);
                    if (firmoParts.length) parts.push(`**Company Profile:**\n${firmoParts.join(' · ')}\n`);

                    const social = c.social || {};
                    const socialParts: string[] = [];
                    if (social.linkedin_url) socialParts.push(`[LinkedIn](${social.linkedin_url})${social.linkedin_followers ? ` (${(social.linkedin_followers / 1000).toFixed(1)}K followers)` : ''}`);
                    if (social.twitter_url) socialParts.push(`[Twitter/X](${social.twitter_url})${social.twitter_followers ? ` (${(social.twitter_followers / 1000).toFixed(1)}K followers)` : ''}`);
                    if (socialParts.length) parts.push(`**Social Presence:**\n${socialParts.join(' · ')}\n`);

                    const posts: any[] = c.linkedin_posts || [];
                    if (posts.length > 0) {
                        parts.push(`**Recent LinkedIn Activity (${posts.length} posts):**`);
                        posts.slice(0, 3).forEach((p: any) => {
                            const preview = (p.text || '').substring(0, 160).replace(/\n/g, ' ');
                            const eng = [p.likes ? `👍 ${p.likes}` : null, p.comments ? `💬 ${p.comments}` : null].filter(Boolean).join('  ');
                            parts.push(`• "${preview}${(p.text || '').length > 160 ? '...' : ''}"\n  ${eng}`);
                        });
                        parts.push('');
                    }

                    const activities: any[] = c.recent_activities || [];
                    if (activities.length > 0) {
                        parts.push(`**Recent News & Activities:**`);
                        activities.slice(0, 4).forEach((a: any) => parts.push(`• **${a.title}**${a.date ? ` _(${a.date})_` : ''}${a.source ? ` — ${a.source}` : ''}`));
                        parts.push('');
                    }

                    const dms: any[] = (c.key_decision_makers || []).sort((a: any, b: any) => (b.icp_score || 0) - (a.icp_score || 0));
                    if (dms.length > 0) {
                        parts.push(`**Key Decision Makers & ICP Scores:**`);
                        dms.slice(0, 6).forEach((dm: any) => {
                            const score = dm.icp_score >= 80 ? `🟢 ${dm.icp_score}/100` : dm.icp_score >= 60 ? `🟡 ${dm.icp_score}/100` : `🟠 ${dm.icp_score}/100`;
                            parts.push(`• **${dm.name || 'Unknown'}** — ${dm.title || 'N/A'}${dm.department ? ` · ${dm.department}` : ''} ${score}${dm.linkedin_url ? ` · [LinkedIn](${dm.linkedin_url})` : ''}`);
                            if (dm.icp_rationale) parts.push(`  _${dm.icp_rationale}_`);
                        });
                        parts.push('');
                    }

                    if (actions.length > 0) {
                        parts.push(`**🎯 Next Best Actions for Account-Based Sales Development:**`);
                        actions.forEach((a: any) => {
                            parts.push(`\n**${a.priority}. ${a.action}** [${a.channel || ''}]${a.target_person ? ` → _${a.target_person}_` : ''}`);
                            if (a.rationale) parts.push(`   ${a.rationale}`);
                            if (a.suggested_message_hook) parts.push(`   💬 _"${a.suggested_message_hook}"_`);
                        });
                        parts.push('');
                    }

                    parts.push(`---\n_Company profile saved to your ABM prospect list._`);
                    const responseText = parts.join('\n');

                    setMessages(p => p.filter(m => m.id !== lid).concat({
                        id: `a-${Date.now()}`, role: 'ai',
                        text: responseText,
                        ts: new Date(),
                        abmData: abmData.data,
                        nextBestActions: actions,
                    }));
                    setBusy(false);
                    return;
                }
            } catch (abmErr) {
                // ABM call failed — fall through to web-search / lead-chat
                console.warn('[ABM] Research failed, falling through:', abmErr);
            }
        }

        // ── WEB SEARCH INTENT DETECTION ──
        // Intercept queries asking about specific companies or people before routing to ICP lead-chat
        const isWebResearchQuery = webSearchEnabled ||
            /\b(get me|tell me|give me|show me|research|look up|look into|find out|details about|info (on|about)|information (on|about)|what (is|are|does)|who (is|are)|describe|explain|overview of|summary of|all about)\b.{1,60}\b(company|firm|startup|corp|ltd|inc|llc|group|brand|business|person|people|individual|lead)\b/i.test(text) ||
            /\b(details about|info about|about .{2,40} company|about .{2,40} startup|about .{2,40} corp)\b/i.test(text) ||
            /\b(get (me )?(all )?(the )?(details|info|information|data)|tell me (about|more about))\b.{1,80}(company|startup|firm|corp|brand|person)/i.test(text);

        if (isWebResearchQuery) {
            try {
                // Extract company/person name from query using a simple heuristic
                const queryForSearch = text
                    .replace(/^(get me all the details about|get me details about|tell me about|give me info on|give me information about|research|look up|find out about|details about|info about|all about)\s*/i, '')
                    .replace(/\s*(company|startup|corp|ltd|inc|llc|firm|business|brand|group)$/i, '')
                    .trim();

                const response = await fetch('/api/campaigns/linkedin/web-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ query: queryForSearch || text, type: 'auto' }),
                });
                const data = await response.json();

                if (data.success && data.result) {
                    const r = data.result;
                    let responseText = '';

                    if (data.type === 'company' || r.company_name) {
                        // Company result
                        const parts: string[] = [`🏢 **${r.company_name || queryForSearch}**`];
                        if (r.description) parts.push(`\n${r.description}`);
                        const details: string[] = [];
                        if (r.industry) details.push(`**Industry:** ${r.industry}`);
                        if (r.company_size) details.push(`**Size:** ${r.company_size} employees`);
                        if (r.founded_year) details.push(`**Founded:** ${r.founded_year}`);
                        if (r.headquarters) details.push(`**HQ:** ${r.headquarters}`);
                        if (r.website) details.push(`**Website:** ${r.website}`);
                        if (r.linkedin_url) details.push(`**LinkedIn:** ${r.linkedin_url}`);
                        if (details.length > 0) parts.push('\n' + details.join('  •  '));
                        if (r.key_products?.length > 0) parts.push(`\n**Products/Services:** ${r.key_products.join(', ')}`);
                        if (r.notable_facts?.length > 0) parts.push(`\n**Key Facts:** ${r.notable_facts.join(' • ')}`);
                        parts.push(`\n\n💡 Want me to find leads at **${r.company_name || queryForSearch}**? Just ask!`);
                        responseText = parts.join('\n');
                    } else if (data.type === 'person' || r.full_name) {
                        // Person result
                        const parts: string[] = [`👤 **${r.full_name || queryForSearch}**`];
                        if (r.bio) parts.push(`\n${r.bio}`);
                        const details: string[] = [];
                        if (r.job_title) details.push(`**Title:** ${r.job_title}`);
                        if (r.company) details.push(`**Company:** ${r.company}`);
                        if (r.industry) details.push(`**Industry:** ${r.industry}`);
                        if (r.location) details.push(`**Location:** ${r.location}`);
                        if (r.linkedin_url) details.push(`**LinkedIn:** ${r.linkedin_url}`);
                        if (details.length > 0) parts.push('\n' + details.join('  •  '));
                        parts.push(`\n\n💡 Want me to find similar leads? Just describe who you're targeting!`);
                        responseText = parts.join('\n');
                    } else if (r.summary) {
                        // General result
                        const parts: string[] = [`🔍 **Search Results**\n\n${r.summary}`];
                        if (r.companies?.length > 0) {
                            parts.push(`\n\n**Relevant Companies:**`);
                            r.companies.slice(0, 3).forEach((c: any) => {
                                parts.push(`• **${c.name}** (${c.industry || 'Unknown'})${c.website ? ` — ${c.website}` : ''}`);
                            });
                        }
                        if (r.insights?.length > 0) {
                            parts.push(`\n\n**Insights:**`);
                            r.insights.forEach((ins: string) => parts.push(`• ${ins}`));
                        }
                        if (r.suggested_searches?.length > 0) {
                            parts.push(`\n\n💡 Try also: ${r.suggested_searches.map((s: string) => `*"${s}"*`).join(' · ')}`);
                        }
                        responseText = parts.join('\n');
                    }

                    if (responseText) {
                        setMessages(p => p.filter(m => m.id !== lid).concat({
                            id: `a-${Date.now()}`, role: 'ai', text: responseText, ts: new Date(),
                            webSearchResult: true,
                            sources: (data.sources || []).filter((s: any) => s.url),
                        }));
                        setBusy(false);
                        return;
                    }
                }
            } catch (webSearchErr) {
                console.warn('[WebSearch] Failed, falling back to lead-chat:', webSearchErr);
                // Fall through to normal ICP flow if web search fails
            }
        }

        // ── LOCATION REQUEST ──
        // If we previously asked the user for a location (ABM with no location), handle their reply here.
        if (pendingLocationRequest) {
            const locationReply = text.trim();
            const isGlobal = /^global$/i.test(locationReply) || /^worldwide$/i.test(locationReply) || /^everywhere$/i.test(locationReply);
            // Merge the supplied location into the stored intent then proceed to confirmation
            const mergedIntent: LeadTargeting = {
                ...pendingLocationRequest.intent,
                locations: isGlobal ? [] : [locationReply],
            };
            const mergedConfirmation = { intent: mergedIntent, originalQuery: pendingLocationRequest.originalQuery };
            setPendingLocationRequest(null);
            // Show the confirmation preview with the now-resolved location
            const confirmMsg = buildConfirmationMessage(mergedIntent, pendingLocationRequest.originalQuery);
            setPendingSearchConfirmation(mergedConfirmation);
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai', text: confirmMsg, ts: new Date(),
                options: [
                    { label: '✅ Yes, search this', value: 'yes' },
                    { label: '✏️ Let me refine this', value: 'I want to change what I\'m looking for' },
                ],
            }));
            setBusy(false);
            return;
        }

        // ── SEARCH CONFIRMATION ──
        // If the user replied to a search preview (confirming or correcting it), capture that intent.
        let confirmedForSearch: { intent: LeadTargeting; originalQuery: string } | null = null;
        if (pendingSearchConfirmation) {
            if (isConfirmation(text)) {
                // User confirmed the parsed intent — carry it into the search execution below
                confirmedForSearch = pendingSearchConfirmation;
                setPendingSearchConfirmation(null);
            } else {
                // User is refining/correcting — clear the preview state and re-parse from scratch
                setPendingSearchConfirmation(null);
            }
        }

        try {
            // Build history array for context (last 6 messages)
            const historySnapshot = messages.slice(-6).map(m => ({ role: m.role, text: m.text }));

            // ── CASE 1: Detect Intent (Always call /lead-chat first, unless user just confirmed a preview) ──
            const isFirstMessage = messages.filter(m => m.role === 'user').length === 0;
            let shouldRunSearch = false;
            let aiResponseText = '';
            let aiOpts: { label: string; value: string }[] | undefined;
            // If user confirmed a search preview, start with the stored intent; otherwise use current targeting (or override from caller)
            let updatedTargetState = confirmedForSearch ? confirmedForSearch.intent : (opts?.targetingOverride || targeting);
            // Tracks whether lead-chat produced a targeting for THIS turn (a fresh
            // parse or a refine). When false at search time, the intent we hold is
            // carried-over state (e.g. a prior ICP) that must be re-parsed.
            let targetingFromChat = false;

            if (confirmedForSearch) {
                // User confirmed the search preview — skip lead-chat and go straight to search
                shouldRunSearch = true;
            } else {
                // Normal flow: call lead-chat for AI conversation
                try {
                    const chatD = await aiChat.sendLeadChatMessage({
                        message: text,
                        history: historySnapshot,
                        currentTargeting: opts?.targetingOverride || targeting,
                        pendingIntent: (pendingIntent as string | null),
                        conversationSummary,
                        icpProfile: businessProfile,
                    });
                    if (chatD) {
                        aiResponseText = chatD.response || '';
                        shouldRunSearch = !!chatD.newSearch;
                        if (chatD.updatedTargeting) { updatedTargetState = chatD.updatedTargeting; targetingFromChat = true; }
                        setPendingIntent(chatD.pendingIntent || null);
                        if (Array.isArray(chatD.options) && chatD.options.length > 0) {
                            aiOpts = chatD.options;
                        }
                        // Append summary bullet to the rolling conversation summary
                        if (chatD.summaryUpdate) {
                            setConversationSummary(prev => prev ? `${prev}\n${chatD.summaryUpdate}` : chatD.summaryUpdate);
                        }
                        // ── Generic prospect search: route to enriched discovery pipeline ──
                        if (chatD.newSearch && chatD.searchType === 'generic_prospect') {
                            // Show the AI's loading message immediately
                            setMessages(p => p.filter(m => m.id !== lid).concat({
                                id: `a-${Date.now()}`, role: 'ai', text: aiResponseText, ts: new Date(),
                            }));
                            setIsSearching(true);
                            setActivities([]);

                            const prospectQuery = chatD.originalQuery || text;
                            setLastProspectQuery(prospectQuery);
                            setLastSearchType('generic_prospect');
                            setSeenProspectIds([]);
                            setLeads([]);

                            try {
                                const resp = await fetch('/api/ai-icp-assistant/prospect-search', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        query: prospectQuery,
                                        icpProfile: businessProfile,
                                        sessionId: `gps-${Date.now()}`,
                                        seenIds: [],
                                        batchSize: leadCount,
                                    }),
                                });
                                const d = await resp.json();
                                setIsSearching(false);
                                if (d.success && Array.isArray(d.results) && d.results.length > 0) {
                                    const prospectLeads: LeadProfile[] = d.results.map((item: any, idx: number) => ({
                                        id: item.id || `gps-${idx}`,
                                        name: item.name || 'Unknown',
                                        first_name: item.first_name || '',
                                        last_name: item.last_name || '',
                                        headline: item.headline || item.decision_maker_title || '',
                                        location: item.location || '',
                                        current_company: item.current_company || '',
                                        profile_url: item.profile_url || '',
                                        profile_picture: item.profile_picture || '',
                                        industry: item.industry || item.company_type || '',
                                        network_distance: '',
                                        locked: idx >= 5,
                                        phone: item.phone || item.company_phone || '',
                                        email: item.email || '',
                                        icp_score: item.icp_score != null ? item.icp_score : undefined,
                                        match_level: item.match_level || undefined,
                                        icp_reasoning: item.icp_reasoning || undefined,
                                        enriched_profile: item.enriched_profile || undefined,
                                    }));
                                    setLeads(prospectLeads);
                                    seedDefaultSelection(prospectLeads);
                                    setShowPanel('leads');
                                    // Track seen IDs for "get more" dedup
                                    setSeenProspectIds(prospectLeads.map(l => l.profile_url || l.id));
                                    setNoMoreLeads(!d.hasMore);
                                    setTotalResults(d.total || prospectLeads.length);
                                    setMessages(p => p.concat({
                                        id: `a-sr-${Date.now()}`, role: 'ai',
                                        text: `✅ **Found ${prospectLeads.length} prospect${prospectLeads.length !== 1 ? 's' : ''}** for your query!\n\n${prospectLeads.filter(l => l.icp_score && l.icp_score >= 70).length > 0 ? `🎯 **${prospectLeads.filter(l => l.icp_score && l.icp_score >= 70).length} strong ICP matches** identified.\n\n` : ''}Results include contact details, LinkedIn profiles, and ICP scores.\n\n💡 Click **"Get More Leads"** to find additional prospects.`,
                                        ts: new Date(),
                                    }));
                                } else {
                                    setMessages(p => p.concat({
                                        id: `a-err-${Date.now()}`, role: 'ai',
                                        text: `⚠️ I couldn't find specific prospects for that query. Try rephrasing — for example: *"General Managers at 5-star hotels in Dubai"* or *"CEOs of construction companies in Saudi Arabia"*.`,
                                        ts: new Date(),
                                    }));
                                }
                            } catch (prospectErr) {
                                setIsSearching(false);
                                console.error('[ProspectSearch] error', prospectErr);
                                setMessages(p => p.concat({
                                    id: `a-err-${Date.now()}`, role: 'ai',
                                    text: `⚠️ Prospect search failed. Please try again or rephrase your query.`,
                                    ts: new Date(),
                                }));
                            }
                            setBusy(false);
                            return;
                        }
                    }
                } catch (e) { console.warn('[Lead Chat] lead-chat error', e); }

                // If it's the first message and lead-chat didn't respond or failed, fallback to searching
                if (isFirstMessage && !aiResponseText && !shouldRunSearch) {
                    shouldRunSearch = true;
                }

                // Smart search detection: if the user explicitly asks to find/search someone or something
                // AND the query contains a specific entity (company, person name, location — not just vague intent)
                // BUT NOT if the message is a meta-instruction about how to search
                // e.g. "search for only 1 industry at a time" is a preference, not a search query
                if (!shouldRunSearch && !isFirstMessage) {
                    const lowerText = text.toLowerCase();
                    const hasSearchIntent = /\b(find|search|look for|get me|show me|locate|who is|who are|people at|employees at|team at|leads? (in|at|from|for))\b/i.test(lowerText);
                    // Check if there's a specific entity (not just generic words like 'a specific company')
                    const hasVagueTarget = /\b(a specific|any|some|certain)\b/i.test(lowerText);
                    // Detect meta-instructions: user is giving a preference about HOW to search, not WHAT to search for
                    // e.g. "search for only 1 industry at a time", "only show 5 results", "limit to Financial Services"
                    const isMetaInstruction = /\b(only \d+|\d+ at a time|at a time|per (search|query|request)|from now on|limit (to|the)|max(imum)? \d+|no more than|don'?t (include|show|use)|please (don'?t|only|just)|how (do|should|can)|just (show|use|one|1)|one (industry|title|location|at))\b/i.test(lowerText)
                        || /\b(refine|change|switch|update|modify|only|just|can you)\b.*(search|looking|criteria|results|industry|industries|title|location)/i.test(lowerText);
                    // Must have search intent AND NOT be vague AND NOT be a meta-instruction to force search
                    if (hasSearchIntent && !hasVagueTarget && !isMetaInstruction) {
                        shouldRunSearch = true;
                        // Clear old targeting so Gemini parses this fresh query from scratch
                        // e.g. previous search was "founders at X", now user says "find all people at X"
                        updatedTargetState = null;
                        // Clear the AI response so we show search results, not the chat response
                        aiResponseText = '';
                    }
                }

                // ── FRONTEND GENERIC PROSPECT SEARCH SAFETY NET ──────────────────
                // If the backend didn't return searchType:'generic_prospect' but the query
                // clearly describes a company TYPE + attribute/location, intercept here and
                // route directly to the enriched prospect discovery pipeline.
                // This catches cases where the backend classified the intent as CONTEXT_SEARCH
                // or extracted LinkedIn keywords instead of detecting the generic pattern.
                if (shouldRunSearch && isGenericCompanySearchQuery(text)) {
                    setMessages(p => p.filter(m => m.id !== lid).concat({
                        id: `a-${Date.now()}`, role: 'ai',
                        text: `🔍 **Finding specific companies and decision makers for you...**\n\nI'm using AI to identify real companies matching your description and their key contacts. This may take a moment as I research each prospect.\n\n⚡ *Searching across the web, LinkedIn, and company databases...*`,
                        ts: new Date(),
                    }));
                    setIsSearching(true);
                    setActivities([]);
                    setLastProspectQuery(text);
                    setLastSearchType('generic_prospect');
                    setSeenProspectIds([]);
                    setLeads([]);

                    try {
                        const resp = await fetch('/api/ai-icp-assistant/prospect-search', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                query: text,
                                icpProfile: businessProfile,
                                sessionId: `gps-${Date.now()}`,
                                seenIds: [],
                                batchSize: leadCount,
                            }),
                        });
                        const d = await resp.json();
                        setIsSearching(false);
                        if (d.success && Array.isArray(d.results) && d.results.length > 0) {
                            const prospectLeads: LeadProfile[] = d.results.map((item: any, idx: number) => ({
                                id: item.id || `gps-${idx}`,
                                name: item.name || 'Unknown',
                                first_name: item.first_name || '',
                                last_name: item.last_name || '',
                                headline: item.headline || '',
                                location: item.location || '',
                                current_company: item.current_company || '',
                                profile_url: item.profile_url || '',
                                profile_picture: item.profile_picture || '',
                                industry: item.industry || item.company_type || '',
                                network_distance: '',
                                locked: idx >= 5,
                                phone: item.phone || item.company_phone || '',
                                email: item.email || '',
                                icp_score: item.icp_score != null ? item.icp_score : undefined,
                                match_level: item.match_level || undefined,
                                icp_reasoning: item.icp_reasoning || undefined,
                                enriched_profile: item.enriched_profile || undefined,
                            }));
                            setLeads(prospectLeads);
                            seedDefaultSelection(prospectLeads);
                            setShowPanel('leads');
                            setSeenProspectIds(prospectLeads.map(l => l.profile_url || l.id));
                            setNoMoreLeads(!d.hasMore);
                            setTotalResults(d.total || prospectLeads.length);
                            const strongMatches = prospectLeads.filter(l => l.icp_score && l.icp_score >= 70).length;
                            setMessages(p => p.concat({
                                id: `a-sr-${Date.now()}`, role: 'ai',
                                text: `✅ **Found ${prospectLeads.length} prospect${prospectLeads.length !== 1 ? 's' : ''}** for your query!\n\n${strongMatches > 0 ? `🎯 **${strongMatches} strong ICP match${strongMatches !== 1 ? 'es' : ''}** identified.\n\n` : ''}Results include company contact details, LinkedIn profiles, and ICP scores.\n\n💡 Click **"Get More Leads"** to discover additional prospects.`,
                                ts: new Date(),
                            }));
                        } else {
                            setMessages(p => p.concat({
                                id: `a-err-${Date.now()}`, role: 'ai',
                                text: `⚠️ I couldn't find specific prospects for that query. Try rephrasing — e.g. *"GMs at 5-star hotels in Dubai"* or *"owners of gyms in Abu Dhabi"*.`,
                                ts: new Date(),
                            }));
                        }
                    } catch (prospectErr) {
                        setIsSearching(false);
                        console.error('[ProspectSearch] error', prospectErr);
                        setMessages(p => p.concat({
                            id: `a-err-${Date.now()}`, role: 'ai',
                            text: `⚠️ Prospect search failed. Please try again.`,
                            ts: new Date(),
                        }));
                    }
                    setBusy(false);
                    return;
                }

                if (!shouldRunSearch && aiResponseText) {
                    // Just show the AI answer — no search needed
                    setMessages(p => p.filter(m => m.id !== lid).concat({
                        id: `a-${Date.now()}`, role: 'ai', text: aiResponseText, ts: new Date(), options: aiOpts,
                    }));
                    setBusy(false);
                    return;
                }

                // ── CONFIRMATION GATE ──
                // Before running the search, show the parsed intent back to the user for confirmation.
                if (shouldRunSearch) {
                    // Use the intent already parsed by lead-chat; if none, call extract-intent for a quick parse
                    let previewIntent: LeadTargeting | null = updatedTargetState;
                    const hasUsableIntent = (previewIntent?.job_titles?.length ?? 0) > 0
                        || (previewIntent?.locations?.length ?? 0) > 0
                        || (previewIntent?.keywords?.length ?? 0) > 0
                        || (previewIntent?.company_names?.length ?? 0) > 0
                        || (previewIntent?.industries?.length ?? 0) > 0;

                    // Extra metadata from extract-intent (abm_type, llm_entities)
                    let extractedAbmType: string | null = null;
                    let extractedPersonName: string | null = null;
                    let extractedCompanyName: string | null = null;

                    // Re-parse THIS message's text unless the carried intent was freshly
                    // produced by lead-chat for this turn (a refine on a continuing
                    // conversation). Without this, a stale ICP/targeting left by a prior
                    // action (ICP Discovery, or the saved business-profile ICP) silently
                    // hijacks a newly-typed query — the user types "Sales Manager in Real
                    // Estate in Dubai" but the search runs their saved ICP instead.
                    const carriedIntentIsFresh = targetingFromChat && !isFirstMessage;
                    if (!hasUsableIntent || !carriedIntentIsFresh) {
                        try {
                            const intentD = await linkedInSearch.extractIntent(text);
                            const freshIntent = intentD?.intent ? {
                                job_titles: toArr(intentD.intent.job_titles),
                                industries: toArr(intentD.intent.industries),
                                locations: toArr(intentD.intent.locations),
                                keywords: toArr(intentD.intent.keywords),
                                profile_language: toArr(intentD.intent.profile_language),
                                company_names: toArr(intentD.intent.company_names),
                                seniority: toArr(intentD.intent.seniority),
                                functions: toArr(intentD.intent.functions),
                            } : null;
                            const freshHasData = !!freshIntent && (
                                (freshIntent.job_titles?.length ?? 0) > 0
                                || (freshIntent.locations?.length ?? 0) > 0
                                || (freshIntent.keywords?.length ?? 0) > 0
                                || (freshIntent.company_names?.length ?? 0) > 0
                                || (freshIntent.industries?.length ?? 0) > 0
                            );
                            // Prefer the fresh parse of this query when it found targeting.
                            // A bare refine word ("go", "yes") parses to nothing and must
                            // NOT wipe a legitimately carried intent — only override then.
                            if (freshHasData || !hasUsableIntent) previewIntent = freshIntent;
                            // Capture ABM metadata
                            if (intentD?.abm_type) extractedAbmType = intentD.abm_type;
                            if (intentD?.llm_entities?.person_name) extractedPersonName = intentD.llm_entities.person_name;
                            if (intentD?.llm_entities?.company_name) extractedCompanyName = intentD.llm_entities.company_name;
                        } catch (e) { console.warn('[Search] extract-intent for preview failed', e); }
                    }

                    const hasPreviewData = (previewIntent?.job_titles?.length ?? 0) > 0
                        || (previewIntent?.locations?.length ?? 0) > 0
                        || (previewIntent?.keywords?.length ?? 0) > 0
                        || (previewIntent?.company_names?.length ?? 0) > 0
                        || (previewIntent?.industries?.length ?? 0) > 0;

                    // ── ABM location gate: if ABM query has no location, ask before searching ──
                    // This prevents hallucinating a location or running a global search silently.
                    const isAbmQuery = !!extractedAbmType && (extractedAbmType === 'person_at_company' || extractedAbmType === 'person_search' || extractedAbmType === 'company_search');
                    const hasLocation = (previewIntent?.locations?.length ?? 0) > 0;
                    if (isAbmQuery && !hasLocation && previewIntent && hasPreviewData) {
                        // Build a friendly location prompt mentioning what we detected
                        const whoLabel = extractedPersonName && extractedCompanyName
                            ? `**${extractedPersonName}** at **${extractedCompanyName}**`
                            : extractedPersonName
                                ? `**${extractedPersonName}**`
                                : extractedCompanyName
                                    ? `**${extractedCompanyName}**`
                                    : 'this person/company';
                        const locationPromptMsg = `📍 I found ${whoLabel}. Which location should I search in?\n\n*(e.g., Dubai, London, New York — or type **global** to search worldwide)*`;
                        setPendingLocationRequest({
                            intent: previewIntent,
                            originalQuery: text,
                            abmType: extractedAbmType,
                            personName: extractedPersonName ?? undefined,
                            companyName: extractedCompanyName ?? undefined,
                        });
                        setMessages(p => p.filter(m => m.id !== lid).concat({
                            id: `a-${Date.now()}`, role: 'ai', text: locationPromptMsg, ts: new Date(),
                            options: [
                                { label: '🌍 Global (worldwide)', value: 'global' },
                                { label: '🇦🇪 Dubai / UAE', value: 'Dubai, UAE' },
                                { label: '🇬🇧 London / UK', value: 'London, UK' },
                                { label: '🇺🇸 United States', value: 'United States' },
                            ],
                        }));
                        setBusy(false);
                        return;
                    }

                    if (previewIntent && hasPreviewData) {
                        // Show the confirmation preview and pause — the search runs only after the user confirms
                        const confirmMsg = buildConfirmationMessage(previewIntent, text);
                        setPendingSearchConfirmation({ intent: previewIntent, originalQuery: text });
                        setMessages(p => p.filter(m => m.id !== lid).concat({
                            id: `a-${Date.now()}`, role: 'ai', text: confirmMsg, ts: new Date(),
                            options: [
                                { label: '✅ Yes, search this', value: 'yes' },
                                { label: '✏️ Let me refine this', value: 'I want to change what I\'m looking for' },
                            ],
                        }));
                        setBusy(false);
                        return;
                    }
                    // If intent could not be determined, fall through and run the search immediately
                }
            }

            // ── SPECIFIC-PERSON GATE ──────────────────────────────────────────
            // A confirmed query that identifies one named person at a company must
            // not go through broad search + ICP scoring (it can only return
            // strangers who happen to share the first name). Route it through the
            // same import/save + waterfall pipeline as file-imported leads: the
            // backend resolves the exact person, the panel shows them checked, and
            // campaign creation attaches them as an inbound lead (lead generation
            // is skipped entirely at run time).
            if (shouldRunSearch) {
                const personIntent = confirmedForSearch ? confirmedForSearch.intent : updatedTargetState;
                const person = detectSpecificPersonQuery(personIntent);
                if (person) {
                    const personLoadingId = `${lid}-person`;
                    setMessages(p => p.filter(m => m.id !== lid).concat(
                        {
                            id: `a-${Date.now()}`, role: 'ai', ts: new Date(),
                            text: `🎯 Got it — **${person.name}**${person.company ? ` at **${person.company}**` : ''} is a specific person, so I'll skip the broad search and find their LinkedIn profile directly.`,
                        },
                        { id: personLoadingId, role: 'ai', text: '', ts: new Date(), loading: true },
                    ));
                    const [pFirst, ...pRest] = person.name.split(/\s+/);
                    const personRow: ParsedInboundLead = {
                        firstName: pFirst || person.name,
                        lastName: pRest.join(' '),
                        companyName: person.company,
                        linkedinProfile: '', email: '', whatsapp: '', phone: '', website: '', notes: '',
                        title: person.title,
                        location: person.location,
                        profilePicture: '',
                    };
                    setInboundLeads([personRow]);
                    setInboundMode(true);
                    setLeads([{
                        id: 'inbound-0',
                        name: person.name,
                        first_name: personRow.firstName,
                        last_name: personRow.lastName,
                        headline: person.title ? `${person.title}${person.company ? ' at ' + person.company : ''}` : (person.company ? `at ${person.company}` : ''),
                        location: person.location,
                        current_company: person.company,
                        profile_url: '',
                        profile_picture: '',
                        industry: '',
                        network_distance: '',
                        locked: false,
                    }]);
                    await finishInboundImport([personRow], person.location, personLoadingId);
                    return;
                }
            }

            // ── CASE 2: Run LinkedIn search ──
            let ext: LeadTargeting | null = updatedTargetState;
            let realLeads: LeadProfile[] = [];
            let rawSearchResults: any[] = [];
            let searchTotal = 0;
            let icpWasApplied = false;
            // Count of matches the backend found but hid because they were already
            // contacted in a prior campaign. Used to explain an otherwise-confusing
            // "0 results" empty state (search worked; the leads were just filtered).
            let excludedAlreadyContacted = 0;
            // True when 0 results is a transient provider rate-limit (HTTP 429),
            // not an empty match set — surfaced so we tell the user to retry.
            let searchRateLimited = false;

            // Determine effective search query for confirmed searches.
            // When user confirms a preview with "yes", "ok", etc., always use the pre-extracted intent
            // directly to avoid re-parsing, which can introduce inconsistencies (Gemini may extract
            // different fields on repeat calls). The original intent was already extracted correctly
            // during the first lead-chat call, so re-using it preserves user intent.
            let searchQuery: string;
            if (confirmedForSearch && confirmedForSearch.intent) {
                // User confirmed the preview — structured targeting is passed separately to the
                // backend (fast path). The query field is used only for module classification and
                // as a short queryHint. Use the original user text so:
                //   (a) the QueryClassifier sees natural language ("muffadal in raj digital in dubai")
                //       and correctly detects ABM / person_at_company patterns
                //   (b) the classic LinkedIn API doesn't receive a 200-char blob of all titles/industries
                ext = confirmedForSearch.intent;
                searchQuery = confirmedForSearch.originalQuery || text;
            } else {
                // For non-confirmed (lead-chat triggered) searches, build a compact query
                // from only core keywords + locations (not job titles or industries which are
                // passed as structured targeting and would bloat the query string).
                if (shouldRunSearch && ext && !isFirstMessage) {
                    const kwArr = Array.isArray(ext.keywords)
                        ? ext.keywords
                        : (ext.keywords ? [ext.keywords] : []);
                    searchQuery = [
                        ...kwArr,
                        ...(ext.company_names || []),
                        ...(ext.locations?.slice(0, 1) || []),   // first location only
                    ].filter(Boolean).join(' ') || text;
                } else {
                    searchQuery = text;
                }
            }

            let searchErrorMessage: string | null = null;

            try {
                // Enhance ICP description with user feedback on previous leads
                // Use the effective searchQuery (never "yes") as the ICP base description
                const icpBase = confirmedForSearch ? searchQuery : text;
                const bizCtx = getBusinessContext();
                // Business context only describes what the seller offers — it does NOT redefine
                // who to target. The search query is the sole source of ICP target criteria.
                let icpDesc = bizCtx
                    ? `## Search Target (WHO to find):\n${icpBase}\n\n## Seller Context (WHAT they sell — use only to assess relevance, not to redefine the target):\n${bizCtx}`
                    : icpBase;
                const goodLeads = leads.filter(l => leadFeedback[l.id] === 'good');
                const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
                if (goodLeads.length > 0 || badLeads.length > 0) {
                    const parts = [icpBase];
                    if (goodLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as GOOD matches (find more like these):\n${goodLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`).join('\n')}`);
                    }
                    if (badLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as BAD matches (avoid similar profiles):\n${badLeads.map(l => { const c = leadFeedbackComments[l.id]; return `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${c ? ` — Reason: "${c}"` : ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`; }).join('\n')}`);
                    }
                    icpDesc = parts.join('');
                }

                setIsSearching(true);
                setActivities([]);

                // Use targetingOverride (from Targeting card confirm) when available,
                // because setTargeting() is async and the React state may not yet reflect
                // the new nationality / filters when the search fires immediately after confirm.
                const effectiveTargeting = opts?.targetingOverride || targeting;
                // ── Option A: route fresh searches through the 6-module unified endpoint ──
                // searchUnified() calls /search/unified, which classifies the query and
                // routes it to the correct module (ABM / Signal / Competitor / Advanced).
                // The response is normalised to the same shape as /search/advanced so the
                // result-handling code below is unchanged.
                //
                // Fallback: pagination ("Get More") still calls linkedInSearch.search()
                // → /search/advanced because /search/unified does not support cursor paging.
                //
                // To revert to Option B (old route for all calls), change `searchUnified`
                // back to `search` on this line and remove the searchUnified hook method.
                const d = await linkedInSearch.searchUnified({
                    query: searchQuery,
                    count: leadCount,
                    targeting: ext || undefined,
                    targeting_filters: effectiveTargeting && (
                        effectiveTargeting.decision_maker_nationality?.length ||
                        effectiveTargeting.decision_maker_experience_level?.length ||
                        effectiveTargeting.decision_maker_skills?.length ||
                        effectiveTargeting.decision_maker_education?.length ||
                        effectiveTargeting.company_size?.length ||
                        effectiveTargeting.posted_recently
                    ) ? {
                        nationality: effectiveTargeting.decision_maker_nationality,
                        experience_level: effectiveTargeting.decision_maker_experience_level,
                        skills: effectiveTargeting.decision_maker_skills,
                        education: effectiveTargeting.decision_maker_education,
                        company_size: effectiveTargeting.company_size,
                        // Only send posted_recently when explicitly set by user
                        posted_recently: effectiveTargeting.posted_recently === true ? true : undefined,
                    } : undefined,
                    icp_description: icpDesc,
                    search_enrichment: buildSearchEnrichment(),
                    useSalesNav,
                    // Return the full ICP range (0–100) so the user can pick prospects
                    // via checkboxes rather than being capped at the backend's default 50.
                    icp_min_score: 0,
                    // Don't block the response on ICP scoring — leads render as soon as
                    // LinkedIn answers, and scoreIcp() fills the scores in afterwards.
                    defer_icp: true,
                });

                // Extract and set activities from response
                if (d?.activities && Array.isArray(d.activities)) {
                    setActivities(d.activities);
                }

                setIsSearching(false);

                if (d) {
                    if (d.intent) {
                        const newExt: LeadTargeting = {
                            job_titles: toArr(d.intent.job_titles), industries: toArr(d.intent.industries),
                            locations: toArr(d.intent.locations), keywords: toArr(d.intent.keywords),
                            profile_language: toArr(d.intent.profile_language),
                            company_names: toArr(d.intent.company_names),
                            // Carry nationality_filter so subsequent paginated searches pass it through
                            nationality_filter: toArr(d.intent.nationality_filter),
                        };
                        const hasData = newExt.job_titles.length > 0 || newExt.industries.length > 0 || newExt.locations.length > 0 || (newExt.keywords && newExt.keywords.length > 0) || (newExt.company_names && newExt.company_names.length > 0);
                        if (hasData) {
                            ext = newExt;
                            setTargeting(ext);
                            updatedTargetState = ext;
                        }
                    }
                    // Store search context for pagination + localStorage
                    setLastSearchQuery(searchQuery);
                    setLastIcpDescription(icpBase);
                    setLastTargeting(ext);
                    setLastSearchType('linkedin'); // mark as LinkedIn search for loadMore routing
                    addSearchSession(searchQuery, ext, icpBase);
                    setSearchPage(1);
                    setTotalResults(d.total || 0);
                    const nextCursor = d.cursor || null;
                    setSearchCursor(nextCursor);
                    setCursorHistory([null, nextCursor]); // page1=null(start), page2=nextCursor
                    icpWasApplied = !!d.icp_applied;
                    excludedAlreadyContacted = Number(d.excluded_already_contacted) || 0;
                    searchRateLimited = !!d.rate_limited;
                    if (Array.isArray(d.results) && d.results.length > 0) {
                        rawSearchResults = d.results;
                        realLeads = d.results.map((item: any, idx: number) => {
                            const profileUrl = resolveProfileUrl(item);
                            return {
                                id: item.id || item.provider_id || `lead-${idx}`,
                                name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.phone || item.email || (profileUrl ? 'LinkedIn User' : 'Contact'),
                                first_name: item.first_name || '',
                                last_name: item.last_name || '',
                                headline: item.headline || '',
                                location: item.location || '',
                                current_company: item.current_company || '',
                                profile_url: profileUrl,
                                profile_picture: item.profile_picture || '',
                                industry: item.industry || '',
                                network_distance: item.network_distance || '',
                                locked: idx >= 5,
                                icp_score: item.icp_score != null ? item.icp_score : undefined,
                                match_level: item.match_level || undefined,
                                icp_reasoning: item.icp_reasoning || undefined,
                                enriched_profile: item.enriched_profile || undefined,
                                inferred: item.inferred || undefined,
                            };
                        });
                        setLeads(realLeads);
                        // Fresh result set — the user hasn't picked anything in it yet.
                        selectionTouchedRef.current = false;
                        seedDefaultSelection(realLeads);
                        searchTotal = d.total || realLeads.length;
                        setLastModuleUsed(d.module_used || 'advanced_search');

                        // ── Deferred ICP scoring ──────────────────────────────────────────
                        // The search returned before Gemini scored anything (defer_icp), so
                        // the leads above are already on screen. Score them in the background
                        // and merge by id — never rebuild or reorder the list, because the
                        // user may already be ticking checkboxes while this runs.
                        if (d.icp_pending && realLeads.length > 0 && icpDesc) {
                            setIcpScoringPending(true);
                            (async () => {
                                try {
                                    const scoreResult = await linkedInSearch.scoreIcp(
                                        realLeads,
                                        icpDesc,
                                        effectiveTargeting ? {
                                            nationality:      effectiveTargeting.decision_maker_nationality,
                                            experience_level: effectiveTargeting.decision_maker_experience_level,
                                            skills:           effectiveTargeting.decision_maker_skills,
                                            education:        effectiveTargeting.decision_maker_education,
                                            company_size:     effectiveTargeting.company_size,
                                        } : null
                                    );
                                    if (scoreResult?.success && Array.isArray(scoreResult.results)) {
                                        const scoreMap: Record<string, any> = {};
                                        for (const r of scoreResult.results) {
                                            if (r.id) scoreMap[r.id] = r;
                                        }
                                        setLeads(prev => prev.map(l => {
                                            const s = scoreMap[l.id];
                                            if (!s || s.icp_score == null) return l;
                                            return {
                                                ...l,
                                                icp_score:        s.icp_score,
                                                match_level:      s.match_level || l.match_level,
                                                icp_reasoning:    s.icp_reasoning || l.icp_reasoning,
                                                enriched_profile: s.enriched_profile || l.enriched_profile,
                                            };
                                        }));
                                        // Now that real scores exist, apply the default
                                        // ≥50 pre-check the user would have seen up front
                                        // had scoring been synchronous — unless they've
                                        // already started picking, in which case leave it.
                                        seedDefaultSelection(
                                            realLeads.map(l => ({ ...l, icp_score: scoreMap[l.id]?.icp_score ?? l.icp_score })),
                                            true
                                        );
                                    }
                                } catch (scoreErr) {
                                    console.warn('[ICP] Deferred scoring failed', scoreErr);
                                } finally {
                                    setIcpScoringPending(false);
                                }
                            })();
                        } else {
                            setIcpScoringPending(false);
                        }

                        // ── Nationality annotation + secondary filter ─────────────────────
                        // The backend already filters by nationality via LLM name inference.
                        // This frontend pass: (1) annotates leads with inferred_nationality for
                        // the UI badge display, (2) acts as a secondary safety net to catch any
                        // profiles the backend may have missed.
                        const nationalityFilters = effectiveTargeting?.decision_maker_nationality || (ext || targeting)?.decision_maker_nationality;
                        if (nationalityFilters && nationalityFilters.length > 0 && realLeads.length > 0) {
                            // Fire async — annotate after leads are shown (backend already filtered)
                            (async () => {
                                try {
                                    const leadsForInference = realLeads.map(l => ({ id: l.id, name: l.name }));
                                    const inferResult = await linkedInSearch.inferNationality(leadsForInference);
                                    if (inferResult?.success && Array.isArray(inferResult.results)) {
                                        const natMap: Record<string, { nationality: string; confidence: number }> = {};
                                        for (const r of inferResult.results) {
                                            if (r.id) natMap[r.id] = { nationality: r.nationality || '', confidence: r.confidence || 0 };
                                        }
                                        const normalise = (s: string) => s.toLowerCase().trim();
                                        const targetNats = nationalityFilters.map(normalise);
                                        const isMatch = (nat?: string) =>
                                            // Keep if: (a) inferred nationality matches, OR
                                            //           (b) nationality is unknown/ambiguous (trust backend filter)
                                            !nat || targetNats.some(t =>
                                                normalise(nat).includes(t) || t.includes(normalise(nat))
                                            );

                                        const annotate = (l: LeadProfile) => ({
                                            ...l,
                                            inferred_nationality: natMap[l.id]?.nationality || undefined,
                                            nationality_confidence: natMap[l.id]?.confidence || undefined,
                                        });

                                        // Annotate off the CURRENT list rather than rebuilding
                                        // from the `realLeads` snapshot — deferred ICP scoring
                                        // writes to this same state, and a snapshot rebuild
                                        // would discard whichever of the two landed first.
                                        setLeads(prev => prev
                                            .filter(l => isMatch(natMap[l.id]?.nationality))
                                            .map(annotate));

                                        // Confirmed non-matches move to the "filtered out"
                                        // bucket, which ICP scoring never touches — so taking
                                        // them from the snapshot is safe.
                                        const nonMatching = realLeads
                                            .filter(l => !isMatch(natMap[l.id]?.nationality))
                                            .map(annotate);
                                        if (nonMatching.length > 0) {
                                            setFilteredLeads(prev => [...nonMatching, ...prev]);
                                        }
                                    }
                                } catch (inferErr) {
                                    console.warn('[Nationality] Annotation failed', inferErr);
                                }
                            })();
                        }
                        // ── End nationality annotation ─────────────────────────────────────
                    }
                    // Capture below-threshold leads returned from ICP filtering
                    if (Array.isArray(d.filtered_leads) && d.filtered_leads.length > 0) {
                        const fl = d.filtered_leads.map((item: any, idx: number) => {
                            const profileUrl = resolveProfileUrl(item);
                            return {
                                id: item.id || item.provider_id || `fl-${idx}`,
                                name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || (profileUrl ? 'LinkedIn User' : 'Contact'),
                                first_name: item.first_name || '',
                                last_name: item.last_name || '',
                                headline: item.headline || '',
                                location: item.location || '',
                                current_company: item.current_company || '',
                                profile_url: profileUrl,
                                profile_picture: item.profile_picture || '',
                                industry: item.industry || '',
                                network_distance: item.network_distance || '',
                                locked: false,
                                icp_score: item.icp_score != null ? item.icp_score : undefined,
                                match_level: item.match_level || undefined,
                                icp_reasoning: item.icp_reasoning || undefined,
                                enriched_profile: item.enriched_profile || undefined,
                            };
                        });
                        setFilteredLeads(fl);
                        // Auto-expand when all results were filtered (no qualified leads found)
                        setShowFilteredLeads(realLeads.length === 0);
                    } else {
                        setFilteredLeads([]);
                        setShowFilteredLeads(false);
                    }
                }
            } catch (e) {
                const errMsg = e instanceof Error ? e.message : String(e);
                console.warn('[Search] advanced search err', e);
                // Store the error message to show to the user instead of silent fail
                if (errMsg.includes('No LinkedIn account') || errMsg.includes('not connected')) {
                    searchErrorMessage = `❌ **LinkedIn Account Required**\n\nTo search for leads, please connect your LinkedIn account first:\n\n1. Go to **Settings**\n2. Click **Connect LinkedIn**\n3. Complete the verification\n4. Then try your search again!`;
                } else {
                    searchErrorMessage = `⚠️ **Search Error**\n\n${errMsg}\n\nPlease try again or check your LinkedIn connection in Settings.`;
                }
            }

            // Fallback: If advanced search didn't extract targeting, try extract-intent
            if (!ext && isFirstMessage) {
                try {
                    const d = await linkedInSearch.extractIntent(text);
                    if (d?.intent) {
                        ext = {
                            job_titles: toArr(d.intent.job_titles), industries: toArr(d.intent.industries),
                            locations: toArr(d.intent.locations), keywords: toArr(d.intent.keywords),
                            profile_language: toArr(d.intent.profile_language),
                        };
                        const hasData = ext.job_titles.length > 0 || ext.industries.length > 0 || ext.locations.length > 0;
                        if (!hasData) ext = null;
                        else setTargeting(ext);
                    }
                } catch (e) { console.warn('[Search] extract-intent err', e); }
            }

            // ── Build final AI response text ──
            let finalText = aiResponseText; // May be set by lead-chat above

            if (!finalText) {
                // If search failed, show the error
                if (searchErrorMessage) {
                    finalText = searchErrorMessage;
                } else if (ext && (ext.job_titles.length || ext.industries.length || ext.locations.length || (ext.keywords && ext.keywords.length > 0) || (ext.company_names && ext.company_names.length > 0))) {
                    // First message: build summary
                    finalText = buildSummary(ext);
                    if (realLeads.length > 0) {
                        finalText += `\n\n🔍 **Found ${searchTotal} real leads** on LinkedIn via Sales Navigator.`;
                        if (icpWasApplied) {
                            const strongCount = realLeads.filter(l => l.match_level === 'strong').length;
                            const moderateCount = realLeads.filter(l => l.match_level === 'moderate').length;
                            finalText += `\n\n🎯 **ICP Qualification:** ${strongCount} strong match${strongCount !== 1 ? 'es' : ''}, ${moderateCount} moderate — sorted by relevance.`;
                        }
                    }
                    if (realLeads.length > 0) setTimeout(() => setShowPanel('leads'), 500);
                } else if (realLeads.length > 0) {
                    finalText = `Searching LinkedIn for leads...\n\n🔍 **Found ${searchTotal} leads** matching your search.`;
                    setTimeout(() => setShowPanel('leads'), 500);
                } else {
                    finalText = "I'm here to help you find the perfect leads! Try describing what you need — for example:\n\n• **Find a person:** \"John Smith, CTO at Stripe\"\n• **People at a company:** \"Find all people in Tesla\"\n• **Decision makers:** \"Find decision makers at Google\"\n• **Specific role:** \"Find founders at techiemaya\"\n• **Industry search:** \"Marketing directors at fintech startups in London\"";
                }
            } else if (realLeads.length > 0) {
                // lead-chat triggered a search and got results
                finalText += `\n\n🔍 **Found ${searchTotal} leads** matching your criteria.`;
                setTimeout(() => setShowPanel('leads'), 500);
            }

            // ── Explain an "empty" result truthfully instead of a bare "0 records" ──
            // Two very different causes look identical without this: (a) LinkedIn
            // temporarily rate-limited the search (transient — retry works), or
            // (b) the search DID find people but all were hidden by the
            // already-contacted filter. Either way a bare summary reads as
            // "nothing found / broken search", so say what actually happened.
            if (realLeads.length === 0 && searchRateLimited && !searchErrorMessage) {
                finalText += `\n\n⏳ **LinkedIn is temporarily rate-limiting searches** on this account — this is not a problem with your search terms or your account. Please wait a minute and run the same search again.`;
            } else if (realLeads.length === 0 && excludedAlreadyContacted > 0 && !searchErrorMessage) {
                const n = excludedAlreadyContacted;
                finalText += `\n\n🔎 **${n} matching ${n === 1 ? 'lead was' : 'leads were'} found but hidden** — you already sent ${n === 1 ? 'them a' : 'them'} connection request${n === 1 ? '' : 's'} in a previous campaign, so they're not shown again. Try a different search, or a lead you haven't contacted yet.`;
            }

            const journey = realLeads.length > 0 ? buildOutreachJourney(realLeads, ext) : undefined;
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai', text: finalText, ts: new Date(),
                targeting: ext || undefined, options: aiOpts, leads: realLeads.length > 0 ? realLeads.slice(0, 3) : undefined,
                outreach_journey: journey,
            }));

            // ── Persist search results to ai_messages.message_data (non-blocking) ──
            if (rawSearchResults.length > 0) {
                const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || '') : '';
                fetch('/api/ai-icp-assistant/messages/batch-save', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    body: JSON.stringify({
                        sessionId: convId,
                        messages: [
                            {
                                role: 'user',
                                content: text,
                                timestamp: new Date().toISOString(),
                                messageData: { source: 'advanced_search_ai' },
                            },
                            {
                                role: 'ai',
                                content: finalText,
                                timestamp: new Date().toISOString(),
                                messageData: {
                                    source: 'advanced_search_ai',
                                    search_query: text,
                                    targeting: ext || null,
                                    total_results: searchTotal,
                                    icp_applied: icpWasApplied,
                                    leads: rawSearchResults,
                                },
                            },
                        ],
                    }),
                }).catch(e => console.warn('[batch-save] Failed to persist search results:', e));
            }
        } catch (err) {
            console.error('Error:', err);
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai', text: '⚠️ Something went wrong. Please try again.', ts: new Date(),
            }));
        } finally { setBusy(false); }
    }, [busy, messages, convId, targeting, pendingIntent, pendingSearchConfirmation, pendingLocationRequest, pendingImportLocation, finishInboundImport, webSearchEnabled]);

    // ── Roles wizard ───────────────────────────────────────────────────────
    const rolePushAi = useCallback((text: string, options?: { label: string; value: string }[]) => {
        setMessages(p => [...p, { id: `a-role-${Date.now()}-${p.length}`, role: 'ai', text, ts: new Date(), options }]);
    }, []);

    const pushRoleCard = useCallback((card: NonNullable<ChatMsg['roleCard']>) => {
        setMessages(p => [...p, { id: `a-role-${Date.now()}-${p.length}`, role: 'ai', text: '', ts: new Date(), roleCard: card }]);
    }, []);

    const startRole = useCallback((t: WorkflowTemplate) => {
        setMessages(p => [...p, { id: `u-role-${Date.now()}`, role: 'user', text: `Role: ${t.name}`, ts: new Date() }]);
        if (t.requiresFile) {
            roleWizardRef.current = null;
            pushRoleCard({ key: t.key, stage: 'file' });
            return;
        }
        roleWizardRef.current = { key: t.key, idx: 0, answers: {} };
        if (!templateWizardInputs(t).length) {
            pushRoleCard({ key: t.key, stage: 'summary', answers: {} });
            return;
        }
        pushRoleCard({ key: t.key, stage: 'intro', qIdx: 0 });
    }, [pushRoleCard]);

    const handleRoleAnswer = useCallback((text: string) => {
        const wiz = roleWizardRef.current;
        if (!wiz) return;
        const tpl = WORKFLOW_TEMPLATES.find(t => t.key === wiz.key);
        if (!tpl) { roleWizardRef.current = null; return; }
        const inputs = templateWizardInputs(tpl);
        // Every earlier card stays in the transcript with its buttons live, so a
        // click can arrive for a question the wizard has already moved past —
        // and after the last one `idx` sits at `inputs.length`. Bail before
        // echoing a user bubble, so a stale click is a no-op rather than a
        // phantom reply or a crash on `inputs[idx].target`.
        const inp = inputs[wiz.idx];
        if (!inp) return;
        setMessages(p => [...p, { id: `u-role-${Date.now()}`, role: 'user', text, ts: new Date() }]);
        // The copy gate branches rather than storing anything: only an explicit
        // yes walks the message questions, anything else jumps to the summary
        // with the template's own copy intact.
        if (inp.target === 'gate') {
            const wantsToWrite = /^(y|yes|yeah|yep|sure|ok(ay)?|please|write|edit|customi[sz]e)/i.test(text.trim());
            wiz.idx = wantsToWrite ? wiz.idx + 1 : inputs.length;
            if (wiz.idx < inputs.length) pushRoleCard({ key: tpl.key, stage: 'question', qIdx: wiz.idx });
            else pushRoleCard({ key: tpl.key, stage: 'summary', answers: { ...wiz.answers } });
            return;
        }
        const skipped = !!inp.optional && /^(skip|no|none|-)$/i.test(text.trim());
        const val = skipped ? '' : text.trim();
        if (!val && !inp.optional) {
            pushRoleCard({ key: tpl.key, stage: 'question', qIdx: wiz.idx, nudge: true });
            return;
        }
        if (val) wiz.answers[inp.key] = val;
        wiz.idx += 1;
        if (wiz.idx < inputs.length) {
            pushRoleCard({ key: tpl.key, stage: 'question', qIdx: wiz.idx });
            return;
        }
        pushRoleCard({ key: tpl.key, stage: 'summary', answers: { ...wiz.answers } });
    }, [pushRoleCard]);

    const onChatSend = useCallback(() => {
        if (!input.trim() || busy) return;
        if (roleWizardRef.current) {
            const t = input.trim();
            setInput('');
            if (taRef.current) taRef.current.style.height = 'auto';
            handleRoleAnswer(t);
            return;
        }
        doSend(input.trim()); setInput('');
        if (taRef.current) taRef.current.style.height = 'auto';
    }, [input, busy, doSend, handleRoleAnswer]);

    const onOptClick = useCallback(async (v: string) => {
        // ── Roles wizard actions ──────────────────────────────────────────
        // Copy gate answered by button — routed through the same handler as a
        // typed reply so the wizard has one advance path.
        if (v === '__role_gate_yes__' || v === '__role_gate_no__') {
            handleRoleAnswer(v === '__role_gate_yes__' ? 'yes' : 'skip');
            return;
        }
        // A quick-reply chip on a wizard question. Routed through the same
        // handler as a typed reply so there is still one advance path — the
        // chip is a shortcut for typing, not a second way through the wizard.
        if (v.startsWith('__role_answer__:')) {
            handleRoleAnswer(v.slice('__role_answer__:'.length));
            return;
        }
        if (v === '__role_cancel__') {
            roleWizardRef.current = null;
            rolePushAi('No problem — Accelerator setup cancelled. Pick another from the **Accelerators** menu any time.');
            return;
        }
        if (v.startsWith('__role_builder__:')) {
            const key = v.slice('__role_builder__:'.length);
            setBuilderTemplate({ key, sourceCfg: {}, nodeCfg: {}, autoLaunch: false });
            setShowCustomWorkflow(true);
            return;
        }
        // Preview the audience in the leads panel WITHOUT launching: same
        // /search/unified call the chat uses, driven by the Accelerator's targeting.
        // The wizard stays open so the summary CTAs remain usable afterwards.
        if (v === '__role_preview__') {
            const wiz = roleWizardRef.current;
            if (!wiz || rolePreviewing) return;
            const tpl = WORKFLOW_TEMPLATES.find(t => t.key === wiz.key);
            if (!tpl) return;
            const { sourceCfg } = splitWizardAnswers(tpl, wiz.answers);
            const query = templateSearchQuery(tpl, sourceCfg);
            if (!query) {
                rolePushAi('This Accelerator doesn\'t search LinkedIn for its leads, so there\'s nothing to preview yet.');
                return;
            }
            setRolePreviewing(true);
            setIsSearching(true);
            rolePushAi(`🔍 Previewing who this Accelerator would reach — searching for **${query}**…`);
            try {
                // Same structured targeting the Accelerator's source node will run with,
                // so the preview reflects the real audience rather than an
                // approximation of it.
                const csv = (s?: string) => (s || '').split(',').map(x => x.trim()).filter(Boolean);
                // Industry Roles pre-fill titles/industries on the template itself;
                // wizard answers only override what the user was asked.
                const effCfg = { ...(tpl.source?.cfg || {}), ...sourceCfg } as Record<string, string>;
                const previewTargeting = tpl.source?.key === 'linkedin_search' ? {
                    job_titles: csv(effCfg.job_titles),
                    industries: csv(effCfg.industries),
                    locations: csv(effCfg.locations),
                } : undefined;
                const bizCtx = getBusinessContext();
                const d = await linkedInSearch.searchUnified({
                    query,
                    count: leadCount,
                    targeting: previewTargeting,
                    icp_description: bizCtx
                        ? `## Search Target (WHO to find):\n${query}\n\n## Seller Context (WHAT they sell — use only to assess relevance, not to redefine the target):\n${bizCtx}`
                        : query,
                    useSalesNav,
                    // Full 0–100 range: the preview is for judging fit, not enrolling.
                    icp_min_score: 0,
                });
                const results: any[] = Array.isArray(d?.results) ? d.results : [];
                const previewLeads: LeadProfile[] = results.map((item: any, idx: number) => {
                    const profileUrl = resolveProfileUrl(item);
                    return {
                        id: item.id || item.provider_id || `role-preview-${idx}`,
                        name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || (profileUrl ? 'LinkedIn User' : 'Contact'),
                        first_name: item.first_name || '',
                        last_name: item.last_name || '',
                        headline: item.headline || '',
                        location: item.location || '',
                        current_company: item.current_company || '',
                        profile_url: profileUrl,
                        profile_picture: item.profile_picture || '',
                        industry: item.industry || '',
                        network_distance: item.network_distance || '',
                        locked: idx >= 5,
                        icp_score: item.icp_score != null ? item.icp_score : undefined,
                        match_level: item.match_level || undefined,
                        icp_reasoning: item.icp_reasoning || undefined,
                        enriched_profile: item.enriched_profile || undefined,
                        inferred: item.inferred || undefined,
                    };
                });
                if (previewLeads.length === 0) {
                    rolePushAi('No profiles came back for that targeting. Widen the titles or location — say **cancel** and pick the Accelerator again, or open it in the builder to edit the search.');
                } else {
                    setLeads(previewLeads);
                    seedDefaultSelection(previewLeads);
                    setTotalResults(d?.total || previewLeads.length);
                    setShowPanel('leads');
                    rolePushAi(`👀 Found **${d?.total || previewLeads.length}** matching profiles — they're in the **Leads** panel on the right. Happy with them? Activate the Accelerator below.`);
                }
            } catch (e) {
                console.warn('[role-preview] search failed:', e);
                rolePushAi('⚠️ The preview search failed. You can still activate the Accelerator — it runs its own search when it launches.');
            } finally {
                setIsSearching(false);
                setRolePreviewing(false);
                // Re-render the summary card so Activate / Review stay one click away.
                pushRoleCard({ key: wiz.key, stage: 'summary', answers: { ...wiz.answers } });
            }
            return;
        }
        // Full builder, on demand — for editing a node rather than just reading
        // the pipeline. Works after a review too: the answers were kept.
        if (v === '__role_openbuilder__') {
            const wiz = roleWizardRef.current;
            const tpl = wiz ? WORKFLOW_TEMPLATES.find(t => t.key === wiz.key) : null;
            if (wiz && tpl) {
                const { sourceCfg, nodeCfg } = splitWizardAnswers(tpl, wiz.answers);
                setBuilderTemplate({ key: wiz.key, sourceCfg, nodeCfg, autoLaunch: false });
                roleWizardRef.current = null;
            }
            setShowCustomWorkflow(true);
            return;
        }
        if (v === '__role_launch__' || v === '__role_review__') {
            const wiz = roleWizardRef.current;
            if (!wiz) return;
            const tpl = WORKFLOW_TEMPLATES.find(t => t.key === wiz.key);
            roleWizardRef.current = null;
            // Targeting answers seed the source drawer; message answers seed the
            // node they belong to (InMail subject/body, each follow-up touch).
            const { sourceCfg, nodeCfg } = tpl
                ? splitWizardAnswers(tpl, wiz.answers)
                : { sourceCfg: wiz.answers, nodeCfg: {} };

            // Review stays on this page: the pipeline renders in the right-hand
            // Workflow panel, which reads the same store the builder writes to.
            // Sending the user to a full-screen builder to look at what they
            // just described loses the conversation they built it from.
            if (v === '__role_review__' && tpl) {
                const { steps } = templateToPreviewSteps(tpl, { sourceCfgOverride: sourceCfg, nodeCfgOverride: nodeCfg });
                setWorkflowPreview(steps as never);
                // Remembered so "Open full builder" later carries the same answers.
                setBuilderTemplate({ key: wiz.key, sourceCfg, nodeCfg, autoLaunch: false });
                setShowPanel('workflow');
                rolePushAi('Here\'s your Accelerator in the **Workflow** panel — every step, in order. Open the full builder if you want to edit a node, or hit **Activate & launch** above when it looks right.');
                return;
            }

            setBuilderTemplate({ key: wiz.key, sourceCfg, nodeCfg, autoLaunch: v === '__role_launch__' });
            setShowCustomWorkflow(true);
            rolePushAi('🚀 Building and launching your Accelerator — you\'ll land on the campaigns page when it\'s live.');
            return;
        }
        // Special action: submit lead detail form data
        if (v.startsWith('__submit_lead_details__:')) {
            try {
                const formData = JSON.parse(v.replace('__submit_lead_details__:', ''));
                const updatedContact = { ...(pendingContact || {}), ...formData };
                setPendingContact(updatedContact);
                const nameParts = [formData.first_name, formData.last_name].filter(Boolean);
                const summary: string[] = [];
                if (nameParts.length) summary.push(`👤 **Name:** ${nameParts.join(' ')}`);
                if (formData.company) summary.push(`🏢 **Company:** ${formData.company}`);
                if (formData.website) summary.push(`🌐 **Website:** ${formData.website}`);
                if (formData.location) summary.push(`📍 **Location:** ${formData.location}`);
                if (formData.email) summary.push(`📧 **Email:** ${formData.email}`);
                if (formData.phone) summary.push(`📞 **Phone:** ${formData.phone}`);
                setMessages(p => [...p, {
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `✅ **Details saved!**\n\n${summary.join('\n')}\n\nReady to set up your campaign!`,
                    ts: new Date(),
                    options: [
                        { label: '🚀 Start Campaign Setup', value: '__start_campaign__' },
                    ],
                }]);
            } catch { /* ignore parse error */ }
            return;
        }

        // Special action: open campaign overview (adds contact to leads + shows summary bubble)
        if (v === '__start_campaign__') {
            if (pendingContact) {
                // Convert detected contact to a LeadProfile and add to leads
                const contactName = [pendingContact.first_name, pendingContact.last_name].filter(Boolean).join(' ')
                    || pendingContact.phone || pendingContact.email || 'New Contact';
                const newLead: any = {
                    id: `contact-${Date.now()}`,
                    name: contactName,
                    first_name: pendingContact.first_name || '',
                    last_name: pendingContact.last_name || '',
                    headline: pendingContact.title || pendingContact.company || '',
                    location: pendingContact.location || '',
                    current_company: pendingContact.company || '',
                    profile_url: pendingContact.linkedin_url || '',
                    profile_picture: '',
                    icp_score: 100,
                    match_level: 'strong' as const,
                    network_distance: '',
                    icp_reasoning: 'Manually added contact',
                    phone: pendingContact.phone || '',
                    email: pendingContact.email || '',
                    industry: pendingContact.industry || '',
                };
                setLeads(p => [...p, newLead]);

                // Save direct contact to the leads table so it gets a real DB UUID
                // and can be linked via inbound_lead_ids (same path as CSV imports)
                try {
                    const saveRes = await fetch('/api/campaigns/leads/import/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            leads: [{
                                first_name: pendingContact.first_name || '',
                                last_name: pendingContact.last_name || '',
                                email: pendingContact.email || null,
                                phone: pendingContact.phone || null,
                                company: pendingContact.company || null,
                                linkedin_url: pendingContact.linkedin_url || null,
                            }],
                            detectedChannels: {
                                phone: !!pendingContact.phone,
                                email: !!pendingContact.email,
                                linkedin: !!pendingContact.linkedin_url,
                                whatsapp: false,
                                website: false,
                            },
                        }),
                    });
                    if (saveRes.ok) {
                        const saveData = await saveRes.json();
                        if (saveData.leadIds && saveData.leadIds.length > 0) {
                            setDirectContactLeadIds(saveData.leadIds);
                        }
                    }
                } catch (saveErr) {
                    console.warn('[DirectContact] Failed to save contact to leads table:', saveErr);
                }
                // Ensure targeting is set so campaign overview bubble renders
                if (!targeting) {
                    setTargeting({ keywords: [], industries: [], locations: [], job_titles: [], profile_language: [] });
                }
                // Add campaign overview message — msg.targeting triggers the 3-card UI
                setMessages(p => [...p, {
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `✅ **Contact added!** Here's your campaign overview — click **"Create Outreach Journey"** to proceed:`,
                    ts: new Date(),
                    targeting: targeting || { keywords: [], industries: [], locations: [], job_titles: [], profile_language: [] },
                }]);
            } else {
                // No pending contact — go directly to checkpoint form
                setCpStep(0);
            }
            return;
        }

        // Special action: show inline lead detail form
        if (v === '__more_details__') {
            setMessages(p => [...p, {
                id: `a-${Date.now()}`, role: 'ai',
                text: 'Please fill in the contact details below:',
                ts: new Date(),
                leadDetailForm: true,
            }]);
            return;
        }
        if (v.toLowerCase().includes('refine')) setChatBlocked(false);
        doSend(v);
    }, [doSend, targeting, pendingContact, setCpStep, isMobile, rolePreviewing, leadCount, useSalesNav, linkedInSearch, rolePushAi, pushRoleCard, handleRoleAnswer]);

    const handleTargetingConfirm = useCallback(async () => {
        // Build the updated targeting object with new filter values
        const updatedTargeting: LeadTargeting = {
            ...targeting,
            decision_maker_nationality: tgNationality.length > 0 ? tgNationality : undefined,
            decision_maker_experience_level: tgExperienceLevel.length > 0 ? tgExperienceLevel : undefined,
            company_size: tgCompanySize.length > 0 ? tgCompanySize : undefined,
            company_age: tgCompanyAge.length > 0 ? tgCompanyAge : undefined,
            decision_maker_education: tgEducation.length > 0 ? tgEducation : undefined,
            decision_maker_skills: tgSkills.length > 0 ? tgSkills : undefined,
            // Only set posted_recently when user explicitly toggled it ON
            posted_recently: tgPostedRecently ? true : undefined,
        } as LeadTargeting;

        // Update targeting state
        setTargeting(updatedTargeting);

        // Persist targeting_filters to localStorage (reuse for next few days)
        try {
            const filtersToSave = {
                nationality: tgNationality,
                experience_level: tgExperienceLevel,
                company_size: tgCompanySize,
                company_age: tgCompanyAge,
                education: tgEducation,
                skills: tgSkills,
                // posted_recently intentionally excluded — must be set explicitly each session
                saved_at: new Date().toISOString(),
            };
            localStorage.setItem('lad_targeting_filters', JSON.stringify(filtersToSave));
        } catch { }

        // Build a message for the AI — nationality is intentionally kept out of the text
        // so the AI/Gemini doesn't misinterpret a nationality like "India" as a search location.
        // Nationality is applied purely as a post-search LLM filter (infer from names).
        const filterParts: string[] = [];
        // Nationality deliberately excluded from text — handled as backend post-filter only
        if (tgExperienceLevel.length > 0) filterParts.push(`Experience Level: ${tgExperienceLevel.join(', ')}`);
        if (tgCompanySize.length > 0) filterParts.push(`Company Size: ${tgCompanySize.join(', ')}`);
        if (tgCompanyAge.length > 0) filterParts.push(`Company Age: ${tgCompanyAge.join(', ')}`);
        if (tgEducation.length > 0) filterParts.push(`Education: ${tgEducation.join(', ')}`);
        if (tgSkills.length > 0) filterParts.push(`Skills: ${tgSkills.join(', ')}`);
        if (tgPostedRecently) filterParts.push(`Activity: Posted on LinkedIn in the last 3 months`);

        // Show nationality in the display label but keep it separate from the search query
        const nationalityLabel = tgNationality.length > 0
            ? `Nationality filter applied: ${tgNationality.join(', ')} (results will be filtered by inferred nationality)`
            : '';

        const refinementMessage = filterParts.length > 0
            ? `Re-search with my updated targeting filters${nationalityLabel ? ` [${nationalityLabel}]` : ''}:\n${filterParts.join('\n')}`
            : nationalityLabel
                ? `Re-search — ${nationalityLabel}`
                : 'Confirm my current targeting criteria';

        // Clear previous results so the UI shows fresh leads after the new search
        if (filterParts.length > 0) {
            setLeads([]);
            setSearchPage(1);
            setTotalResults(0);
            setSearchCursor(null);
            setCursorHistory([null]);
            setNoMoreLeads(false);
            setTargetingFiltersActive(true);
        }

        // Close the targeting form
        setTgStep(-1);

        // Send to AI for refinement with explicit targeting override so stale state isn't used
        doSend(refinementMessage, { targetingOverride: updatedTargeting });
    }, [targeting, tgNationality, tgExperienceLevel, tgCompanySize, tgCompanyAge, tgEducation, tgSkills, tgPostedRecently, doSend]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (mediaMode) {
                if (input.trim() || (mb.references && mb.references.length > 0)) {
                    submitMediaInput(input.trim());
                    setInput('');
                    if (taRef.current) taRef.current.style.height = 'auto';
                }
            } else {
                messages.length === 0 ? onLandingSubmit() : onChatSend();
            }
        }
    };

    const reset = () => {
        // setScreen('landing'); // Single-screen mode - no screen switching
        setMessages([]);
        setTargeting(null);
        setLeads([]);
        setChatBlocked(false);
        setShowPanel(false);
        setConvId(crypto.randomUUID());
        setMsgCount(0);
        setPendingIntent(null);
        setPendingSearchConfirmation(null);
        setPendingLocationRequest(null);
        setConversationSummary('');
        setSearchPage(1);
        setTotalResults(0);
        setSearchCursor(null);
        setNoMoreLeads(false);
        setCursorHistory([null]);
        setLastSearchQuery('');
        setLastIcpDescription('');
        setLastTargeting(null);
        setLastSearchType('linkedin');
        setSeenProspectIds([]);
        setLastProspectQuery('');
        setCpStep(-1);
        setTgStep(-1);
        setTgNationality([]);
        setTgExperienceLevel([]);
        setTgCompanySize([]);
        setTgCompanyAge([]);
        setTgEducation([]);
        setTgSkills([]);
        setTgPostedRecently(false);
        setTargetingFiltersActive(false);
    };

    /* ── Load more leads (append to existing list) ── */
    const loadMoreLeads = useCallback(async () => {
        // ── Generic prospect search: "Get More" calls prospect-search with seenIds ──
        if (lastSearchType === 'generic_prospect') {
            if (loadingMore || !lastProspectQuery) return;
            setLoadingMore(true);
            try {
                setIsSearching(true);
                const resp = await fetch('/api/ai-icp-assistant/prospect-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: lastProspectQuery,
                        icpProfile: businessProfile,
                        sessionId: `gps-more-${Date.now()}`,
                        seenIds: seenProspectIds,
                        batchSize: leadCount,
                    }),
                });
                const d = await resp.json();
                setIsSearching(false);
                if (d.success && Array.isArray(d.results) && d.results.length > 0) {
                    const existingCount = leads.length;
                    const moreLeads: LeadProfile[] = d.results.map((item: any, idx: number) => ({
                        id: item.id || `gps-more-${existingCount + idx}`,
                        name: item.name || 'Unknown',
                        first_name: item.first_name || '',
                        last_name: item.last_name || '',
                        headline: item.headline || '',
                        location: item.location || '',
                        current_company: item.current_company || '',
                        profile_url: item.profile_url || '',
                        profile_picture: item.profile_picture || '',
                        industry: item.industry || '',
                        network_distance: '',
                        locked: (existingCount + idx) >= 5,
                        phone: item.phone || '',
                        email: item.email || '',
                        icp_score: item.icp_score != null ? item.icp_score : undefined,
                        match_level: item.match_level || undefined,
                        icp_reasoning: item.icp_reasoning || undefined,
                        enriched_profile: item.enriched_profile || undefined,
                    }));
                    setLeads(prev => [...prev, ...moreLeads]);
                    mergeDefaultSelection(moreLeads);
                    setSeenProspectIds(prev => [...prev, ...moreLeads.map(l => l.profile_url || l.id)]);
                    if (!d.hasMore) setNoMoreLeads(true);
                } else {
                    setNoMoreLeads(true);
                }
            } catch (e) { console.error('[LoadMore:GenericProspect] error', e); setIsSearching(false); }
            setLoadingMore(false);
            return;
        }

        // ── Standard LinkedIn search "Get More" ───────────────────────────────────
        if (loadingMore || !lastSearchQuery) return;

        setLoadingMore(true);
        try {
            // Enhance ICP description with feedback for paginated results too
            let icpDesc = lastIcpDescription || undefined;
            const goodLeads = leads.filter(l => leadFeedback[l.id] === 'good');
            const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
            if (icpDesc && (goodLeads.length > 0 || badLeads.length > 0)) {
                const parts = [icpDesc];
                if (goodLeads.length > 0) parts.push(`\n\nUser marked these as GOOD matches (find more like these):\n${goodLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}`).join('\n')}`);
                if (badLeads.length > 0) parts.push(`\n\nUser marked these as BAD matches (avoid similar):\n${badLeads.map(l => { const c = leadFeedbackComments[l.id]; return `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${c ? ` — Reason: "${c}"` : ''}`; }).join('\n')}`);
                icpDesc = parts.join('');
            }

            const body: Record<string, any> = {
                query: lastSearchQuery,
                count: leadCount,
                targeting: lastTargeting || undefined,
                targeting_filters: targeting && (
                    targeting.decision_maker_nationality?.length ||
                    targeting.decision_maker_experience_level?.length ||
                    targeting.decision_maker_skills?.length ||
                    targeting.decision_maker_education?.length ||
                    targeting.company_size?.length ||
                    targeting.posted_recently
                ) ? {
                    nationality: targeting.decision_maker_nationality,
                    experience_level: targeting.decision_maker_experience_level,
                    skills: targeting.decision_maker_skills,
                    education: targeting.decision_maker_education,
                    company_size: targeting.company_size,
                    posted_recently: targeting.posted_recently === true ? true : undefined,
                } : undefined,
                icp_description: icpDesc,
                search_enrichment: buildSearchEnrichment(),
                // Use cursor when available (Unipile token); fall back to start-offset pagination
                filters: searchCursor ? { cursor: searchCursor } : {},
                start: searchCursor ? 0 : leads.length,
                useSalesNav,
                // Keep pagination consistent with the full-range initial list.
                icp_min_score: 0,
            };

            setIsSearching(true);
            setActivities([]);

            const d = await linkedInSearch.search(body);

            // Extract and set activities from response
            if (d?.activities && Array.isArray(d.activities)) {
                setActivities(d.activities);
            }

            setIsSearching(false);

            if (d && Array.isArray(d.results) && d.results.length > 0) {
                const existingCount = leads.length;
                const moreLeads: LeadProfile[] = d.results.map((item: any, idx: number) => {
                    const profileUrl = resolveProfileUrl(item);
                    return {
                        id: item.id || item.provider_id || `lead-${existingCount + idx}`,
                        name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || (profileUrl ? 'LinkedIn User' : 'Contact'),
                        first_name: item.first_name || '',
                        last_name: item.last_name || '',
                        headline: item.headline || '',
                        location: item.location || '',
                        current_company: item.current_company || '',
                        profile_url: profileUrl,
                        profile_picture: item.profile_picture || '',
                        industry: item.industry || '',
                        network_distance: item.network_distance || '',
                        locked: (existingCount + idx) >= 5,
                        icp_score: item.icp_score != null ? item.icp_score : undefined,
                        match_level: item.match_level || undefined,
                        icp_reasoning: item.icp_reasoning || undefined,
                        enriched_profile: item.enriched_profile || undefined,
                    };
                });
                setLeads(prev => [...prev, ...moreLeads]);
                mergeDefaultSelection(moreLeads);
                setSearchCursor(d.cursor || null);
                if (d.total) setTotalResults(d.total);
            } else {
                // No more results
                setSearchCursor(null);
                setNoMoreLeads(true);
            }
        } catch (e) { console.error('[LoadMore] error', e); }
        setLoadingMore(false);
    }, [loadingMore, lastSearchQuery, leadCount, lastTargeting, lastIcpDescription, searchCursor, leads.length]);

    /* ═══════════════════════════════════════════════
       AI CHAT PERSISTENCE — save conversation + messages
       ═══════════════════════════════════════════════ */
    const savedMsgIdsRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        // Only sync when there are completed (non-loading) messages
        const completed = messages.filter(m => !m.loading);
        const unsaved = completed.filter(m => !savedMsgIdsRef.current.has(m.id));
        if (!unsaved.length) return;

        const sync = async () => {
            try {
                const token = typeof window !== 'undefined'
                    ? (localStorage.getItem('authToken') || localStorage.getItem('token') || '')
                    : '';
                const headers: Record<string, string> = {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                };

                // 1. Upsert conversation (create first time, update context on subsequent calls)
                const lastSearchMsg = [...completed].reverse().find(m => m.role === 'ai' && m.leads?.length);
                const convPayload = {
                    session_id: convId,
                    search_query: lastSearchQuery || undefined,
                    targeting: lastTargeting || undefined,
                    icp_description: lastIcpDescription || undefined,
                    lead_count: leads.length,
                    filtered_count: filteredLeads.length,
                };
                const convRes = await fetch('/api/ai-chat/conversations', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(convPayload),
                });
                if (!convRes.ok) return;
                const { conversation_id } = await convRes.json();

                // 2. Save unsaved messages
                const msgPayload = unsaved.map(m => ({
                    role: m.role,
                    content: m.text,
                    search_query: m.targeting ? lastSearchQuery : undefined,
                    targeting: m.targeting || undefined,
                    leads_found: m.leads?.length ?? undefined,
                    icp_applied: !!(m.leads?.some((l: any) => l.icp_score != null)),
                    sources: m.sources || undefined,
                    metadata: {
                        ...(m.inboundAction ? { inboundAction: m.inboundAction } : {}),
                        ...(m.webSearchResult ? { webSearchResult: true } : {}),
                    },
                    created_at: m.ts instanceof Date ? m.ts.toISOString() : m.ts,
                }));

                await fetch(`/api/ai-chat/conversations/${conversation_id}/messages`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ messages: msgPayload }),
                });

                // Mark as saved so we don't re-send them
                unsaved.forEach(m => savedMsgIdsRef.current.add(m.id));
            } catch (_) {
                // Non-blocking — persistence failure must not disrupt the UX
            }
        };

        // Debounce slightly so rapid state updates are batched
        const timer = setTimeout(sync, 1200);
        return () => clearTimeout(timer);
    }, [messages, convId, lastSearchQuery, lastTargeting, lastIcpDescription, leads.length, filteredLeads.length]);

    // Reset saved-IDs tracker when convId changes (new session)
    React.useEffect(() => {
        savedMsgIdsRef.current = new Set();
    }, [convId]);

    /* ═══════════════════════════════════════════════
       SCREEN 1: LANDING (Disabled - Single-screen mode)
       ═══════════════════════════════════════════════ */
    if (false && false) return (  // Always skip to unified chat screen
        <div className="adv-landing">
            {/* Top bar with back button */}
            <div className="adv-topbar">
                <button className="adv-back" onClick={() => router.back()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>

                {/* Clear Chat — only visible once conversation has started */}
                {messages.length > 0 && (
                    <button
                        onClick={() => {
                            if (window.confirm('Clear this chat and start a new campaign setup?')) {
                                clearChat();
                            }
                        }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            marginLeft: 'auto',
                            padding: '7px 14px', borderRadius: '20px',
                            border: '1.5px solid #e5e7eb',
                            background: '#fff', color: '#6b7280',
                            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                            transition: 'all .15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#ef4444'; (e.currentTarget as HTMLButtonElement).style.color = '#ef4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'; (e.currentTarget as HTMLButtonElement).style.color = '#6b7280'; }}
                    >
                        {/* Refresh / restart icon */}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                            <path d="M3 3v5h5" />
                        </svg>
                        New Setup
                    </button>
                )}
            </div>

            {/* Center greeting */}
            <div className="adv-center">
                {/* Mr LAD logo */}
                <div className="adv-asterisk-wrap">
                    <img src="/MrLAD-logo.svg" alt="Mr LAD" className="dark:hidden adv-lad-logo" />
                    <img src="/MrLAD-logo-white.svg" alt="Mr LAD" className="hidden dark:block adv-lad-logo" />
                </div>

                <h1 className="adv-title">Hey! I am LAD, How can I help you today?</h1>

                {/* Main input box */}
                <div className="adv-input-outer" onClick={() => taRef.current?.focus()}>
                    <textarea
                        ref={taRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={onKey}
                        placeholder="Ask me to find leads, describe your ideal customer..."
                        rows={3}
                        className="adv-ta"
                    />

                    {/* Web search badge when enabled */}
                    {webSearchEnabled && (
                        <div className="adv-websearch-badge">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            Web search
                            <button onClick={(e) => { e.stopPropagation(); setWebSearchEnabled(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: '#6b7280', fontSize: '11px' }}>x</button>
                        </div>
                    )}

                    {/* Input bottom row */}
                    <div className="adv-input-foot">
                      {/* Left cluster — keeps Accelerators pinned beside the + button
                          (the foot is space-between, so ungrouped children
                          would spread across the whole bar). */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {/* + button with dropdown */}
                        <div style={{ position: 'relative' }}>
                            <button
                                className="adv-attach-btn"
                                onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
                                title="Add attachments or tools"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                            </button>

                            {showAttachMenu && (
                                <div className="adv-attach-menu" onClick={e => e.stopPropagation()}>
                                    <div className="adv-attach-item" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                                        <div className="adv-attach-icon" style={{ background: '#dcfce7' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Import leads</div>
                                            <div className="adv-attach-sub">CSV, Excel, images, PDFs</div>
                                        </div>
                                    </div>
                                    <div className="adv-attach-item" onClick={() => { openContactPicker(); setShowAttachMenu(false); }}>
                                        <div className="adv-attach-icon" style={{ background: '#dce3f5' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b1957" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Select contacts</div>
                                            <div className="adv-attach-sub">Pick from your existing contacts</div>
                                        </div>
                                    </div>
                                    <div className="adv-attach-item" onClick={() => { setShowAttachMenu(false); setShowCustomWorkflow(true); }}>
                                        <div className="adv-attach-icon" style={{ background: '#ede9fe' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="6" r="3" /><circle cx="19" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M7.5 8L10 15M16.5 8L14 15" /></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Custom Accelerator</div>
                                            <div className="adv-attach-sub">Source → outreach nodes</div>
                                        </div>
                                    </div>
                                    <div className={`adv-attach-item${webSearchEnabled ? ' adv-attach-active' : ''}`} onClick={() => { setWebSearchEnabled(!webSearchEnabled); setShowAttachMenu(false); }}>
                                        <div className="adv-attach-icon" style={{ background: webSearchEnabled ? '#dbeafe' : '#e0f2fe' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={webSearchEnabled ? '#2563eb' : '#0284c7'} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Web search {webSearchEnabled ? '\u2713' : ''}</div>
                                            <div className="adv-attach-sub">Search LinkedIn &amp; web for leads</div>
                                        </div>
                                    </div>
                                    <div className="adv-attach-divider" />
                                    <div className="adv-attach-item" onClick={() => { setShowAttachMenu(false); router.push('/settings'); }}>
                                        <div className="adv-attach-icon" style={{ background: '#fef3c7' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Connect tools</div>
                                            <div className="adv-attach-sub">LinkedIn, HubSpot, Salesforce</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Accelerators — prebuilt pipeline templates, configured via chat wizard */}
                        <RolesLauncher onPick={startRole} />
                      </div>

                        {/* Send button */}
                        <button
                            className="adv-send-circle"
                            disabled={!input.trim()}
                            onClick={onLandingSubmit}
                            style={{
                                background: input.trim() ? '#0b1957' : '#e5e7eb',
                                boxShadow: input.trim() ? '0 4px 14px rgba(11,25,87,.3)' : 'none'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Suggestion chips */}
                {/* Suggestion chips — split into two explicit rows (3 + 2) so the
                    layout is two lines at any width, not dependent on wrapping. */}
                <div className="adv-chips-stack">
                <div className="adv-chips-row">
                    <button className="adv-chip" onClick={() => { setInput('Connect me with founders in trading companies in UAE'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        Founders in trading companies in UAE
                    </button>
                    <button className="adv-chip" onClick={() => { setInput('Connect me with CFO in Goldman Sachs in USA'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                        CFO in Goldman Sachs in USA
                    </button>
                    <button className="adv-chip" onClick={() => { setInput('Find VP of Sales in SaaS companies in UK'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                        VP of Sales in UK SaaS
                    </button>
                </div>
                <div className="adv-chips-row adv-chips-row-2">
                    <button className="adv-chip" onClick={() => { setInput(ICP_LEADS_PROMPT); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
                        Get leads from my active ICP
                    </button>
                    <button className="adv-chip" onClick={handleStartMediaGeneration}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                        Media Generation
                    </button>
                </div>
                </div>

                {/* Recent searches */}
                {searchHistory.length > 0 && (
                    <div className="adv-recent-wrap">
                        <div className="adv-recent-label">Recent searches</div>
                        <div className="adv-recent-list">
                            {[...searchHistory].reverse().slice(0, 3).map((q, i) => (
                                <button key={i} className="adv-recent-item" onClick={() => { setInput(q); taRef.current?.focus(); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                    <span>{q}</span>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden file input — accepts all supported lead import formats */}
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleInboundFile(f); e.target.value = ''; }} />

            <style>{css}</style>
        </div>
    );

    // Identify the latest message with targeting actions, inbound summary, or follow-up options to show in the mobile footer
    const lastActionMsg = [...messages].reverse().find(m => !!m.targeting || m.inboundAction === 'summary' || (m.options && m.options.length > 0));



    const renderActiveSplitWidget = () => {
        if (!mediaMode) return null;
        switch (mb.step) {
            case "builder-brand-dna":
                return (
                    <AgentBuilderBrandDNA
                        brandDna={mb.uiPayload?.brand_dna}
                        onNext={(val) => {
                            if (val === "Request Changes") {
                                setBrandDnaRequestedChanges(true);
                            } else if (val === "Select this & start") {
                                submitMediaInput("Select this & start", "Select this & start");
                            } else if (val === "Go back") {
                                mb.undoStep();
                            }
                        }}
                        phase={mb.uiPayload?.phase}
                        onBack={() => mb.undoStep()}
                        hideButtons={brandDnaRequestedChanges}
                        fullBleed={false}
                    />
                );
            case "builder-video-progress":
                return (
                    <AgentBuilderVideoProgress
                        title={mb.uiPayload?.question}
                        description={mb.uiPayload?.description}
                        blocks={mb.uiPayload?.blocks || []}
                        phase={mb.uiPayload?.phase}
                        videoUrl={mb.uiPayload?.video}
                        status={mb.uiPayload?.status as 'completed' | 'failed' | 'cancelled' | 'active' | undefined}
                        progress={mb.uiPayload?.progress}
                        onBack={() => mb.undoStep()}
                        onNext={(val) => {
                            if (val === "[SHOW_GALLERY]") {
                                mb.fetchGallery();
                            } else {
                                submitMediaInput(val, val);
                            }
                        }}
                    />
                );
            case "builder-image-output":
                return (
                    <AgentBuilderImageOutput
                        title={mb.uiPayload?.question}
                        description={mb.uiPayload?.description}
                        images={mb.uiPayload?.images || []}
                        video={mb.uiPayload?.video}
                        onNext={(val) => submitMediaInput("Proceed with layout", val)}
                        phase={mb.uiPayload?.phase}
                        generating={mb.generating}
                        references={mb.references}
                        onUpload={mb.uploadReference}
                        onRemove={mb.removeReference}
                        isUploading={mb.isUploading}
                        error={mb.error}
                        onBack={() => mb.undoStep()}
                    />
                );
            case "builder-video-confirm":
                return (
                    <AgentBuilderVideoConfirm
                        title={mb.uiPayload?.question}
                        description={mb.uiPayload?.description}
                        image={mb.uiPayload?.images?.[0]}
                        onNext={(val) => submitMediaInput("Generate Video", val)}
                        phase={mb.uiPayload?.phase}
                        references={mb.references}
                        onUpload={mb.uploadReference}
                        onRemove={mb.removeReference}
                        isUploading={mb.isUploading}
                        error={mb.error}
                        onBack={() => mb.undoStep()}
                    />
                );
            case "builder-video-output":
                return (
                    <AgentBuilderVideoOutput
                        title={mb.uiPayload?.question}
                        description={mb.uiPayload?.description}
                        videoUrl={mb.uiPayload?.video}
                        onNext={(val) => submitMediaInput("Proceed", val)}
                        phase={mb.uiPayload?.phase}
                        onBack={() => mb.undoStep()}
                    />
                );
            case "builder-keyframes-confirm":
                return (
                    <AgentBuilderKeyframesConfirm
                        title={mb.uiPayload?.question}
                        description={mb.uiPayload?.description}
                        keyframes={mb.uiPayload?.images || []}
                        onNext={(val) => submitMediaInput(val || "", val)}
                        phase={mb.uiPayload?.phase}
                        references={mb.references}
                        onUpload={mb.uploadReference}
                        onRemove={mb.removeReference}
                        isUploading={mb.isUploading}
                        error={mb.error}
                        onBack={() => mb.undoStep()}
                        feedbackText={input}
                        setFeedbackText={setInput}
                        isSplitScreen={true}
                    />
                );
            default:
                return null;
        }
    };

    const toggleRecording = async () => {
        if (beautifying) return;

        if (isRecording) {
            if (recognitionInstance) {
                try {
                    recognitionInstance.stop();
                } catch (e) {
                    console.error(e);
                }
            }
            setIsRecording(false);
            setBeautifying(true);

            const rawText = input.trim();
            if (!rawText) {
                setBeautifying(false);
                return;
            }

            try {
                const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
                const workerUrl = process.env.NEXT_PUBLIC_PLAYGROUND_WORKER_URL || "http://localhost:8080";
                const res = await fetch(`${workerUrl}/playground-media/beautify-transcription`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token && { Authorization: `Bearer ${token}` })
                    },
                    body: JSON.stringify({ text: rawText })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.beautified_text) {
                        setInput(data.beautified_text);
                    }
                }
            } catch (err) {
                console.error("Failed to beautify transcription:", err);
            } finally {
                setBeautifying(false);
            }
        } else {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (!SpeechRecognition) {
                alert("Speech recognition is not supported in this browser. Please use Chrome, Safari, or Edge.");
                return;
            }

            try {
                await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (err) {
                console.error("Microphone access denied:", err);
                alert("Microphone access is required for voice interaction.");
                return;
            }

            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) {
                    setInput(finalTranscript);
                }
            };

            rec.onerror = (event: any) => {
                console.error("Speech recognition error:", event.error);
                if (event.error !== 'aborted') {
                    setIsRecording(false);
                }
            };

            rec.onend = () => {
                setIsRecording(false);
            };

            rec.start();
            setIsRecording(true);
            setRecognitionInstance(rec);
        }
    };

    /* ═══════════════════════════════════════════════
       SCREEN 2: CHAT + LEADS PANEL
       ═══════════════════════════════════════════════ */
    return (
        <div className="adv-chat-root">
            <div className="adv-yellow-bar" />
            
            {/* Dynamic Media Studio Sticky Header */}
            {mediaMode && (
                <>
                    <div className="adv-media-header">
                        <button 
                            className="adv-media-header-back-btn" 
                            onClick={handleMediaBack} 
                            style={{ display: mb.step === "welcome" ? "none" : "flex" }}
                            title="Undo last message"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            <span>Undo last message</span>
                        </button>
                        
                        <div className="adv-media-header-title">
                            {mb.uiPayload?.phase || (mb.step === "welcome" ? "AI Media Studio" : "Waking up Mr. LADs...")}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
                            <SessionSelector mb={mb} />
                            
                            <button
                                onClick={() => {
                                    mb.closeFlow();
                                    setMediaMode(false);
                                    setMediaMessages([]);
                                    lastRestoredSessionIdRef.current = "";
                                }}
                                className="adv-media-header-exit-btn cursor-pointer"
                            >
                                <X className="size-4" style={{ flexShrink: 0 }} />
                                <span>Exit Media Gen</span>
                            </button>
                        </div>
                    </div>
                    <div className="adv-media-header-fade" />
                </>
            )}

            <div className="adv-chat-main">
                {/* LEFT: CHAT */}
                <div className={`adv-chat-left${(messages.length === 0 && !mediaMode) ? ' adv-chat-left-empty' : ''}${mediaMode ? ' media-active-left' : ''}`} style={{ width: (showPanel || isSplitScreenStep) ? '60%' : '100%', position: (mediaMode && mb.step === "builder-brand-dna" && brandDnaRequestedChanges) ? 'static' : undefined }}>
                    
                    {!mediaMode && (
                        <>
                            <button className="adv-chat-back" onClick={reset}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                            </button>

                    {/* AI Playground button — top-right */}
                    {(!isMobile || messages.length === 0) && (
                        <button
                            onClick={() => setShowPlayground(true)}
                            title="Configure AI context: company, ICP, sales script, etc."
                            className={`adv-icp-discover-btn absolute top-4 right-5 z-10 flex items-center gap-2 px-4 h-9 sm:h-10 rounded-full text-xs font-bold uppercase tracking-wider text-white !text-white bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 transition-all shadow-md active:scale-[0.98] cursor-pointer outline-none border-none ${
                              Object.values(businessProfile).some((v) => v)
                                ? 'opacity-100 ring-2 ring-emerald-500/50 dark:ring-emerald-400/40'
                                : 'opacity-90 hover:opacity-100'
                            }`}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#0b1957'; e.currentTarget.style.color = '#0b1957'; }}
                            onMouseLeave={e => {
                                e.currentTarget.style.borderColor = Object.values(businessProfile).some(v => v) ? '#0b1957' : '#e5e7eb';
                                e.currentTarget.style.color = Object.values(businessProfile).some(v => v) ? '#0b1957' : '#6b7280';
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            ICP Discovery
                            {Object.values(businessProfile).some(v => v) && (
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', display: 'inline-block', marginLeft: 2 }} />
                            )}
                        </button>
                    )}
                        </>
                    )}
                    
                    <div className={`adv-chat-msgs${hasOptionsOpen ? ' has-options-open' : ''}`} style={{ paddingBottom: mediaMode ? `${mediaInputWrapHeight + 16}px` : undefined }}>
                        {/* Landing Content - Show when no messages */}
                        {messages.length === 0 && !mediaMode && (
                            <div className="adv-gemini-hero">
                                <div className="adv-gemini-logo-wrap">
                                    <img src="/logo.svg" alt="LAD" className="adv-gemini-logo" />
                                </div>
                                <h2 className="adv-gemini-title">
                                    Hey! I am LAD, How can I help you today?
                                    <Sparkles className="adv-gemini-sparkle" />
                                </h2>
                            </div>
                        )}

                        <div className="adv-msgs-inner">
                            {mediaMode ? (
                                <>
                                    {(() => {
                                        const lastUserMsgIdx = mediaMessages.map(msg => msg.role).lastIndexOf('user');
                                        return mediaMessages.map((m, idx) => {
                                            const nextMsg = mediaMessages[idx + 1];
                                            const userSelectionText = (nextMsg && nextMsg.role === 'user') ? nextMsg.text : undefined;
                                            return (
                                                <MediaBubble 
                                                    key={m.id} 
                                                    msg={m} 
                                                    isActive={idx === mediaMessages.length - 1} 
                                                    isLastUser={idx === lastUserMsgIdx}
                                                    handleMediaBack={handleMediaBack}
                                                    mb={mb}
                                                    submitMediaInput={submitMediaInput}
                                                    userSelectionText={userSelectionText}
                                                />
                                            );
                                        });
                                    })()}
                                    {/* Inline Loader — rendered dynamically below messages, perfectly centered in the left chat/split container */}
                                    {(mb.step === "loading" || mb.generating) && (
                                        <div className="w-full flex justify-center py-12 fadeUp">
                                            <ThinkingIndicator generating={mb.generating} />
                                        </div>
                                    )}
                                </>
                            ) : (
                                messages.map((m, idx) => {
                                    // Show real activities in the AI's thinking indicator (replace "Thinking...")
                                    const displayMsg = isSearching && idx === messages.length - 1 && messages[idx].role === 'ai'
                                        ? {
                                            ...m,
                                            content: activities.length > 0
                                                ? activities[activities.length - 1].message
                                                : 'Qualifying...'
                                        }
                                        : m;
                                    return <Bubble key={m.id} msg={displayMsg} onOpt={onOptClick} onShowPanel={setShowPanel} onStartCheckpoints={() => setCpStep(0)} onLetAgentDeal={letAgentDeal} agentDealLoading={agentDealLoading} onStartTargeting={() => { setTgStep(0); setChatBlocked(false); }} hasPanel={!!showPanel} leadsCount={leads.length} filteredLeadsCount={filteredLeads.length} onUploadClick={() => fileInputRef.current?.click()} useSalesNav={useSalesNav} isMobile={isMobile} rolePreviewing={rolePreviewing} roleIcp={businessProfile} />;
                                })
                            )}
                            {/* Import leads prompt — shown when conversation is about existing client relationships */}
                            {(() => {
                                const allText = messages.map(m => m.text?.toLowerCase() || '').join(' ');
                                const isRelationshipContext = /existing client|strengthen.*relation|client relation|account manager|customer success|re.engage|re-engage/.test(allText);
                                if (!isRelationshipContext || messages.length === 0) return null;
                                const downloadTemplate = () => {
                                    const headers = ['first_name', 'last_name', 'job_title', 'company_name', 'email', 'linkedin_url', 'phone', 'website'];
                                    const example = ['Jane', 'Doe', 'VP of Sales', 'Acme Corp', 'jane@acme.com', 'https://linkedin.com/in/janedoe', '+971501234567', 'https://acme.com'];
                                    const csv = [headers.join(','), example.join(',')].join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url; a.download = 'client_import_template.csv';
                                    a.click(); URL.revokeObjectURL(url);
                                };
                                const hasUploadedLeads = inboundLeads.length > 0;
                                return (
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '8px 0 16px' }}>
                                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e8ecfa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b1957" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                        </div>
                                        {hasUploadedLeads ? (
                                            <button
                                                onClick={() => fileInputRef.current?.click()}
                                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                Upload More
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <button
                                                    onClick={() => fileInputRef.current?.click()}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', background: '#0b1957', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                    Import your leads & create outreach journey
                                                </button>
                                                <button
                                                    onClick={downloadTemplate}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: '#fff', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer' }}>
                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}><path d="M7 10 12 15 17 10" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                    Download CSV Template
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* ── Inline Checkpoint Form (typeform-style) ── */}
                        {cpStep >= 0 && (
                            <div className="adv-msgs-inner">
                                <CheckpointFormInline
                                    editingCampaignId={editingCampaignId}
                                    persistedLeadSource={persistedLeadSource}
                                    onLetAgentDeal={letAgentDeal}
                                    agentDealLoading={agentDealLoading}
                                    step={cpStep}
                                    setStep={setCpStep}
                                    icpThreshold={cpIcpThreshold}
                                    setIcpThreshold={setCpIcpThreshold}
                                    actions={cpActions}
                                    setActions={setCpActions}
                                    connMsg={cpConnMsg}
                                    setConnMsg={setCpConnMsg}
                                    followMsg={cpFollowMsg}
                                    setFollowMsg={setCpFollowMsg}
                                    nextChannels={cpNextChannels}
                                    setNextChannels={setCpNextChannels}
                                    triggerCondition={cpTriggerCondition}
                                    setTriggerCondition={setCpTriggerCondition}
                                    days={cpDays}
                                    setDays={setCpDays}
                                    channelConfigStep={cpChannelConfigStep}
                                    setChannelConfigStep={setCpChannelConfigStep}
                                    channelDelays={cpChannelDelays}
                                    setChannelDelays={setCpChannelDelays}
                                    name={cpName}
                                    setName={setCpName}
                                    genLoading={cpGenLoading}
                                    setGenLoading={setCpGenLoading}
                                    launching={cpLaunching}
                                    setLaunching={setCpLaunching}
                                    voiceAgents={cpVoiceAgents}
                                    setVoiceAgents={setCpVoiceAgents}
                                    voiceNumbers={cpVoiceNumbers}
                                    setVoiceNumbers={setCpVoiceNumbers}
                                    selectedAgentId={cpSelectedAgentId}
                                    setSelectedAgentId={setCpSelectedAgentId}
                                    selectedVoiceId={cpSelectedVoiceId}
                                    setSelectedVoiceId={setCpSelectedVoiceId}
                                    selectedFromNumber={cpSelectedFromNumber}
                                    setSelectedFromNumber={setCpSelectedFromNumber}
                                    emailSubject={cpEmailSubject}
                                    setEmailSubject={setCpEmailSubject}
                                    emailBody={cpEmailBody}
                                    setEmailBody={setCpEmailBody}
                                    selectedEmailTemplateId={cpSelectedEmailTemplateId}
                                    setSelectedEmailTemplateId={setCpSelectedEmailTemplateId}
                                    saveTemplateMode={cpSaveTemplateMode}
                                    setSaveTemplateMode={setCpSaveTemplateMode}
                                    saveTemplateName={cpSaveTemplateName}
                                    setSaveTemplateName={setCpSaveTemplateName}
                                    emailGenLoading={cpEmailGenLoading}
                                    setEmailGenLoading={setCpEmailGenLoading}
                                    emailFromAddress={cpEmailFromAddress}
                                    setEmailFromAddress={setCpEmailFromAddress}
                                    emailProvider={cpEmailProvider}
                                    setEmailProvider={setCpEmailProvider}
                                    waBody={cpWaBody}
                                    setWaBody={setCpWaBody}
                                    waFromNumber={cpWaFromNumber}
                                    setWaFromNumber={setCpWaFromNumber}
                                    waGenLoading={cpWaGenLoading}
                                    setWaGenLoading={setCpWaGenLoading}
                                    targeting={targeting}
                                    leads={leads}
                                    leadFeedback={leadFeedback}
                                    selectedLeadIds={selectedLeadIds}
                                    creditBalance={creditBalance}
                                    onOpenRecharge={() => setShowRechargeModal(true)}
                                    searchSessions={searchSessions}
                                    chatMessages={messages}
                                    pendingContact={pendingContact}
                                    inboundMode={inboundMode}
                                    inboundLeads={inboundLeads}
                                    inboundLeadIds={inboundLeadIds}
                                    directContactLeadIds={directContactLeadIds}
                                    enableDailyWebPresence={cpEnableDailyWebPresence}
                                    setEnableDailyWebPresence={setCpEnableDailyWebPresence}
                                    enableDailyPosts={cpEnableDailyPosts}
                                    setEnableDailyPosts={setCpEnableDailyPosts}
                                    enableAiPersonalization={cpEnableAiPersonalization}
                                    setEnableAiPersonalization={setCpEnableAiPersonalization}
                                    enableAiConnectionPersonalization={cpEnableAiConnectionPersonalization}
                                    setEnableAiConnectionPersonalization={setCpEnableAiConnectionPersonalization}
                                    enableAiFollowupPersonalization={cpEnableAiFollowupPersonalization}
                                    setEnableAiFollowupPersonalization={setCpEnableAiFollowupPersonalization}
                                />
                            </div>
                        )}

                        {/* ── Inline Targeting Form (typeform-style) ── */}
                        {tgStep >= 0 && (
                            <div className="adv-msgs-inner">
                                <TargetingFormInline
                                    step={tgStep}
                                    setStep={setTgStep}
                                    nationality={tgNationality}
                                    setNationality={setTgNationality}
                                    experienceLevel={tgExperienceLevel}
                                    setExperienceLevel={setTgExperienceLevel}
                                    companySize={tgCompanySize}
                                    setCompanySize={setTgCompanySize}
                                    companyAge={tgCompanyAge}
                                    setCompanyAge={setTgCompanyAge}
                                    education={tgEducation}
                                    setEducation={setTgEducation}
                                    skills={tgSkills}
                                    setSkills={setTgSkills}
                                    postedRecently={tgPostedRecently}
                                    setPostedRecently={setTgPostedRecently}
                                    currentTargeting={targeting}
                                    onConfirm={handleTargetingConfirm}
                                    loading={busy}
                                    setLoading={setBusy}
                                />
                            </div>
                        )}

                        <div ref={endRef} />
                    </div>


                    {!(isMobile && chatBlocked) && (
                        <div ref={mediaInputWrapRef} className={`adv-chat-input-wrap ${(!isMobile && chatBlocked) ? 'adv-chat-blur' : ''} ${(mediaMode && mb.step === "builder-brand-dna" && brandDnaRequestedChanges) ? 'adv-chat-input-wrap-full' : ''}`}>
                            
                            {mediaMode && renderOptionsExtension()}

                             <div className={`adv-chat-input-box ${hasOptionsOpen ? 'has-extension' : ''}`}>
                                <textarea ref={taRef} value={input} rows={1} 
                                    disabled={mediaMode ? (mb.generating || mb.step === 'loading' || (mb.step === 'builder-brand-dna' && !brandDnaRequestedChanges)) : (busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10))}
                                    onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                                    onKeyDown={onKey}
                                    placeholder={mediaMode ? (mb.step === 'builder-image-output' ? 'Type feedback to refine generated images...' : mediaPlaceholder) : (creditBalance !== null && creditBalance <= 0 && msgCount >= 10 ? 'Message limit reached — add credits to continue' : (typedPlaceholder || 'Ask Mr LAD...'))}
                                    className="adv-chat-ta" />
                                <div className="adv-chat-input-foot">
                                  {/* Left cluster — Accelerators sits beside + (foot is space-between). */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ position: 'relative' }}>
                                        {mediaMode ? (
                                            <button 
                                                className="adv-chat-attach-btn" 
                                                title="Upload reference images" 
                                                onClick={(e) => { e.stopPropagation(); mediaFileInputRef.current?.click(); }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                            </button>
                                        ) : (
                                            <>
                                                <button className="adv-chat-attach-btn" title="Add files or tools" onClick={(e) => { e.stopPropagation(); setShowChatAttachMenu(!showChatAttachMenu); }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                                </button>
                                                {showChatAttachMenu && (
                                                    <div className="adv-attach-menu" onClick={e => e.stopPropagation()}>
                                                        <div className="adv-attach-item" onClick={() => { fileInputRef.current?.click(); setShowChatAttachMenu(false); }}>
                                                            <div className="adv-attach-icon" style={{ background: '#dcfce7' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="adv-attach-label">Import leads</div>
                                                                <div className="adv-attach-sub">CSV, Excel, images, PDFs</div>
                                                            </div>
                                                        </div>
                                                        <div className="adv-attach-item" onClick={() => { openContactPicker(); setShowChatAttachMenu(false); }}>
                                                            <div className="adv-attach-icon" style={{ background: '#dce3f5' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b1957" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="adv-attach-label">Select contacts</div>
                                                                <div className="adv-attach-sub">Pick from your existing contacts</div>
                                                            </div>
                                                        </div>
                                                        <div className="adv-attach-item" onClick={() => { setShowChatAttachMenu(false); setShowCustomWorkflow(true); }}>
                                                            <div className="adv-attach-icon" style={{ background: '#ede9fe' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round"><circle cx="5" cy="6" r="3" /><circle cx="19" cy="6" r="3" /><circle cx="12" cy="18" r="3" /><path d="M7.5 8L10 15M16.5 8L14 15" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="adv-attach-label">Custom Accelerator</div>
                                                                <div className="adv-attach-sub">Source → outreach nodes</div>
                                                            </div>
                                                        </div>
                                                        <div className="adv-attach-divider" />
                                                        <div className="adv-attach-item" onClick={() => { setShowChatAttachMenu(false); router.push('/settings'); }}>
                                                            <div className="adv-attach-icon" style={{ background: '#fef3c7' }}>
                                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
                                                            </div>
                                                            <div>
                                                                <div className="adv-attach-label">Connect tools</div>
                                                                <div className="adv-attach-sub">LinkedIn, HubSpot, Salesforce</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {!mediaMode && (
                                        <RolesLauncher onPick={startRole} />
                                    )}
                                  </div>
                                    {/* Premium Search or Mic Button based on mediaMode */}
                                    {mediaMode ? (
                                        <button
                                            className={`adv-premium-btn ${isRecording ? 'recording-pulse' : ''}`}
                                            onClick={toggleRecording}
                                            disabled={beautifying}
                                            title={beautifying ? "Beautifying..." : isRecording ? "Stop voice transcription" : "Talk to Mr. LADs — voice interaction"}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '3px 8px', borderRadius: '12px',
                                                border: isRecording ? '1.5px solid #ef4444' : 'none',
                                                cursor: beautifying ? 'not-allowed' : 'pointer',
                                                fontSize: '11px', fontWeight: 600,
                                                transition: 'all 0.15s',
                                                background: beautifying ? '#e2e8f0' : isRecording ? '#fef2f2' : '#f1f5f9',
                                                color: beautifying ? '#94a3b8' : isRecording ? '#ef4444' : '#64748b',
                                                boxShadow: 'none',
                                            }}
                                        >
                                            {beautifying ? (
                                                <Loader2 className="size-3 animate-spin" />
                                            ) : isRecording ? (
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '3px', color: '#ef4444', flexShrink: 0 }}>
                                                    <rect x="4" y="4" width="16" height="16" rx="2" />
                                                </svg>
                                            ) : (
                                                <Mic className="size-3" style={{ strokeWidth: 2.5 }} />
                                            )}
                                            {beautifying ? "Beautifying..." : isRecording ? "Stop" : "Talk to Mr. LADs"}
                                        </button>
                                    ) : (
                                        <button
                                            className="adv-premium-btn"
                                            onClick={() => setUseSalesNav(v => !v)}
                                            title={useSalesNav ? 'Premium Search ON — Google X-Ray + Sales Navigator (1 credit/search)' : 'Enable Premium Search: Google X-Ray + Sales Navigator (1 credit/search)'}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                                padding: '3px 8px', borderRadius: '12px', border: 'none',
                                                cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                                                transition: 'all 0.15s',
                                                background: useSalesNav ? '#0a66c2' : '#f1f5f9',
                                                color: useSalesNav ? '#fff' : '#64748b',
                                                boxShadow: useSalesNav ? '0 1px 4px rgba(10,102,194,.35)' : 'none',
                                            }}
                                        >
                                            {/* Star icon for Premium */}
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            {useSalesNav ? 'Premium Search ON' : 'Premium Search'}
                                        </button>
                                    )}
                                    <button 
                                        className="adv-send-circle adv-send-sm" 
                                        disabled={mediaMode ? ((!input.trim() && (!mb.references || mb.references.length === 0)) || mb.generating || mb.step === 'loading' || (mb.step === 'builder-brand-dna' && !brandDnaRequestedChanges)) : (!input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10))} 
                                        onClick={mediaMode ? () => { if (input.trim() || (mb.references && mb.references.length > 0)) { submitMediaInput(input.trim()); setInput(''); if (taRef.current) taRef.current.style.height = 'auto'; } } : onChatSend}
                                        style={{ 
                                            background: (mediaMode ? ((!input.trim() && (!mb.references || mb.references.length === 0)) || mb.generating || mb.step === 'loading' || (mb.step === 'builder-brand-dna' && !brandDnaRequestedChanges)) : (!input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10))) ? '#e5e7eb' : '#172560', 
                                            boxShadow: (mediaMode ? ((!input.trim() && (!mb.references || mb.references.length === 0)) || mb.generating) : (!input.trim() || busy)) ? 'none' : '0 2px 8px rgba(23,37,96,.3)' 
                                        }}
                                    >
                                        {mediaMode && mb.generating ? <div className="adv-spinner" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                                    </button>
                                </div>
                                {!mediaMode && (
                                    <div className="adv-msg-counter">{creditBalance !== null && creditBalance > 0 ? `${msgCount} messages used` : `${msgCount}/10 messages used`}</div>
                                )}
                            </div>
                        </div>
                    )}
                    {messages.length === 0 && !mediaMode && (
                        <div className="adv-gemini-chips">

                            <button className="adv-gemini-chip" onClick={() => { setInput('Connect me with founders in trading companies in UAE'); taRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                Founders in trading in UAE
                            </button>
                            <button className="adv-gemini-chip" onClick={() => { setInput('Schedule sales meetings with procurement managers in HVAC in UAE'); taRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                Sales meetings with HVAC managers
                            </button>
                            <button className="adv-gemini-chip" onClick={() => { setInput('Find VP of Sales in SaaS companies in UK'); taRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg>
                                VP of Sales in UK SaaS
                            </button>
                            <button className="adv-gemini-chip" onClick={() => { setInput('Strengthen my relationship with existing clients'); taRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1a5.5 5.5 0 1 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>
                                Strengthen client relationships
                            </button>
                            <button className="adv-gemini-chip" onClick={() => { setInput(ICP_LEADS_PROMPT); taRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></svg>
                                Get leads from my active ICP
                            </button>
                            <button className="adv-gemini-chip" onClick={handleStartMediaGeneration}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                Media Generation
                            </button>
                        </div>
                    )}
                    {/* Hidden file input — accepts all supported lead import formats */}
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.pdf" className="hidden" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleInboundFile(f); e.target.value = ''; }} />
                    <input ref={mediaFileInputRef} type="file" accept="image/*" multiple className="hidden" style={{ display: 'none' }}
                        onChange={e => {
                            if (e.target.files) {
                                Array.from(e.target.files).forEach(file => {
                                    mb.uploadReference(file);
                                });
                            }
                            e.target.value = '';
                        }} />
                </div>

                {/* MOBILE ICP BUTTON (Always visible on mobile) */}
                {isMobile && messages.length === 0 && (
                    <div className="adv-mobile-icp-box">
                        <button
                            className="adv-mobile-icp-btn"
                            onClick={() => setShowPlayground(true)}
                            title="ICP Discovery"
                        >
                            <Sparkles size={22} color="#fff" />
                        </button>
                    </div>
                )}

                {/* MOBILE BOTTOM NAVIGATION (Chat/Leads/Flow) */}
                {isMobile && (messages.length > 0 || leads.length > 0 || inboundLeads.length > 0) && (
                    <div className="adv-mobile-footer">
                        <button
                            className={`adv-footer-btn ${!showPanel ? 'active' : ''}`}
                            onClick={() => setShowPanel(false)}
                        >
                            <div className="adv-footer-btn-icon"><MessageSquare size={20} /></div>
                            <span>Chat</span>
                        </button>
                        <button
                            disabled={leads.length === 0 && inboundLeads.length === 0}
                            className={`adv-footer-btn ${showPanel === 'leads' ? 'active' : ''} ${(leads.length > 0 || inboundLeads.length > 0) ? 'has-data' : ''}`}
                            onClick={() => setShowPanel('leads')}
                        >
                            <div className="adv-footer-btn-icon"><Users size={20} /></div>
                            <span>Leads</span>
                        </button>
                        <button
                            className={`adv-footer-btn ${showPanel === 'workflow' ? 'active' : ''}`}
                            onClick={() => setShowPanel('workflow')}
                        >
                            <div className="adv-footer-btn-icon"><Zap size={20} /></div>
                            <span>Flow</span>
                        </button>
                    </div>
                )}

                {/* RIGHT: PANELS */}
                {(showPanel === 'leads' || showPanel === 'workflow') && (leads.length > 0 || inboundLeads.length > 0 || filteredLeads.length > 0 || showPanel === 'workflow') && (
                    <div className="adv-leads-panel">
                        {/* Split-screen panel header */}
                        <div className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-5 py-3.5 dark:border-gray-800 dark:bg-[#000724]">
                            {/* Toggle Container */}
                            <div className="flex flex-1 gap-1 rounded-[10px] bg-gray-100 p-[3px] dark:bg-[#0b1229]">
                                <button
                                  onClick={() => setShowPanel('leads')}
                                  className={`flex-1 rounded-[8px] px-3 py-1.5 text-[13.5px] font-semibold transition-all duration-150 ${
                                    showPanel === 'leads'
                                      ? 'bg-white text-[#0b1957] shadow-sm dark:bg-[#2563eb] dark:text-white'
                                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                  }`}
                                >
                                    👤 Leads {leads.length > 0 || inboundLeads.length > 0 ? `(${inboundMode ? inboundLeads.length : leads.length})` : ''}
                                </button>
                                <button
                                  onClick={() => setShowPanel('workflow')}
                                  className={`flex-1 rounded-[8px] px-3 py-1.5 text-[13.5px] font-semibold transition-all duration-150 ${
                                    showPanel === 'workflow'
                                      ? 'bg-white text-[#0b1957] shadow-sm dark:bg-[#2563eb] dark:text-white'
                                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                                  }`}
                                >
                                    ⚡ Workflow
                                </button>
                            </div>

                            <button
                              onClick={() => setShowPanel(false)}
                              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:bg-[#0b1229] dark:text-gray-400 dark:hover:bg-[#161d36] dark:hover:text-white"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {showPanel === 'leads' ? (

                          <div className="adv-panel-body">
                              <div className="flex justify-between items-center">
                                  <h2 className="adv-panel-title m-0 text-gray-900 dark:text-gray-100">
                                        {inboundMode ? 'Your Imported Leads' : 'Your Lead Results'}
                                    </h2>
                                    {!inboundMode && totalResults > 0 && (
                                      <span className="text-[12px] text-gray-500 dark:text-slate-300 whitespace-nowrap">
                                            {((searchPage - 1) * leadCount) + 1}-{Math.min(searchPage * leadCount, totalResults)} of {totalResults}
                                        </span>
                                    )}
                                    {inboundMode && inboundLeads.length > 0 && (
                                      <span className="text-[12px] bg-blue-100 dark:bg-blue-900/50 text-[#0b1957] dark:text-blue-200 px-[10px] py-[3px] rounded-[20px] font-semibold">
                                            {inboundLeads.length} contacts
                                        </span>
                                    )}
                                    {!inboundMode && leads.length > 0 && totalResults === 0 && (
                                      <span className="text-[12px] bg-blue-100 dark:bg-blue-900/50 text-[#0b1957] dark:text-blue-200 px-[10px] py-[3px] rounded-[20px] font-semibold">
                                            {leads.length} contact{leads.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>

                                <p className="adv-panel-desc">
                                    <span className="adv-navy">✦</span>
                                    {inboundMode
                                        ? ' Leads imported from your file — ready to launch a campaign'
                                        : targeting
                                            ? `${targeting.job_titles?.length > 0 ? ` ${targeting.job_titles.join(', ')}` : ''}${targeting.industries?.length > 0 ? ` in ${targeting.industries.join(', ')}` : ''}${targeting.locations?.length > 0 ? ` located in ${targeting.locations.join(', ')}` : ''} who are focused on growth and lead generation.`
                                            : ' Contacts ready for outreach — review and launch your campaign.'
                                    }
                                </p>

                                {/* Selection bar — pick which prospects to enroll into the campaign */}
                                {!inboundMode && leads.length > 0 && (
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: '8px', margin: '4px 0 10px', padding: '8px 12px',
                                        background: '#f1f5ff', border: '1px solid #dbe4ff', borderRadius: '10px',
                                    }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0b1957' }}>
                                            {selectedLeadIds.size} of {leads.length} selected
                                        </span>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); selectAllLeads(); }}
                                                style={{ fontSize: '12px', fontWeight: 600, color: '#172560', background: '#fff', border: '1px solid #c7d2fe', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}
                                            >
                                                Select all
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); clearLeadSelection(); }}
                                                style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' }}
                                            >
                                                Clear
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Inbound leads (CSV upload) */}
                                {inboundMode && inboundLeads.length > 0 && (
                                    <div className="adv-leads-list">
                                        {inboundLeads.map((lead, i) => (
                                          <div key={i} className="adv-lead-card flex items-start gap-3 p-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                              {inboundLeadIds[i] && (
                                                  <input
                                                      type="checkbox"
                                                      checked={selectedLeadIds.has(inboundLeadIds[i])}
                                                      onChange={(e) => { e.stopPropagation(); toggleLeadSelection(inboundLeadIds[i]); }}
                                                      title={selectedLeadIds.has(inboundLeadIds[i]) ? 'Selected for campaign — uncheck to remove' : 'Add to campaign'}
                                                      className="mt-2.5 flex-shrink-0 cursor-pointer"
                                                      style={{ width: '17px', height: '17px', accentColor: '#4f46e5' }}
                                                  />
                                              )}
                                              <div className="adv-lead-avatar w-10 h-10 self-start rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                                                   style={{ background: lead.profilePicture ? 'transparent' : avatarColor(`${lead.firstName} ${lead.lastName}`) }}>
                                                  {lead.profilePicture
                                                      ? <img src={lead.profilePicture} alt={`${lead.firstName} ${lead.lastName}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                                      : (initials(`${lead.firstName} ${lead.lastName}`) || '?')}
                                              </div>
                                                <div className="adv-lead-info flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="adv-lead-name text-gray-900 dark:text-gray-100 font-bold text-sm">{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}</span>
                                                        <span className="adv-verified text-green-600 dark:text-green-400">✓</span>
                                                    </div>
                                                    <div className="adv-lead-title text-xs text-gray-500 dark:text-slate-300 truncate">
                                                        {lead.companyName || 'No company'}
                                                        {lead.location ? <span className="text-gray-400 dark:text-slate-400"> · {lead.location}</span> : null}
                                                    </div>
                                                    {lead.title && lead.title !== lead.companyName && (
                                                        <div className="text-xs text-gray-500 dark:text-slate-300 truncate" title={lead.title}>{lead.title}</div>
                                                    )}
                                                    {lead.email && <div className="text-xs text-gray-500 dark:text-slate-300 flex items-center gap-1 overflow-hidden"><span className="flex-shrink-0">✉️</span><span className="truncate">{lead.email}</span></div>}
                                                    {lead.phone && <div className="text-xs text-gray-500 dark:text-slate-300 flex items-center gap-1 overflow-hidden"><span className="flex-shrink-0">📞</span><span className="truncate">{lead.phone}</span></div>}
                                                    {lead.linkedinProfile && (
                                                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                                            <a href={lead.linkedinProfile} target="_blank" rel="noopener noreferrer"
                                                               className="flex items-center gap-1 no-underline hover:underline">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                                LinkedIn Profile
                                                            </a>
                                                        </div>
                                                    )}
                                                    {lead.notes && (
                                                      <div className="mt-4 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-transparent">
                                                          {/* Header */}
                                                          <button
                                                            onClick={() => toggleSummary(i)}
                                                            className="w-full flex items-center justify-between p-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                                                          >
                                                              <div className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase">
                                                                  <Sparkles className="w-3 h-3 text-indigo-400" />
                                                                  AI Research Summary
                                                              </div>
                                                              <ChevronDown className={`w-3 h-3 transition-transform ${openSummaries.has(i) ? 'rotate-180' : ''}`} />
                                                          </button>

                                                          {/* Content */}
                                                          {openSummaries.has(i) && (
                                                            <div className="p-4 pt-0 text-sm text-gray-600 dark:text-gray-300 leading-relaxed border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30">
                                                                {lead.notes}
                                                            </div>
                                                          )}
                                                      </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => openEditLead(i)}
                                                      className="h-5 w-5"

                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                        onClick={() => openDeleteConfirmation(i)}
                                                        className="h-5 w-5 text-destructive"
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#fecaca';
                                                            e.currentTarget.style.borderColor = '#fca5a5';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#fee2e2';
                                                            e.currentTarget.style.borderColor = '#fecaca';
                                                        }}
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* LinkedIn search leads */}
                                {!inboundMode && (
                                    <div className="adv-leads-list">
                                        {leads.map((lead, i) => (
                                            <div key={i} className={`adv-lead-card flex items-center gap-[14px] p-[14px_16px] border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${lead.locked ? 'adv-lead-locked' : ''}`}>
                                                {lead.profile_picture ? (
                                                    <img src={lead.profile_picture} alt={lead.name} className="w-[42px] h-[42px] rounded-full object-cover flex-shrink-0" />
                                                ) : (
                                                    <div className="adv-lead-avatar w-[42px] h-[42px] rounded-full flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0" style={{ background: avatarColor(lead.name) }}>
                                                        {initials(lead.name)}
                                                    </div>
                                                )}
                                                <div className="adv-lead-info flex-1 min-w-0">
                                                    <div className="flex items-center gap-[8px]">
                                                        {lead.profile_url && lead.profile_url.startsWith('http') ? (
                                                            <a href={lead.profile_url} target="_blank" rel="noopener noreferrer" className="adv-lead-name" style={{ textDecoration: 'none', color: 'inherit' }} onClick={e => e.stopPropagation()}>
                                                                {lead.name} {!lead.locked && <span className="adv-verified text-green-600 dark:text-green-400 ml-1">✓</span>}
                                                            </a>
                                                        ) : (
                                                            <span className="adv-lead-name text-gray-900 dark:text-gray-100 font-bold text-[14px]">{lead.name} {!lead.locked && <span className="adv-verified">✓</span>}</span>
                                                        )}
                                                        {!targetingFiltersActive && lead.icp_score !== undefined && (
                                                          <span className={`inline-flex items-center gap-[3px] px-[8px] py-[2px] rounded-[12px] text-[11px] font-bold ${scoreToMatchLevel(lead.icp_score) === 'strong' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300' : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300'}`}>
                                                                {scoreToMatchLevel(lead.icp_score) === 'strong' ? '🟢' : '🟡'} {lead.icp_score}%
                                                            </span>
                                                        )}
                                                        {/* Scoring still in flight (defer_icp): hold the chip's place with a
                                                            pulsing dot so the row doesn't reflow when the real score lands. */}
                                                        {!targetingFiltersActive && lead.icp_score === undefined && icpScoringPending && (
                                                          <span
                                                            className="adv-icp-pending inline-flex items-center gap-[5px] px-[8px] py-[2px] rounded-[12px] text-[11px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                                                            title="Scoring this lead against your ICP…"
                                                          >
                                                            <span className="adv-icp-pending-dot" />
                                                            Scoring
                                                          </span>
                                                        )}
                                                    </div>
                                                    <div className="adv-lead-title">
                                                        {lead.headline || (lead.profile_url ? 'LinkedIn User' : lead.phone ? 'Phone Contact' : lead.email ? 'Email Contact' : 'Contact')}
                                                    </div>
                                                    {/* Company name under the name/title */}
                                                    {lead.current_company && <div className="adv-lead-company">{lead.current_company}</div>}
                                                    {lead.location && <div className="adv-lead-location text-[11px] text-gray-400 dark:text-gray-500">📍 {lead.location}</div>}
                                                    {lead.inferred_nationality && (
                                                        <div className="flex items-center gap-[4px] mt-[3px]">
                                                            <span className="inline-flex items-center gap-[3px] px-[7px] py-[1px] rounded-[10px] text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                                🌍 {lead.inferred_nationality}
                                                                {lead.nationality_confidence && lead.nationality_confidence >= 70 && (
                                                                    <span className="opacity-60 ml-[2px]">·{lead.nationality_confidence}%</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!targetingFiltersActive && lead.icp_reasoning && (
                                                        <div className="text-[11px] text-gray-500 dark:text-slate-300 mt-[4px] italic leading-relaxed">
                                                            {lead.icp_reasoning}
                                                        </div>
                                                    )}
                                                    {lead.enriched_profile?.skills && lead.enriched_profile.skills.length > 0 && (
                                                        <div className="flex gap-[4px] flex-wrap mt-[6px]">
                                                            {lead.enriched_profile.skills.slice(0, 4).map((skill, si) => (
                                                                <span key={si} className="px-[6px] py-[1px] rounded-[8px] text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                                    {skill}</span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {lead.profile_url ? (
                                                        <div className="adv-lead-platform mt-[4px]">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                        </div>
                                                    ) : lead.phone ? (
                                                        <div className="adv-lead-platform" style={{ fontSize: '13px' }}>📞</div>
                                                    ) : lead.email ? (
                                                        <div className="adv-lead-platform" style={{ fontSize: '13px' }}>✉️</div>
                                                    ) : null}
                                                </div>
                                                <div className="flex flex-col items-center gap-[4px] flex-shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        title={selectedLeadIds.has(lead.id) ? 'Selected for campaign — click to remove' : 'Add to campaign'}
                                                        checked={selectedLeadIds.has(lead.id)}
                                                        onChange={(e) => { e.stopPropagation(); toggleLeadSelection(lead.id); }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#172560' }}
                                                    />
                                                    <button
                                                       className="adv-lead-action flex items-center justify-center w-[36px] h-[36px] rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Generate Summary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (!lead.locked) handleViewSummary(lead);
                                                        }}
                                                    >
                                                        {lead.locked ? (
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                                        ) : (
                                                            <Sparkles size={18} color="#172560" />
                                                        )}
                                                    </button>
                                                    {!lead.locked && (
                                                        <div className="flex gap-[2px]">
                                                            <button
                                                                title="Good match"
                                                                onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'good'); }}
                                                                className={`p-[3px_5px] rounded-[6px] text-[14px] ${leadFeedback[lead.id] === 'good' ? 'bg-green-100 dark:bg-green-900' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                            >
                                                                👍
                                                            </button>
                                                            <button
                                                                title="Bad match"
                                                                onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'bad', lead.name); }}
                                                                style={{
                                                                    border: 'none', background: leadFeedback[lead.id] === 'bad' ? '#fee2e2' : 'transparent',
                                                                    borderRadius: '6px', padding: '3px 5px', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                            >
                                                                👎
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )} {/* end !inboundMode leads list */}

                                {/* ── Filtered-out leads (below ICP threshold) ── */}
                                {!inboundMode && filteredLeads.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                        {/* Banner */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', borderRadius: '8px',
                                            background: '#fefce8', border: '1px solid #fde68a',
                                        }}>
                                            <span style={{ fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                                                Filtered {filteredLeads.length} lead{filteredLeads.length !== 1 ? 's' : ''} below ICP threshold of 50
                                            </span>
                                            <button
                                                onClick={() => setShowFilteredLeads(v => !v)}
                                                style={{
                                                    fontSize: '12px', fontWeight: 600, color: '#b45309',
                                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px', padding: '2px 4px',
                                                    borderRadius: '4px',
                                                }}
                                            >
                                                {showFilteredLeads ? 'Hide' : 'Show all'}
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ transform: showFilteredLeads ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                        </div>

                                        {/* Collapsible lead cards */}
                                        {showFilteredLeads && (
                                            <div className="adv-leads-list" style={{ marginTop: '6px', opacity: 0.85 }}>
                                                {filteredLeads.map((lead, i) => (
                                                    <div key={i} className="adv-lead-card" style={{ background: '#fafafa', border: '1px solid #f3f4f6' }}>
                                                        {/* Avatar */}
                                                        {lead.profile_picture ? (
                                                            <img src={lead.profile_picture} alt={lead.name} className="adv-lead-avatar-img" style={{ filter: 'grayscale(30%)' }} />
                                                        ) : (
                                                            <div className="adv-lead-avatar" style={{ background: '#d1d5db', color: '#6b7280' }}>
                                                                {(lead.name || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}

                                                        {/* Info */}
                                                        <div className="adv-lead-info">
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {lead.profile_url && lead.profile_url.startsWith('http') ? (
                                                                    <a href={lead.profile_url} target="_blank" rel="noopener noreferrer"
                                                                        className="adv-lead-name" style={{ textDecoration: 'none', color: '#374151' }} onClick={e => e.stopPropagation()}>
                                                                        {lead.name}
                                                                    </a>
                                                                ) : (
                                                                    <span className="adv-lead-name" style={{ color: '#374151' }}>{lead.name}</span>
                                                                )}
                                                                {lead.icp_score !== undefined && (
                                                                    <span style={{
                                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                                                        background: scoreToMatchLevel(lead.icp_score) === 'strong' ? '#dcfce7' : '#fef9c3',
                                                                        color: scoreToMatchLevel(lead.icp_score) === 'strong' ? '#166534' : '#854d0e',
                                                                    }}>
                                                                        {scoreToMatchLevel(lead.icp_score) === 'strong' ? '🟢' : '🟡'} {lead.icp_score}%
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="adv-lead-title" style={{ color: '#9ca3af' }}>
                                                                {lead.headline || (lead.profile_url ? 'LinkedIn User' : 'Contact')}
                                                            </div>
                                                            {/* Company name under the name/title */}
                                                            {lead.current_company && <div className="adv-lead-company" style={{ color: '#9ca3af' }}>{lead.current_company}</div>}
                                                            {lead.location && <div className="adv-lead-location" style={{ color: '#9ca3af' }}>📍 {lead.location}</div>}
                                                            {lead.icp_reasoning && (
                                                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', lineHeight: '1.4', fontStyle: 'italic' }}>
                                                                    {lead.icp_reasoning}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Feedback buttons */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                            <div style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>Good fit?</div>
                                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                                <button
                                                                    title="Actually a good fit"
                                                                    onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'good'); }}
                                                                    style={{
                                                                        border: 'none', background: leadFeedback[lead.id] === 'good' ? '#dcfce7' : '#f3f4f6',
                                                                        borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                >👍</button>
                                                                <button
                                                                    title="Confirmed bad fit"
                                                                    onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'bad', lead.name); }}
                                                                    style={{
                                                                        border: 'none', background: leadFeedback[lead.id] === 'bad' ? '#fee2e2' : '#f3f4f6',
                                                                        borderRadius: '6px', padding: '4px 6px', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
                                                                        transition: 'all 0.15s',
                                                                    }}
                                                                >👎</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* ── end filtered-out leads ── */}

                                {!inboundMode && leads.some(l => l.locked) && (
                                    <div className="adv-panel-footer" style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '0px solid #e5e7eb', marginTop: '8px' }}>
                                        <button
                                            onClick={() => {
                                                if (creditBalance !== null && creditBalance <= 0) {
                                                    setShowRechargeModal(true);
                                                } else {
                                                    setLeads(prev => prev.map(l => ({ ...l, locked: false })));
                                                }
                                            }}
                                            style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                color: '#ffffff',
                                                padding: '10px 20px',
                                                borderRadius: '24px',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 4px 12px rgba(30, 27, 75, 0.2)'
                                            }}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 27, 75, 0.3)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 27, 75, 0.2)'; }}
                                        >
                                            <Gem size={16} color="#fbbf24" fill="#fbbf24" />
                                            Unlock Results
                                        </button>
                                    </div>
                                )}

                                {/* Get More Leads button — show when there are leads and either a
                                cursor token is available or the backend reported more total
                                results than we're currently displaying */}
                                {!inboundMode && leads.length > 0 && !noMoreLeads && (
                                    <div style={{
                                        display: 'flex', justifyContent: 'center',
                                        padding: '14px 16px', borderTop: '1px solid #e5e7eb', marginTop: '4px',
                                    }}>
                                        <button
                                            disabled={loadingMore}
                                            onClick={loadMoreLeads}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 28px', borderRadius: '24px', fontSize: '14px', fontWeight: 600,
                                                border: '1px solid #e5e7eb',
                                                background: loadingMore ? '#f9fafb' : '#0b1957',
                                                color: loadingMore ? '#9ca3af' : '#fff',
                                                cursor: loadingMore ? 'default' : 'pointer',
                                                transition: 'all 0.15s',
                                            }}
                                        >
                                            {loadingMore ? (
                                                <>
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 11-6.219-8.56" /></svg>
                                                    Loading more leads...
                                                </>
                                            ) : (
                                                <>Get More Leads →</>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                          <div className="flex flex-1 flex-col overflow-auto bg-white dark:bg-[#000724]">
                              {/* Workflow panel header */}
                              <div className="flex-shrink-0 border-b border-gray-200 bg-white px-5 py-4 dark:border-gray-800 dark:bg-[#000724]">
                                  <div className="mb-1 text-[17px] font-extrabold text-gray-900 dark:text-slate-300">
                                      Campaign Accelerator
                                  </div>
                                  <div className="text-[12.5px] text-gray-500 dark:text-slate-300">
                                      Live preview of your outreach sequence
                                  </div>
                              </div>

                              {/* Preview Body */}
                              <div className="flex-1 overflow-hidden p-0 py-1">
                                  <WorkflowPreviewPanel />
                              </div>
                          </div>
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════
                    AI PLAYGROUND DRAWER — Chat + Card based
                    ═══════════════════════════════════════════════ */}
                {showPlayground && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9998,
                        display: 'flex', alignItems: 'stretch',
                    }}>
                        {/* Backdrop */}
                        <div onClick={() => setShowPlayground(false)} className="flex-1 bg-black/35 backdrop-blur-[2px]" />

                        {/* Drawer */}
                        <div className="w-[480px] max-w-[96vw] bg-white dark:bg-[#000724] flex flex-col shadow-[-8px_0_40px_rgba(0,0,0,.18)] animate-[slideInRight_0.28s_cubic-bezier(0.4,0,0.2,1)_both] overflow-hidden">
                            {/* ── Header ── */}
                            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-br from-[#f0f3ff] to-[#e8ecfa] dark:from-[#000c3b] dark:to-[#000724] flex-shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0b1957] to-[#1a3a8f] dark:from-[#0b1957] dark:to-[#1a3a8f] flex items-center justify-center">
                                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                                                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-[15px] font-bold text-gray-900 dark:text-white">ICP Discovery</div>
                                            <div className="text-[11.5px] font-semibold text-[#0b1957] dark:text-blue-300">
                                                {pgIsComplete ? '✅ ICP profile complete!' : 'Answer questions to power smarter lead discovery'}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={pgStartConversation}
                                            title="Restart conversation"
                                        className="p-2 sm:px-2.5 sm:py-1 text-[11px] font-bold rounded-lg border-none text-white dark:text-white bg-[#0B1957] dark:bg-[#2563eb] hover:bg-[#13257e] dark:hover:bg-[#2563eb]/90 flex items-center justify-center gap-1 cursor-pointer transition-all shadow-sm outline-none"
                                      >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white dark:text-white flex-shrink-0">
                                                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                                                <path d="M3 3v5h5" />
                                            </svg>
                                            <span className="hidden sm:inline">Restart</span>
                                        </button>
                                        <button onClick={() => setShowPlayground(false)}
                                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#000724] hover:bg-gray-50 dark:hover:bg-[#1A2A43] cursor-pointer text-gray-600 dark:text-gray-300 transition-all"
                                      >
                                          <X size={15} />
                                        </button>
                                    </div>
                                </div>

                                {/* Profile completeness bar — math comes from the shared SDK helper so
                                    the wizard / Settings / this drawer always agree. When pgIsComplete
                                    we lock to 100% regardless of trailing blank optional fields. */}
                                {(() => {
                                    const c = computeCompleteness(businessProfile as BusinessProfile);
                                    const filled = pgIsComplete ? c.total : c.filled;
                                    const total = c.total;
                                    const pct = pgIsComplete ? 100 : c.pct;
                                    return (
                                        <div className="mt-3">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">Profile completeness</span>
                                                <span className={`text-[11px] font-bold ${pct >= 70 ? 'text-emerald-500' : 'text-[#0b1957] dark:text-blue-400'}`}>{pct}% ({filled}/{total} fields)</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                              className="h-full bg-emerald-500 transition-all duration-500"
                                              style={{ width: `${pct}%` }}
                                            />
                                            </div>

                                            {/* Edit affordance — once any field is filled, the tenant can jump
                                                to the full editor (Settings → Business Profile) to change any of
                                                the 14 values. The chat is for first capture; Settings is for edits. */}
                                            {filled > 0 && (
                                                <button
                                                    onClick={() => router.push('/settings?tab=businessprofile')}
                                            title="Open the Business Profile editor to change any saved field"
                                            className="mt-2 w-full px-2.5 py-2 rounded-lg border border-[#c7d2fe] dark:border-blue-900 bg-white dark:bg-[#000724] text-[#0b1957] dark:text-blue-300 text-[11.5px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1A2A43] transition-colors"
                                          >
                                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                                    Review &amp; edit your {total} fields
                                                </button>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* ── Chat Messages ── */}
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 bg-gray-50 dark:bg-[#000724]">
                                {pgChatHistory.length === 0 && !pgBusy && (
                                    <div className="flex flex-col items-center justify-center flex-1 p-10 text-center gap-4">
                                        <div className="w-[50px] h-[50px] rounded-full flex items-center justify-center
                                                                            bg-transparent transition-colors duration-300">
                                            <AgentVisualizer state="idle" size={36} />
                                        </div>
                                        <div className="max-w-[300px]">
                                            <div className="text-base font-bold text-gray-900 dark:text-white mb-2">Define Your Ideal Customer Profile</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                                Answer a few questions about your business and I&apos;ll identify exactly who you should target for outreach.
                                            </div>
                                        </div>
                                        <button
                                            onClick={pgStartConversation}
                                      className="flex items-center gap-2 px-7 py-3 rounded-xl border-none font-bold text-sm cursor-pointer transition-all shadow-[0_4px_14px_rgba(11,25,87,.4)] bg-gradient-to-br from-[#0b1957] to-[#1a3a8f] dark:from-blue-600 dark:to-blue-800 text-white"
                                        >
                                            <Sparkles size={16} />
                                            Start AI Setup
                                        </button>
                                    </div>
                                )}

                                {pgChatHistory.map((msg, idx) => (
                                    <div key={idx}>
                                        {msg.role === 'user' ? (
                                            <div className="flex justify-end">
                                          <div className="max-w-[78%] bg-gradient-to-br from-[#0b1957] to-[#2563eb] text-white rounded-[18px_18px_4px_18px] p-[10px_14px] text-[13.5px] leading-[1.55] shadow-[0_2px_8px_rgba(23,37,96,.2)]"
                                              >
                                                    {/* Hide card submission raw messages */}
                                                    {msg.content.startsWith('[Card submission:') ? '✅ Submitted' : msg.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2.5 items-start">
                                                <div className="w-8 h-8 flex-shrink-0">
                                                    <AgentVisualizer state="idle" size={32} />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="bg-white dark:bg-gray-800 rounded-[4px_18px_18px_18px] p-[10px_14px] text-[13.5px] text-gray-700 dark:text-gray-200 leading-[1.65] shadow-[0_1px_4px_rgba(0,0,0,.06)] border border-gray-100 dark:border-gray-700">
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Typing indicator */}
                                {pgBusy && (
                                    <div className="flex gap-2.5 items-start">
                                        <div className="w-8 h-8 flex-shrink-0">
                                            <AgentVisualizer state="thinking" size={32} />
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 rounded-[4px_18px_18px_18px] p-[12px_16px] shadow-[0_1px_4px_rgba(0,0,0,.06)] border border-gray-100 dark:border-gray-700 flex gap-1 items-center">
                                            {[0, 1, 2].map(i => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#0b1957] dark:bg-blue-400 animate-pulse" />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Active Card Input ── */}
                                {pgCurrentCard && !pgBusy && (() => {
                                    const card = pgCurrentCard;
                                    const fieldVal = pgCardValues[card.field];

                                    return (
                                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,.08)]">
                                            <div className="text-[12px] font-bold text-[#0b1957] dark:text-blue-300 mb-2.5 flex items-center gap-1.5">
                                                <Sparkles size={12} /> {card.label}
                                            </div>

                                            {/* TEXT / TEXTAREA */}
                                            {(card.type === 'text' || card.type === 'textarea') && (
                                                <div className="relative">
                                                    <textarea
                                                        rows={card.type === 'textarea' ? 3 : 1}
                                                        value={fieldVal || ''}
                                                        onChange={e => setPgCardValues({ [card.field]: e.target.value })}
                                                        placeholder={card.placeholder || ''}
                                                        autoFocus
                                                      className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 text-[13px] text-gray-700 dark:text-gray-100 resize-vertical outline-none bg-gray-50 dark:bg-gray-900 focus:border-[#0b1957] dark:focus:border-blue-500 ${card.type === 'textarea' ? 'pb-9' : ''}`}

                                                      onFocus={e => { e.currentTarget.style.borderColor = '#0b1957'; }}
                                                      onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && card.type !== 'textarea') { e.preventDefault(); pgSubmitCard(); } }}
                                                    />
                                                    {card.type === 'textarea' && (
                                                        <button
                                                            type="button"
                                                            onClick={pgGenerateSuggestion}
                                                            disabled={pgSuggesting}
                                                            title="Generate with AI"
                                                  className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-md border-none bg-gradient-to-br from-[#0b1957] to-[#1a3a8f] dark:from-blue-700 dark:to-blue-900 text-white text-[11.5px] font-semibold cursor-pointer disabled:bg-gray-300"
                                                        >
                                                            <Sparkles size={11} />
                                                            {pgSuggesting ? 'Generating…' : 'Generate with AI'}
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* CHIPS (multi or single select) */}
                                            {card.type === 'chips' && (
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                                                    {(card.options || []).map((opt: string) => {
                                                        const selected = Array.isArray(fieldVal) ? fieldVal.includes(opt) : fieldVal === opt;
                                                        return (
                                                            <button
                                                                key={opt}
                                                                onClick={() => {
                                                                    if (card.field === 'icpCompanySize' || card.field === 'campaignTone' || card.field === 'timezone') {
                                                                        // Single select
                                                                        setPgCardValues({ [card.field]: opt });
                                                                    } else {
                                                                        // Multi-select
                                                                        const current = Array.isArray(fieldVal) ? [...fieldVal] : [];
                                                                        const idx = current.indexOf(opt);
                                                                        if (idx >= 0) current.splice(idx, 1); else current.push(opt);
                                                                        setPgCardValues({ [card.field]: current });
                                                                    }
                                                                }}
                                                                style={{
                                                                    padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500,
                                                                    border: selected ? 'none' : '1.5px solid #e5e7eb',
                                                                    background: selected ? 'linear-gradient(135deg,#0b1957,#1a3a8f)' : '#f9fafb',
                                                                    color: selected ? '#fff' : '#374151',
                                                                    cursor: 'pointer', transition: 'all .12s',
                                                                }}
                                                            >{opt}</button>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* RADIO */}
                                            {card.type === 'radio' && (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                                    {(card.options || []).map((opt: string) => (
                                                        <button
                                                            key={opt}
                                                            onClick={() => setPgCardValues({ [card.field]: opt })}
                                                            style={{
                                                                textAlign: 'left', padding: '9px 14px', borderRadius: 10, fontSize: 13,
                                                                border: fieldVal === opt ? '2px solid #0b1957' : '1.5px solid #e5e7eb',
                                                                background: fieldVal === opt ? '#f0f3ff' : '#fff',
                                                                color: '#374151', cursor: 'pointer', fontWeight: 500,
                                                                display: 'flex', alignItems: 'center', gap: 8,
                                                            }}
                                                        >
                                                            <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${fieldVal === opt ? '#0b1957' : '#d1d5db'}`, background: fieldVal === opt ? '#0b1957' : 'transparent', transition: 'all .12s', flexShrink: 0 }} />
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* TAGS */}
                                            {card.type === 'tags' && (
                                                <div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                                        {(Array.isArray(fieldVal) ? fieldVal : []).map((tag: string, ti: number) => (
                                                            <div key={ti} style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                                background: '#dce3f5', borderRadius: 16, padding: '4px 10px',
                                                                fontSize: 12.5, color: '#0b1957', fontWeight: 600,
                                                            }}>
                                                                {tag}
                                                                <button onClick={() => {
                                                                    const updated = [...fieldVal];
                                                                    updated.splice(ti, 1);
                                                                    setPgCardValues({ [card.field]: updated });
                                                                }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#0b1957', display: 'flex', lineHeight: 1 }}>
                                                                    <X size={11} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <input
                                                            value={pgTagInput}
                                                            onChange={e => setPgTagInput(e.target.value)}
                                                            placeholder={card.placeholder || 'Type and press Enter'}
                                                            onKeyDown={e => {
                                                                if ((e.key === 'Enter' || e.key === ',') && pgTagInput.trim()) {
                                                                    e.preventDefault();
                                                                    const current = Array.isArray(fieldVal) ? [...fieldVal] : [];
                                                                    if (!current.includes(pgTagInput.trim())) current.push(pgTagInput.trim());
                                                                    setPgCardValues({ [card.field]: current });
                                                                    setPgTagInput('');
                                                                }
                                                            }}
                                                            style={{
                                                                flex: 1, border: '1.5px solid #e5e7eb', borderRadius: 8,
                                                                padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                                                            }}
                                                            onFocus={e => { e.currentTarget.style.borderColor = '#0b1957'; }}
                                                            onBlur={e => { e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* HOURS */}
                                            {card.type === 'hours' && (
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>From</div>
                                                        <input type="time" value={(fieldVal as any)?.from || '09:00'} onChange={e => setPgCardValues({ [card.field]: { ...(fieldVal as any || {}), from: e.target.value } })}
                                                            style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
                                                    </div>
                                                    <div style={{ marginTop: 16, color: '#9ca3af' }}>–</div>
                                                    <div>
                                                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4, fontWeight: 600 }}>To</div>
                                                        <input type="time" value={(fieldVal as any)?.to || '18:00'} onChange={e => setPgCardValues({ [card.field]: { ...(fieldVal as any || {}), to: e.target.value } })}
                                                            style={{ border: '1.5px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 13, outline: 'none' }} />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Submit card button */}
                                            <button
                                                onClick={pgSubmitCard}
                                                disabled={!fieldVal && !pgTagInput.trim() && card.type !== 'hours'}
                                          className="mt-3 w-full py-2 rounded-lg border-none text-[13px] font-bold text-white bg-[#0b1957] dark:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-400 cursor-pointer transition-all"
                                            >
                                                Submit →
                                            </button>
                                        </div>
                                    );
                                })()}

                                <div ref={pgMessagesEndRef} />
                            </div>

                            {/* ── Text Input Bar ── */}
                            {pgChatHistory.length > 0 && (
                                <div className="px-3.5 py-2.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 flex gap-2">
                                    <input
                                        value={pgInput}
                                        onChange={e => setPgInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); pgSendMessage(pgInput); } }}
                                        placeholder="Type a message or skip to next question…"
                                        disabled={pgBusy}
                                  className={`flex-1 border-[1.5px] rounded-[24px] px-4 py-2.5 text-[13.5px] outline-none transition-colors font-inherit 
                                        ${pgBusy
                                    ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-slate-300 focus:border-[#0b1957] dark:focus:border-blue-500'
                                  }`}
                                    />
                                    <button
                                        onClick={() => pgSendMessage(pgInput)}
                                        disabled={!pgInput.trim() || pgBusy}
                                    className={`w-[38px] h-[38px] rounded-full border-none shrink-0 flex items-center justify-center transition-all ${
                                    pgInput.trim() && !pgBusy
                                      ? 'bg-gradient-to-br from-[#0b1957] to-[#1a3a8f] dark:from-blue-700 dark:to-blue-900 cursor-pointer'
                                      : 'bg-gray-200 dark:bg-gray-700 cursor-default'
                                        }`}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                            )}

                            {/* ── Footer: Done / Apply ── */}
                            {pgIsComplete && (
                                <div style={{ padding: '10px 14px', borderTop: '1.5px solid #e5e7eb', background: '#f0fdf4', flexShrink: 0 }}>
                                    <button
                                        onClick={() => setShowPlayground(false)}
                                        style={{
                                            width: '100%', padding: '10px 0', borderRadius: 10, border: 'none',
                                            background: 'linear-gradient(135deg,#10b981,#059669)',
                                            color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                                            boxShadow: '0 4px 14px rgba(16,185,129,.35)',
                                        }}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                                        ✅ Profile Complete — Apply Context
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* RIGHT: Split-Screen Widget Panel */}
                {isSplitScreenStep && (
                    <div className="adv-media-brand-dna-panel" style={{ 
                        width: '40%', 
                        height: '100%', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '24px', 
                        position: 'relative', 
                        overflow: 'hidden' 
                    }}>
                        <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: 'translateY(-24px)' }}>
                            {renderActiveSplitWidget()}
                        </div>
                    </div>
                )}

                <MediaGenerationModal isOpen={showMediaModal} onClose={() => setShowMediaModal(false)} />

                {/* Credit Recharge Modal */}
                {showRechargeModal && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }} onClick={() => setShowRechargeModal(false)}>
                        <div onClick={(e) => e.stopPropagation()} style={{
                            background: '#fff', borderRadius: '20px', padding: '32px', width: '420px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.2)', textAlign: 'center',
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: 'linear-gradient(135deg, #fef3c7, #fde68a)', margin: '0 auto 16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
                            }}>
                                <Gem size={28} color="#b45309" />
                            </div>
                            <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>
                                Insufficient Credits
                            </h3>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px', lineHeight: '1.6' }}>
                                You need credits to unlock lead results. Recharge your account to access full lead profiles, contact details, and more.
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                                {[
                                    { name: 'Starter', credits: '1,000', price: '$99' },
                                    { name: 'Professional', credits: '3,000', price: '$199', popular: true },
                                    { name: 'Business', credits: '12,000', price: '$499' },
                                ].map(plan => (
                                    <div key={plan.name} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '12px 16px', borderRadius: '12px',
                                        border: plan.popular ? '2px solid #0b1957' : '1px solid #e5e7eb',
                                        background: plan.popular ? '#f0f4ff' : '#fff',
                                        cursor: 'pointer',
                                    }} onClick={() => {
                                        window.location.href = '/settings?tab=credits&action=add';
                                    }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                                {plan.name} {plan.popular && <span style={{ fontSize: '10px', background: '#0b1957', color: '#fff', padding: '2px 6px', borderRadius: '8px', marginLeft: '6px' }}>Popular</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{plan.credits} credits</div>
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0b1957' }}>{plan.price}</div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    onClick={() => setShowRechargeModal(false)}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '12px', border: '1px solid #e5e7eb',
                                        background: '#fff', fontSize: '14px', fontWeight: 600, color: '#374151', cursor: 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => { window.location.href = '/settings?tab=credits&action=add'; }}
                                    style={{
                                        flex: 1, padding: '10px', borderRadius: '12px', border: 'none',
                                        background: '#0b1957', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer',
                                    }}
                                >
                                    Recharge Now
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Gallery Popup Overlay Modal */}
                {mb.step === "gallery" && (
                    <div style={{
                        position: 'fixed', inset: 0, zIndex: 9999,
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <div style={{ background: '#fff', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                            <AgentBuilderGallery
                                images={mb.galleryImages}
                                videos={mb.galleryVideos}
                                loading={mb.loadingGallery}
                                onBack={() => mb.setStep("welcome")}
                                onGenerateImages={mb.generateImagesFromGallery}
                                onAnimateImage={mb.animateImageFromGallery}
                                onExtendVideo={mb.extendVideoFromGallery}
                                onAddDialogues={mb.addDialoguesFromGallery}
                                onDeleteAssets={mb.deleteAssets}
                                isFullHistory={mb.isGalleryFullHistory}
                                onLoadFullHistory={() => mb.fetchGallery(true)}
                            />
                        </div>
                    </div>
                )}

                {/* Checkpoints panel removed — now inline in chat */}

            </div>

            <ProfileSummaryDialog
                open={summaryDialogOpen}
                onClose={handleCloseSummaryDialog}
                employee={selectedEmployee}
                summary={profileSummary}
                webPresence={profileWebPresence}
                recentPosts={profileRecentPosts}
                loading={summaryLoading}
                error={summaryError}
                dataAgeDays={summaryDataAgeDays}
                onRefresh={handleRefreshSummary}
                refreshLoading={summaryRefreshLoading}
            />

            {/* ── Bad-feedback comment popup ── */}
            {badFeedbackPopup && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 10000,
                    }}
                    onClick={() => { setBadFeedbackPopup(null); setBadFeedbackDraft(''); }}
                >
                    <div
                        style={{
                            background: '#fff', borderRadius: '14px', padding: '24px',
                            width: '90%', maxWidth: '420px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.18)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <div style={{ fontWeight: 700, fontSize: '15px', color: '#111827' }}>
                                👎 Why is this a bad match?
                            </div>
                            <button
                                onClick={() => { setBadFeedbackPopup(null); setBadFeedbackDraft(''); }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '18px', lineHeight: 1, padding: '2px' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '14px' }}>
                            {badFeedbackPopup.leadName} — your feedback helps refine future searches.
                        </div>

                        {/* Quick-select chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                            {['Role not relevant', 'Wrong seniority level', 'Wrong industry', 'Wrong location', 'Missing key responsibility', 'Wrong company size'].map(chip => (
                                <button
                                    key={chip}
                                    onClick={() => setBadFeedbackDraft(prev => prev ? `${prev}, ${chip}` : chip)}
                                    style={{
                                        padding: '5px 10px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500,
                                        border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151',
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    {chip}
                                </button>
                            ))}
                        </div>

                        {/* Free-text comment */}
                        <textarea
                            value={badFeedbackDraft}
                            onChange={(e) => setBadFeedbackDraft(e.target.value)}
                            placeholder="e.g. Role doesn't include finance responsibilities, profile is too junior…"
                            rows={3}
                            style={{
                                width: '100%', boxSizing: 'border-box',
                                border: '1.5px solid #e5e7eb', borderRadius: '8px',
                                padding: '10px 12px', fontSize: '13px', color: '#374151',
                                resize: 'vertical', outline: 'none', marginBottom: '14px',
                                fontFamily: 'inherit', lineHeight: 1.5,
                            }}
                            onFocus={(e) => { e.target.style.borderColor = '#0b1957'; }}
                            onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; }}
                        />

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => { setBadFeedbackPopup(null); setBadFeedbackDraft(''); }}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                                    border: '1.5px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer',
                                }}
                            >
                                Skip
                            </button>
                            <button
                                onClick={() => confirmBadFeedback(badFeedbackDraft)}
                                style={{
                                    padding: '8px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                    border: 'none', background: '#0b1957', color: '#fff', cursor: 'pointer',
                                }}
                            >
                                Mark as Bad Match
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ── end bad-feedback popup ── */}

            {/* Edit Inbound Lead Modal */}
            {editingLeadIndex !== null && editFormData && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeEditLead}>
                  <div className="relative w-[90%] max-w-[500px] max-h-[80vh] overflow-auto rounded-2xl bg-white p-8 shadow-2xl dark:bg-[#101935] dark:text-white" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={closeEditLead}
                        className="absolute top-6 right-6 text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-400 dark:hover:text-white"
                      >
                          ✕
                      </button>

                      <h2 className="mb-6 text-lg font-bold">
                          Edit Lead #{editingLeadIndex + 1}
                      </h2>

                      <div className="grid gap-5">
                          {/* Reusable Input Helper Component logic would go here */}
                          {/* Updated Inputs Map */}
                          {[
                              { label: 'First Name', key: 'firstName', placeholder: 'Lead first name' },
                              { label: 'Last Name', key: 'lastName', placeholder: 'Lead last name' },
                              { label: 'Email', key: 'email', placeholder: 'Lead email address' },
                              { label: 'Phone', key: 'phone', placeholder: 'Lead phone number' },
                              { label: 'Company', key: 'companyName', placeholder: 'Company name' },
                              { label: 'LinkedIn URL', key: 'linkedinProfile', placeholder: 'https://linkedin.com/in/...' },
                              { label: 'Website', key: 'website', placeholder: 'https://...' }
                          ].map((field) => {
                            const fieldKey = field.key as keyof ParsedInboundLead;
                            return (
                            <div key={field.key}>
                                <label className="mb-2 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    {field.label}
                                </label>
                                <input
                                  type="text"
                                  value={editFormData[fieldKey]}
                                  onChange={(e) => updateEditField(fieldKey, e.target.value)}
                                  placeholder={field.placeholder} // Using the placeholder property here
                                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none dark:border-[#262831] dark:bg-[#000724] dark:text-white dark:placeholder-gray-500"
                                />
                            </div>
                            );
                          })}

                          {/* Notes */}
                          <div>
                              <label className="mb-2 block text-xs font-semibold text-gray-500 dark:text-gray-400">
                                  Notes
                              </label>
                              <textarea
                                value={editFormData.notes}
                                onChange={(e) => updateEditField('notes', e.target.value)}
                                className="h-20 w-full resize-y rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-blue-500 focus:outline-none dark:border-[#262831] dark:bg-[#000724] dark:text-white"
                              />
                          </div>
                      </div>
                      <div className="mt-8">
                          <button
                            onClick={saveEditedLead}
                            disabled={savingLead}
                            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                              {savingLead ? 'Saving...' : 'Save Changes'}
                          </button>
                      </div>

              </div>
              </div>
            )}

            {/* Delete Confirmation Dialog */}
            {deleteConfirmation && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', zIndex: 9999
                }} onClick={closeDeleteConfirmation}>
                    <div style={{
                        background: 'white', borderRadius: '12px', padding: '24px',
                        width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px rgba(0,0,0,0.15)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ marginBottom: '16px' }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                Remove Lead?
                            </h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                                Are you sure you want to remove <strong>{deleteConfirmation.name}</strong> from your imported leads?
                                This action cannot be undone.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                            <button
                                onClick={closeDeleteConfirmation}
                                disabled={deletingLead}
                                style={{
                                    padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px',
                                    background: 'white', color: '#374151', cursor: deletingLead ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: '500', opacity: deletingLead ? 0.6 : 1
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteLead}
                                disabled={deletingLead}
                                style={{
                                    padding: '8px 16px', border: 'none', borderRadius: '6px',
                                    background: deletingLead ? '#d1d5db' : '#dc2626', color: 'white',
                                    cursor: deletingLead ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: '500'
                                }}
                            >
                                {deletingLead ? 'Removing...' : 'Remove Lead'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Contact Picker Modal ── */}
            {/* ── Custom Accelerator builder (node graph) — full-screen takeover from the "+" menu ── */}
            {showCustomWorkflow && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: '#F8F9FE' }}>
                    <CustomWorkflowBuilder
                        onClose={() => { setShowCustomWorkflow(false); setBuilderTemplate(null); setEditingCampaignId(null); }}
                        initialTemplateKey={builderTemplate?.key}
                        initialSourceCfg={builderTemplate?.sourceCfg}
                        initialNodeCfg={builderTemplate?.nodeCfg}
                        autoLaunch={builderTemplate?.autoLaunch}
                        editCampaignId={editingCampaignId || undefined}
                    />
                </div>
            )}

            {showContactPicker && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '16px' }}
                    onClick={() => setShowContactPicker(false)}
                >
                    <div
                        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '82vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(0,0,0,0.18)', overflow: 'hidden' }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* ── Modal Header ── */}
                        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {cpPickerStep === 'contacts' && (
                                        <button onClick={() => setCpPickerStep('source')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '2px 4px', marginLeft: '-4px', display: 'flex', alignItems: 'center' }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                                        </button>
                                    )}
                                    <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#dce3f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0b1957" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827', lineHeight: 1.2 }}>
                                            {cpPickerStep === 'source' ? 'Select contact source' : (CP_SOURCES.find(s => s.key === cpSourceKey)?.label || 'Contacts')}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                                            {cpPickerStep === 'source' ? 'Choose where to pull contacts from' : 'Select contacts for your campaign'}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowContactPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* ── STEP 1: Source selection ── */}
                        {cpPickerStep === 'source' && (
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                {CP_SOURCES.map(src => (
                                    <div
                                        key={src.key}
                                        onClick={() => selectCpSource(src.key)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#f0f3ff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                                    >
                                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: src.color, flexShrink: 0 }} />
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827', flex: 1 }}>{src.label}</span>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* ── STEP 2: Contact list ── */}
                        {cpPickerStep === 'contacts' && (<>
                            {/* Search bar */}
                            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                <div style={{ position: 'relative' }}>
                                    <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={cpSearch}
                                        onChange={e => handleCpSearch(e.target.value)}
                                        placeholder="Search by name, phone or email…"
                                        style={{ width: '100%', boxSizing: 'border-box', padding: '7px 12px 7px 30px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#111827', background: '#f9fafb' }}
                                    />
                                </div>
                            </div>

                            {/* Select-all row */}
                            {!cpLoading && cpContacts.length > 0 && (
                                <div
                                    onClick={toggleCpSelectAll}
                                    style={{ padding: '8px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: '#fafafa' }}
                                >
                                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: cpSelected.size === cpContacts.length ? 'none' : '1.5px solid #d1d5db', background: cpSelected.size === cpContacts.length ? '#0b1957' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {cpSelected.size === cpContacts.length && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                                        {cpSelected.size > 0 && cpSelected.size < cpContacts.length && <div style={{ width: '8px', height: '2px', background: '#0b1957', borderRadius: '1px' }} />}
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#6b7280' }}>
                                        {cpSelected.size === cpContacts.length ? 'Deselect all' : `Select all ${cpContacts.length} shown`}
                                    </span>
                                </div>
                            )}

                            {/* List */}
                            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                                {cpLoading ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                                        <svg style={{ margin: '0 auto 8px', display: 'block', animation: 'spin 1s linear infinite' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity=".3" /><path d="M21 12a9 9 0 00-9-9" /></svg>
                                        Loading contacts…
                                    </div>
                                ) : cpContacts.length === 0 ? (
                                    <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" strokeWidth="1.5" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#6b7280' }}>No contacts found</div>
                                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{cpSearch ? 'Try a different search term' : 'No contacts in this source'}</div>
                                    </div>
                                ) : cpContacts.map((c: any) => {
                                    const checked = cpSelected.has(c.id);
                                    const name = c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown';
                                    const sub = [c.company || c.company_name, c.email || c.phone].filter(Boolean).join(' · ');
                                    const initl = name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
                                    return (
                                        <div key={c.id} onClick={() => toggleCpContact(c.id)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 20px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: checked ? '#f0f3ff' : 'white', transition: 'background 0.1s' }}>
                                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', flexShrink: 0, border: checked ? 'none' : '1.5px solid #d1d5db', background: checked ? '#0b1957' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2"><path d="M2 6l3 3 5-5" /></svg>}
                                            </div>
                                            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarColor(name), flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: '#fff' }}>{initl}</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                                                {sub && <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
                                            </div>
                                            {c.phone && (
                                                <span style={{ fontSize: '11px', color: '#6b7280', flexShrink: 0 }}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '2px' }}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.1 10.81a19.79 19.79 0 01-3.07-8.63A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                    {cpSelected.size > 0
                                        ? <><strong style={{ color: '#0b1957' }}>{cpSelected.size}</strong> selected</>
                                        : 'None selected'
                                    }
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setCpPickerStep('source')} style={{ padding: '7px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', color: '#6b7280', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>
                                        Back
                                    </button>
                                    <button
                                        onClick={confirmContactPicker}
                                        disabled={cpSelected.size === 0}
                                        style={{ padding: '7px 16px', border: 'none', borderRadius: '8px', background: cpSelected.size > 0 ? '#0b1957' : '#e5e7eb', color: cpSelected.size > 0 ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: cpSelected.size > 0 ? 'pointer' : 'not-allowed', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                        Start Campaign{cpSelected.size > 0 ? ` (${cpSelected.size})` : ''}
                                    </button>
                                </div>
                            </div>
                        </>)}
                    </div>
                </div>
            )}

            <style>{css}</style>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════════════════ */


// ── "Roles" — template pipelines launched from chat ─────────────────────────
/** Pipeline chips row: step chips in the template's accent, joined by arrows. */
function RoleChain({ tpl, compact = false }: { tpl: WorkflowTemplate; compact?: boolean }) {
    const items = compact ? tpl.chain.slice(0, 3) : tpl.chain;
    return (
        <div className="flex flex-wrap items-center gap-y-1.5" style={{ columnGap: 4 }}>
            {items.map((c, i) => (
                <React.Fragment key={i}>
                    {i > 0 && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                    <span className={`${compact ? 'text-[9.5px]' : 'text-[10.5px]'} font-semibold px-2 py-[3px] rounded-full whitespace-nowrap`}
                        style={{ background: `${tpl.accent}12`, color: tpl.accent }}>{c}</span>
                </React.Fragment>
            ))}
            {compact && tpl.chain.length > 3 && (
                <span className="text-[9.5px] font-semibold text-slate-400 pl-0.5">+{tpl.chain.length - 3}</span>
            )}
        </div>
    );
}

/** "Accelerators" pill + dropdown of template cards. Self-contained open/close state.
 *  NOTE: the component and its CSS keep the older `roles` naming — renaming those
 *  is churn with no user-visible effect, and `.adv-roles-btn` is referenced in
 *  four style blocks. */
function RolesLauncher({ onPick }: { onPick: (t: WorkflowTemplate) => void }) {
    const [open, setOpen] = React.useState(false);
    React.useEffect(() => {
        if (!open) return;
        const h = () => setOpen(false);
        document.addEventListener('click', h);
        return () => document.removeEventListener('click', h);
    }, [open]);
    return (
        <div style={{ position: 'relative' }}>
            <button type="button" className="adv-roles-btn" title="Accelerate LAD with prebuilt pipeline"
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                Accelerators
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ opacity: .55, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}><path d="m6 9 6 6 6-6" /></svg>
            </button>
            {open && (
                <div className="adv-roles-menu" onClick={(e) => e.stopPropagation()}>
                    <div className="px-2.5 pt-1.5 pb-2 flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Pick an Accelerator</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{WORKFLOW_TEMPLATES.length} pipelines</span>
                    </div>
                    {(() => {
                        const card = (t: WorkflowTemplate) => (
                            <button key={t.key} type="button"
                                className="w-full text-left rounded-xl p-2.5 flex gap-2.5 items-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                onClick={() => { setOpen(false); onPick(t); }}>
                                <span className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: `${t.accent}14` }}>
                                    <TemplateIcon tplKey={t.key} color={t.accent} size={15} />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">{t.name}</span>
                                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{t.tagline}</span>
                                    <span className="block mt-1.5"><RoleChain tpl={t} compact /></span>
                                </span>
                                <svg className="mt-2 flex-shrink-0 text-slate-300 dark:text-slate-600" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        );
                        const sec = (label: string) => (
                            <div className="flex items-center gap-2 px-2.5 pt-2 pb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
                                <span className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
                            </div>
                        );
                        const general = WORKFLOW_TEMPLATES.filter((t) => t.category === 'general');
                        const industry = WORKFLOW_TEMPLATES.filter((t) => t.category === 'industry');
                        return (<>
                            {sec('General')}
                            {general.map(card)}
                            {sec('By industry')}
                            {industry.map(card)}
                        </>);
                    })()}
                </div>
            )}
        </div>
    );
}

/** Rich wizard card rendered inside AI bubbles (msg.roleCard). */
/**
 * Quick replies for one wizard question.
 *
 * Every chip is grounded in something real — the template's own preset, or the
 * tenant's saved ICP — so none of them invents a taxonomy for the user to pick
 * from. A question with nothing real to offer simply stays free text.
 */
function roleQuickReplies(
    q: TemplateInput | undefined,
    tpl: WorkflowTemplate,
    icp?: Record<string, string>,
): { label: string; value: string; hint?: string }[] {
    if (!q || q.target === 'gate') return [];
    const out: { label: string; value: string; hint?: string }[] = [];

    // The tenant's saved ICP, offered only where it answers THIS question.
    // Chosen by the user rather than injected: elsewhere these fields are
    // deliberately kept out of search context because they would silently
    // override a fresh query — clicking a chip is an explicit choice.
    const icpFor: Record<string, string | undefined> = {
        job_titles: icp?.icpJobTitles,
        industries: icp?.industry,
        locations: icp?.icpLocations || icp?.geographicFocus,
    };
    const fromIcp = (icpFor[q.key] || '').trim();
    if (fromIcp) out.push({ label: 'Use my ICP', value: fromIcp, hint: fromIcp });

    // Skipping keeps whatever the template already carries, so say what that is
    // rather than making "skip" a blind choice.
    const preset = String((tpl.source?.cfg as Record<string, string> | undefined)?.[q.key] || '').trim();
    if (q.optional) {
        if (q.target === 'node') out.push({ label: 'Let Mr LAD write it', value: 'skip' });
        else if (preset && preset !== fromIcp) out.push({ label: 'Keep the suggested', value: 'skip', hint: preset });
        else out.push({ label: 'Skip', value: 'skip' });
    }
    return out;
}

function RoleCardView({ card, onOpt, previewing, icp }: { card: NonNullable<ChatMsg['roleCard']>; onOpt: (v: string) => void; previewing?: boolean; icp?: Record<string, string> }) {
    const tpl = WORKFLOW_TEMPLATES.find((t) => t.key === card.key);
    if (!tpl) return null;
    const accent = tpl.accent;
    const inputs = templateWizardInputs(tpl);
    const total = inputs.length;
    const qIdx = Math.min(card.qIdx ?? 0, Math.max(0, total - 1));
    const q = inputs[qIdx];
    // Tiny **bold** renderer — questions carry markdown-style emphasis.
    const md = (t: string) => t.split('**').map((part, i) => (i % 2
        ? <strong key={i} className="adv-role-q-strong">{part}</strong>
        : <React.Fragment key={i}>{part}</React.Fragment>));
    const isQuestionStage = card.stage === 'intro' || card.stage === 'question';

    return (
        <div className="mt-1 w-full max-w-[540px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-[0_2px_16px_rgba(15,23,42,0.06)] overflow-hidden">
            {/* Accent hairline */}
            <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}55)` }} />
            {/* Header */}
            <div className="flex items-start gap-3 px-4 pt-3.5 pb-3">
                <span className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}14` }}>
                    <TemplateIcon tplKey={tpl.key} color={accent} size={17} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-slate-900 dark:text-white leading-tight">{tpl.name}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full" style={{ background: `${accent}14`, color: accent }}>Accelerator</span>
                    </div>
                    <div className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{tpl.tagline}</div>
                </div>
            </div>
            {/* Pipeline */}
            {(card.stage === 'intro' || card.stage === 'summary' || card.stage === 'file') && (
                <div className="px-4 pb-3"><RoleChain tpl={tpl} /></div>
            )}

            {/* Question stages */}
            {isQuestionStage && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 mt-2.5 mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 whitespace-nowrap">Step {qIdx + 1} of {total}</span>
                        <div className="flex-1 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${(qIdx / Math.max(1, total)) * 100}%`, background: accent }} />
                        </div>
                    </div>
                    {card.nudge && (
                        <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-amber-600 dark:text-amber-400 mb-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 9v4M12 17h.01" /><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                            This one&apos;s required to launch the Accelerator
                        </div>
                    )}
                    {/* The question itself — highlighted in the same navy as the
                        user's own replies, with a pulsing "?" to pull the eye. */}
                    <div className="adv-role-q">
                        <span className="adv-role-q-mark" aria-hidden="true">?</span>
                        <span className="adv-role-q-text">{md(q?.question || '')}</span>
                    </div>
                    {/* The copy gate is a two-way choice — answer it by button
                        rather than making the user type "yes". */}
                    {q?.target === 'gate' && (
                        <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            <button type="button" onClick={() => onOpt('__role_gate_yes__')}
                                className="px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                                style={{ background: accent, boxShadow: `0 4px 14px ${accent}40` }}>
                                Write them myself
                            </button>
                            <button type="button" onClick={() => onOpt('__role_gate_no__')}
                                className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                Use the suggested copy
                            </button>
                        </div>
                    )}
                    {/* What "skip" keeps — so message copy is never a blind choice. */}
                    {q?.suggestion ? (
                        <div className="mt-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 px-3 py-2">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">Suggested — kept if you skip</div>
                            <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-snug whitespace-pre-wrap">{q.suggestion}</div>
                        </div>
                    ) : q?.target === 'node' ? (
                        <div className="mt-2.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                            Skip and Mr LAD writes this one from the lead&apos;s profile and the conversation so far.
                        </div>
                    ) : null}
                    {/* Quick replies — a shortcut for typing, never the only way
                        to answer, so the free-text hint below stays. */}
                    {(() => {
                        const chips = roleQuickReplies(q, tpl, icp);
                        if (!chips.length) return null;
                        return (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                                {chips.map((c) => (
                                    <button key={c.label} type="button" onClick={() => onOpt(`__role_answer__:${c.value}`)}
                                        title={c.hint}
                                        className="max-w-full inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-[12px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                                        <span className="flex-shrink-0">{c.label}</span>
                                        {c.hint && (
                                            <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate max-w-[190px]">
                                                {c.hint}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        );
                    })()}
                    {q?.target !== 'gate' && (
                        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400 dark:text-slate-500">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 4v7a4 4 0 0 1-4 4H4" /><path d="m9 10-5 5 5 5" /></svg>
                            Type your answer below{q?.optional ? ' — or pick an option above' : ''}
                        </div>
                    )}
                </div>
            )}

            {/* File hand-off */}
            {card.stage === 'file' && (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[13px] text-slate-700 dark:text-slate-200 leading-relaxed">
                        This Accelerator starts from a <strong className="font-semibold">file upload</strong>. I&apos;ll open the workflow builder with the whole pipeline pre-built — upload your CSV/Excel in the source node and hit Launch.
                    </div>
                    <div className="flex items-center gap-2 mt-3.5">
                        <button type="button" onClick={() => onOpt(`__role_builder__:${tpl.key}`)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: accent, boxShadow: `0 4px 14px ${accent}40` }}>
                            Open builder
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                        </button>
                        <button type="button" onClick={() => onOpt('__role_cancel__')}
                            className="px-3.5 py-2 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                    </div>
                </div>
            )}

            {/* Summary + launch CTAs */}
            {card.stage === 'summary' && (() => {
                const answers = card.answers || {};
                // Targeting rows show only what was answered. Message rows always
                // show — with the answer, the template's suggestion, or the
                // AI-drafted note — so nothing goes out unseen.
                const targetingRows = inputs.filter((i) => (!i.target || i.target === 'source') && answers[i.key]);
                const messageRows = inputs.filter((i) => i.target === 'node');
                const rowLabel = (i: TemplateInput) => i.label || i.key.replace(/_/g, ' ');
                const previewQuery = templateSearchQuery(tpl, splitWizardAnswers(tpl, answers).sourceCfg);
                return (
                <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    {(targetingRows.length > 0 || messageRows.length > 0) ? (
                        <div className="space-y-1.5 mb-3">
                            {targetingRows.map((i) => (
                                <div key={i.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2">
                                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 whitespace-nowrap">{rowLabel(i)}</span>
                                    <span className="text-[12.5px] font-medium text-slate-800 dark:text-slate-100 text-right truncate">{answers[i.key]}</span>
                                </div>
                            ))}
                            {messageRows.map((i) => {
                                const copy = answers[i.key] || i.suggestion || '';
                                return (
                                    <div key={i.key} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 px-3 py-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 whitespace-nowrap">{rowLabel(i)}</span>
                                            {!answers[i.key] && (
                                                <span className="text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-700/60 text-slate-500 dark:text-slate-300">
                                                    {copy ? 'suggested' : 'AI-written'}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[12px] text-slate-700 dark:text-slate-200 leading-snug whitespace-pre-wrap line-clamp-3">
                                            {copy || 'Mr LAD drafts this at send time from the lead\'s profile and the thread.'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-[13px] text-slate-600 dark:text-slate-300 mb-3">Nothing to configure — this Accelerator is ready to go.</div>
                    )}
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 mb-3.5">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                        Defaults: 25 leads/day · 30 days — adjustable in the builder
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {previewQuery && (
                            <button type="button" disabled={previewing} onClick={() => onOpt('__role_preview__')}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold border transition-colors disabled:opacity-60 disabled:cursor-wait"
                                style={{ borderColor: `${accent}55`, color: accent, background: `${accent}0f` }}>
                                {previewing ? (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                                ) : (
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></svg>
                                )}
                                {previewing ? 'Searching…' : 'Preview leads'}
                            </button>
                        )}
                        <button type="button" onClick={() => onOpt('__role_launch__')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[12.5px] font-semibold text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: accent, boxShadow: `0 4px 14px ${accent}40` }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></svg>
                            Activate &amp; launch
                        </button>
                        <button type="button" onClick={() => onOpt('__role_review__')}
                            className="px-3.5 py-2 rounded-xl text-[12.5px] font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Review workflow</button>
                        <button type="button" onClick={() => onOpt('__role_openbuilder__')}
                            className="px-3 py-2 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Open builder</button>
                        <button type="button" onClick={() => onOpt('__role_cancel__')}
                            className="px-3 py-2 rounded-xl text-[12.5px] font-medium text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                    </div>
                </div>
                );
            })()}
        </div>
    );
}

function Bubble({ msg, onOpt, onShowPanel, onStartCheckpoints, onLetAgentDeal, agentDealLoading, onStartTargeting, hasPanel, leadsCount, filteredLeadsCount, onUploadClick, useSalesNav, isMobile, rolePreviewing, roleIcp }: { msg: ChatMsg; onOpt: (v: string) => void; onShowPanel: (panel: 'leads' | 'workflow') => void; onStartCheckpoints: () => void; onLetAgentDeal?: () => void; agentDealLoading?: boolean; onStartTargeting: () => void; hasPanel: boolean; leadsCount: number; filteredLeadsCount?: number; onUploadClick?: () => void; useSalesNav?: boolean; isMobile?: boolean; rolePreviewing?: boolean; roleIcp?: Record<string, string> }) {
    const user = useSelector((state: any) => state.auth?.user);
    const displayName = user?.name || "User";
    const userInitial = displayName.charAt(0).toUpperCase();
    const THINKING_WORDS = ['Thinking', 'Searching', 'Scrapping', 'Crawling', 'Analyzing', 'Matching', 'Qualifying', 'Processing'];
    const [thinkIdx, setThinkIdx] = React.useState(0);
    const [thinkVisible, setThinkVisible] = React.useState(true);
    // Lead detail form local state (used when msg.leadDetailForm === true)
    const [ldFirst, setLdFirst] = React.useState('');
    const [ldLast, setLdLast] = React.useState('');
    const [ldCompany, setLdCompany] = React.useState('');
    const [ldWebsite, setLdWebsite] = React.useState('');
    const [ldLocation, setLdLocation] = React.useState('');
    const [ldEmail, setLdEmail] = React.useState('');
    const [ldPhone, setLdPhone] = React.useState('');
    React.useEffect(() => {
        if (!msg.loading) return;
        const iv = setInterval(() => {
            setThinkVisible(false);
            setTimeout(() => { setThinkIdx(p => (p + 1) % THINKING_WORDS.length); setThinkVisible(true); }, 300);
        }, 1400);
        return () => clearInterval(iv);
    }, [msg.loading]);
    if (msg.loading) return (
        <div className="adv-bubble adv-bubble-ai fadeUp">
            <div className="adv-ai-avatar adv-ai-avatar-viz">
                <AgentVisualizer state="thinking" size={36} />
            </div>
            <div>
                <div className="adv-ai-name">LAD in Action <span className="adv-ai-name-dot" /></div>
                <div className="adv-thinking-wrap">
                    <span className={`adv-thinking-word${thinkVisible ? ' adv-tw-in' : ' adv-tw-out'}`}>
                        {THINKING_WORDS[thinkIdx]}...
                    </span>
                </div>
            </div>
        </div>
    );
    if (msg.role === 'user') return (
        <div className="adv-bubble adv-bubble-user fadeUp" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div className="adv-user-msg" style={{ margin: 0, order: 1 }}>{msg.text}</div>
            <div style={{ order: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#172560', color: 'white', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>
                {user?.avatar ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : userInitial}
            </div>
        </div>
    );
    return (
        <div className="adv-bubble adv-bubble-ai fadeUp">
            <div className="adv-ai-avatar adv-ai-avatar-viz">
                <AgentVisualizer state="idle" size={36} />
            </div>
            <div className="adv-ai-body">
                {msg.webSearchResult && (
                    <div className="adv-web-searched">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        Searched the web
                    </div>
                )}
                <div className="adv-ai-name">
                    LAD in Action
                    <span className="adv-ai-name-dot" />
                </div>

                {/* Accelerators wizard card — rendered under the LAD in Action label. */}
                {msg.roleCard && <RoleCardView card={msg.roleCard} onOpt={onOpt} previewing={rolePreviewing} icp={roleIcp} />}

                {/* ── Rich markdown-aware renderer ── */}
                <div className="adv-ai-text" style={{ marginBottom: msg.targeting ? "16px" : "0", display: msg.roleCard && !msg.text ? 'none' : undefined }}>
                    {msg.text.split('\n').map((line, i) => {
                        // ── Inline rich text parser: **bold**, *italic*, `code` ──────
                        const renderInline = (raw: string) => {
                            const tokens = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
                            return tokens.map((t, j) => {
                                if (t.startsWith('**') && t.endsWith('**')) return <strong key={j}>{t.slice(2, -2)}</strong>;
                                if (t.startsWith('*') && t.endsWith('*')) return <em key={j} className="adv-ai-em">{t.slice(1, -1)}</em>;
                                if (t.startsWith('`') && t.endsWith('`')) return <code key={j} style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace', color: '#0b1957' }}>{t.slice(1, -1)}</code>;
                                return t;
                            });
                        };

                        const trimmed = line.trim();
                        if (!trimmed) return <div key={i} style={{ height: '6px' }} />;

                        // ### Heading
                        if (trimmed.startsWith('### ')) return <div key={i} className="adv-ai-h3">{renderInline(trimmed.slice(4))}</div>;
                        if (trimmed.startsWith('## ')) return <div key={i} className="adv-ai-h3" style={{ fontSize: '14.5px' }}>{renderInline(trimmed.slice(3))}</div>;

                        // --- Divider
                        if (/^-{3,}$/.test(trimmed)) return <hr key={i} className="adv-ai-hr" />;

                        // Numbered list  1. Item
                        const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
                        if (numMatch) return (
                            <div key={i} className="adv-ai-num-item">
                                <span className="adv-ai-num-badge">{numMatch[1]}</span>
                                <span style={{ flex: 1, lineHeight: '1.65' }}>{renderInline(numMatch[2])}</span>
                            </div>
                        );

                        // Bullet list  • or - or *
                        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || /^\* [^*]/.test(trimmed)) {
                            const content = trimmed.replace(/^[•\-\*]\s+/, '');
                            return (
                                <div key={i} className="adv-ai-bullet">
                                    <span className="adv-ai-bullet-dot" />
                                    <span style={{ flex: 1, lineHeight: '1.65' }}>{renderInline(content)}</span>
                                </div>
                            );
                        }

                        return <p key={i} style={{ margin: '3px 0' }}>{renderInline(trimmed)}</p>;
                    })}
                </div>

                {/* ── Web search source links ── */}
                {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">
                            Sources
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {msg.sources.slice(0, 5).map((src, i) => {
                                let hostname = '';
                                try { hostname = new URL(src.url).hostname.replace('www.', ''); } catch { hostname = src.url; }
                                return (
                                    <a
                                        key={i}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                  className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 no-underline px-2 py-1.5 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        {/* Globe icon */}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-500 dark:text-slate-300 flex-shrink-0" strokeWidth="2" strokeLinecap="round">
                                            <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                                        </svg>
                                        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                                            {src.title || hostname}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">{hostname}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── NAS.io-style MAIN PRODUCT CARD (only for first search results) ── */}
                {msg.targeting && (
                    <div
                    onClick={onStartCheckpoints}
                    className="adv-main-product-card flex items-center gap-[14px] p-4 my-3 border rounded-[14px] cursor-pointer transition-all duration-150
                       bg-gray-50 dark:bg-gray-800
                       border-gray-200 dark:border-gray-700
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       hover:border-[#0b1957] dark:hover:border-blue-400 adv-main-product-card"
                      >
                      <div className="w-[48px] h-[48px] bg-[#0b1957] dark:bg-blue-600 rounded-[10px] flex items-center justify-center flex-shrink-0">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                      </div>
                      <div className="flex-1">
                          <div className="text-[15px] font-bold text-gray-900 dark:text-gray-100 mb-1">
                              Automate Your Business Processes with AI Agents
                          </div>
                          <div className="text-[12px] text-gray-500 dark:text-slate-300">V1</div>
                      </div>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-gray-500" strokeWidth="2" strokeLinecap="round">
                          <path d="M9 18l6-6-6-6" />
                      </svg>
                  </div>
                )}

                {/* ── NAS.io-style clickable result cards ── */}
                {msg.targeting && (
                    <div className="adv-result-cards flex gap-3 mb-4">
                        {/* Targeting card */}
                        <div className={`adv-rc flex flex-1 items-center gap-3 p-4 rounded-xl cursor-pointer border transition-colors ${
                               useSalesNav
                                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                                : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                            }`}
                               onClick={onStartTargeting}
                        >
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-indigo-900 dark:text-indigo-300" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="20" y2="12" /><line x1="12" y1="18" x2="20" y2="18" /><circle cx="2" cy="6" r="1" fill="currentColor" /><circle cx="4" cy="12" r="1" fill="currentColor" /><circle cx="8" cy="18" r="1" fill="currentColor" /></svg>
                          </div>
                            <div className="adv-rc-body">
                                <div className="text-[13px] font-bold text-gray-900 dark:text-gray-100">Targeting</div>
                              {!useSalesNav && (
                                <div className="flex items-center gap-1 mt-1">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-amber-600 dark:text-amber-500" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-medium leading-tight">Sales Navigator required</span>
                                </div>
                              )}
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-gray-500" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                      <div className="adv-rc adv-rc-leads flex flex-1 items-center gap-3 p-4 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" onClick={() => onShowPanel('leads')}>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-indigo-900 dark:text-blue-300" strokeWidth="2"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                          </div>
                          <div className="flex-1">
                              <div className="text-[13px] font-bold text-gray-900 dark:text-gray-100">Leads</div>
                              <div className="text-[11px] text-indigo-900 dark:text-blue-300 font-medium">
                                  {leadsCount > 0
                                    ? `${leadsCount} Leads found`
                                    : filteredLeadsCount && filteredLeadsCount > 0
                                      ? `${filteredLeadsCount} lead${filteredLeadsCount !== 1 ? 's' : ''} (below ICP threshold)`
                                      : '0 Leads found'}
                              </div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-gray-500" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                      <div className="adv-rc adv-rc-leads flex flex-1 items-center gap-3 p-4 rounded-xl cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" onClick={() => onShowPanel('workflow')}>
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-indigo-900 dark:text-blue-300" strokeWidth="2"><circle cx="12" cy="5" r="2" /><circle cx="5" cy="19" r="2" /><circle cx="19" cy="19" r="2" /><path d="M12 7v4M9.5 17.5L12 11l2.5 6.5" /></svg>
                          </div>
                          <div className="flex-1">
                              <div className="text-[13px] font-bold text-gray-900 dark:text-gray-100">Accelerator</div>
                              <div className="text-[11px] text-indigo-900 dark:text-blue-300 font-medium">Live preview</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-400 dark:text-gray-500" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
                      </div>
                  </div>
                )}

                {/* ── Modern action buttons (Example 1 style) ── */}
                {msg.targeting && (
                  <div className="flex flex-col gap-2.5 border-t border-gray-200 dark:border-gray-800 pt-3">
                      {/* ⚡ Hero action — let the agent build the whole multi-channel campaign */}
                      {onLetAgentDeal && (
                          <button type="button" onClick={onLetAgentDeal} disabled={agentDealLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-none text-white text-[13.5px] font-bold tracking-[0.01em] transition-opacity disabled:cursor-default disabled:opacity-75 cursor-pointer"
                            style={{
                                background: "linear-gradient(135deg, #0b1957 0%, #3730a3 100%)",
                                boxShadow: "0 4px 14px rgba(11,25,87,0.22)",
                            }}>
                              <span style={{ fontSize: "16px", lineHeight: 1 }}>{agentDealLoading ? "⏳" : "⚡"}</span>
                              {agentDealLoading ? "Building your campaign…" : "Let Agent Deal — auto-build every connected channel"}
                          </button>
                      )}
                      <div className="adv-action-btns flex flex-nowrap gap-2 justify-between">
                          <button
                            className="adv-act-btn adv-act-btn-refine flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[12.5px] font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-blue-600 hover:text-gray-900 dark:hover:text-white transition-colors"
                            onClick={() => onOpt('Refine my targeting criteria')}
                          >
                              Refine
                          </button>
                          <button
                            className="adv-act-btn adv-act-btn-journey flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-[#0b1957] dark:border-blue-400 bg-white dark:bg-gray-800 text-[12.5px] font-bold text-[#0b1957] dark:text-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors tracking-[0.01em]"
                            onClick={onStartCheckpoints}
                          >
                              Configure manually
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12h14M12 5l7 7-7 7" />
                              </svg>
                          </button>
                      </div>
                  </div>
                )}

                {/* ── Inbound: Download Template + Upload buttons ── */}
                {(msg.inboundAction === 'download' || msg.inboundAction === 'upload') && (
                  <div className="flex flex-row flex-nowrap gap-2 w-full mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <button onClick={downloadInboundTemplate}
                              className="inline-flex items-center justify-center flex-1 gap-1.5 px-2 py-2.5 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white border-none rounded-xl font-semibold text-[13px] cursor-pointer shadow-md hover:shadow-lg transition-all whitespace-nowrap"
                      >
                          <Download size={16} /> Download
                      </button>
                      <button
                        onClick={() => onUploadClick?.()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-[#0b1957] dark:text-blue-300 border-2 border-[#0b1957] dark:border-blue-400 rounded-xl font-semibold text-[13px] cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                          <Upload size={16} /> Upload CSV File
                      </button>
                  </div>
                )}

                {/* ── Inbound: Summary with platform badges ── */}
                {msg.inboundAction === 'summary' && msg.inboundSummary && (
                  <div className="mt-3 p-4 rounded-[14px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20">
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2.5">
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                          <span className="text-[14px] font-bold text-emerald-800 dark:text-emerald-300">
            {msg.inboundSummary.total} Leads Ready</span>
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                          {msg.inboundSummary.linkedin > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900">
                <LinkedInIcon size={12} /> LinkedIn ({msg.inboundSummary.linkedin})</span>}
                          {msg.inboundSummary.email > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-pink-700 dark:text-pink-300 border border-pink-100 dark:border-pink-900">
                ✉️ Email ({msg.inboundSummary.email})</span>}
                          {msg.inboundSummary.whatsapp > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900">
                💬 WhatsApp ({msg.inboundSummary.whatsapp})</span>}
                          {msg.inboundSummary.phone > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900">
                📞 Phone ({msg.inboundSummary.phone})</span>}
                          {msg.inboundSummary.website > 0 && <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900">
                🌐 Website ({msg.inboundSummary.website})</span>}
                      </div>
                      {/* Only show this CTA when the auto/manual action buttons aren't already
                          rendered (msg.targeting) — otherwise it duplicates "Configure manually". */}
                      {!msg.targeting && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/50 dark:border-emerald-800/50">
                              <button
                                onClick={onStartCheckpoints}
                                className="w-full px-4 py-2.5 bg-[#172560] dark:bg-blue-700 text-white border-none rounded-[10px] text-[13px] font-bold cursor-pointer transition-all hover:bg-[#0b1957] dark:hover:bg-blue-600 shadow-sm"
                              >
                                  Create Outreach Journey</button>
                          </div>
                      )}
                  </div>
                )}

                {/* Option buttons from AI */}
                {msg.options && msg.options.length > 0 && (
                    <div className="adv-opts">
                        {msg.options.map((o, i) => <button key={i} className="adv-opt-btn" onClick={() => onOpt(o.value)}>{o.label}</button>)}
                    </div>
                )}

                {/* ── Outreach Journey Stepper ── */}
                {msg.outreach_journey && msg.outreach_journey.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                      <div className="text-slate-700 dark:text-slate-300" style={{ fontSize: '12px', fontWeight: 700, marginBottom: '10px', letterSpacing: '.04em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-[#0b1957] dark:text-blue-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                          Suggested Outreach Journey
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0', overflowX: 'auto', paddingBottom: '4px', justifyContent: "center" }}>
                          {msg.outreach_journey.map((step, si) => {
                              const channelConfig = {
                                  linkedin: {
                                      icon: (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className={step.recommended ? "text-white" : "text-slate-400 dark:text-slate-500"}>
                                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                                        </svg>
                                      )
                                  },
                                  email: {
                                      icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={step.recommended ? "text-white" : "text-slate-400 dark:text-slate-500"}>
                                            <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                      )
                                  },
                                  whatsapp: {
                                      icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={step.recommended ? "text-white" : "text-slate-400 dark:text-slate-500"}>
                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                        </svg>
                                      )
                                  },
                                  voice: {
                                      icon: (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={step.recommended ? "text-white" : "text-slate-400 dark:text-slate-500"}>
                                            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.8 10.5 19.79 19.79 0 01.74 1.84 2 2 0 012.72 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.69a16 16 0 006.4 6.4l1.06-1.06a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                                        </svg>
                                      )
                                  },
                              };
                              const config = channelConfig[step.channel as keyof typeof channelConfig] || channelConfig.email;

                              const shadowColor = step.channel === 'linkedin' ? '#0a66c2'
                                : step.channel === 'email' ? '#0b1957'
                                  : step.channel === 'whatsapp' ? '#25d366'
                                    : '#f97316';

                              return (
                                <div key={si} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100px' }}>
                                            {/* Icon circle with custom tooltip */}
                                        <div style={{ position: 'relative', display: 'inline-flex' }}
                                             onMouseEnter={e => {
                                                 const tip = (e.currentTarget as HTMLElement).querySelector('.journey-tip') as HTMLElement;
                                                 if (tip) tip.style.opacity = '1';
                                             }}
                                             onMouseLeave={e => {
                                                 const tip = (e.currentTarget as HTMLElement).querySelector('.journey-tip') as HTMLElement;
                                                 if (tip) tip.style.opacity = '0';
                                             }}
                                        >
                                            <div
                                              className={`journey-icon-circle flex items-center justify-center border ${
                                                step.recommended
                                                  ? step.channel === 'linkedin' ? 'bg-[#0a66c2] dark:bg-[#0a66c2]'
                                                    : step.channel === 'email' ? 'bg-[#0b1957] dark:bg-[#2563eb]'
                                                      : step.channel === 'whatsapp' ? 'bg-[#25d366] dark:bg-[#22c55e]'
                                                        : 'bg-[#f97316] dark:bg-[#ea580c]'
                                                  : 'bg-[#f3f4f6] dark:bg-[#1e293b] border-slate-200 dark:border-slate-800'
                                              }`}
                                              style={{
                                                  width: '44px',
                                                  height: '44px',
                                                  borderRadius: '50%',
                                                  boxShadow: step.recommended ? (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? `0 4px 12px ${shadowColor}33` : `0 4px 12px ${shadowColor}55`) : 'none',
                                                  flexShrink: 0,
                                                  cursor: 'default'
                                              }}
                                            >
                                                {config.icon}
                                            </div>
                                            <div className="journey-tip border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-[#111827] text-white" style={{
                                                opacity: 0, pointerEvents: 'none', transition: 'opacity 0.15s',
                                                position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                                                transform: 'translateX(-50%)',
                                                fontSize: '11px', borderRadius: '8px', padding: '6px 10px', width: '160px',
                                                lineHeight: 1.4, textAlign: 'center', zIndex: 50,
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                                                whiteSpace: 'normal',
                                            }}>
                                                {step.reason}
                                                <div style={{
                                                    position: 'absolute', top: '100%', left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    borderWidth: '5px', borderStyle: 'solid',
                                                    borderColor: 'currentColor transparent transparent transparent'
                                                }} className="text-slate-900 dark:text-[#111827]" />
                                            </div>
                                        </div>
                                        <div className="text-slate-800 dark:text-slate-200" style={{ fontSize: '11px', fontWeight: 700, marginTop: '6px', textAlign: 'center' }}>{step.label}</div>
                                        <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '10px', marginTop: '2px', textAlign: 'center', lineHeight: 1.3, padding: '0 4px' }}>{step.action}</div>
                                        {step.recommended && (
                                          <div className="bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400" style={{ marginTop: '4px', fontSize: '9px', borderRadius: '8px', padding: '1px 6px', fontWeight: 700, textTransform: 'uppercase' }}>Recommended</div>
                                        )}
                                    </div>
                                    {si < msg.outreach_journey!.length - 1 && (
                                      <div style={{ display: 'flex', alignItems: 'center', paddingTop: '14px', flexShrink: 0 }}>
                                          <svg width="24" height="16" viewBox="0 0 24 16" fill="none">
                                              <path d="M0 8h20M16 4l4 4-4 4" className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                      </div>
                                    )}
                                </div>
                              );
                          })}
                      </div>
                  </div>
                )}

                {/* ── Lead Detail Form (inline card) ── */}
                {msg.leadDetailForm && (
                    <div style={{
                        marginTop: '12px', background: '#fff', border: '1.5px solid #e0eaf5',
                        borderRadius: '16px', padding: '20px', maxWidth: '460px',
                        boxShadow: '0 4px 16px rgba(23,37,96,0.06)',
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#0b1957', marginBottom: '14px', letterSpacing: '.01em' }}>
                            Contact Details
                        </div>
                        {/* Row 1: First Name + Last Name */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>First Name</label>
                                <input value={ldFirst} onChange={e => setLdFirst(e.target.value)} placeholder="John"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Last Name</label>
                                <input value={ldLast} onChange={e => setLdLast(e.target.value)} placeholder="Doe"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                        </div>
                        {/* Row 2: Company */}
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Company Name</label>
                            <input value={ldCompany} onChange={e => setLdCompany(e.target.value)} placeholder="Acme Corp"
                                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                        </div>
                        {/* Row 3: Website + Location */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Website</label>
                                <input value={ldWebsite} onChange={e => setLdWebsite(e.target.value)} placeholder="https://acme.com"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Location</label>
                                <input value={ldLocation} onChange={e => setLdLocation(e.target.value)} placeholder="Dubai, UAE"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                        </div>
                        {/* Row 4: Email + Phone */}
                        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Email</label>
                                <input value={ldEmail} onChange={e => setLdEmail(e.target.value)} placeholder="john@acme.com" type="email"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '4px' }}>Phone / WhatsApp</label>
                                <input value={ldPhone} onChange={e => setLdPhone(e.target.value)} placeholder="+971506341191" type="tel"
                                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e5e7eb', borderRadius: '10px', fontSize: '13px', color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fafafa' }} />
                            </div>
                        </div>
                        {/* Submit button */}
                        <button
                            onClick={() => {
                                const formData: any = {};
                                if (ldFirst.trim()) formData.first_name = ldFirst.trim();
                                if (ldLast.trim()) formData.last_name = ldLast.trim();
                                if (ldCompany.trim()) formData.company = ldCompany.trim();
                                if (ldWebsite.trim()) formData.website = ldWebsite.trim();
                                if (ldLocation.trim()) formData.location = ldLocation.trim();
                                if (ldEmail.trim()) formData.email = ldEmail.trim();
                                if (ldPhone.trim()) formData.phone = ldPhone.trim();
                                onOpt('__submit_lead_details__:' + JSON.stringify(formData));
                            }}
                            style={{
                                width: '100%', padding: '11px', background: '#0b1957', color: '#fff',
                                border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                cursor: 'pointer', transition: 'all .15s', boxShadow: '0 2px 8px rgba(23,37,96,.2)',
                            }}
                            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#0a1447'; }}
                            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#0b1957'; }}
                        >
                            Save Details &amp; Continue →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   CHECKPOINT FORM INLINE (typeform-style in chat)
   ═══════════════════════════════════════════════ */

// Trigger condition options keyed by the primary channel
const TRIGGER_OPTIONS_MAP: Record<string, Array<{ id: string; label: string; desc: string }>> = {
    linkedin: [
        { id: 'connection_accepted', label: 'After connection accepted', desc: 'Trigger when the lead accepts your LinkedIn connection' },
        { id: 'message_replied', label: 'After responding to message', desc: 'Trigger when the lead replies to your LinkedIn message' },
        { id: 'profile_visited', label: 'After profile visit', desc: 'Trigger for all visited profiles with ICP score above your threshold' },
    ],
    email: [
        { id: 'email_read', label: 'After Email Read', desc: 'Trigger when the lead opens your email' },
        { id: 'email_replied', label: 'After Responded to Email', desc: 'Trigger when the lead replies to your email' },
        { id: 'no_dependency', label: 'No Step Dependency', desc: 'Trigger the next channel immediately without waiting' },
    ],
    whatsapp: [
        { id: 'wa_read', label: 'After Message Read', desc: 'Trigger when the lead reads your WhatsApp message' },
        { id: 'wa_replied', label: 'After Responded to WhatsApp', desc: 'Trigger when the lead replies to your WhatsApp message' },
        { id: 'no_dependency', label: 'No Step Dependency', desc: 'Trigger the next channel immediately without waiting' },
    ],
    voice_call: [
        { id: 'call_completed', label: 'After Call Completed', desc: 'Trigger after the AI voice call finishes' },
        { id: 'call_answered', label: 'After Call Answered', desc: 'Trigger only when the lead answers the call' },
        { id: 'no_dependency', label: 'No Step Dependency', desc: 'Trigger the next channel immediately without waiting' },
    ],
};

const CHANNEL_PRIORITY = ['linkedin', 'email', 'whatsapp', 'voice_call'];

const CP_QUESTIONS = [
    { id: 'icp_threshold', question: 'What minimum ICP score should leads have?', type: 'select' },
    { id: 'next_channels', question: 'Configure your campaign channels', type: 'multi' },
    { id: 'trigger_condition', question: 'When should the next channel step trigger?', type: 'select' },
    { id: 'duration', question: 'How many days should this campaign run?', type: 'select' },
    { id: 'name', question: 'Give your campaign a name', type: 'input' },
];

// ── AI Personalisation toggle primitives ─────────────────────────────────────
// Shared, accessible switch + row so every personalisation option is pixel-identical.
// Two accents encode meaning: `indigo` = live-data inputs, `violet` = AI generation.
const AI_PERSO_ACCENTS: Record<'indigo' | 'violet', { on: string; tint: string; border: string; chip: string }> = {
    indigo: { on: '#4338ca', tint: '#eef2ff', border: '#c7d2fe', chip: '#e0e7ff' },
    violet: { on: '#7c3aed', tint: '#f5f3ff', border: '#ddd6fe', chip: '#ede9fe' },
};

function AiPersoToggle({ checked, onChange, accent = 'indigo', size = 'sm', disabled = false }: {
    checked: boolean; onChange: (v: boolean) => void; accent?: 'indigo' | 'violet'; size?: 'sm' | 'lg'; disabled?: boolean;
}) {
    const a = AI_PERSO_ACCENTS[accent];
    const W = size === 'lg' ? 40 : 34, H = size === 'lg' ? 22 : 20, TH = H - 4;
    return (
        <button type="button" role="switch" aria-checked={checked} disabled={disabled}
            onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!checked); }}
            style={{
                width: W, height: H, borderRadius: 99, border: 'none', padding: 0, flexShrink: 0,
                background: checked ? a.on : '#cbd5e1', position: 'relative',
                cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background .2s',
                boxShadow: checked ? `0 0 0 3px ${a.on}22` : 'none',
            }}>
            <span style={{
                position: 'absolute', top: 2, left: checked ? W - TH - 2 : 2, width: TH, height: TH,
                borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            }} />
        </button>
    );
}

function AiPersoRow({ icon, title, desc, checked, onChange, accent = 'indigo', disabled = false }: {
    icon: React.ReactNode; title: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
    accent?: 'indigo' | 'violet'; disabled?: boolean;
}) {
    const a = AI_PERSO_ACCENTS[accent];
    return (
        <div role="button" aria-pressed={checked} onClick={() => { if (!disabled) onChange(!checked); }}
            style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
                background: checked ? a.tint : '#fff', border: `1px solid ${checked ? a.border : '#e5e7eb'}`,
                borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1,
                transition: 'background .15s, border-color .15s',
            }}>
            <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0, display: 'grid', placeItems: 'center',
                background: checked ? a.chip : '#f3f4f6', color: checked ? a.on : '#94a3b8', transition: 'background .15s, color .15s',
            }}>{icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{title}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1, lineHeight: 1.35 }}>{desc}</div>
            </div>
            <AiPersoToggle checked={checked} onChange={onChange} accent={accent} disabled={disabled} />
        </div>
    );
}

function CheckpointFormInline({
    step, setStep, icpThreshold, setIcpThreshold, actions, setActions, connMsg, setConnMsg, followMsg, setFollowMsg,
    nextChannels, setNextChannels, triggerCondition, setTriggerCondition,
    days, setDays, channelConfigStep, setChannelConfigStep, channelDelays, setChannelDelays, name, setName, genLoading, setGenLoading, launching, setLaunching, targeting, leads,
    leadFeedback, selectedLeadIds, creditBalance, onOpenRecharge, searchSessions, chatMessages,
    voiceAgents, setVoiceAgents, voiceNumbers, setVoiceNumbers,
    selectedAgentId, setSelectedAgentId, selectedVoiceId, setSelectedVoiceId,
    selectedFromNumber, setSelectedFromNumber,
    emailSubject, setEmailSubject, emailBody, setEmailBody,
    selectedEmailTemplateId, setSelectedEmailTemplateId,
    saveTemplateMode, setSaveTemplateMode,
    saveTemplateName, setSaveTemplateName,
    emailGenLoading, setEmailGenLoading,
    emailFromAddress, setEmailFromAddress,
    emailProvider, setEmailProvider,
    waBody, setWaBody, waFromNumber, setWaFromNumber, waGenLoading, setWaGenLoading,
    pendingContact, inboundMode, inboundLeads, inboundLeadIds, directContactLeadIds,
    enableDailyWebPresence, setEnableDailyWebPresence,
    enableDailyPosts, setEnableDailyPosts,
    enableAiPersonalization, setEnableAiPersonalization,
    enableAiConnectionPersonalization, setEnableAiConnectionPersonalization,
    enableAiFollowupPersonalization, setEnableAiFollowupPersonalization,
    editingCampaignId,
    persistedLeadSource,
    onLetAgentDeal, agentDealLoading,
}: {
    step: number; setStep: (s: number) => void;
    icpThreshold: string; setIcpThreshold: (v: string) => void;
    actions: string[]; setActions: React.Dispatch<React.SetStateAction<string[]>>;
    connMsg: string; setConnMsg: (v: string) => void;
    followMsg: string; setFollowMsg: (v: string) => void;
    nextChannels: string[]; setNextChannels: React.Dispatch<React.SetStateAction<string[]>>;
    triggerCondition: string; setTriggerCondition: (v: string) => void;
    days: string; setDays: (v: string) => void;
    channelConfigStep: number; setChannelConfigStep: (v: number) => void;
    channelDelays: Record<string, { days: string; hours: string }>; setChannelDelays: (v: Record<string, { days: string; hours: string }>) => void;
    name: string; setName: (v: string) => void;
    genLoading: boolean; setGenLoading: (v: boolean) => void;
    launching: boolean; setLaunching: (v: boolean) => void;
    targeting: LeadTargeting | null;
    leads: LeadProfile[];
    leadFeedback: Record<string, 'good' | 'bad'>;
    selectedLeadIds: Set<string>;
    creditBalance: number | null;
    onOpenRecharge: () => void;
    searchSessions: { query: string; targeting: LeadTargeting | null; icp_description: string; timestamp: string }[];
    chatMessages: ChatMsg[];
    voiceAgents: any[]; setVoiceAgents: (v: any[]) => void;
    voiceNumbers: any[]; setVoiceNumbers: (v: any[]) => void;
    selectedAgentId: string; setSelectedAgentId: (v: string) => void;
    selectedVoiceId: string; setSelectedVoiceId: (v: string) => void;
    selectedFromNumber: string; setSelectedFromNumber: (v: string) => void;
    emailSubject: string; setEmailSubject: (v: string) => void;
    emailBody: string; setEmailBody: (v: string) => void;
    selectedEmailTemplateId: string; setSelectedEmailTemplateId: (v: string) => void;
    saveTemplateMode: boolean; setSaveTemplateMode: (v: boolean) => void;
    saveTemplateName: string; setSaveTemplateName: (v: string) => void;
    emailGenLoading: boolean; setEmailGenLoading: (v: boolean) => void;
    emailFromAddress: string; setEmailFromAddress: (v: string) => void;
    emailProvider: string; setEmailProvider: (v: string) => void;
    waBody: string; setWaBody: (v: string) => void;
    waFromNumber: string; setWaFromNumber: (v: string) => void;
    waGenLoading: boolean; setWaGenLoading: (v: boolean) => void;
    pendingContact?: any; // directly-added contact (phone/email, not LinkedIn search)
    inboundMode: boolean;
    inboundLeads: ParsedInboundLead[];
    inboundLeadIds: string[];       // Real UUIDs from leads table (CSV/image uploads)
    directContactLeadIds: string[]; // Real UUIDs for chat-entered direct contacts
    enableDailyWebPresence: boolean; setEnableDailyWebPresence: (v: boolean) => void;
    enableDailyPosts: boolean; setEnableDailyPosts: (v: boolean) => void;
    enableAiPersonalization: boolean; setEnableAiPersonalization: (v: boolean) => void;
    enableAiConnectionPersonalization: boolean; setEnableAiConnectionPersonalization: (v: boolean) => void;
    enableAiFollowupPersonalization: boolean; setEnableAiFollowupPersonalization: (v: boolean) => void;
    editingCampaignId?: string | null;
    persistedLeadSource?: PersistedLeadSource | null;
    onLetAgentDeal: () => void; agentDealLoading: boolean;
}) {
    const totalSteps = CP_QUESTIONS.length;

    // Detect if this is a directly-added contact (phone/email, no LinkedIn)
    // → skip LinkedIn-specific steps (ICP threshold, LinkedIn actions, messages)
    const isDirectContact = !!(pendingContact && !pendingContact.linkedin_url);
    const hasPhone = !!(pendingContact?.phone);
    const hasEmail = !!(pendingContact?.email);
    // LinkedIn is only possible for direct contacts if we have at least name + company (enough to look them up)
    const hasLinkedInInfo = isDirectContact
        ? !!(pendingContact?.first_name || pendingContact?.name) && !!(pendingContact?.company)
        : true;

    // Dynamic question override for direct contacts
    const getQuestion = (s: number) => {
        if (isDirectContact && s === 3) {
            return {
                id: 'outreach_channels',
                question: 'Which channel(s) do you want to use to reach this contact?',
                type: 'multi',
            };
        }
        return CP_QUESTIONS[s];
    };
    const q = getQuestion(step);

    // Sequential channel configuration helpers
    const selectedChannelsList = nextChannels.filter(ch => ch !== 'linkedin' || !isDirectContact || hasLinkedInInfo);
    const channelIcons: Record<string, string> = { linkedin: '💼', email: '✉️', whatsapp: '💬', voice_call: '📞' };
    const channelNames: Record<string, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', voice_call: 'Voice Call' };
    const currentChannelBeingConfigured = selectedChannelsList[channelConfigStep];
    const isInChannelConfiguration = nextChannels.length > 0 && step === 1 && currentChannelBeingConfigured;

    // True when no lead has a meaningful ICP score (e.g. imported/inbound leads without scoring)
    const hasNoIcpScores = leads.length === 0 || leads.every(l => !l.icp_score || l.icp_score === 0);

    // Primary channel for trigger-condition purposes (first selected channel in priority order)
    const primaryTriggerChannel = CHANNEL_PRIORITY.find(ch => nextChannels.includes(ch)) ?? null;
    // Trigger step only makes sense when 2+ channels are selected (channel A triggers channel B)
    const hasMultipleChannels = nextChannels.length > 1;
    // Dynamic trigger options based on the primary channel
    const triggerOptions = primaryTriggerChannel ? (TRIGGER_OPTIONS_MAP[primaryTriggerChannel] ?? []) : [];

    // Auto-skip ICP threshold step for:
    //   • direct contacts (single lead, no scoring needed)
    //   • inbound/imported leads that have no ICP scores generated
    // Auto-skip trigger condition step (step 2) when:
    //   • direct contact, OR fewer than 2 channels selected (no cross-channel trigger needed)
    useEffect(() => {
        if ((isDirectContact || hasNoIcpScores) && step === 0) {
            setIcpThreshold('0'); // include all leads
            setStep(1);
        }
        if (step === 2 && (!hasMultipleChannels || isDirectContact)) {
            setStep(3); // jump over trigger condition to duration
        }
    }, [isDirectContact, hasNoIcpScores, hasMultipleChannels, step]); // eslint-disable-line react-hooks/exhaustive-deps

    // SDK hooks — email templates fetched from communication_templates table
    const { data: emailTemplates = [] } = useEmailTemplates({ is_active: true });
    const createEmailTemplate = useCreateEmailTemplate();

    // LinkedIn account daily limit (for All Leads label)
    const [linkedInDailyLimit, setLinkedInDailyLimit] = useState<number | null>(null);
    useEffect(() => {
        fetch('/api/social-integration/linkedin/accounts', { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.success && d.accounts?.length) {
                    const limit = d.accounts[0].default_daily_limit;
                    if (limit) setLinkedInDailyLimit(limit);
                }
            })
            .catch(() => { });
    }, []);  

    // SDK hook — connected Gmail / Outlook accounts from integration tab
    const { data: connectedSenders = [] } = useConnectedEmailSenders();

    // WhatsApp accounts from social_whatsapp_accounts table
    const [whatsAppAccounts, setWhatsAppAccounts] = useState<any[]>([]);
    const [waAccountId, setWaAccountId] = useState('');
    useEffect(() => {
        if (!nextChannels.includes('whatsapp') || whatsAppAccounts.length > 0) return;
        fetch('/api/social-integration/whatsapp/accounts', { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
                if (d.success && d.accounts?.length) {
                    setWhatsAppAccounts(d.accounts);
                    if (!waAccountId) setWaAccountId(d.accounts[0].id);
                }
            })
            .catch(() => { });
    }, [nextChannels]); // eslint-disable-line react-hooks/exhaustive-deps

    // WhatsApp message templates (from communication_templates table)
    const [waTemplates, setWaTemplates] = useState<any[]>([]);
    const [waTemplatesLoaded, setWaTemplatesLoaded] = useState(false);
    const [selectedWaTemplateId, setSelectedWaTemplateId] = useState('');
    const [showWaTemplatePanel, setShowWaTemplatePanel] = useState(false);
    // Create-new template form state
    const [showWaNewTmplForm, setShowWaNewTmplForm] = useState(false);
    const [waNewTmplName, setWaNewTmplName] = useState('');
    const [waNewTmplChannelType, setWaNewTmplChannelType] = useState<'personal_whatsapp' | 'business_api'>('personal_whatsapp');
    const [waNewTmplHeader, setWaNewTmplHeader] = useState('');
    const [waNewTmplBody, setWaNewTmplBody] = useState('');
    const [waNewTmplFooter, setWaNewTmplFooter] = useState('');
    const [waNewTmplWabaName, setWaNewTmplWabaName] = useState('');
    const [waNewTmplLang, setWaNewTmplLang] = useState('en');
    const [waNewTmplDefault, setWaNewTmplDefault] = useState(false);
    const [waNewTmplSaving, setWaNewTmplSaving] = useState(false);
    // Media attachment state
    const [waNewTmplMediaType, setWaNewTmplMediaType] = useState<'none' | 'image' | 'video' | 'document' | 'location'>('none');
    const [waNewTmplMediaUrl, setWaNewTmplMediaUrl] = useState('');
    const [waNewTmplMediaFilename, setWaNewTmplMediaFilename] = useState('');
    const [waNewTmplMediaUploading, setWaNewTmplMediaUploading] = useState(false);
    const [waNewTmplLocLat, setWaNewTmplLocLat] = useState('');
    const [waNewTmplLocLng, setWaNewTmplLocLng] = useState('');
    const [waNewTmplLocName, setWaNewTmplLocName] = useState('');
    const [waNewTmplShowPreview, setWaNewTmplShowPreview] = useState(true);
    const waMediaUploadRef = useRef<HTMLInputElement>(null);

    // Fetch WA templates once when WhatsApp channel is first enabled
    useEffect(() => {
        if (!nextChannels.includes('whatsapp') || waTemplatesLoaded) return;
        setWaTemplatesLoaded(true);
        fetch('/api/campaigns/whatsapp-templates', { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setWaTemplates(d.data || []); })
            .catch(() => { });
    }, [nextChannels, waTemplatesLoaded]);  

    // LinkedIn follow-up config (when linkedin selected as next channel in step 3)
    // Multi-select: 'profile_view' | 'connect' | 'message'
    // Initialise from the `actions` prop so edit-mode hydration (the parent sets
    // cpActions from the saved campaign / its steps) pre-checks the LinkedIn action
    // boxes. In the create flow `actions` is [] at mount, so this is a no-op there.
    // Use the shared config actions (derived from the canonical workflowPreview
    // by the parent) so LinkedIn action toggles round-trip to the Workflow canvas
    // instead of living in an orphaned local copy that never synced back.
    const liChannelActions = actions || [];
    const setLiChannelActions = setActions;
    const [liFollowGenLoading, setLiFollowGenLoading] = useState(false);

    // AI Generate inline context panel state (one per message type)
    const [showAiConnPanel, setShowAiConnPanel] = useState(false);
    const [showAiFollowPanel, setShowAiFollowPanel] = useState(false);
    const [aiMsgValueProp, setAiMsgValueProp] = useState('');
    const [aiMsgTone, setAiMsgTone] = useState('professional');  // 'professional' | 'casual' | 'direct'
    const [aiMsgGoal, setAiMsgGoal] = useState('get_meeting');   // 'get_meeting' | 'share_resource' | 'explore_collab' | 'general'

    // LinkedIn message templates (communication_templates table, channel='linkedin')
    const [liTemplates, setLiTemplates] = useState<any[]>([]);
    const [liTemplatesLoaded, setLiTemplatesLoaded] = useState(false);
    const [selectedLiConnTmplId, setSelectedLiConnTmplId] = useState('');
    const [selectedLiFollowTmplId, setSelectedLiFollowTmplId] = useState('');
    const [showLiConnTmplPanel, setShowLiConnTmplPanel] = useState(false);
    const [showLiFollowTmplPanel, setShowLiFollowTmplPanel] = useState(false);
    // Create-new template form state
    const [showLiNewTmplForm, setShowLiNewTmplForm] = useState(false);
    const [liNewTmplCategory, setLiNewTmplCategory] = useState<'linkedin_connection' | 'linkedin_followup'>('linkedin_connection');
    const [liNewTmplName, setLiNewTmplName] = useState('');
    const [liNewTmplBody, setLiNewTmplBody] = useState('');
    const [liNewTmplSaving, setLiNewTmplSaving] = useState(false);

    // Sync waNewTmplChannelType with selected account type
    useEffect(() => {
        if (!waAccountId || !whatsAppAccounts.length) return;
        const acc = whatsAppAccounts.find((a: any) => a.id === waAccountId);
        if (acc) setWaNewTmplChannelType(acc.account_type === 'business_api' ? 'business_api' : 'personal_whatsapp');
    }, [waAccountId, whatsAppAccounts]);  

    // Fetch LinkedIn message templates once when LinkedIn channel is first enabled
    useEffect(() => {
        if (!nextChannels.includes('linkedin') || liTemplatesLoaded) return;
        setLiTemplatesLoaded(true);
        fetch('/api/campaigns/linkedin-message-templates', { credentials: 'include' })
            .then(r => r.json())
            .then(d => { if (d.success) setLiTemplates(d.data || []); })
            .catch(() => { });
    }, [nextChannels, liTemplatesLoaded]);  

    // Toggle a LinkedIn channel action (multi-select) with dependency auto-select:
    // - selecting 'connect'  → also selects 'profile_view'
    // - selecting 'message'  → also selects 'profile_view' and 'connect'
    // - deselecting follows the reverse: deselecting 'profile_view' also deselects 'connect'+'message'; deselecting 'connect' also deselects 'message'
    const toggleLiChannelAction = (id: string) => {
        setLiChannelActions(prev => {
            const isOn = prev.includes(id);
            if (!isOn) {
                // turning ON
                const toAdd = new Set([...prev, id]);
                if (id === 'connect') toAdd.add('profile_view');
                if (id === 'message') { toAdd.add('profile_view'); toAdd.add('connect'); }
                return Array.from(toAdd);
            } else {
                // turning OFF
                let toRemove = [id];
                if (id === 'profile_view') toRemove = ['profile_view', 'connect', 'message'];
                if (id === 'connect') toRemove = ['connect', 'message'];
                return prev.filter(a => !toRemove.includes(a));
            }
        });
    };

    // Save a new LinkedIn message template
    const saveLiTemplate = async () => {
        if (!liNewTmplName.trim() || !liNewTmplBody.trim()) return;
        setLiNewTmplSaving(true);
        try {
            const resp = await fetch('/api/campaigns/linkedin-message-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: liNewTmplName.trim(), content: liNewTmplBody.trim(), category: liNewTmplCategory }),
            });
            const d = await resp.json();
            if (d.success && d.data) {
                setLiTemplates(prev => [d.data, ...prev]);
                // Auto-apply the new template
                if (liNewTmplCategory === 'linkedin_connection') {
                    setSelectedLiConnTmplId(d.data.id);
                    setConnMsg(d.data.content);
                    setShowLiConnTmplPanel(false);
                } else {
                    setSelectedLiFollowTmplId(d.data.id);
                    setFollowMsg(d.data.content);
                    setShowLiFollowTmplPanel(false);
                }
                setLiNewTmplName('');
                setLiNewTmplBody('');
                setShowLiNewTmplForm(false);
            }
        } catch { }
        setLiNewTmplSaving(false);
    };

    // Delete a LinkedIn template (soft delete)
    const deleteLiTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/campaigns/linkedin-message-templates/${id}`, { method: 'DELETE', credentials: 'include' });
            setLiTemplates(prev => prev.filter(t => t.id !== id));
            if (selectedLiConnTmplId === id) setSelectedLiConnTmplId('');
            if (selectedLiFollowTmplId === id) setSelectedLiFollowTmplId('');
        } catch { }
    };

    // Apply a saved WA template: compose header + body + footer into waBody
    const applyWaTemplate = (tmpl: any) => {
        setSelectedWaTemplateId(tmpl.id);
        const parts = [tmpl.header_text, tmpl.content, tmpl.footer_text].filter(Boolean);
        setWaBody(parts.join('\n\n'));
        setShowWaTemplatePanel(false);
    };

    // Upload media file to backend (GCP storage)
    const uploadWaTemplateMedia = async (file: File) => {
        setWaNewTmplMediaUploading(true);
        setWaNewTmplMediaUrl('');
        setWaNewTmplMediaFilename(file.name);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/campaigns/whatsapp-templates/media-upload', {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            const d = await res.json();
            if (d.success) setWaNewTmplMediaUrl(d.url);
        } catch { }
        setWaNewTmplMediaUploading(false);
    };

    // Save a new WA template and apply it immediately
    const saveWaTemplate = async () => {
        if (!waNewTmplName.trim() || !waNewTmplBody.trim()) return;
        setWaNewTmplSaving(true);
        try {
            const res = await fetch('/api/campaigns/whatsapp-templates', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: waNewTmplName.trim(),
                    content: waNewTmplBody.trim(),
                    channel_type: waNewTmplChannelType,
                    header_text: waNewTmplHeader.trim() || null,
                    footer_text: waNewTmplFooter.trim() || null,
                    template_name: waNewTmplWabaName.trim() || null,
                    language_code: waNewTmplLang,
                    is_default: waNewTmplDefault,
                    media_type: waNewTmplMediaType !== 'none' ? waNewTmplMediaType : null,
                    media_url: waNewTmplMediaUrl || null,
                    media_filename: waNewTmplMediaFilename || null,
                    location_lat: waNewTmplLocLat ? parseFloat(waNewTmplLocLat) : null,
                    location_lng: waNewTmplLocLng ? parseFloat(waNewTmplLocLng) : null,
                    location_name: waNewTmplLocName || null,
                }),
            });
            const d = await res.json();
            if (d.success) {
                setWaTemplates(prev => [d.data, ...prev]);
                applyWaTemplate(d.data);
                setShowWaNewTmplForm(false);
                setShowWaTemplatePanel(false);
                // Reset all form fields
                setWaNewTmplName(''); setWaNewTmplBody(''); setWaNewTmplHeader('');
                setWaNewTmplFooter(''); setWaNewTmplWabaName(''); setWaNewTmplDefault(false);
                setWaNewTmplMediaType('none'); setWaNewTmplMediaUrl(''); setWaNewTmplMediaFilename('');
                setWaNewTmplLocLat(''); setWaNewTmplLocLng(''); setWaNewTmplLocName('');
            }
        } catch { }
        setWaNewTmplSaving(false);
    };

    // Delete a WA template
    const deleteWaTemplate = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Delete this template?')) return;
        try {
            await fetch(`/api/campaigns/whatsapp-templates/${id}`, { method: 'DELETE', credentials: 'include' });
            setWaTemplates(prev => prev.filter(t => t.id !== id));
            if (selectedWaTemplateId === id) { setSelectedWaTemplateId(''); }
        } catch { }
    };

    // SDK hooks — campaign creation and AI chat (needed for launchCampaign, generateMsg, generateEmail)
    const aiChat = useAIChat();
    const campaignCreation = useCampaignCreation();

    // Auto-select default template when templates load for the first time
    useEffect(() => {
        if (emailTemplates.length > 0 && !selectedEmailTemplateId) {
            const def = emailTemplates.find(t => t.is_default);
            if (def && !emailSubject) {
                setEmailSubject(def.subject || '');
                setEmailBody(def.body || '');
                setSelectedEmailTemplateId(def.id);
            }
        }
    }, [emailTemplates]); // eslint-disable-line react-hooks/exhaustive-deps

    // LinkedIn safe limits
    const LINKEDIN_DAILY_LIMIT = 40; // safe daily connection request limit
    const LINKEDIN_WEEKLY_LIMIT = 190; // safe weekly limit

    // Minimum credit ESTIMATE per enrolled lead, matching the default personalized-connect
    // flow (featureCreditConfig: personalized connect = 5 flat). Real billing is PER-ACTION
    // at execution time — launch itself charges 0; connect=1, personalized connect=5,
    // template msg=5, enrichment=2, phone=10 — so this gate is a deliberate minimum
    // estimate, NOT the actual charge.
    const CREDIT_COST_PER_LEAD = 5;

    // Compute qualified leads count based on ICP threshold
    // Inbound imports: the user can uncheck leads in the panel — every config number
    // (duration copy, leads/day, totals) must reflect the SELECTED count, not the
    // full import.
    const inboundSelectedCount = inboundMode
        ? (selectedLeadIds.size > 0
            ? (inboundLeadIds.filter(id => selectedLeadIds.has(id)).length || inboundLeadIds.length || inboundLeads.length)
            : (inboundLeadIds.length || inboundLeads.length))
        : null;
    const qualifiedLeadCount = inboundSelectedCount != null && inboundSelectedCount > 0
        ? inboundSelectedCount
        : leads.filter(l => (l.icp_score ?? 0) >= (parseInt(icpThreshold) || 0)).length;

    // Compute LinkedIn capacity based on campaign duration
    const campaignDays = parseInt(days) || 30;
    const workingDays = Math.max(1, Math.floor(campaignDays * 5 / 7)); // Mon-Fri only, at least 1
    const campaignWeeks = Math.ceil(campaignDays / 7);
    const dailyCapacity = workingDays * LINKEDIN_DAILY_LIMIT;
    const weeklyCapacity = campaignWeeks * LINKEDIN_WEEKLY_LIMIT;
    const totalLinkedInCapacity = Math.min(dailyCapacity, weeklyCapacity);
    // Daily target = the qualified-lead count from prospecting, capped at LinkedIn's safe daily limit.
    // The backend uses this as a per-day fetch target and continues paginating LinkedIn search via the
    // saved cursor on each scheduled run, so the same number of NEW qualified leads is sourced every day.
    // (Previously this was qualifiedLeadCount / workingDays, which spread an initial snapshot of leads
    // across the campaign duration and made subsequent scheduled runs fetch only 1 lead/day.)
    const safeLeadsPerDay = Math.min(LINKEDIN_DAILY_LIMIT, Math.max(1, qualifiedLeadCount));
    const exceedsLinkedInLimits = qualifiedLeadCount > LINKEDIN_DAILY_LIMIT;

    // Credit gate for launch. Enrolled = CHECKED leads minus thumbs-down — mirrors
    // launchCampaign's goodMatchLeads filter, not raw selectedLeadIds.size.
    // creditBalance === null (billing fetch failed) fails OPEN — never block launch
    // on a billing-fetch error.
    const enrolledCount = leads.filter(l => selectedLeadIds.has(l.id)).filter(l => leadFeedback[l.id] !== 'bad').length;
    const requiredCredits = enrolledCount * CREDIT_COST_PER_LEAD;
    const creditsOk = creditBalance == null || creditBalance >= requiredCredits;

    const toggleAction = (a: string) => {
        const newActions = actions.includes(a) ? actions.filter(x => x !== a) : [...actions, a];
        setActions(newActions);
    };
    const toggleNextChannel = (ch: string) => {
        if (ch === 'skip') { setNextChannels([]); setTriggerCondition(''); return; }
        setNextChannels((p: string[]) => {
            const next = p.includes(ch) ? p.filter(x => x !== ch) : [...p, ch];
            // Reset trigger condition when the primary channel changes (options differ per channel)
            const oldPrimary = CHANNEL_PRIORITY.find(c => p.includes(c));
            const newPrimary = CHANNEL_PRIORITY.find(c => next.includes(c));
            if (oldPrimary !== newPrimary) setTriggerCondition('');
            return next;
        });
        // Email templates are loaded by useEmailTemplates SDK hook (no manual fetch needed)
        // Fetch voice agents and numbers when voice_call is first selected
        if (ch === 'voice_call' && voiceAgents.length === 0) {
            // voiceAgents and voiceNumbers are pre-populated by the parent via the voiceAgent hook.
            // Normalize the already-fetched data from props.
            const agents = voiceAgents.map((a: any) => ({
                ...a,
                id: a.agent_id || a.id || '',
                name: a.agent_name || a.name || '',
            }));
            const numbers = voiceNumbers.map((n: any) => {
                let num = n.phone_number || '';
                // If phone_number is just "+" or "+null" or empty, construct from parts
                if (!num || num === '+' || num.includes('null')) {
                    num = (n.country_code && n.base_number) ? `+${n.country_code}${n.base_number}` : '';
                }
                return { ...n, phone_number: num };
            }).filter((n: any) => n.phone_number && n.phone_number !== '+');
            setVoiceAgents(agents);
            setVoiceNumbers(numbers);
            if (agents.length > 0 && !selectedAgentId) {
                setSelectedAgentId(agents[0].id);
                setSelectedVoiceId(agents[0].voice_id || '');
            }
            if (numbers.length > 0 && !selectedFromNumber) {
                setSelectedFromNumber(numbers[0].phone_number);
            }
        }
    };

    const generateMsg = async (type: 'connect' | 'follow') => {
        setGenLoading(true);
        try {
            const jobDesc = targeting?.job_titles?.length ? targeting.job_titles.join(' / ') : 'professionals';
            const indDesc = targeting?.industries?.length ? ` in the ${targeting.industries[0]} industry` : '';
            const locDesc = targeting?.locations?.length ? ` in ${targeting.locations[0]}` : '';
            const prompt = type === 'connect'
                ? `System Settings:\n- You are an automated script that outputs raw string data.\n- NEVER talk to the user.\n- OUTPUT THE ACTUAL MESSAGE AND NOTHING ELSE.\n\nTask: Write a short, casual LinkedIn connection request (max 300 chars) for a ${jobDesc}${indDesc}${locDesc}.\nStart exactly with: "Hi {first_name},"\nFocus on networking. No sales pitches.`
                : `System Settings:\n- You are an automated script that outputs raw string data.\n- NEVER talk to the user.\n- OUTPUT THE ACTUAL MESSAGE AND NOTHING ELSE.\n\nTask: Write a concise, professional LinkedIn follow-up message (under 300 chars) to send AFTER someone accepts a connection request. Target audience is: ${jobDesc}${indDesc}.\nStart exactly with: "Thanks for connecting! "\nAsk a relevant, polite question to spark conversation. Do not pitch.`;
            const d = await aiChat.sendMessage(prompt);
            if (d) { type === 'connect' ? setConnMsg(d.response || d.text) : setFollowMsg(d.response || d.text); }
        } catch (e) { console.error('Gen msg error', e); }
        setGenLoading(false);
    };

    const generateEmail = async () => {
        setEmailGenLoading(true);
        try {
            const jobDesc = targeting?.job_titles?.length ? targeting.job_titles.join(' / ') : 'professionals';
            const indDesc = targeting?.industries?.length ? ` in the ${targeting.industries[0]} industry` : '';
            const locDesc = targeting?.locations?.length ? ` in ${targeting.locations[0]}` : '';
            const subjectPrompt = `System Settings:\n- You are an automated script that outputs raw string data.\n- NEVER talk to the user.\n- OUTPUT THE SUBJECT LINE ONLY (max 80 chars).\n\nTask: Write a compelling email subject line for a follow-up email to ${jobDesc}${indDesc}${locDesc}.`;
            const bodyPrompt = `System Settings:\n- You are an automated script that outputs raw string data.\n- NEVER talk to the user.\n- OUTPUT THE EMAIL BODY ONLY.\n\nTask: Write a professional, concise outreach email body (150-200 words) for ${jobDesc}${indDesc}${locDesc}. Start with "Hi {{first_name}}," and end with a soft call-to-action. Use placeholders: {{first_name}}, {{company}}, {{title}}. No subject line, just the body.`;
            const [subjectData, bodyData] = await Promise.all([
                aiChat.sendMessage(subjectPrompt),
                aiChat.sendMessage(bodyPrompt),
            ]);
            if (subjectData) setEmailSubject(subjectData.response || subjectData.text || '');
            if (bodyData) setEmailBody(bodyData.response || bodyData.text || '');
        } catch { }
        setEmailGenLoading(false);
    };

    const generateWhatsApp = async () => {
        setWaGenLoading(true);
        try {
            const contactName = pendingContact?.first_name || pendingContact?.name || '';
            const jobDesc = targeting?.job_titles?.length ? targeting.job_titles.join(' / ') : 'professionals';
            const indDesc = targeting?.industries?.length ? ` in the ${targeting.industries[0]} industry` : '';
            const locDesc = targeting?.locations?.length ? ` in ${targeting.locations[0]}` : '';
            const nameHint = contactName ? ` to ${contactName}` : '';
            const prompt = `System Settings:\n- You are an automated script that outputs raw string data.\n- NEVER talk to the user.\n- OUTPUT THE WHATSAPP MESSAGE ONLY.\n\nTask: Write a friendly, brief WhatsApp outreach message${nameHint} for ${jobDesc}${indDesc}${locDesc}. Start with "Hi {{first_name}},". End with a soft call-to-action. Use placeholders: {{first_name}}, {{company}}, {{title}}. Keep it conversational and under 300 characters.`;
            const data = await aiChat.sendMessage(prompt);
            if (data) setWaBody(data.response || data.text || '');
        } catch { }
        setWaGenLoading(false);
    };

    const saveEmailTemplate = async () => {
        if (!saveTemplateName.trim() || !emailSubject.trim() || !emailBody.trim()) return;
        try {
            const saved = await createEmailTemplate.mutateAsync({
                name: saveTemplateName.trim(),
                subject: emailSubject,
                body: emailBody,
                category: 'email_send',
            });
            setSelectedEmailTemplateId(saved.id);
            setSaveTemplateName('');
            setSaveTemplateMode(false);
            // React Query cache is auto-invalidated by the mutation — list refreshes
        } catch { }
    };

    const suggestName = () => {
        const datePart = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        // Inbound imports: targeting.job_titles is empty, so the targeting-based path
        // yields a meaningless "Leads in X". Derive from the SELECTED imported leads
        // instead (companies + location) — same spirit as the outbound name.
        if (inboundMode && inboundLeads.length > 0) {
            const selected = inboundLeads.filter((_, idx) => {
                if (selectedLeadIds.size === 0) return true;
                const id = inboundLeadIds[idx];
                return !id || selectedLeadIds.has(id);
            });
            const pool = selected.length > 0 ? selected : inboundLeads;
            const companies = [...new Set(pool.map(l => (l.companyName || '').trim()).filter(Boolean))];
            const companyPart = companies.length === 0
                ? 'Imported Leads'
                : companies.length === 1
                    ? companies[0]
                    : companies.length === 2
                        ? `${companies[0]} & ${companies[1]}`
                        : `${companies[0]} +${companies.length - 1} more`;
            const inbLocPart = targeting?.locations?.length ? ` (${targeting.locations[0].split(',')[0]})` : '';
            setName(`${companyPart} Outreach${inbLocPart} · ${datePart}`);
            return;
        }

        const t = targeting;
        // Simple pluralize: append "s" unless the word already ends in one.
        const pluralize = (s: string) => (s.endsWith('s') ? s : `${s}s`);
        // " +N" suffix when the targeting has more than one value for a facet.
        const more = (arr?: string[]) => (arr && arr.length > 1 ? ` +${arr.length - 1}` : '');

        // Title/role: first job title (pluralized), else first keyword, else "Leads".
        let titlePart = 'Leads';
        if (t?.job_titles?.length) {
            titlePart = pluralize(t.job_titles[0].trim()) + more(t.job_titles);
        } else if (t?.keywords?.length) {
            titlePart = t.keywords[0].trim();
        }

        // Industry: always included when present (previously dropped whenever a location existed).
        const indPart = t?.industries?.length
            ? ` — ${t.industries[0].trim()}${more(t.industries)}`
            : '';

        // Location: city (part before the comma) of the first location.
        const locPart = t?.locations?.length
            ? ` in ${t.locations[0].split(',')[0].trim()}${more(t.locations)}`
            : '';

        // title + industry + location is the headline; date is a subtle suffix for uniqueness.
        const composed = `${titlePart}${indPart}${locPart} · ${datePart}`.replace(/\s{2,}/g, ' ').trim();
        setName(composed || `Leads · ${datePart}`);
    };

    // AI-generate a LinkedIn message for the given type
    const generateLinkedInFollowup = async (type: 'connect' | 'followup') => {
        // Close whichever inline panel was open
        if (type === 'connect') setShowAiConnPanel(false);
        else setShowAiFollowPanel(false);

        // Check if user already entered text - if so, don't generate
        const existingMsg = type === 'connect' ? connMsg : followMsg;
        if (existingMsg && existingMsg.trim()) {
            // User has already entered a message, no need to generate
            return;
        }

        setLiFollowGenLoading(true);
        try {
            const sampleLead = leads && leads.length > 0 ? (leads[0] as any) : null;
            const sampleLinkedInUrl = sampleLead
                ? sampleLead.linkedin_url || sampleLead.employee_linkedin_url || null
                : null;
            const resp = await fetch('/api/campaigns/generate-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    type: type === 'connect' ? 'connection_request' : 'linkedin_followup',
                    targeting,
                    context: {
                        value_prop: aiMsgValueProp || '',
                        tone: aiMsgTone,
                        goal: aiMsgGoal,
                        sample_linkedin_url: sampleLinkedInUrl,
                    },
                }),
            });
            const d = await resp.json();
            if (d.message) {
                if (type === 'connect') setConnMsg(d.message);
                else setFollowMsg(d.message);
            }
        } catch { }
        setLiFollowGenLoading(false);
    };

    const launchCampaign = async () => {
        setLaunching(true);
        try {
            const campaignDays = parseInt(days) || 30;
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + campaignDays);
            const actionSteps: any[] = [];
            let orderIdx = 1;
            if (!isDirectContact && nextChannels.includes('linkedin')) {
                // Primary LinkedIn steps — configured in channels step via liChannelActions
                const liDelayConfig = { delayDays: parseInt(channelDelays.linkedin?.days) || 0, delayHours: parseInt(channelDelays.linkedin?.hours) || 0 };
                if (liChannelActions.includes('profile_view')) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...liDelayConfig } });
                if (liChannelActions.includes('connect')) actionSteps.push({ type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', order_index: orderIdx++, config: { message: connMsg || '', ...liDelayConfig } });
                if (liChannelActions.includes('message')) actionSteps.push({ type: 'linkedin_message', title: 'Send Follow-up Message', channel: 'linkedin', order_index: orderIdx++, config: { message: followMsg || '', ...liDelayConfig } });
                // Default to profile visit if no specific action selected
                if (liChannelActions.length === 0) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...liDelayConfig } });
            }

            if (isDirectContact && nextChannels.length > 0) {
                // Direct contact (phone/email only): add channel steps immediately — no LinkedIn trigger needed
                for (const ch of nextChannels) {
                    const chDelayConfig = { delayDays: parseInt(channelDelays[ch]?.days) || 0, delayHours: parseInt(channelDelays[ch]?.hours) || 0 };
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined, ...chDelayConfig } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { whatsappMessage: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined, ...chDelayConfig } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined, ...chDelayConfig } });
                    if (ch === 'linkedin') {
                        if (liChannelActions.includes('profile_view')) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...chDelayConfig } });
                        if (liChannelActions.includes('connect')) actionSteps.push({ type: 'linkedin_connect', title: 'Send LinkedIn Connection Request', channel: 'linkedin', order_index: orderIdx++, config: { message: connMsg || '', ...chDelayConfig } });
                        if (liChannelActions.includes('message')) actionSteps.push({ type: 'linkedin_message', title: 'Send LinkedIn Follow-up Message', channel: 'linkedin', order_index: orderIdx++, config: { message: followMsg || '', ...chDelayConfig } });
                        // Default to profile visit if no specific action selected
                        if (liChannelActions.length === 0) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...chDelayConfig } });
                    }
                }
            } else if (!isDirectContact && hasMultipleChannels && triggerCondition && triggerCondition !== 'no_dependency') {
                // Multi-channel flow: wait for primary channel trigger, then execute follow-up channels
                const conditionTitleMap: Record<string, string> = {
                    // LinkedIn triggers
                    connection_accepted: 'Wait for Connection Accepted',
                    message_replied: 'Wait for Message Reply',
                    profile_visited: 'Wait for Profile Visit',
                    // Email triggers
                    email_read: 'Wait for Email Read',
                    email_replied: 'Wait for Email Reply',
                    // WhatsApp triggers
                    wa_read: 'Wait for WhatsApp Read',
                    wa_replied: 'Wait for WhatsApp Reply',
                    // Voice triggers
                    call_completed: 'Wait for Call Completed',
                    call_answered: 'Wait for Call Answered',
                };
                const conditionActionMap: Record<string, string> = {
                    connection_accepted: 'CONNECTION_ACCEPTED',
                    message_replied: 'REPLY_RECEIVED',
                    profile_visited: 'PROFILE_VISITED',
                    email_read: 'EMAIL_READ',
                    email_replied: 'EMAIL_REPLIED',
                    wa_read: 'WA_READ',
                    wa_replied: 'WA_REPLIED',
                    call_completed: 'CALL_COMPLETED',
                    call_answered: 'CALL_ANSWERED',
                };
                // Determine which channel this trigger belongs to (primary channel)
                const triggerChannel = primaryTriggerChannel ?? 'linkedin';
                actionSteps.push({
                    type: 'wait_for_condition',
                    title: conditionTitleMap[triggerCondition] || 'Wait for Condition',
                    channel: triggerChannel,
                    order_index: orderIdx++,
                    config: {
                        condition: triggerCondition,
                        action_type: conditionActionMap[triggerCondition] || 'PROFILE_VISITED',
                        ...(triggerCondition === 'profile_visited' ? { icp_threshold: parseInt(icpThreshold) || 0 } : {}),
                    },
                });
                // Follow-up channels: all channels except the primary trigger channel
                for (const ch of nextChannels.filter(ch => ch !== primaryTriggerChannel)) {
                    const chDelayConfig = { delayDays: parseInt(channelDelays[ch]?.days) || 0, delayHours: parseInt(channelDelays[ch]?.hours) || 0 };
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Follow-up Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined, ...chDelayConfig } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { whatsappMessage: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined, ...chDelayConfig } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined, ...chDelayConfig } });
                    if (ch === 'linkedin') {
                        if (liChannelActions.includes('profile_view')) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...chDelayConfig } });
                        if (liChannelActions.includes('connect')) actionSteps.push({ type: 'linkedin_connect', title: 'Send LinkedIn Connection Request', channel: 'linkedin', order_index: orderIdx++, config: { message: connMsg || '', ...chDelayConfig } });
                        if (liChannelActions.includes('message')) actionSteps.push({ type: 'linkedin_message', title: 'Send LinkedIn Follow-up Message', channel: 'linkedin', order_index: orderIdx++, config: { message: followMsg || '', ...chDelayConfig } });
                        if (liChannelActions.length === 0) actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: { ...chDelayConfig } });
                    }
                }
            } else if (!isDirectContact && hasMultipleChannels) {
                // no_dependency or no trigger condition selected — execute all channels sequentially without waiting
                for (const ch of nextChannels.filter(ch => ch !== primaryTriggerChannel)) {
                    const chDelayConfig = { delayDays: parseInt(channelDelays[ch]?.days) || 0, delayHours: parseInt(channelDelays[ch]?.hours) || 0 };
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Follow-up Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined, ...chDelayConfig } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { whatsappMessage: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined, ...chDelayConfig } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined, ...chDelayConfig } });
                }
            } else if (!isDirectContact && !hasMultipleChannels && nextChannels.length > 0) {
                // LinkedIn search source but only a single non-LinkedIn channel selected (e.g. WhatsApp-only).
                // The first block above already added LinkedIn steps (if linkedin is in nextChannels).
                // This block handles the gap: add outreach steps for any non-LinkedIn single channel.
                for (const ch of nextChannels) {
                    const chDelayConfig = { delayDays: parseInt(channelDelays[ch]?.days) || 0, delayHours: parseInt(channelDelays[ch]?.hours) || 0 };
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined, ...chDelayConfig } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { whatsappMessage: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined, ...chDelayConfig } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined, ...chDelayConfig } });
                }
            }

            // ── AI Media step (media_generation) ──────────────────────────────
            // The canvas node carries the accepted asset (permanent GCS quadruple,
            // set via StepEditor → import-generated). Emit it as a real first step
            // and stamp the asset onto every downstream send step that can carry
            // media (LinkedIn message / WhatsApp / Email). The backend executor
            // for media_generation is a fast no-op — sends read their own config.
            const wfMediaNode = (useOnboardingStore.getState().workflowPreview || [])
                .find((s: any) => s.type === 'media_generation') as any;
            if (wfMediaNode?.mediaUrl) {
                const mediaCfg = {
                    media_url: wfMediaNode.mediaUrl,
                    media_type: wfMediaNode.mediaType || 'image',
                    media_filename: wfMediaNode.mediaFilename || undefined,
                    mime_type: wfMediaNode.mimeType || undefined,
                };
                const MEDIA_CAPABLE = ['linkedin_message', 'whatsapp_send', 'email_send'];
                for (const s of actionSteps) {
                    if (MEDIA_CAPABLE.includes(s.type)) s.config = { ...s.config, ...mediaCfg };
                }
                actionSteps.unshift({
                    type: 'media_generation', title: wfMediaNode.title || 'AI Media', channel: 'media',
                    order_index: 0, config: { ...mediaCfg, prompt: wfMediaNode.mediaPrompt || undefined },
                });
                actionSteps.forEach((s, i) => { s.order_index = i + 1; });
            }

            const t = targeting || { keywords: [], industries: [], locations: [], job_titles: [], profile_language: [] };
            const icpMin = parseInt(icpThreshold) || 0;
            // Build lead feedback summary for campaign config
            const feedbackSummary = leads.reduce((acc, l) => {
                const fb = leadFeedback[l.id];
                if (fb) acc.push({ lead_id: l.id, name: l.name, headline: l.headline, company: l.current_company, rating: fb, icp_score: l.icp_score });
                return acc;
            }, [] as { lead_id: string; name: string; headline: string; company: string; rating: string; icp_score?: number }[]);

            // Build checkpoint selections object
            const checkpointSelections = {
                icp_threshold: icpMin,
                linkedin_actions: liChannelActions,
                connection_message: connMsg || '',
                followup_message: followMsg || '',
                next_channels: nextChannels,
                trigger_condition: triggerCondition || null,
                campaign_days: campaignDays,
                campaign_name: name || 'AI Growth Campaign',
                enable_daily_web_presence: enableDailyWebPresence,
                enable_daily_posts: enableDailyPosts,
                enable_ai_personalization: enableAiPersonalization,
                enable_ai_connection_personalization: enableAiConnectionPersonalization,
                enable_ai_followup_personalization: enableAiFollowupPersonalization,
                ai_value_prop: aiMsgValueProp || '',
                ai_tone: aiMsgTone || 'professional',
                ai_goal: aiMsgGoal || 'get_meeting',
                // AI Media node (edit-mode round-trip: hydration re-creates the canvas node)
                media_step: wfMediaNode ? {
                    media_url: wfMediaNode.mediaUrl || '',
                    media_type: wfMediaNode.mediaType || '',
                    media_filename: wfMediaNode.mediaFilename || '',
                    mime_type: wfMediaNode.mimeType || '',
                    prompt: wfMediaNode.mediaPrompt || '',
                } : null,
            };

            // Get original ICP input (first user message in chat)
            const userMessages = chatMessages.filter(m => m.role === 'user').map(m => m.text);
            const initialIcpInput = userMessages[0] || (searchSessions.length > 0
                ? searchSessions[searchSessions.length - 1]?.icp_description || ''
                : '');

            // Persist all user inputs to localStorage
            try {
                localStorage.setItem('lad_campaign_checkpoints', JSON.stringify(checkpointSelections));
                localStorage.setItem('lad_campaign_icp_input', initialIcpInput);
                localStorage.setItem('lad_campaign_user_messages', JSON.stringify(userMessages));
                // Persist targeting_filters (including nationality) for reuse over next few days
                if (targeting) {
                    const filtersToSave = {
                        nationality: targeting.decision_maker_nationality || [],
                        experience_level: targeting.decision_maker_experience_level || [],
                        skills: targeting.decision_maker_skills || [],
                        education: targeting.decision_maker_education || [],
                        company_size: targeting.company_size || [],
                        company_age: targeting.company_age || [],
                        saved_at: new Date().toISOString(),
                    };
                    localStorage.setItem('lad_targeting_filters', JSON.stringify(filtersToSave));
                }
            } catch { }

            // Helper to map a LeadProfile to the API shape
            const mapLead = (l: typeof leads[number], source: string) => ({
                id: l.id, name: l.name, first_name: l.first_name, last_name: l.last_name,
                headline: l.headline, title: l.headline, location: l.location,
                current_company: l.current_company, company_name: l.current_company,
                profile_url: l.profile_url, linkedin_url: l.profile_url,
                profile_picture: l.profile_picture, photo_url: l.profile_picture,
                industry: l.industry, network_distance: l.network_distance,
                icp_score: l.icp_score, match_level: l.match_level, icp_reasoning: l.icp_reasoning,
                phone: (l as any).phone || '', email: (l as any).email || '',
                profile_summary: l.icp_reasoning || null,
                enriched_profile: l.enriched_profile || null,
                _source: source,
            });

            // For LinkedIn search campaigns: enroll exactly the leads the user CHECKED.
            // The per-lead checkbox is the authoritative include signal — the user picks
            // prospects across the full ICP range (0–100) rather than relying on a score
            // cutoff. Thumbs-down already auto-unchecks a lead, so the feedback guard is a
            // redundant safety net.
            const goodMatchLeads = leads
                .filter(l => selectedLeadIds.has(l.id))
                .filter(l => leadFeedback[l.id] !== 'bad')
                .map(l => mapLead(l, 'user_good_match'));

            const directContactLeads = isDirectContact
                ? leads.map(l => mapLead(l, 'direct_contact'))
                : [];

            // Inbound leads from CSV/image upload.
            // Respect the panel checkboxes: inboundLeads[i] aligns 1:1 with
            // inboundLeadIds[i], so unchecked people are excluded here too (they'd
            // otherwise sneak into the campaign via initial_leads).
            const inboundContactLeads = inboundMode && inboundLeads.length > 0
                ? inboundLeads
                    .map((il, idx) => ({ il, idx }))
                    .filter(({ idx }) => {
                        if (selectedLeadIds.size === 0) return true;
                        const id = inboundLeadIds[idx];
                        return !id || selectedLeadIds.has(id);
                    })
                    .map(({ il, idx }) => {
                        // Never persist a synthetic "Lead N" as the lead's real name.
                        // Keep the discovered name when we have one; otherwise send an
                        // EMPTY name and let the backend snapshot (from the linked lead
                        // row), the connect-time backfill, or the greeting guard supply
                        // the right name — anything but "Hi Lead,".
                        const realName = `${il.firstName || ''} ${il.lastName || ''}`.trim();
                        const nameIsReal = !isPlaceholderName(realName) && !isPlaceholderName(il.firstName);
                        return mapLead({
                            id: `inbound-${idx}`,
                            name: nameIsReal ? realName : '',
                            first_name: nameIsReal ? il.firstName : '',
                            last_name: nameIsReal ? il.lastName : '',
                            headline: il.companyName ? `at ${il.companyName}` : '',
                            location: '',
                            current_company: il.companyName,
                            profile_url: il.linkedinProfile,
                            profile_picture: '',
                            industry: '',
                            network_distance: '',
                            // Crucial: pass phone and email so they are stored in lead_data
                            phone: il.phone || il.whatsapp || '',
                            email: il.email || '',
                        } as any, 'inbound_lead');
                    })
                : [];

            // Real DB UUIDs so CampaignModel links inbound / direct people via lead_id — the
            // canonical path (links the real lead row with snapshot + phone), the same one
            // ChatPanel uses. Covers CSV/image imports (inboundLeadIds) and chat-entered direct
            // contacts (directContactLeadIds).
            const resolvedInboundLeadIds: string[] | undefined = (() => {
                let ids = [...inboundLeadIds, ...directContactLeadIds];
                // Respect checkbox selection for imported/discovered people: if the user
                // unchecked some, enrol only the selected ones.
                if (inboundMode && selectedLeadIds.size > 0) {
                    const filtered = ids.filter(id => selectedLeadIds.has(id));
                    if (filtered.length > 0) ids = filtered;
                }
                return ids.length > 0 ? ids : undefined;
            })();

            const payload = {
                name: name || 'AI Growth Campaign', status: 'active',
                campaign_type: inboundMode ? 'direct_outreach' : (isDirectContact ? 'direct_outreach' : 'linkedin_outreach'),
                leads_per_day: safeLeadsPerDay,
                campaign_start_date: startDate.toISOString(), campaign_end_date: endDate.toISOString(),
                // Inbound / direct-contact people are linked via inbound_lead_ids (the canonical
                // path above). Do NOT also send them in initial_leads — the backend can't
                // cross-dedupe the two paths, so it would enrol each person TWICE and spawn an
                // orphan lead. Fail-open: if we have no real IDs (e.g. import-save failed), fall
                // back to initial_leads so nothing is lost. LinkedIn-search campaigns keep using
                // initial_leads (goodMatchLeads) — they never send inbound_lead_ids.
                initial_leads: (inboundMode || isDirectContact)
                    ? (resolvedInboundLeadIds
                        ? undefined
                        : (inboundMode && inboundContactLeads.length > 0
                            ? inboundContactLeads
                            : (isDirectContact && directContactLeads.length > 0 ? directContactLeads : undefined)))
                    : (goodMatchLeads.length > 0 ? goodMatchLeads : undefined),
                inbound_lead_ids: resolvedInboundLeadIds,
                config: {
                    // A preserved source (recurring Zoho import) wins: this form
                    // edits the outreach sequence, never where leads come from.
                    data_source: persistedLeadSource?.data_source
                        || (inboundMode ? 'csv_import' : (isDirectContact ? 'direct_contact' : 'linkedin_search')),
                    ...(persistedLeadSource?.zoho_modules ? { zoho_modules: persistedLeadSource.zoho_modules } : {}),
                    ...(persistedLeadSource?.zoho_tag ? { zoho_tag: persistedLeadSource.zoho_tag } : {}),
                    search_intent: (inboundMode || isDirectContact) ? null : t, search_query: (inboundMode || isDirectContact) ? '' : (t.keywords?.join(' ') || ''),
                    leads_per_day: safeLeadsPerDay, daily_lead_limit: safeLeadsPerDay, linkedin_daily_limit: LINKEDIN_DAILY_LIMIT, linkedin_weekly_limit: LINKEDIN_WEEKLY_LIMIT, working_days: 'monday-friday', campaign_days: campaignDays,
                    linkedin_actions: actions, connection_message: connMsg || '', followup_message: followMsg || '',
                    next_channels: nextChannels, trigger_condition: triggerCondition || null,
                    enable_daily_web_presence: enableDailyWebPresence,
                    enable_daily_posts: enableDailyPosts,
                    enable_ai_personalization: enableAiPersonalization,
                    enable_ai_connection_personalization: enableAiConnectionPersonalization,
                    enable_ai_followup_personalization: enableAiFollowupPersonalization,
                    ai_value_prop: aiMsgValueProp || '',
                    ai_tone: aiMsgTone || 'professional',
                    ai_goal: aiMsgGoal || 'get_meeting',
                    location: t.locations?.[0] || '', industries: t.industries || [], job_titles: t.job_titles || [],
                    profile_language: t.profile_language || [],
                    icp_threshold: icpMin,
                    icp_input: initialIcpInput,
                    checkpoint_selections: checkpointSelections,
                    search_filters: { keywords: t.keywords?.join(' ') || '', industries: t.industries || [], locations: t.locations || [], job_titles: t.job_titles || [], profile_language: t.profile_language || [] },
                    targeting_filters: targeting ? {
                        nationality: targeting.decision_maker_nationality || [],
                        experience_level: targeting.decision_maker_experience_level || [],
                        skills: targeting.decision_maker_skills || [],
                        education: targeting.decision_maker_education || [],
                        company_size: targeting.company_size || [],
                        company_age: targeting.company_age || [],
                        // Only persisted when explicitly set by user
                        posted_recently: targeting.posted_recently === true ? true : undefined,
                    } : undefined,
                    lead_feedback: feedbackSummary,
                    search_sessions: searchSessions.slice(0, 10),
                    user_messages: userMessages,
                    conversation_history: chatMessages.map(m => ({ role: m.role, text: m.text, ts: m.ts })).slice(0, 50),
                },
                steps: [
                    // Only include LinkedIn lead generation step for LinkedIn search campaigns.
                    // Direct contact and inbound lead campaigns skip this — leads are provided via initial_leads instead.
                    // A preserved source (Zoho recurring import) always emits the
                    // step: saving here replaces every step, so dropping it would
                    // leave the campaign with no lead source at all.
                    ...((!isDirectContact && !inboundMode) || persistedLeadSource ? [{
                        type: 'lead_generation',
                        title: persistedLeadSource?.source === 'zoho_contacts' ? 'Zoho Contact Import' : 'LinkedIn Lead Search',
                        channel: persistedLeadSource?.source === 'zoho_contacts' ? 'zoho' : 'linkedin',
                        order_index: 0,
                        config: {
                            source: 'linkedin_search',
                            leadGenerationFilters: {
                                keywords: t.keywords?.join(' ') || '',
                                industries: t.industries || [],
                                locations: t.locations || [],
                                job_titles: t.job_titles || [],
                                profile_language: t.profile_language || [],
                            },
                            leadGenerationLimit: safeLeadsPerDay,
                            icp_input: initialIcpInput,
                            icp_threshold: icpMin,
                            // Spread LAST so the campaign's real source survives the
                            // 'linkedin_search' default above. Backend routes on
                            // config.source (LeadGenerationService.executeLeadGeneration).
                            ...(persistedLeadSource ? {
                                source: persistedLeadSource.source,
                                ...(persistedLeadSource.zoho_modules ? { zoho_modules: persistedLeadSource.zoho_modules } : {}),
                                ...(persistedLeadSource.zoho_tag ? { zoho_tag: persistedLeadSource.zoho_tag } : {}),
                            } : {}),
                        }
                    }] : []),
                    ...actionSteps,
                ],
            };
            if (editingCampaignId) {
                // Edit mode: update THIS campaign in place. PATCH /:id updates the
                // campaign row (name/config) but does NOT persist steps, so the steps
                // are saved separately via updateCampaignSteps (POST /:id/steps,
                // destructive replace) — otherwise the edited workflow silently doesn't
                // save and the campaign shows "No actions". Status + leads are left
                // untouched so the running/draft state and existing leads are preserved.
                await updateCampaign(editingCampaignId, { name: payload.name, config: payload.config });
                // The steps endpoint passes steps straight to CampaignStepModel.bulkCreate,
                // which reads step.type + step.order (NOT order_index). The create path maps
                // these first; mirror that here so step_type/step_order aren't NULL → 500.
                const stepsForSave = (payload.steps || []).map((s: any, i: number) => ({
                    ...s,
                    type: s.step_type || s.type,
                    order: s.step_order ?? s.order ?? s.order_index ?? i,
                    title: s.title || s.type,
                }));
                await updateCampaignSteps(editingCampaignId, stepsForSave);
                // Re-run the campaign so the edited steps actually execute. Saving alone
                // only persists — the engine runs steps via processCampaign, which the
                // create flow kicks off on launch. startCampaign (POST /:id/start) sets
                // the campaign running and runs processCampaign against the NEW steps; it
                // respects per-lead progress, so nobody already contacted is re-messaged.
                await startCampaign(editingCampaignId);
                window.location.href = '/campaigns';
            } else {
                const data = await campaignCreation.createCampaign(payload);
                if (data?.success) { window.location.href = '/campaigns'; }
                else { alert('Failed to launch campaign: ' + (data?.error || 'Unknown error')); setLaunching(false); }
            }
        } catch (err: any) { console.error('Campaign creation error', err); alert('Error: ' + err.message); setLaunching(false); }
    };

    const canNext = () => {
        if (step === 0) return !!icpThreshold;
        if (step === 1) return true; // channels (skip is valid)
        if (step === 2) return !hasMultipleChannels || !!triggerCondition; // trigger condition required only for 2+ channels
        if (step === 3) return !!days;
        if (step === 4) return !!name.trim();
        return true;
    };

    // handleNext/handleBack: skip ICP (step 0) via auto-skip, AND trigger condition (step 2) when not applicable
    const handleNext = () => {
        let next = step + 1;
        // Skip step 2 (trigger condition) if: only 0–1 channels selected (nothing to trigger between), OR direct contact
        if (next === 2 && (!hasMultipleChannels || isDirectContact)) next = 3;
        setStep(next);
    };
    const handleBack = () => {
        let prev = step - 1;
        // Skip step 2 (trigger condition) going back if: only 0-1 channels selected, OR direct contact
        if (prev === 2 && (!hasMultipleChannels || isDirectContact)) prev = 1;
        // Don't go back before channels step when ICP step was auto-skipped
        if ((isDirectContact || hasNoIcpScores) && prev < 1) { setStep(-1); return; }
        setStep(Math.max(0, prev));
    };

    const baseBox: React.CSSProperties = {
        background: 'var(--box-bg)',
        border: '1px solid var(--box-border)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '520px',
        width: '100%',
        boxShadow: 'var(--box-shadow)',
        animation: 'fadeUp 0.3s ease both',
    };

    const optStyle = (selected: boolean): React.CSSProperties => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        border: `2px solid ${selected ? 'var(--opt-selected-border)' : 'var(--opt-border)'}`,
        background: selected ? 'var(--opt-selected-bg)' : 'var(--opt-bg)',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        width: '100%',
        fontSize: '14px',
        fontWeight: 500,
        color: selected ? 'var(--opt-selected-text)' : 'var(--opt-text)',
    });

    const numBadge = (n: number, selected: boolean): React.CSSProperties => ({
        width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0,
        border: `2px solid ${selected ? '#0b1957' : '#d1d5db'}`,
        background: selected ? '#0b1957' : 'transparent',
        color: selected ? '#fff' : '#6b7280',
    });

    // Guard: if question isn't resolved yet (during auto-skip transition), show nothing
    if (!q) return null;

    return (
        <div className="adv-bubble adv-bubble-ai fadeUp" style={{ marginBottom: '16px' }}>
            <div className="adv-ai-avatar adv-ai-avatar-viz"><AgentVisualizer state="idle" size={36} /></div>
            <div style={{ flex: 1, maxWidth: '540px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div className="adv-ai-name">LAD in Action</div>
                    <button onClick={() => setStep(-1)} title="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#9ca3af', display: 'flex', alignItems: 'center', borderRadius: '4px' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    </button>
                </div>

                {/* Lead source this form can't edit (recurring Zoho import).
                    Shown so it's obvious the campaign isn't LinkedIn-sourced —
                    the steps below only change the outreach sequence, and the
                    source is carried through the save untouched. */}
                {persistedLeadSource && (
                    <div
                        className="text-gray-600 dark:text-gray-300"
                        style={{ fontSize: '12px', marginBottom: '12px', padding: '8px 10px', borderRadius: '8px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', lineHeight: 1.5 }}
                    >
                        <strong>Lead source: {persistedLeadSource.source === 'zoho_contacts' ? 'Zoho CRM import' : persistedLeadSource.source}</strong>
                        {persistedLeadSource.zoho_tag ? ` · tag "${persistedLeadSource.zoho_tag}"` : ''}
                        {persistedLeadSource.zoho_modules === 'contacts_leads' ? ' · contacts + leads' : ''}
                        <br />
                        Editing here changes the outreach sequence only — the source is kept as-is.
                    </div>
                )}

                {/* Question header */}
                <div
                  className="text-gray-900 dark:text-gray-100"
                  style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px', lineHeight: 1.4 }}
                >
                    {q.question}
                </div>
                <div style={baseBox}>
                    {/* Step 0: ICP Threshold */}
                    {step === 0 && (
                        <div className="flex flex-col dark:bg-[#000724]" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { value: '80', label: 'Above 80%', desc: 'Only top-tier matches' },
                                { value: '75', label: 'Above 75%', desc: 'High quality leads' },
                                { value: '50', label: 'Above 50%', desc: 'Moderate fit and above' },
                                { value: '25', label: 'Above 25%', desc: 'Include most leads' },
                                { value: '0', label: 'All Leads — Within the LinkedIn Account Limits', desc: linkedInDailyLimit ? `Up to ${linkedInDailyLimit} leads/day based on your account limit` : 'No filtering — include everyone' },
                            ].map((opt, i) => {
                                const selected = icpThreshold === opt.value;
                                const count = leads.filter(l => (l.icp_score ?? 0) >= parseInt(opt.value)).length;
                                const displayCount = opt.value === '0' && linkedInDailyLimit && count > linkedInDailyLimit
                                    ? linkedInDailyLimit
                                    : count;
                                return (
                                  <div
                                    key={opt.value}
                                    onClick={() => setIcpThreshold(opt.value)}
                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                      selected
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#000724] hover:border-gray-300 dark:hover:border-gray-700'
                                    }`}
                                  >
                                      <div style={numBadge(i + 1, selected)}>{selected ? '✓' : i + 1}</div>
                                      <div style={{ flex: 1 }}>
                                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                                              {opt.label}
                                          </div>
                                          <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
                                              {opt.desc}
                                          </div>
                                      </div>
                                      <div
                                        className={`text-[12px] font-bold whitespace-nowrap ${
                                          selected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                                        }`}
                                      >
                                          {displayCount} lead{displayCount !== 1 ? 's' : ''}
                                      </div>
                                  </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 1: Campaign Channels */}
                    {step === 1 && (
                        <div className="flex flex-col gap-2 dark:bg-[#000724]"
                             style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* "Let Agent Deal" — one-click auto-build across connected channels */}
                            {!isDirectContact && (
                                <div style={{ marginBottom: '2px' }}>
                                    <button
                                        type="button"
                                        onClick={onLetAgentDeal}
                                        disabled={agentDealLoading}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '14px 16px', borderRadius: '12px', border: 'none',
                                            cursor: agentDealLoading ? 'default' : 'pointer',
                                            background: 'linear-gradient(135deg, #0b1957 0%, #3730a3 100%)',
                                            color: '#fff', boxShadow: '0 4px 14px rgba(11,25,87,0.22)',
                                            opacity: agentDealLoading ? 0.75 : 1, transition: 'opacity 0.2s',
                                        }}>
                                        <div style={{ fontSize: '22px', lineHeight: 1 }}>{agentDealLoading ? '⏳' : '⚡'}</div>
                                        <div style={{ flex: 1, textAlign: 'left' }}>
                                            <div style={{ fontWeight: 700, fontSize: '15px' }}>
                                                {agentDealLoading ? 'Building your campaign…' : 'Let Agent Deal'}
                                            </div>
                                            <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '2px' }}>
                                                Auto-build the full sequence across your connected channels, with recommended delays
                                            </div>
                                        </div>
                                        {!agentDealLoading && <div style={{ fontSize: '18px' }}>→</div>}
                                    </button>
                                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#9ca3af', margin: '8px 0 2px' }} className="dark:text-gray-500">
                                        — or configure manually —
                                    </div>
                                </div>
                            )}
                            {/* Context badge for direct contacts */}
                            {isDirectContact && (
                              <div
                                className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    marginBottom: '4px'
                                }}
                              >
                                  {hasPhone && hasEmail
                                    ? `📱✉️ Phone & email detected — select how you want to reach this contact${hasLinkedInInfo ? ' (LinkedIn available)' : ''}`
                                    : hasPhone
                                      ? `📱 Phone detected — WhatsApp or Voice Call recommended${hasLinkedInInfo ? ' · LinkedIn available' : ''}`
                                      : `✉️ Email detected — Email outreach recommended${hasLinkedInInfo ? ' · LinkedIn available' : ''}`}
                              </div>
                            )}

                            {/* Channel Configuration Sequential UI */}
                            {isInChannelConfiguration && (
                              <div
                                className="bg-gray-50 dark:bg-[#000724] border-gray-200 dark:border-gray-800"
                                style={{ marginTop: '12px', padding: '16px', borderRadius: '12px', border: '2px solid' }}
                              >
                                  {/* Step indicator */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                      <div className="text-gray-900 dark:text-gray-100" style={{ fontSize: '14px', fontWeight: 700 }}>
                                          {channelIcons[currentChannelBeingConfigured]} Configure {channelNames[currentChannelBeingConfigured]}
                                        </div>
                                      <div className="bg-white dark:bg-[#0b1229] border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400" style={{
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            border: '1px solid'
                                        }}>
                                            Step {channelConfigStep + 1} of {selectedChannelsList.length}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                  <div className="bg-gray-200 dark:bg-gray-800" style={{ width: '100%', height: '4px', borderRadius: '2px', overflow: 'hidden', marginBottom: '16px' }}>
                                      <div className="bg-blue-500" style={{
                                            height: '100%',
                                            width: `${((channelConfigStep + 1) / selectedChannelsList.length) * 100}%`,
                                            transition: 'width 0.3s'
                                        }}
                                      ></div>
                                  </div>
                                </div>
                            )}

                            {[
                                // LinkedIn first — always shown (for non-direct; for direct contacts only if name+company detected)
                                ...(hasLinkedInInfo ? [{
                                    id: 'linkedin', icon: '💼', label: 'LinkedIn',
                                    desc: isDirectContact
                                        ? 'LinkedIn touchpoint (name + company detected)'
                                        : 'Additional LinkedIn touchpoints',
                                    disabled: false,
                                }] : []),
                                { id: 'email', label: 'Email', desc: isDirectContact ? 'Send an email to this contact' : 'Send a follow-up email to the lead', icon: '✉️', disabled: isDirectContact && !hasEmail },
                                { id: 'whatsapp', label: 'WhatsApp', desc: isDirectContact ? 'Send a WhatsApp message to this contact' : 'Send a WhatsApp message', icon: '💬', disabled: isDirectContact && !hasPhone },
                                { id: 'voice_call', label: 'Voice Call', desc: isDirectContact ? 'Trigger an AI voice call to this contact' : 'Trigger an AI voice call', icon: '📞', disabled: isDirectContact && !hasPhone },
                            ].filter(ch => !ch.disabled).map((ch, i) => (
                              <div key={ch.id} onClick={() => toggleNextChannel(ch.id)} className={`flex items-center gap-3 p-4 rounded-xl border transition-all cursor-pointer ${
                                  nextChannels.includes(ch.id)
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-[#2563eb]'
                                    : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-[#000724] hover:border-gray-300 dark:hover:border-gray-700'
                                }`}
                              >
                                  <div style={numBadge(i + 1, nextChannels.includes(ch.id))}>{nextChannels.includes(ch.id) ? '✓' : i + 1}</div>
                                  <div style={{ flex: 1 }}>
                                      <div className="font-semibold text-gray-900 dark:text-slate-300">{ch.icon} {ch.label}</div>
                                      <div className="text-[12px] text-gray-500 dark:text-slate-300 mt-[2px]">{ch.desc}</div>
                                  </div>
                              </div>
                            ))}


                            {/* Email Config (inline when email selected) */}
                            {nextChannels.includes('email') && (isInChannelConfiguration ? currentChannelBeingConfigured === 'email' : true) && (
                              <div
                                className="bg-gray-50 dark:bg-[#000724] border border-gray-200 dark:border-gray-800"
                                style={{ marginTop: '12px', padding: '14px', borderRadius: '12px' }}
                              >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <div
                                        className="text-[#0b1957] dark:text-white"
                                        style={{ fontSize: '13px', fontWeight: 700 }}
                                      >✉️ Email Settings</div>
                                      <button
                                        disabled={emailGenLoading}
                                        onClick={generateEmail}
                                        className={emailGenLoading
                                          ? 'text-[#9ca3af] dark:text-gray-600'
                                          : 'text-[#0b1957] dark:text-slate-300'
                                        }
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: emailGenLoading ? 'default' : 'pointer'
                                        }}
                                      >
                                          {emailGenLoading ? 'Generating...' : '✨ AI Generate'}
                                      </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* From account selector */}
                                        <div>
                                            <label
                                              className="text-[#374151] dark:text-slate-300"
                                              style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}
                                            >
                                                Send From <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            {connectedSenders.length > 0 ? (
                                              <Select
                                                value={emailFromAddress}
                                                onValueChange={(value: string) => {
                                                    const sender = connectedSenders.find(s => s.email === value);
                                                    setEmailFromAddress(value);
                                                    setEmailProvider(sender?.provider || '');
                                                }}
                                              >
                                                  <SelectTrigger className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">
                                                      <SelectValue placeholder="— Select sender account —" />
                                                  </SelectTrigger>
                                                  <SelectContent  className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                                                      {connectedSenders.map((s) => (
                                                        <SelectItem
                                                          key={s.email}
                                                          value={s.email}
                                                          className="pl-3 pr-6 text-sm justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#22C55E] dark:focus:text-[#000724] dark:data-[state=checked]:focus:bg-[#22C55E] dark:data-[state=checked]:focus:text-[#000724]">
                                                            <div className="flex items-center gap-3">
                                                              <span className="text-sm">
                                                                {s.provider === 'google' ? '📧 Gmail' : '📨 Outlook'} — {s.email}
                                                              </span>
                                                            </div>
                                                        </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#ef4444', padding: '8px 10px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px' }}>
                                                    No email account connected.{' '}
                                                    <a href="/settings?tab=integrations" style={{ color: '#0b1957', fontWeight: 600 }}>Connect Gmail or Outlook →</a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Template picker */}
                                        {emailTemplates.length > 0 && (
                                            <div>
                                                <label className="text-[#374151] dark:text-slate-300"
                                                       style={{ fontSize: '12px', fontWeight: 600,  marginBottom: '4px', display: 'block' }}>Use Saved Template</label>
                                                <Select
                                                  value={selectedEmailTemplateId}
                                                  onValueChange={(value: string) => {
                                                      const tpl = emailTemplates.find(t => t.id === value);
                                                      if (tpl) {
                                                          setEmailSubject(tpl.subject);
                                                          setEmailBody(tpl.body);
                                                      }
                                                      setSelectedEmailTemplateId(value);
                                                  }}
                                                >
                                                    <SelectTrigger className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">
                                                        <SelectValue placeholder="— Select a template —" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                                                        {emailTemplates.map((t) => (
                                                          <SelectItem
                                                            key={t.id}
                                                            value={t.id}
                                                            className="pl-3 pr-6 text-sm justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#22C55E] dark:focus:text-[#000724] dark:data-[state=checked]:focus:bg-[#22C55E] dark:data-[state=checked]:focus:text-[#000724]">
                                                              {t.name}
                                                          </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {/* Subject */}
                                        <div>
                                            <label className="text-[#374151] dark:text-slate-300"
                                                   style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                              type="text"
                                              value={emailSubject}
                                              onChange={e => setEmailSubject(e.target.value)}
                                              placeholder="e.g. Quick question for {{first_name}}"
                                              className="w-full px-[10px] py-[8px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#000724] text-gray-900 dark:text-gray-100 text-[13px] outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        {/* Body */}
                                        <div>
                                            <label  className="text-[#374151] dark:text-slate-300"
                                                    style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Email Body <span style={{ color: '#ef4444' }}>*</span></label>
                                            <textarea
                                              value={emailBody}
                                              onChange={e => setEmailBody(e.target.value)}
                                              placeholder={'Hi {{first_name}},\n\nI came across your profile at {{company}} and wanted to reach out...\n\nBest,\n[Your name]'}
                                              rows={6}
                                              className="w-full p-[10px_12px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#000724] text-gray-900 dark:text-gray-100 text-[13px] outline-none resize-vertical focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                            />
                                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-[4px]">
                                                Placeholders: {'{{first_name}}'} {'{{last_name}}'} {'{{company}}'} {'{{title}}'} {'{{industry}}'}
                                            </div>
                                        </div>
                                        {/* Save as Template */}
                                        {!saveTemplateMode ? (
                                            <button onClick={() => setSaveTemplateMode(true)}
                                                style={{ background: 'none', border: '1px dashed #d1d5db', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', fontWeight: 600, color: '#6b7280', cursor: 'pointer', textAlign: 'left' }}>
                                                + Save as template
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                    type="text"
                                                    value={saveTemplateName}
                                                    onChange={e => setSaveTemplateName(e.target.value)}
                                                    placeholder="Template name..."
                                                    style={{ flex: 1, border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', outline: 'none', fontFamily: 'inherit' }}
                                                />
                                                <button onClick={saveEmailTemplate}
                                                    className="bg-[#0b1957] dark:bg-[#2563eb]"
                                                    style={{ padding: '8px 14px', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                                                    Save
                                                </button>
                                                <button onClick={() => { setSaveTemplateMode(false); setSaveTemplateName(''); }}
                                                    style={{ padding: '8px 10px', background: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Navigation & Summary for Channel Configuration */}
                            {isInChannelConfiguration && (
                              <div
                                className="dark:bg-[#000724] dark:border-gray-800 bg-[#f9fafb]"
                                style={{ marginTop: '16px', padding: '14px', border: '1px solid #e5e7eb', borderRadius: '12px' }}
                              >
                                  {/* Per-Channel Delay Configuration */}
                                  <div
                                    className="dark:border-gray-800"
                                    style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}
                                  >
                                      <div
                                        className="dark:text-gray-300 text-[#374151]"
                                        style={{ fontSize: '12px', fontWeight: 600,  marginBottom: '10px' }}
                                      >⏱️ Delay before next step (Optional)</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                            <div>
                                                <label className="text-[#6b7280] dark:text-slate-300"
                                                       style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Days</label>
                                                <input
                                                  type="number"
                                                  value={channelDelays[currentChannelBeingConfigured]?.days || '0'}
                                                  onChange={e => {
                                                      const updated = { ...channelDelays, [currentChannelBeingConfigured]: { ...(channelDelays[currentChannelBeingConfigured] || { hours: '0' }), days: e.target.value } };
                                                      setChannelDelays(updated);
                                                  }}
                                                  min="0" max="365" placeholder="0"
                                                  className="w-full px-[10px] py-[8px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#000724] text-gray-900 dark:text-gray-100 text-[13px] outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[#6b7280] dark:text-slate-300"
                                                       style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', display: 'block' }}>Hours</label>
                                                <input
                                                    type="number"
                                                    value={channelDelays[currentChannelBeingConfigured]?.hours || '0'}
                                                    onChange={e => {
                                                        const updated = { ...channelDelays, [currentChannelBeingConfigured]: { ...(channelDelays[currentChannelBeingConfigured] || { days: '0' }), hours: e.target.value } };
                                                        setChannelDelays(updated);
                                                    }}
                                                    min="0" max="23" placeholder="0"
                                                    className="w-full px-[10px] py-[8px] border border-gray-200 dark:border-gray-800 rounded-lg bg-white dark:bg-[#000724] text-gray-900 dark:text-gray-100 text-[13px] outline-none focus:border-indigo-500 dark:focus:border-indigo-500 transition-colors"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Back/Forward Navigation */}
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button
                                            onClick={() => {
                                                if (channelConfigStep > 0) setChannelConfigStep(channelConfigStep - 1);
                                            }}
                                            disabled={channelConfigStep === 0}
                                            style={{ padding: '10px 16px', background: channelConfigStep === 0 ? '#f3f4f6' : '#fff', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: channelConfigStep === 0 ? '#9ca3af' : '#374151', cursor: channelConfigStep === 0 ? 'not-allowed' : 'pointer' }}>
                                            ← Back
                                        </button>
                                        {channelConfigStep < selectedChannelsList.length - 1 ? (
                                            <button
                                                onClick={() => setChannelConfigStep(channelConfigStep + 1)}
                                                style={{ padding: '10px 16px', background: '#0b1957', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                                Next → ({selectedChannelsList.length - channelConfigStep - 1} remaining)
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => setStep(step + 1)}
                                                style={{ padding: '10px 16px', background: '#10b981', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                                                Continue →
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* WhatsApp Config (inline when whatsapp selected) */}
                            {nextChannels.includes('whatsapp') && (isInChannelConfiguration ? currentChannelBeingConfigured === 'whatsapp' : true) && (
                              <div
                                className="dark:bg-emerald-950/30 dark:border-emerald-800 bg-[#f0fdf4]"
                                style={{ marginTop: '12px', padding: '14px', border: '1px solid #bbf7d0', borderRadius: '12px' }}
                              >
                                    {/* Header row */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                      <div
                                        className="dark:text-emerald-400 text-[#166534]"
                                        style={{ fontSize: '13px', fontWeight: 700 }}
                                      >💬 WhatsApp Settings</div>
                                        <button disabled={waGenLoading} onClick={generateWhatsApp}
                                            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: waGenLoading ? '#9ca3af' : '#166534', cursor: waGenLoading ? 'default' : 'pointer' }}>
                                            {waGenLoading ? 'Generating...' : '✨ AI Generate'}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Send From selector */}
                                        <div>
                                            <label
                                              className="dark:text-gray-300 text-[#374151]"
                                              style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}
                                            >
                                                Send From <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            {whatsAppAccounts.length > 0 ? (
                                              <Select
                                                value={waAccountId}
                                                onValueChange={setWaAccountId}
                                              >
                                                  <SelectTrigger className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">
                                                      <SelectValue placeholder="— Select WhatsApp account —" />
                                                  </SelectTrigger>
                                                  <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                                                      {whatsAppAccounts.map((acc: any) => (
                                                        <SelectItem
                                                          key={acc.id}
                                                          value={acc.id}
                                                          className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">

                                                            <div className="flex items-center gap-2">
                                                                <span>{acc.display_name}</span>
                                                                <span className="text-[10px] opacity-70 bg-gray-100 dark:bg-emerald-900 px-1.5 py-0.5 rounded">
            {acc.account_type === 'business_api' ? 'Business API' : 'Personal'}
          </span>
                                                            </div>
                                                        </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                            ) : (
                                              <div
                                                className="bg-white dark:bg-[#000724] border border-[#bbf7d0] dark:border-emerald-800 rounded-lg p-[8px_10px] text-[12px] text-[#b45309]"
                                              >
                                                  No WhatsApp account connected.{' '}
                                                  <a
                                                    href="/settings?tab=integrations"
                                                    className="dark:text-emerald-400"
                                                    style={{ color: '#166534', fontWeight: 600 }}
                                                  >
                                                      Connect an account →
                                                  </a>
                                              </div>
                                            )}
                                        </div>

                                        {/* ── Template Selector ── */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label
                                                  className="dark:text-slate-300 text-[#374151]"
                                                  style={{ fontSize: '12px', fontWeight: 600 }}
                                                >
                                                    Message Template
                                                </label>
                                                <button
                                                  onClick={() => { setShowWaTemplatePanel(p => !p); setShowWaNewTmplForm(false); }}
                                                  className="dark:text-emerald-400 text-[#166534]"
                                                  style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                >
                                                    {showWaTemplatePanel ? '✕ Close' : '📋 Browse templates'}
                                                </button>
                                            </div>

                                            {/* Selected template badge */}
                                            {selectedWaTemplateId && !showWaTemplatePanel && (() => {
                                                const tmpl = waTemplates.find(t => t.id === selectedWaTemplateId);
                                                return tmpl ? (
                                                  <div
                                                    className="dark:bg-emerald-950/40 dark:border-emerald-800 bg-[#dcfce7]"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px' }}
                                                  >
                                                        <span className="dark:text-emerald-300 text-[#166534]" style={{ fontWeight: 600, flex: 1 }}>
                                                            ✓ {tmpl.name}
                                                        </span>
                                                      <span
                                                        className={`dark:border-opacity-40 ${tmpl.channel_type === 'business_api' ? 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'}`}
                                                        style={{ background: tmpl.channel_type === 'business_api' ? '#dbeafe' : '#f0fdf4', color: tmpl.channel_type === 'business_api' ? '#1d4ed8' : '#166534', border: `1px solid ${tmpl.channel_type === 'business_api' ? '#93c5fd' : '#86efac'}`, borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}
                                                      >
                                                        {tmpl.channel_type === 'business_api' ? 'WABA' : 'Personal'}
                                                    </span>
                                                      <button
                                                        onClick={() => { setSelectedWaTemplateId(''); setWaBody(''); }}
                                                        className="dark:text-gray-400 dark:hover:text-white text-[#6b7280]"
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                                                      >
                                                          ✕
                                                      </button>
                                                  </div>
                                                ) : null;
                                            })()}

                                            {/* Template browser panel */}
                                            {showWaTemplatePanel && (
                                              <div
                                                className="dark:bg-[#000724] dark:border-emerald-900 bg-[#fff]"
                                                style={{ border: '1px solid #bbf7d0', borderRadius: '8px', overflow: 'hidden' }}
                                              >
                                                    {/* Existing templates list */}
                                                    {waTemplates.length > 0 && !showWaNewTmplForm && (
                                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                            {waTemplates.map(tmpl => (
                                                              <div key={tmpl.id} onClick={() => applyWaTemplate(tmpl)}
                                                                   className="group dark:border-emerald-950 dark:hover:bg-[#111c3a] dark:data-[selected=true]:bg-[#064e3b]"
                                                                   data-selected={selectedWaTemplateId === tmpl.id}
                                                                   style={{
                                                                       display: 'flex',
                                                                       alignItems: 'flex-start',
                                                                       gap: '8px',
                                                                       padding: '10px 12px',
                                                                       cursor: 'pointer',
                                                                       borderBottom: '1px solid #f0fdf4',
                                                                       transition: 'background 0.15s',
                                                                       background: selectedWaTemplateId === tmpl.id ? '#dcfce7' : 'transparent'
                                                                   }}
                                                                   onMouseEnter={e => { if (selectedWaTemplateId !== tmpl.id) (e.currentTarget as HTMLDivElement).style.background = '#f0fdf4'; }}
                                                                   onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = selectedWaTemplateId === tmpl.id ? '#dcfce7' : 'transparent'; }}>

                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                                            <span
                                                                              className="dark:text-emerald-300"
                                                                              style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}
                                                                            >
                                                                              {tmpl.name}
                                                                            </span>
                                                                            <span
                                                                              className={`dark:border-opacity-30 ${
                                                                                tmpl.channel_type === 'business_api'
                                                                                  ? 'dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800'
                                                                                  : 'dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800'
                                                                              }`}
                                                                              style={{
                                                                                  background: tmpl.channel_type === 'business_api' ? '#dbeafe' : '#f0fdf4',
                                                                                  color: tmpl.channel_type === 'business_api' ? '#1d4ed8' : '#166534',
                                                                                  border: `1px solid ${tmpl.channel_type === 'business_api' ? '#93c5fd' : '#86efac'}`,
                                                                                  borderRadius: '4px',
                                                                                  padding: '1px 5px',
                                                                                  fontSize: '9px',
                                                                                  fontWeight: 700,
                                                                                  textTransform: 'uppercase',
                                                                                  letterSpacing: '0.3px'
                                                                              }}
                                                                            >
                                                                              {tmpl.channel_type === 'business_api' ? 'WABA' : 'Personal'}
                                                                            </span>
                                                                            {tmpl.is_default && (
                                                                              <span
                                                                                className="bg-[#fef3c7] text-[#92400e] dark:bg-amber-900/30 dark:text-amber-300 dark:border dark:border-amber-800/50"
                                                                                style={{
                                                                                    borderRadius: '4px',
                                                                                    padding: '1px 5px',
                                                                                    fontSize: '9px',
                                                                                    fontWeight: 700
                                                                                }}
                                                                              >
                                                                                Default
                                                                            </span>
                                                                            )}
                                                                        </div>
                                                                        {tmpl.header_text && (
                                                                          <div
                                                                            className="dark:text-gray-400 text-[#6b7280]"
                                                                            style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: '1px' }}
                                                                          >
                                                                              Header: {tmpl.header_text}
                                                                          </div>
                                                                        )}

                                                                        <div
                                                                          className="dark:text-gray-200 text-[#374151]"
                                                                          style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}
                                                                        >
                                                                            {tmpl.content}
                                                                        </div>

                                                                        {tmpl.footer_text && (
                                                                          <div
                                                                            className="dark:text-gray-500 text-[#9ca3af]"
                                                                            style={{ fontSize: '10px',  marginTop: '1px' }}
                                                                          >
                                                                              Footer: {tmpl.footer_text}
                                                                          </div>
                                                                        )}
                                                                    </div>
                                                                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                      <button
                                                                        onClick={e => { e.stopPropagation(); applyWaTemplate(tmpl); }}
                                                                        className="dark:bg-emerald-700 dark:hover:bg-emerald-600 transition-colors"
                                                                        style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                                      >
                                                                          Use
                                                                      </button>
                                                                      <button
                                                                        onClick={e => deleteWaTemplate(tmpl.id, e)}
                                                                        className="dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                                                                        style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                                                                      >
                                                                          ✕
                                                                      </button>
                                                                  </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {waTemplates.length === 0 && !showWaNewTmplForm && (
                                                      <div
                                                        className="dark:text-slate-300 text-[#6b7280]"
                                                        style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '' }}
                                                      >
                                                          No saved templates yet.
                                                      </div>
                                                    )}

                                                    {/* Create new template form */}
                                                    {/* Hidden file input for media upload */}
                                                    <input ref={waMediaUploadRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/3gp,application/pdf" style={{ display: 'none' }}
                                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadWaTemplateMedia(f); e.target.value = ''; }} />

                                                    {showWaNewTmplForm ? (
                                                        <div style={{ borderTop: waTemplates.length > 0 ? '1px solid #bbf7d0' : 'none' }}>
                                                            {/* Form header with preview toggle */}
                                                            <div
                                                              className="dark:bg-green-950 bg-[#f0fdf4]"
                                                              style={{
                                                                  display: 'flex',
                                                                  justifyContent: 'space-between',
                                                                  alignItems: 'center',
                                                                  padding: '10px 12px 6px',
                                                              }}
                                                            >
                                                                <div
                                                                  className="dark:text-green-300 text-[#166534]"
                                                                  style={{ fontSize: '12px', fontWeight: 700 }}
                                                                >
                                                                    ➕ New WhatsApp Template
                                                                </div>

                                                                <button
                                                                  onClick={() => setWaNewTmplShowPreview(p => !p)}
                                                                  className={`dark:border-green-500 dark:text-green-400 ${waNewTmplShowPreview ? "bg-[#166534] text-#fff" : 'none text-#166534'}`}
                                                                  style={{
                                                                      border: '1px solid #166534',
                                                                      borderRadius: '5px',
                                                                      padding: '3px 8px',
                                                                      fontSize: '11px',
                                                                      fontWeight: 600,
                                                                      cursor: 'pointer'
                                                                  }}
                                                                >
                                                                    {waNewTmplShowPreview ? '✕ Hide Preview' : '👁 Preview'}
                                                                </button>
                                                            </div>

                                                            {/* Side-by-side: Form + Preview */}
                                                            <div
                                                              className="flex bg-[#f8fffe] dark:bg-[#0f1a18]"
                                                              style={{ gap: '0' }}
                                                            >
                                                                <div
                                                                  className="flex flex-1 flex-col gap-[8px] min-w-0 p-[10px_12px]"
                                                                >                                                                    <div>
                                                                    <label
                                                                      className="text-[#374151] dark:text-gray-300"
                                                                      style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '3px' }}
                                                                    >
                                                                        Template Name <span className="text-[#ef4444] dark:text-red-400">*</span>
                                                                    </label>
                                                                        <input value={waNewTmplName} onChange={e => setWaNewTmplName(e.target.value)}
                                                                            placeholder="e.g. Intro outreach, Follow-up..."
                                                                            style={{ width: '100%', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                                                                    </div>

                                                                    {/* Channel type */}
                                                                    <div>
                                                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>Channel Type <span style={{ color: '#ef4444' }}>*</span></label>
                                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                                            {(['personal_whatsapp', 'business_api'] as const).map(ct => (
                                                                                <label key={ct} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '11px', padding: '4px 8px', borderRadius: '6px', border: `1px solid ${waNewTmplChannelType === ct ? '#166534' : '#d1d5db'}`, background: waNewTmplChannelType === ct ? '#dcfce7' : '#fff', fontWeight: waNewTmplChannelType === ct ? 600 : 400, color: waNewTmplChannelType === ct ? '#166534' : '#374151' }}>
                                                                                    <input type="radio" name="waChType" value={ct} checked={waNewTmplChannelType === ct} onChange={() => setWaNewTmplChannelType(ct)} style={{ accentColor: '#166534' }} />
                                                                                    {ct === 'personal_whatsapp' ? '📱 Personal' : '🏢 WABA'}
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                        {waNewTmplChannelType === 'business_api' && (
                                                                            <div style={{ marginTop: '4px', padding: '5px 7px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '5px', fontSize: '10px', color: '#1d4ed8' }}>
                                                                                ℹ️ WABA templates must be pre-approved by Meta.
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* ── MEDIA (Meta-compliant) ── */}
                                                                    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 10px' }}>
                                                                        <label style={{ fontSize: '11px', fontWeight: 700, color: '#374151', display: 'block', marginBottom: '6px' }}>
                                                                            Header Media <span style={{ fontWeight: 400, color: '#9ca3af' }}>(optional)</span>
                                                                        </label>
                                                                        {/* Media type pills */}
                                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '6px' }}>
                                                                            {(['none', 'image', 'video', 'document', 'location'] as const).map(mt => {
                                                                                const icons: Record<string, string> = { none: '✕ None', image: '🖼️ Image', video: '▶️ Video', document: '📄 Doc', location: '📍 Location' };
                                                                                return (
                                                                                    <button key={mt} onClick={() => { setWaNewTmplMediaType(mt); setWaNewTmplMediaUrl(''); setWaNewTmplMediaFilename(''); }}
                                                                                        style={{ padding: '3px 8px', borderRadius: '5px', border: `1px solid ${waNewTmplMediaType === mt ? '#166534' : '#d1d5db'}`, background: waNewTmplMediaType === mt ? '#dcfce7' : '#fff', color: waNewTmplMediaType === mt ? '#166534' : '#6b7280', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                                                                                        {icons[mt]}
                                                                                    </button>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                        {/* Media upload / location fields */}
                                                                        {(waNewTmplMediaType === 'image' || waNewTmplMediaType === 'video' || waNewTmplMediaType === 'document') && (
                                                                            <div>
                                                                                {waNewTmplMediaUrl ? (
                                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '5px', fontSize: '11px' }}>
                                                                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#166534', fontWeight: 600 }}>
                                                                                            {waNewTmplMediaType === 'image' ? '🖼️' : waNewTmplMediaType === 'video' ? '▶️' : '📄'} {waNewTmplMediaFilename || 'Uploaded'}
                                                                                        </span>
                                                                                        <button onClick={() => { setWaNewTmplMediaUrl(''); setWaNewTmplMediaFilename(''); }}
                                                                                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                                                                                    </div>
                                                                                ) : (
                                                                                    <button onClick={() => waMediaUploadRef.current?.click()} disabled={waNewTmplMediaUploading}
                                                                                        style={{ width: '100%', padding: '7px', background: '#f9fafb', border: '1.5px dashed #d1d5db', borderRadius: '6px', fontSize: '11px', color: waNewTmplMediaUploading ? '#9ca3af' : '#374151', cursor: waNewTmplMediaUploading ? 'wait' : 'pointer', fontWeight: 500 }}>
                                                                                        {waNewTmplMediaUploading ? '⏳ Uploading...' : `📎 Upload ${waNewTmplMediaType === 'image' ? 'Image (JPEG/PNG/GIF, max 5MB)' : waNewTmplMediaType === 'video' ? 'Video (MP4, max 16MB)' : 'Document (PDF, max 5MB)'}`}
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {waNewTmplMediaType === 'location' && (
                                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                                                <input value={waNewTmplLocName} onChange={e => setWaNewTmplLocName(e.target.value)}
                                                                                    placeholder="Location name (e.g. Our Office)"
                                                                                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '5px', padding: '5px 7px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                                                                <div style={{ display: 'flex', gap: '5px' }}>
                                                                                    <input value={waNewTmplLocLat} onChange={e => setWaNewTmplLocLat(e.target.value)} placeholder="Latitude" type="number"
                                                                                        style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '5px', padding: '5px 7px', fontSize: '11px', outline: 'none' }} />
                                                                                    <input value={waNewTmplLocLng} onChange={e => setWaNewTmplLocLng(e.target.value)} placeholder="Longitude" type="number"
                                                                                        style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: '5px', padding: '5px 7px', fontSize: '11px', outline: 'none' }} />
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Header text */}
                                                                    <div>
                                                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>
                                                                            Header Text <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional, max 60 chars)</span>
                                                                        </label>
                                                                        <input value={waNewTmplHeader} onChange={e => setWaNewTmplHeader(e.target.value.slice(0, 60))}
                                                                            placeholder="e.g. Quick question for you..."
                                                                            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                                                                        <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'right' }}>{waNewTmplHeader.length}/60</div>
                                                                    </div>

                                                                    {/* Body */}
                                                                    <div>
                                                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>Message Body <span style={{ color: '#ef4444' }}>*</span> <span style={{ color: '#9ca3af', fontWeight: 400 }}>(max 1024 chars)</span></label>
                                                                        <textarea value={waNewTmplBody} onChange={e => setWaNewTmplBody(e.target.value.slice(0, 1024))}
                                                                            placeholder={'Hi {{first_name}},\n\nI noticed your work at {{company}}...'}
                                                                            rows={4}
                                                                            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '7px 8px', fontSize: '12px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>{'{{first_name}}'} {'{{last_name}}'} {'{{company}}'} {'{{title}}'}</div>
                                                                            <div style={{ fontSize: '9px', color: waNewTmplBody.length > 900 ? '#ef4444' : '#9ca3af' }}>{waNewTmplBody.length}/1024</div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Footer */}
                                                                    <div>
                                                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>
                                                                            Footer <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional, max 60 chars)</span>
                                                                        </label>
                                                                        <input value={waNewTmplFooter} onChange={e => setWaNewTmplFooter(e.target.value.slice(0, 60))}
                                                                            placeholder="e.g. Reply STOP to unsubscribe"
                                                                            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
                                                                        <div style={{ fontSize: '9px', color: '#9ca3af', textAlign: 'right' }}>{waNewTmplFooter.length}/60</div>
                                                                    </div>

                                                                    {/* WABA-only */}
                                                                    {waNewTmplChannelType === 'business_api' && (
                                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                                            <div style={{ flex: 1 }}>
                                                                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>WABA Template Name</label>
                                                                                <input value={waNewTmplWabaName} onChange={e => setWaNewTmplWabaName(e.target.value)}
                                                                                    placeholder="intro_outreach_v1"
                                                                                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 8px', fontSize: '11px', outline: 'none', boxSizing: 'border-box' }} />
                                                                            </div>
                                                                            <div style={{ width: '100px' }}>
                                                                                <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>Language</label>
                                                                                <select value={waNewTmplLang} onChange={e => setWaNewTmplLang(e.target.value)}
                                                                                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 6px', fontSize: '11px', outline: 'none' }}>
                                                                                    <option value="en">English</option>
                                                                                    <option value="en_US">English US</option>
                                                                                    <option value="es">Spanish</option>
                                                                                    <option value="fr">French</option>
                                                                                    <option value="de">German</option>
                                                                                    <option value="pt_BR">Portuguese</option>
                                                                                    <option value="ar">Arabic</option>
                                                                                    <option value="hi">Hindi</option>
                                                                                </select>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Set default */}
                                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#374151', cursor: 'pointer' }}>
                                                                        <input type="checkbox" checked={waNewTmplDefault} onChange={e => setWaNewTmplDefault(e.target.checked)} style={{ accentColor: '#166534' }} />
                                                                        Set as default WhatsApp template
                                                                    </label>

                                                                    {/* Action buttons */}
                                                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '4px', borderTop: '1px solid #e5e7eb', marginTop: '2px' }}>
                                                                        <button onClick={() => setShowWaNewTmplForm(false)}
                                                                            style={{ background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', color: '#374151' }}>
                                                                            Cancel
                                                                        </button>
                                                                        <button onClick={saveWaTemplate} disabled={waNewTmplSaving || !waNewTmplName.trim() || !waNewTmplBody.trim()}
                                                                            style={{ background: (!waNewTmplName.trim() || !waNewTmplBody.trim()) ? '#9ca3af' : '#166534', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: (!waNewTmplName.trim() || !waNewTmplBody.trim()) ? 'not-allowed' : 'pointer' }}>
                                                                            {waNewTmplSaving ? 'Saving...' : '💾 Save Template'}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                {/* ── LIVE PREVIEW (right) ── */}
                                                                {waNewTmplShowPreview && (
                                                                    <div style={{ width: '190px', flexShrink: 0, borderLeft: '1px solid #e5e7eb', padding: '10px 8px', background: '#f0f0f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}>
                                                                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textAlign: 'center', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Template Preview</div>
                                                                        {/* Phone mockup */}
                                                                        <div style={{ width: '166px', background: '#e5ddd5', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', border: '2px solid #fff' }}>
                                                                            {/* Status bar */}
                                                                            <div style={{ background: '#075E54', height: '6px' }} />
                                                                            {/* Chat header */}
                                                                            <div style={{ background: '#128C7E', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#075E54', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                                                                                    {waNewTmplName ? waNewTmplName[0].toUpperCase() : 'W'}
                                                                                </div>
                                                                                <div>
                                                                                    <div style={{ fontSize: '10px', fontWeight: 600, color: '#fff', lineHeight: 1.2 }}>{waNewTmplName || 'Template name'}</div>
                                                                                    <div style={{ fontSize: '8px', color: '#b2dfdb', lineHeight: 1 }}>online</div>
                                                                                </div>
                                                                            </div>
                                                                            {/* Wallpaper chat area */}
                                                                            <div style={{ background: '#e5ddd5', backgroundImage: 'repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(0,0,0,0.015) 10px,rgba(0,0,0,0.015) 20px)', padding: '8px 6px', minHeight: '120px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                                                                {/* Message bubble */}
                                                                                <div style={{ maxWidth: '90%', background: '#dcf8c6', borderRadius: '8px 0 8px 8px', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.13)' }}>
                                                                                    {/* Media preview */}
                                                                                    {waNewTmplMediaType && waNewTmplMediaType !== 'none' && (
                                                                                        <div style={{ background: '#c8e6c9', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60px', position: 'relative', overflow: 'hidden' }}>
                                                                                            {waNewTmplMediaType === 'image' && waNewTmplMediaUrl ? (
                                                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                                                <img src={waNewTmplMediaUrl} alt="preview" style={{ width: '100%', maxHeight: '80px', objectFit: 'cover', display: 'block' }} />
                                                                                            ) : (
                                                                                                <div style={{ textAlign: 'center', padding: '8px' }}>
                                                                                                    <div style={{ fontSize: '22px', lineHeight: 1 }}>
                                                                                                        {waNewTmplMediaType === 'image' ? '🖼️' : waNewTmplMediaType === 'video' ? '▶️' : waNewTmplMediaType === 'document' ? '📄' : '📍'}
                                                                                                    </div>
                                                                                                    <div style={{ fontSize: '9px', color: '#4caf50', fontWeight: 600, marginTop: '2px' }}>
                                                                                                        {waNewTmplMediaType === 'image' ? (waNewTmplMediaFilename || 'Image') : waNewTmplMediaType === 'video' ? (waNewTmplMediaFilename || 'Video') : waNewTmplMediaType === 'document' ? (waNewTmplMediaFilename || 'Document') : (waNewTmplLocName || 'Location')}
                                                                                                    </div>
                                                                                                    {waNewTmplMediaType === 'location' && waNewTmplLocLat && (
                                                                                                        <div style={{ fontSize: '8px', color: '#666', marginTop: '1px' }}>{waNewTmplLocLat}, {waNewTmplLocLng}</div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                    {/* Text content */}
                                                                                    <div style={{ padding: '5px 7px 4px' }}>
                                                                                        {waNewTmplHeader && (
                                                                                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#111', marginBottom: '3px', lineHeight: 1.3 }}>{waNewTmplHeader}</div>
                                                                                        )}
                                                                                        {waNewTmplBody ? (
                                                                                            <div style={{ fontSize: '10px', color: '#111', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                                                                                {waNewTmplBody
                                                                                                    .replace(/\{\{first_name\}\}/g, 'John')
                                                                                                    .replace(/\{\{last_name\}\}/g, 'Doe')
                                                                                                    .replace(/\{\{company\}\}/g, 'Acme Inc')
                                                                                                    .replace(/\{\{title\}\}/g, 'CEO')
                                                                                                    .replace(/\*([^*]+)\*/g, '$1')
                                                                                                    .slice(0, 300)}
                                                                                                {waNewTmplBody.length > 300 && '...'}
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div style={{ fontSize: '10px', color: '#aaa', fontStyle: 'italic' }}>Your message here...</div>
                                                                                        )}
                                                                                        {waNewTmplFooter && (
                                                                                            <div style={{ fontSize: '8px', color: '#888', marginTop: '4px', paddingTop: '3px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>{waNewTmplFooter}</div>
                                                                                        )}
                                                                                        {/* Timestamp */}
                                                                                        <div style={{ fontSize: '8px', color: '#888', textAlign: 'right', marginTop: '2px' }}>19:28 ✓✓</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            {/* Input bar */}
                                                                            <div style={{ background: '#f0f0f0', padding: '4px 6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                                <div style={{ flex: 1, background: '#fff', borderRadius: '20px', padding: '3px 8px', fontSize: '9px', color: '#aaa' }}>Message</div>
                                                                                <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#128C7E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff' }}>➤</div>
                                                                            </div>
                                                                        </div>
                                                                        {/* Channel badge */}
                                                                        <div style={{ marginTop: '6px', padding: '2px 8px', borderRadius: '10px', background: waNewTmplChannelType === 'business_api' ? '#dbeafe' : '#dcfce7', border: `1px solid ${waNewTmplChannelType === 'business_api' ? '#93c5fd' : '#86efac'}`, fontSize: '9px', fontWeight: 700, color: waNewTmplChannelType === 'business_api' ? '#1d4ed8' : '#166534' }}>
                                                                            {waNewTmplChannelType === 'business_api' ? '🏢 Business WABA' : '📱 WAPA'}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                      <div
                                                        className="dark:bg-[#000724] dark:border-emerald-900 text-[#f8fffe]"
                                                        style={{ padding: '8px 12px', borderTop: waTemplates.length > 0 ? '1px solid #bbf7d0' : 'none'}}
                                                      >
                                                          <button
                                                            onClick={() => setShowWaNewTmplForm(true)}
                                                            className="dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 text-[#166534]"
                                                            style={{ width: '100%', background: 'none', border: '1px dashed #86efac', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}
                                                          >
                                                              + Create New Template
                                                          </button>
                                                      </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Voice Agent Config (inline when voice_call selected) */}
                            {nextChannels.includes('voice_call') && (
                              <div
                                className="bg-[#f8faff] dark:bg-[#000724] border border-[#e0eaf5] dark:border-[#1e3a8a] rounded-xl"
                                style={{ marginTop: '12px', padding: '14px', borderRadius: '12px' }}
                              >
                                  <div
                                    className="text-[#0b1957] dark:text-slate-300"
                                    style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}
                                  >
                                      Voice Call Settings
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <label
                                              className="text-[#374151] dark:text-gray-300"
                                              style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}
                                            >AI Agent</label>
                                            {voiceAgents.length > 0 ? (
                                              <Select
                                                value={selectedAgentId}
                                                onValueChange={(val: string) => {
                                                    setSelectedAgentId(val);
                                                    const agent = voiceAgents.find((a: any) => a.id === val);
                                                    if (agent?.voice_id) setSelectedVoiceId(agent.voice_id);
                                                }}
                                              >
                                                  <SelectTrigger className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">
                                                      <SelectValue placeholder="Select an AI Agent" />
                                                  </SelectTrigger>
                                                  <SelectContent  className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                                                      {voiceAgents.map((a: any) => (
                                                        <SelectItem
                                                          key={a.id}
                                                          value={a.id}
                                                          className="pl-3 pr-6 text-sm justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#22C55E] dark:focus:text-[#000724] dark:data-[state=checked]:focus:bg-[#22C55E] dark:data-[state=checked]:focus:text-[#000724]">

                                                            {a.name}{a.agent_language ? ` (${a.agent_language})` : ''}
                                                        </SelectItem>
                                                      ))}
                                                  </SelectContent>
                                              </Select>
                                            ) : (
                                              <div
                                                className="text-[12px] text-[#9ca3af] dark:text-slate-300"
                                              >
                                                  No agents found —
                                                  <a
                                                    href="/voice-agent"
                                                    className="text-[#0b1957] dark:text-blue-300 underline"
                                                  >
                                                      set up an agent
                                                  </a>
                                              </div>
                                            )}
                                        </div>
                                        <div>
                                            <label
                                              className="text-[#374151] dark:text-slate-300"
                                              style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}
                                            >
                                                From Number
                                            </label>
                                            {voiceNumbers.length > 0 ? (
                                              <Select
                                                value={selectedFromNumber}
                                                onValueChange={setSelectedFromNumber}
                                              >
                                                  <SelectTrigger className="flex items-center w-full px-3 bg-white dark:bg-[#000724] border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#111c3a] rounded-lg focus:ring-0 shadow-none h-[42px] text-sm">
                                                      <SelectValue placeholder="Select a number" />
                                                  </SelectTrigger>
                                                  <SelectContent  className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
                                                      {voiceNumbers.map((n: any) => {
                                                          const num = n.phone_number || n.number || n.phoneNumber || '';
                                                          const label = num + (n.number_type ? ` (${n.number_type})` : '') + (n.provider ? ` — ${n.provider}` : '');
                                                          return (
                                                            <SelectItem
                                                              key={n.id || num}
                                                              value={num}
                                                              className="pl-3 pr-6 text-sm justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#22C55E] dark:focus:text-[#000724] dark:data-[state=checked]:focus:bg-[#22C55E] dark:data-[state=checked]:focus:text-[#000724]">

                                                                {label || n.id || 'Unknown number'}
                                                            </SelectItem>
                                                          );
                                                      })}
                                                  </SelectContent>
                                              </Select>
                                            ) : (
                                              <div
                                                className="text-[12px] text-[#9ca3af] dark:text-slate-300"
                                              >
                                                  No phone numbers found —
                                                  <a
                                                    href="/voice-agent"
                                                    className="text-[#0b1957] dark:text-blue-300 underline"
                                                  >
                                                      add a number
                                                  </a>
                                              </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* LinkedIn Activity Config (inline when linkedin selected as follow-up channel in step 3) */}
                            {nextChannels.includes('linkedin') && (isInChannelConfiguration ? currentChannelBeingConfigured === 'linkedin' : true) && (
                              <div
                                className="bg-[#eff6ff] dark:bg-[#000724] border border-[#bfdbfe] dark:border-[#1e3a8a] rounded-xl"
                                style={{ marginTop: '12px', padding: '14px', borderRadius: '12px' }}
                              >
                                  <div
                                    className="text-[#1e40af] dark:text-blue-200"
                                    style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}
                                  >
                                      💼 LinkedIn Activity Settings
                                  </div>
                                  <div
                                    className="text-[#6b7280] dark:text-gray-400"
                                    style={{ fontSize: '12px', marginBottom: '8px' }}
                                  >
                                      Select LinkedIn actions (multi-select):
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {/* ── Option 1: Visit Profile ── */}
                                        {[
                                            { id: 'profile_view', label: 'Visit profile', desc: 'Visit their LinkedIn profile to warm up the connection', icon: '👁️' },
                                            { id: 'connect', label: 'Send connection request', desc: 'Send a personalised connection request', icon: '🤝' },
                                            { id: 'message', label: 'Send follow-up message', desc: 'Send a LinkedIn message after connection is accepted', icon: '💬' },
                                        ].map((opt) => {
                                            const isSelected = liChannelActions.includes(opt.id);
                                            return (
                                                <div key={opt.id} style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                                                    {/* Checkbox row */}
                                                    <div
                                                      onClick={() => toggleLiChannelAction(opt.id)}
                                                      className={`group flex items-start gap-[10px] p-[10px_12px] cursor-pointer transition-all duration-150 border-[1.5px]
        ${isSelected
                                                        ? 'bg-[#dbeafe] border-[#3b82f6] dark:bg-blue-900/30 dark:border-blue-500'
                                                        : 'bg-white border-[#bfdbfe] dark:bg-[#000724] dark:border-blue-900'
                                                      }`}
                                                      style={{
                                                          borderRadius: isSelected && (opt.id === 'connect' || opt.id === 'message') ? '10px 10px 0 0' : '10px',
                                                      }}
                                                    >
                                                        <div className={`w-[18px] h-[18px] rounded-[4px] flex-shrink-0 mt-[1px] flex items-center justify-center border-[2px] transition-colors
                                                        ${isSelected
                                                          ? 'bg-[#3b82f6] border-[#3b82f6] dark:border-blue-500'
                                                          : 'border-[#bfdbfe] dark:border-blue-800'
                                                        }`}
                                                        >
                                                            {isSelected && <span className="text-white text-[11px] font-bold">✓</span>}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[13px] font-semibold text-[#1e3a8a] dark:text-blue-100">
                                                                {opt.icon} {opt.label}
                                                            </div>
                                                            <div className="text-[11px] text-[#6b7280] dark:text-slate-300 mt-[2px]">
                                                                {opt.desc}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* ── Expanded config for 'connect' ── */}
                                                    {opt.id === 'connect' && isSelected && (
                                                      <div
                                                        className="border-[1.5px] border-t-0 border-[#3b82f6] bg-[#f0f6ff] dark:bg-[#060b21] dark:border-blue-700 p-3 rounded-b-[10px]"
                                                        style={{ borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '12px' }}
                                                      >
                                                          <div className="flex justify-between items-center mb-2">
                                                              <label className="text-[12px] font-semibold text-[#374151] dark:text-gray-300">
                                                                  Connection Message
                                                              </label>
                                                              <div className="flex gap-2 items-center">
                                                                  <button
                                                                    onClick={() => { setLiNewTmplCategory('linkedin_connection'); setShowLiConnTmplPanel(p => !p); setShowLiFollowTmplPanel(false); setShowLiNewTmplForm(false); }}
                                                                    className="bg-none border-none text-[#1e40af] dark:text-blue-300 hover:opacity-80 transition-opacity"
                                                                    style={{ fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                                  >
                                                                      {showLiConnTmplPanel ? '✕ Close' : '📋 Templates'}
                                                                  </button>

                                                                  <button
                                                                    disabled={liFollowGenLoading}
                                                                    onClick={() => { setShowAiConnPanel(v => !v); setShowAiFollowPanel(false); }}
                                                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all
                                                                    ${showAiConnPanel
                                                                      ? 'bg-[#e8ecfa] border border-[#c2d6eb] dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-200'
                                                                      : 'bg-none border-none'}
                                                                        ${liFollowGenLoading
                                                                      ? 'text-[#9ca3af] dark:text-gray-600 cursor-default'
                                                                      : 'text-[#0b1957] dark:text-blue-100 cursor-pointer'
                                                                    }`}
                                                                  >
                                                                      {liFollowGenLoading ? '⏳ Generating...' : (showAiConnPanel ? '✕ Close' : '✨ AI Generate')}
                                                                  </button>
                                                                </div>
                                                            </div>
                                                            {/* Connection template browser */}
                                                            {showLiConnTmplPanel && (
                                                              <div className="border border-[#bfdbfe] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21]" style={{ borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                                                                    {liTemplates.filter(t => t.category === 'linkedin_connection').length > 0 && !showLiNewTmplForm ? (
                                                                        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                                                            {liTemplates.filter(t => t.category === 'linkedin_connection').map(tmpl => (
                                                                                <div key={tmpl.id}
                                                                                    onClick={() => { setSelectedLiConnTmplId(tmpl.id); setConnMsg(tmpl.content); setShowLiConnTmplPanel(false); }}
                                                                                    style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #eff6ff', background: selectedLiConnTmplId === tmpl.id ? '#dbeafe' : 'transparent' }}>
                                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e40af', marginBottom: '2px' }}>{tmpl.name}</div>
                                                                                        <div style={{ fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tmpl.content}</div>
                                                                                    </div>
                                                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                                        <button onClick={e => { e.stopPropagation(); setSelectedLiConnTmplId(tmpl.id); setConnMsg(tmpl.content); setShowLiConnTmplPanel(false); }}
                                                                                            style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Use</button>
                                                                                        <button onClick={e => deleteLiTemplate(tmpl.id, e)}
                                                                                            style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : !showLiNewTmplForm ? (
                                                                      <div
                                                                        className="dark:text-slate-300 text-[#6b7280]"
                                                                        style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '' }}
                                                                      >
                                                                        No saved templates yet.
                                                                      </div>
                                                                    ) : null}
                                                                    {/* Create new template form */}
                                                                    {showLiNewTmplForm && liNewTmplCategory === 'linkedin_connection' ? (
                                                                        <div style={{ padding: '10px', borderTop: liTemplates.filter(t => t.category === 'linkedin_connection').length > 0 ? '1px solid #bfdbfe' : 'none' }}>
                                                                            <input
                                                                              value={liNewTmplName}
                                                                              onChange={e => setLiNewTmplName(e.target.value)}
                                                                              placeholder="Template name..."
                                                                              className="w-full border border-[#bfdbfe] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#111827] dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
                                                                              style={{
                                                                                  width: '100%',
                                                                                  borderRadius: '6px',
                                                                                  padding: '6px 8px',
                                                                                  fontSize: '12px',
                                                                                  marginBottom: '6px',
                                                                                  boxSizing: 'border-box',
                                                                                  fontFamily: 'inherit'
                                                                              }}
                                                                            />
                                                                            <textarea
                                                                              value={liNewTmplBody}
                                                                              onChange={e => setLiNewTmplBody(e.target.value)}
                                                                              placeholder="Hi {{first_name}}, I would love to connect..."
                                                                              rows={3}
                                                                              className="w-full border border-[#bfdbfe] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#111827] dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
                                                                              style={{
                                                                                  width: '100%',
                                                                                  borderRadius: '6px',
                                                                                  padding: '6px 8px',
                                                                                  fontSize: '12px',
                                                                                  resize: 'vertical',
                                                                                  fontFamily: 'inherit',
                                                                                  boxSizing: 'border-box',
                                                                                  marginBottom: '6px'
                                                                              }}
                                                                            />
                                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                                <button
                                                                                  onClick={saveLiTemplate}
                                                                                  disabled={liNewTmplSaving}
                                                                                  className={`flex-1 rounded-[6px] text-white
                                                                                ${liNewTmplSaving
                                                                                    ? 'bg-gray-400 dark:bg-gray-600'
                                                                                    : 'bg-[#1e40af] dark:bg-blue-600'
                                                                                  }
                                                                                `}
                                                                                  style={{
                                                                                      border: 'none',
                                                                                      padding: '6px',
                                                                                      fontSize: '12px',
                                                                                      fontWeight: 600,
                                                                                      cursor: 'pointer'
                                                                                  }}
                                                                                >
                                                                                    {liNewTmplSaving ? 'Saving...' : '💾 Save'}
                                                                                </button>
                                                                                <button onClick={() => setShowLiNewTmplForm(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ padding: '6px 10px', borderTop: liTemplates.filter(t => t.category === 'linkedin_connection').length > 0 ? '1px solid #bfdbfe' : 'none' }}>
                                                                            <button onClick={() => { setLiNewTmplCategory('linkedin_connection'); setShowLiNewTmplForm(true); }}
                                                                                    className="dark:border-emerald-700 dark:text-slate-300 text-[#1e40af]"
                                                                                    style={{ width: '100%', background: 'none', border: '1px dashed #86efac', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                                                                                + Create New Template
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Selected template badge */}
                                                            {selectedLiConnTmplId && !showLiConnTmplPanel && (() => {
                                                                const tmpl = liTemplates.find(t => t.id === selectedLiConnTmplId);
                                                                return tmpl ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '12px', marginBottom: '6px' }}>
                                                                        <span style={{ fontWeight: 600, color: '#1e40af', flex: 1 }}>✓ {tmpl.name}</span>
                                                                        <button onClick={() => { setSelectedLiConnTmplId(''); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        <textarea
                                                          value={connMsg}
                                                          onChange={e => setConnMsg(e.target.value.slice(0, 300))}
                                                          placeholder={'Hi {{first_name}}, I noticed your work at {{company}} and would love to connect...'}
                                                          rows={3}
                                                          maxLength={300}
                                                          className={`w-full rounded-[8px] border transition-colors outline-none
                                                            ${connMsg.length >= 300
                                                                                                                ? 'border-[#ef4444]'
                                                                                                                : connMsg.length > 270
                                                                                                                  ? 'border-[#f59e0b]'
                                                                                                                  : 'border-[#bfdbfe] dark:border-[#1e3a8a]'
                                                                                                              }
                                                            bg-white dark:bg-[#060b21] text-[#374151] dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-0
                                                        `}
                                                          style={{
                                                            width: '100%',
                                                            padding: '8px 10px',
                                                            fontSize: '13px',
                                                            fontFamily: 'inherit',
                                                            boxSizing: 'border-box',
                                                            resize: 'vertical'
                                                          }}
                                                        />
                                                            {/* Character counter */}
                                                        <div
                                                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}
                                                        >
                                                          <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-[4px]">
                                                            Placeholders: {'{{first_name}}'} {'{{last_name}}'} {'{{company}}'} {'{{title}}'}
                                                            <span className="text-[#0b1957] dark:text-blue-300 font-semibold">
                                                              {' {{web_insight}}'} {'{{recent_post}}'} {'{{article}}'} {'{{news}}'}
                                                            </span>
                                                            <span className="text-[#0b1957] dark:text-blue-400">
                                                              {' ← AI-personalised at send time'}
                                                            </span>
                                                          </div>
                                                          <div
                                                            className={`text-[11px] font-bold flex-shrink-0 ml-[8px] whitespace-nowrap
                                                          ${connMsg.length >= 300
                                                              ? 'text-[#ef4444]'
                                                              : connMsg.length > 270
                                                                ? 'text-[#f59e0b]'
                                                                : 'text-[#9ca3af] dark:text-gray-500'
                                                            }
                                                          `}
                                                          >
                                                            {connMsg.length}/300{connMsg.length >= 300 && ' ⚠️ limit reached'}
                                                          </div>
                                                        </div>
                                                            {connMsg.length >= 300 && (
                                                                <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '2px', fontWeight: 500 }}>
                                                                    LinkedIn hard limit is 300 characters. Message will be sent as-is — keep it concise.
                                                                </div>
                                                            )}

                                                            {/* ── AI Generate inline panel (connection) ── */}
                                                            {showAiConnPanel && <AiMsgContextPanel
                                                                valueProp={aiMsgValueProp} setValueProp={setAiMsgValueProp}
                                                                tone={aiMsgTone} setTone={setAiMsgTone}
                                                                goal={aiMsgGoal} setGoal={setAiMsgGoal}
                                                                targeting={targeting} leadsCount={leads?.length || 0}
                                                                loading={liFollowGenLoading}
                                                                onGenerate={() => generateLinkedInFollowup('connect')}
                                                            />}
                                                        </div>
                                                    )}

                                                    {/* ── Expanded config for 'message' ── */}
                                                    {opt.id === 'message' && isSelected && (
                                                      <div  className="border-[1.5px] border-t-0 border-[#3b82f6] dark:border-blue-700 bg-[#f0f6ff] dark:bg-[#060b21]" style={{ borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '12px' }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                          <label className="text-[#374151] dark:text-gray-300" style={{ fontSize: '12px', fontWeight: 600 }}>
                                                            Follow-up Message
                                                          </label>
                                                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <button
                                                              onClick={() => { setLiNewTmplCategory('linkedin_followup'); setShowLiFollowTmplPanel(p => !p); setShowLiConnTmplPanel(false); setShowLiNewTmplForm(false); }}
                                                              className="text-[#1e40af] dark:text-blue-300 hover:opacity-80 transition-opacity"
                                                              style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                                                            >
                                                              {showLiFollowTmplPanel ? '✕ Close' : '📋 Templates'}
                                                            </button>

                                                            <button
                                                              disabled={liFollowGenLoading}
                                                              onClick={() => { setShowAiFollowPanel(v => !v); setShowAiConnPanel(false); }}
                                                              className={`rounded-[6px] transition-all
                                                            ${showAiFollowPanel
                                                                ? 'bg-[#e8ecfa] dark:bg-blue-900/40 border border-[#c2d6eb] dark:border-blue-700'
                                                                : 'bg-transparent border-transparent'}
                                                              ${liFollowGenLoading
                                                                ? 'text-[#9ca3af] dark:text-gray-600'
                                                                : 'text-[#0b1957] dark:text-blue-100'
                                                              }
                                                        `} style={{
                                                                padding: showAiFollowPanel ? '2px 7px' : 0,
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                cursor: liFollowGenLoading ? 'default' : 'pointer'
                                                              }}
                                                            >
                                                              {liFollowGenLoading ? '⏳ Generating...' : (showAiFollowPanel ? '✕ Close' : '✨ AI Generate')}
                                                            </button>
                                                                </div>
                                                            </div>
                                                            {/* Followup template browser */}
                                                            {showLiFollowTmplPanel && (
                                                              <div className="border border-[#bfdbfe] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21]" style={{ borderRadius: '8px', marginBottom: '8px', overflow: 'hidden' }}>
                                                                    {liTemplates.filter(t => t.category === 'linkedin_followup').length > 0 && !showLiNewTmplForm ? (
                                                                        <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
                                                                            {liTemplates.filter(t => t.category === 'linkedin_followup').map(tmpl => (
                                                                              <div key={tmpl.id}
                                                                                   onClick={() => { setSelectedLiFollowTmplId(tmpl.id); setFollowMsg(tmpl.content); setShowLiFollowTmplPanel(false); }}
                                                                                   className={`border-b transition-colors ${selectedLiFollowTmplId === tmpl.id ? 'bg-[#dbeafe] dark:bg-blue-900/30' : 'bg-transparent'} border-[#eff6ff] dark:border-[#1e3a8a]`}
                                                                                   style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '8px 10px', cursor: 'pointer' }}>

                                                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                                                  <div
                                                                                    className="text-[#1e40af] dark:text-blue-300"
                                                                                    style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}
                                                                                  >
                                                                                    {tmpl.name}
                                                                                  </div>
                                                                                  <div
                                                                                    className="text-[#374151] dark:text-gray-400"
                                                                                    style={{ fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                                                  >
                                                                                    {tmpl.content}
                                                                                  </div>
                                                                                </div>

                                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                                  <button
                                                                                    onClick={e => { e.stopPropagation(); setSelectedLiFollowTmplId(tmpl.id); setFollowMsg(tmpl.content); setShowLiFollowTmplPanel(false); }}
                                                                                    className="bg-[#1e40af] dark:bg-blue-600 text-white"
                                                                                    style={{ border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                                                                  >
                                                                                    Use
                                                                                  </button>
                                                                                  <button
                                                                                    onClick={e => deleteLiTemplate(tmpl.id, e)}
                                                                                    className="bg-transparent border border-[#fca5a5] dark:border-red-900 text-[#dc2626] dark:text-red-400"
                                                                                    style={{ borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}
                                                                                  >
                                                                                    ✕
                                                                                  </button>
                                                                                </div>
                                                                              </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : !showLiNewTmplForm ? (
                                                                      <div
                                                                        className="dark:text-slate-300 text-[#6b7280]"
                                                                        style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '' }}
                                                                      >
                                                                        No saved templates yet.
                                                                      </div>
                                                                    ) : null}
                                                                    {/* Create new template form */}
                                                                    {showLiNewTmplForm && liNewTmplCategory === 'linkedin_followup' ? (
                                                                        <div style={{ padding: '10px', borderTop: liTemplates.filter(t => t.category === 'linkedin_followup').length > 0 ? '1px solid #bfdbfe' : 'none' }}>
                                                                            <input value={liNewTmplName} onChange={e => setLiNewTmplName(e.target.value)} placeholder="Template name..." style={{ width: '100%', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', outline: 'none', marginBottom: '6px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                                                            <textarea value={liNewTmplBody} onChange={e => setLiNewTmplBody(e.target.value)} placeholder={'Hi {{first_name}}, great connecting! I wanted to share...'} rows={3} style={{ width: '100%', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '6px 8px', fontSize: '12px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: '6px' }} />
                                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                                <button onClick={saveLiTemplate} disabled={liNewTmplSaving} className={`flex-1 rounded-[6px] text-white
                                                                                ${liNewTmplSaving
                                                                                  ? 'bg-gray-400 dark:bg-gray-600'
                                                                                  : 'bg-[#1e40af] dark:bg-blue-600'
                                                                                }
                                                                                `}
                                                                                        style={{
                                                                                            border: 'none',
                                                                                            padding: '6px',
                                                                                            fontSize: '12px',
                                                                                            fontWeight: 600,
                                                                                            cursor: 'pointer'
                                                                                        }}>{liNewTmplSaving ? 'Saving...' : '💾 Save'}</button>
                                                                                <button onClick={() => setShowLiNewTmplForm(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', color: '#6b7280', cursor: 'pointer' }}>Cancel</button>
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <div style={{ padding: '6px 10px', borderTop: liTemplates.filter(t => t.category === 'linkedin_followup').length > 0 ? '1px solid #bfdbfe' : 'none' }}>
                                                                            <button onClick={() => { setLiNewTmplCategory('linkedin_followup'); setShowLiNewTmplForm(true); }}
                                                                                    className="dark:border-emerald-700 dark:text-slate-300 text-[#1e40af]"
                                                                                    style={{ width: '100%', background: 'none', border: '1px dashed #86efac', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                                                                                + Create New Template
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            {/* Selected template badge */}
                                                            {selectedLiFollowTmplId && !showLiFollowTmplPanel && (() => {
                                                                const tmpl = liTemplates.find(t => t.id === selectedLiFollowTmplId);
                                                                return tmpl ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 8px', background: '#dbeafe', border: '1px solid #93c5fd', borderRadius: '6px', fontSize: '12px', marginBottom: '6px' }}>
                                                                        <span style={{ fontWeight: 600, color: '#1e40af', flex: 1 }}>✓ {tmpl.name}</span>
                                                                        <button onClick={() => { setSelectedLiFollowTmplId(''); }} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                                                                    </div>
                                                                ) : null;
                                                            })()}
                                                        <textarea
                                                          value={followMsg}
                                                          onChange={e => setFollowMsg(e.target.value)}
                                                          placeholder={'Hi {{first_name}}, great connecting! I wanted to reach out about how we help companies like {{company}}...'}
                                                          rows={3}
                                                          className="w-full border border-[#bfdbfe] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#374151] dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:ring-0 outline-none"
                                                          style={{
                                                            width: '100%',
                                                            borderRadius: '8px',
                                                            padding: '8px 10px',
                                                            fontSize: '13px',
                                                            resize: 'vertical',
                                                            fontFamily: 'inherit',
                                                            boxSizing: 'border-box'
                                                          }}
                                                        />
                                                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-[4px]">Placeholders: {'{{first_name}}'} {'{{last_name}}'} {'{{company}}'} {'{{title}}'} <span className="text-[#0b1957] dark:text-blue-300 font-semibold">{'{{web_insight}}'} {'{{recent_post}}'} {'{{article}}'} {'{{news}}'}</span> <span style={{ color: '#0b1957' }}>← AI-personalised at send time</span></div>

                                                            {/* ── AI Generate inline panel (follow-up) ── */}
                                                            {showAiFollowPanel && <AiMsgContextPanel
                                                                valueProp={aiMsgValueProp} setValueProp={setAiMsgValueProp}
                                                                tone={aiMsgTone} setTone={setAiMsgTone}
                                                                goal={aiMsgGoal} setGoal={setAiMsgGoal}
                                                                targeting={targeting} leadsCount={leads?.length || 0}
                                                                loading={liFollowGenLoading}
                                                                onGenerate={() => generateLinkedInFollowup('followup')}
                                                            />}

                                                            {/* Dry-run the sequence before the campaign goes live. */}
                                                            <a
                                                                href="/followup-simulator.html"
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="group mt-[10px] flex items-start gap-[8px] rounded-[10px] border-[1.5px] border-dashed border-[#bfdbfe] dark:border-blue-900 p-[10px_12px] hover:border-[#3b82f6] hover:bg-[#eff6ff] dark:hover:bg-blue-900/20 transition-colors no-underline"
                                                            >
                                                                <span className="text-[15px] leading-none mt-[1px]">🧪</span>
                                                                <span className="min-w-0">
                                                                    <span className="block text-[12px] font-semibold text-[#0b1957] dark:text-blue-200">
                                                                        Test this sequence before launching
                                                                    </span>
                                                                    <span className="block text-[11px] text-gray-500 dark:text-gray-400 leading-snug">
                                                                        Play the connect note and every follow-up against a sample lead, and read
                                                                        what each touch would actually send.
                                                                    </span>
                                                                </span>
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* ── 🤖 AI Daily Personalisation ───────────── */}
                                    {(() => {
                                        const anyOn = enableDailyWebPresence || enableDailyPosts || enableAiPersonalization;
                                        const noSource = !enableDailyWebPresence && !enableDailyPosts;
                                        const toggleAll = () => {
                                            const next = !anyOn;
                                            setEnableDailyWebPresence(next);
                                            setEnableDailyPosts(next);
                                            setEnableAiPersonalization(next);
                                        };
                                        return (
                                            <div style={{ marginTop: '16px' }}>
                                                {/* Master header — one tap toggles the whole feature */}
                                                <div role="button" aria-pressed={anyOn} onClick={toggleAll}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', cursor: 'pointer',
                                                        borderRadius: anyOn ? '14px 14px 0 0' : 14,
                                                        background: anyOn ? 'linear-gradient(135deg,#eef2ff 0%,#f5f3ff 100%)' : '#f8fafc',
                                                        border: `1px solid ${anyOn ? '#c7d2fe' : '#e5e7eb'}`,
                                                        borderBottom: anyOn ? '1px solid transparent' : '1px solid #e5e7eb',
                                                        transition: 'background .2s',
                                                    }}>
                                                    <div style={{
                                                        width: 34, height: 34, borderRadius: 10, flexShrink: 0, display: 'grid', placeItems: 'center',
                                                        background: anyOn ? 'linear-gradient(135deg,#4338ca,#7c3aed)' : '#eef2ff',
                                                        boxShadow: anyOn ? '0 2px 8px rgba(67,56,202,0.30)' : 'none', transition: 'background .2s',
                                                    }}>
                                                        <img src={anyOn ? '/logo-white.svg' : '/logo.svg'} alt="LAD" style={{ width: 20, height: 20, display: 'block' }} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#4338ca' }}>AI Daily Personalisation</div>
                                                        <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>Unique messages per lead, powered by live data</div>
                                                    </div>
                                                    <AiPersoToggle checked={anyOn} onChange={toggleAll} accent="indigo" size="lg" />
                                                </div>

                                                {anyOn && (
                                                    <div style={{
                                                        border: '1px solid #c7d2fe', borderTop: 'none', borderRadius: '0 0 14px 14px',
                                                        background: '#fcfcff', padding: 13, display: 'flex', flexDirection: 'column', gap: 16,
                                                    }}>
                                                        {/* Group 1 — live data the agent gathers per lead */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#4338ca' }}>Live data sources</div>
                                                            <AiPersoRow icon={<Globe size={16} />} title="Refresh web presence daily" desc="Re-runs Google search for articles, news & social profiles per lead" checked={enableDailyWebPresence} onChange={setEnableDailyWebPresence} accent="indigo" />
                                                            <AiPersoRow icon={<Newspaper size={16} />} title="Fetch live LinkedIn posts" desc="Pulls the lead's recent LinkedIn posts before each send" checked={enableDailyPosts} onChange={setEnableDailyPosts} accent="indigo" />
                                                        </div>

                                                        {/* Group 2 — how the agent writes each message */}
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#7c3aed' }}>AI message generation</div>
                                                            <AiPersoRow icon={<Sparkles size={16} />} title="AI-generate unique message per lead"
                                                                desc={noSource ? 'Enable a live data source above first' : 'AI writes a personalised connect + follow-up from live web & post data'}
                                                                checked={enableAiPersonalization} onChange={setEnableAiPersonalization} accent="violet" disabled={noSource} />

                                                            {enableAiPersonalization && !noSource && (
                                                                <>
                                                                    <div style={{ display: 'flex', gap: 8, fontSize: 11.5, color: '#6d28d9', background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 9, padding: '9px 11px', lineHeight: 1.5 }}>
                                                                        <Check size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                                                        <span>Each lead gets a <strong>unique AI-generated message</strong> from their live web presence &amp; LinkedIn posts. Your static template is the fallback.</span>
                                                                    </div>

                                                                    {/* Nested granular control — clearly a child of the toggle above */}
                                                                    <div style={{ marginLeft: 8, paddingLeft: 14, borderLeft: '2px solid #ddd6fe', display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                                        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#7c3aed' }}>Which messages?</div>
                                                                        <AiPersoRow icon={<UserPlus size={16} />} title="Connection request" desc="Personalised connect note per lead" checked={enableAiConnectionPersonalization} onChange={setEnableAiConnectionPersonalization} accent="violet" />
                                                                        <AiPersoRow icon={<MessageSquare size={16} />} title="Follow-up message" desc="Personalised follow-up per lead" checked={enableAiFollowupPersonalization} onChange={setEnableAiFollowupPersonalization} accent="violet" />
                                                                        <div style={{ fontSize: 11, color: '#9ca3af', paddingLeft: 2 }}>Unchecked messages use your static template.</div>
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    )}


                    {/* Step 2: Trigger Condition — options are dynamic based on primary channel */}
                    {step === 2 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {/* Channel sequence badge */}
                          <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '12px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              {nextChannels.map((ch, idx) => {
                                  const label = ch === 'voice_call' ? 'Voice Call' : ch === 'linkedin' ? 'LinkedIn' : ch.charAt(0).toUpperCase() + ch.slice(1);
                                  return (
                                    <span key={ch} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span className="bg-[#e8ecfa] dark:bg-blue-950/60 text-[#0b1957] dark:text-blue-300" style={{ padding: '2px 8px', borderRadius: '99px', fontWeight: 600, fontSize: '11px' }}>{label}</span>
                                        {idx < nextChannels.length - 1 && <span className="text-slate-400 dark:text-slate-600">→</span>}
                </span>
                                  );
                              })}
                          </div>
                          {triggerOptions.map((opt, i) => (
                            <div
                              key={opt.id}
                              onClick={() => setTriggerCondition(opt.id)}
                              style={optStyle(triggerCondition === opt.id)}
                              className="group"
                            >
                                <div style={numBadge(i + 1, triggerCondition === opt.id)}>{triggerCondition === opt.id ? '✓' : i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div className="text-slate-900 dark:text-white font-semibold transition-colors">{opt.label}</div>
                                    <div className="text-slate-500 dark:text-slate-400" style={{ fontSize: '12px', marginTop: '2px' }}>{opt.desc}</div>
                                </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Step 3: Duration */}
                    {step === 3 && (
                      <div
                        className="flex flex-col gap-2 dark:bg-[#000724]"
                        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                      >
                          {[
                              { d: '1', label: 'Once' },
                              { d: '7', label: '7 days' },
                              { d: '14', label: '14 days' },
                              { d: '30', label: '30 days' },
                              { d: '60', label: '60 days' },
                          ].map((o, i) => {
                              const dNum = parseInt(o.d);
                              const isOnce = dNum <= 1;
                              const wd = Math.max(1, Math.floor(dNum * 5 / 7));
                              const perDay = Math.min(LINKEDIN_DAILY_LIMIT, Math.max(1, qualifiedLeadCount));
                              const totalOverDuration = perDay * wd;
                              const capped = qualifiedLeadCount > LINKEDIN_DAILY_LIMIT;
                              const leadWord = `lead${qualifiedLeadCount !== 1 ? 's' : ''}`;
                              const desc = isOnce
                                  ? (inboundMode
                                      ? `One-time send to your ${qualifiedLeadCount} selected ${leadWord} — no drip schedule`
                                      : `Single-day run — targets up to ${perDay} leads once`)
                                  : (inboundMode
                                      ? `Reaches your ${qualifiedLeadCount} selected ${leadWord} over ${wd} working day${wd !== 1 ? 's' : ''}`
                                      : capped
                                          ? `Targets ${perDay}/day (capped from ${qualifiedLeadCount}; LinkedIn safe limit), ~${totalOverDuration} new leads over ${wd} working days`
                                          : `Targets ${perDay} new leads/day via pagination, ~${totalOverDuration} leads over ${wd} working days`);
                              return (
                                <div
                                  key={o.d}
                                  onClick={() => setDays(o.d)}
                                  className={`${days === o.d ? 'border-indigo-500 bg-indigo-50 dark:bg-[#2563eb]' : 'border-[#e0eaf5] dark:border-gray-800 bg-white dark:bg-[#000724]'} transition-all cursor-pointer`}
                                  style={{
                                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                                      borderRadius: '12px', border: '1px solid', marginBottom: '8px'
                                  }}
                                >
                                    <div style={numBadge(i + 1, days === o.d)}>{days === o.d ? '✓' : i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }} className="text-gray-900 dark:text-gray-100">
                                            {o.label}
                                        </div>
                                        <div
                                          style={{ fontSize: '11px', marginTop: '2px' }}
                                          className={capped && !inboundMode ? 'text-[#b45309] dark:text-amber-500' : 'text-[#6b7280] dark:text-slate-300'}
                                        >
                                            {desc}
                                        </div>
                                    </div>
                                </div>
                              );
                          })}
                          <div className="mt-2">
                              <input
                                type="number"
                                value={days}
                                onChange={e => setDays(e.target.value)}
                                placeholder="Or enter custom days..."
                                className="w-full rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#000724] px-[14px] py-[10px] text-[14px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none focus:border-indigo-500 transition-colors"
                              />
                          </div>
                          {/* Warning when prospect-time qualified count exceeds LinkedIn's safe daily limit */}
                          {exceedsLinkedInLimits && (
                            <div style={{
                                padding: '10px 14px', borderRadius: '10px', fontSize: '12px', lineHeight: 1.5,
                                background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', marginTop: '4px',
                            }}>
                                <strong>LinkedIn safe-limit cap:</strong> Your ICP threshold matches {qualifiedLeadCount} leads, but LinkedIn&apos;s safe daily action limit is {LINKEDIN_DAILY_LIMIT}.
                                The campaign will source {safeLeadsPerDay} new qualified leads/day via pagination, totalling ~{safeLeadsPerDay * workingDays} over {workingDays} working days.
                            </div>
                          )}
                      </div>
                    )}

                    {/* Step 4: Campaign Name */}
                    {step === 4 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                              <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Q3 Outreach Strategy"
                                className="flex-1 border border-[#e0eaf5] rounded-[10px] px-[14px] py-[10px] text-[14px] outline-none bg-[#fafbff] font-inherit min-w-0
                       dark:bg-[#060b21] dark:border-[#1e3a8a] dark:text-gray-100 dark:placeholder-gray-600"
                              />
                              <button
                                onClick={suggestName}
                                className="bg-[#e8ecfa] border-[1.5px] border-[#0b1957] rounded-[10px] px-[14px] text-[12px] font-bold text-[#0b1957] cursor-pointer whitespace-nowrap flex-shrink-0 transition-all
                       dark:bg-[#2563eb] dark:border-blue-500 dark:text-slate-300 hover:bg-[#dbeafe] dark:hover:bg-blue-900/50"
                              >
                                  ✨ Suggest
                              </button>
                          </div>
                          {!creditsOk && (
                              <div className="dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300" style={{
                                  padding: '10px 14px', borderRadius: '10px', fontSize: '12px', lineHeight: 1.5,
                                  background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e',
                                  display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start',
                              }}>
                                  <div>
                                      <strong>Not enough credits:</strong> You need {requiredCredits} credits to launch this
                                      campaign ({enrolledCount} leads × {CREDIT_COST_PER_LEAD}). You have {creditBalance}.
                                  </div>
                                  <button onClick={onOpenRecharge} className="dark:bg-blue-700" style={{
                                      padding: '6px 14px', borderRadius: '8px', border: 'none',
                                      background: '#0b1957', color: '#fff', fontSize: '12px', fontWeight: 700,
                                      cursor: 'pointer', transition: 'all 0.15s',
                                  }}>Add credits</button>
                              </div>
                          )}
                          {creditsOk && creditBalance !== null && enrolledCount > 0 && (
                              <div className="dark:text-gray-500" style={{ fontSize: '12px', color: '#9ca3af' }}>
                                  ≈{requiredCredits} credits will be used as this campaign runs
                              </div>
                          )}
                      </div>
                    )}
                </div>

                {/* Navigation footer */}
                {(() => {
                    // Direct contacts AND no-ICP-score campaigns skip step 0 (ICP) and step 2 (trigger)
                    // → only steps 1,3,4 remain (3 visible steps)
                    const skipsIcp = isDirectContact || hasNoIcpScores;
                    const dispStep = skipsIcp ? (step <= 1 ? 1 : step - 1) : step + 1;
                    const dispTotal = skipsIcp ? 3 : totalSteps;
                    const isFirstStep = skipsIcp ? step <= 1 : step <= 0;
                    return (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', maxWidth: '520px' }}>
                            <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>{dispStep}/{dispTotal}</div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                    disabled={isFirstStep}
                                    onClick={handleBack}
                                    style={{
                                        width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e5e7eb',
                                        background: isFirstStep ? '#f9fafb' : '#fff', cursor: isFirstStep ? 'default' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                    }}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFirstStep ? '#d1d5db' : '#0b1957'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                                </button>
                                {step < totalSteps - 1 ? (
                                    <button
                                        disabled={!canNext()}
                                        onClick={handleNext}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                                            background: canNext() ? '#0b1957' : '#e5e7eb', cursor: canNext() ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                        }}
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                ) : (
                                    <button
                                        disabled={!canNext() || launching || !creditsOk}
                                        onClick={launchCampaign}
                                        style={{
                                            padding: '8px 20px', borderRadius: '10px', border: 'none',
                                            background: canNext() && !launching && creditsOk ? '#10b981' : '#e5e7eb',
                                            color: canNext() && !launching && creditsOk ? '#fff' : '#9ca3af',
                                            fontSize: '13px', fontWeight: 700, cursor: canNext() && !launching && creditsOk ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s',
                                        }}
                                    >
                                        {launching ? 'Launching...' : 'Launch Campaign'}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })()}

            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   TARGETING FORM INLINE (typeform-style in chat)
   ═══════════════════════════════════════════════ */
const TG_QUESTIONS = [
    { id: 'nationality', question: 'What nationalities are your target decision makers from?', type: 'multi-select' },
    { id: 'experience', question: 'What experience level should they have?', type: 'multi-select' },
    { id: 'company_size', question: 'What company sizes are you targeting?', type: 'multi-select' },
    { id: 'company_age', question: 'What company age ranges interest you?', type: 'multi-select' },
    { id: 'education', question: 'What educational backgrounds are ideal?', type: 'multi-select' },
    { id: 'skills', question: 'Any specific skills you\'re looking for? (e.g., "AI/ML, Cloud Architecture")', type: 'text' },
    { id: 'posted_recently', question: 'Filter by LinkedIn activity?', type: 'toggle' },
    { id: 'review', question: 'Review your targeting criteria', type: 'review' },
];

function TargetingFormInline({
    step, setStep, nationality, setNationality, experienceLevel, setExperienceLevel,
    companySize, setCompanySize, companyAge, setCompanyAge, education, setEducation,
    skills, setSkills, postedRecently, setPostedRecently, currentTargeting, onConfirm, loading, setLoading
}: {
    step: number; setStep: (s: number) => void;
    nationality: string[]; setNationality: React.Dispatch<React.SetStateAction<string[]>>;
    experienceLevel: string[]; setExperienceLevel: React.Dispatch<React.SetStateAction<string[]>>;
    companySize: string[]; setCompanySize: React.Dispatch<React.SetStateAction<string[]>>;
    companyAge: string[]; setCompanyAge: React.Dispatch<React.SetStateAction<string[]>>;
    education: string[]; setEducation: React.Dispatch<React.SetStateAction<string[]>>;
    skills: string[]; setSkills: React.Dispatch<React.SetStateAction<string[]>>;
    postedRecently: boolean; setPostedRecently: React.Dispatch<React.SetStateAction<boolean>>;
    currentTargeting: LeadTargeting | null;
    onConfirm: () => void;
    loading?: boolean;
    setLoading?: (v: boolean) => void;
}) {
    const totalSteps = TG_QUESTIONS.length;
    const q = TG_QUESTIONS[step];
    const [searchQuery, setSearchQuery] = React.useState('');

    // Local raw text for the skills textarea — avoids trim-on-every-keystroke bug
    // that prevented typing multi-word skills like "Gas Detector" or "Cloud Architecture"
    const [skillsRaw, setSkillsRaw] = React.useState(() => skills.join(', '));
    // Sync skillsRaw when the component re-opens with pre-existing skills
    React.useEffect(() => { setSkillsRaw(skills.join(', ')); }, [step === 5]); // eslint-disable-line react-hooks/exhaustive-deps

    const baseBox: React.CSSProperties = {
        background: '#fff', border: '1px solid #e0eaf5', borderRadius: '16px', padding: '24px',
        maxWidth: '520px', boxShadow: '0 4px 20px rgba(23,37,96,0.06)', animation: 'fadeUp 0.3s ease both',
    };

    const optStyle = (selected: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        border: `2px solid ${selected ? '#0b1957' : '#e5e7eb'}`, background: selected ? '#e8ecfa' : '#fff',
        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        fontSize: '14px', fontWeight: 500, color: selected ? '#0b1957' : '#374151',
    });

    const numBadge = (n: number, selected: boolean): React.CSSProperties => ({
        width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0, border: `2px solid ${selected ? '#0b1957' : '#d1d5db'}`,
        background: selected ? '#0b1957' : 'transparent', color: selected ? '#fff' : '#6b7280',
    });

    const toggleSelection = (arr: string[], item: string, setter: any) => {
        if (arr.includes(item)) {
            setter(arr.filter(x => x !== item));
        } else {
            setter([...arr, item]);
        }
    };

    const filteredNationalities = NATIONALITIES.filter(n =>
        n.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="adv-bubble adv-bubble-ai fadeUp" style={{ marginBottom: '16px' }}>
            <div className="adv-ai-avatar adv-ai-avatar-viz"><AgentVisualizer state="idle" size={36} /></div>
            <div style={{ flex: 1, maxWidth: '540px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div className="adv-ai-name">Targeting Filters</div>
                    <button onClick={() => setStep(-1)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af'
                        }}>
                        <X size={20} />
                    </button>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px', lineHeight: 1.4 }}>
                    {q.question}
                </div>

                <div style={baseBox}>
                    {/* Step 0: Nationality */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input
                                type="text" placeholder="Search nationalities..." value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px',
                                    fontSize: '14px', marginBottom: '8px'
                                }}
                            />
                            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {filteredNationalities.slice(0, 10).map((nat) => {
                                    const selected = nationality.includes(nat);
                                    return (
                                        <div key={nat} onClick={() => toggleSelection(nationality, nat, setNationality)}
                                            style={optStyle(selected)}>
                                            <div style={numBadge(nationality.indexOf(nat) + 1 || 0, selected)}>
                                                {selected ? '✓' : '○'}
                                            </div>
                                            <div>{nat}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Experience Level */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {EXPERIENCE_LEVELS.map((level) => {
                                const selected = experienceLevel.includes(level);
                                return (
                                    <div key={level} onClick={() => toggleSelection(experienceLevel, level, setExperienceLevel)}
                                        style={optStyle(selected)}>
                                        <div style={numBadge(experienceLevel.indexOf(level) + 1 || 0, selected)}>
                                            {selected ? '✓' : '○'}
                                        </div>
                                        <div>{level}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 2: Company Size */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {COMPANY_SIZES.map((size) => {
                                const selected = companySize.includes(size);
                                return (
                                    <div key={size} onClick={() => toggleSelection(companySize, size, setCompanySize)}
                                        style={optStyle(selected)}>
                                        <div style={numBadge(companySize.indexOf(size) + 1 || 0, selected)}>
                                            {selected ? '✓' : '○'}
                                        </div>
                                        <div>{size}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 3: Company Age */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {COMPANY_AGES.map((age) => {
                                const selected = companyAge.includes(age);
                                return (
                                    <div key={age} onClick={() => toggleSelection(companyAge, age, setCompanyAge)}
                                        style={optStyle(selected)}>
                                        <div style={numBadge(companyAge.indexOf(age) + 1 || 0, selected)}>
                                            {selected ? '✓' : '○'}
                                        </div>
                                        <div>{age}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 4: Education */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {EDUCATION_OPTIONS.map((edu) => {
                                const selected = education.includes(edu);
                                return (
                                    <div key={edu} onClick={() => toggleSelection(education, edu, setEducation)}
                                        style={optStyle(selected)}>
                                        <div style={numBadge(education.indexOf(edu) + 1 || 0, selected)}>
                                            {selected ? '✓' : '○'}
                                        </div>
                                        <div>{edu}</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 5: Skills (text input) */}
                    {step === 5 && (
                        <div>
                            <textarea
                                placeholder="Enter skills separated by commas (e.g., Gas Detector, Cloud Architecture, DevOps)"
                                value={skillsRaw}
                                onChange={e => setSkillsRaw(e.target.value)}
                                onBlur={e => setSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                style={{
                                    width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
                                }}
                            />
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '6px' }}>
                                Separate multiple skills with commas — e.g. <em>Gas Detector, HVAC Controls, BMS</em>
                            </div>
                        </div>
                    )}

                    {/* Step 6: Posted Recently */}
                    {step === 6 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* Toggle card */}
                            <div
                                onClick={() => setPostedRecently(!postedRecently)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '16px 18px', borderRadius: '12px', cursor: 'pointer',
                                    border: `2px solid ${postedRecently ? '#0b1957' : '#e5e7eb'}`,
                                    background: postedRecently ? '#e8ecfa' : '#fff',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: postedRecently ? '#0b1957' : '#111827' }}>
                                        📢 Posted on LinkedIn in last 3 months
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.4 }}>
                                        Only show leads who have been active — posted, shared, or commented recently.
                                        <br />
                                        <span style={{ color: '#f59e0b', fontWeight: 500 }}>⚠ Sales Navigator only</span> — ignored for Classic API accounts.
                                    </div>
                                </div>
                                {/* Toggle switch */}
                                <div style={{
                                    width: '44px', height: '24px', borderRadius: '12px', flexShrink: 0, marginLeft: '16px',
                                    background: postedRecently ? '#0b1957' : '#d1d5db', transition: 'background 0.2s', position: 'relative',
                                }}>
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                                        position: 'absolute', top: '3px', transition: 'left 0.2s',
                                        left: postedRecently ? '23px' : '3px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                    }} />
                                </div>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', lineHeight: 1.5 }}>
                                This filter is <strong>not saved</strong> between sessions — you must re-enable it each time you want it applied. It will not be auto-applied to campaigns or prospecting.
                            </div>
                        </div>
                    )}

                    {/* Step 7: Review */}
                    {step === 7 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {nationality.length > 0 && <div><strong>Nationalities:</strong> {nationality.join(', ')}</div>}
                            {experienceLevel.length > 0 && <div><strong>Experience Level:</strong> {experienceLevel.join(', ')}</div>}
                            {companySize.length > 0 && <div><strong>Company Size:</strong> {companySize.join(', ')}</div>}
                            {companyAge.length > 0 && <div><strong>Company Age:</strong> {companyAge.join(', ')}</div>}
                            {education.length > 0 && <div><strong>Education:</strong> {education.join(', ')}</div>}
                            {skills.length > 0 && <div><strong>Skills:</strong> {skills.join(', ')}</div>}
                            {postedRecently && <div><strong>Activity:</strong> Posted on LinkedIn in last 3 months ✅</div>}
                            {nationality.length === 0 && experienceLevel.length === 0 && companySize.length === 0 && companyAge.length === 0 && education.length === 0 && skills.length === 0 && !postedRecently && (
                                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>No additional filters selected</div>
                            )}
                        </div>
                    )}

                    {/* Skip Button - Inside the box */}
                    {step < totalSteps - 1 && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                            <button onClick={() => setStep(step + 1)}
                                style={{
                                    padding: '8px 14px', background: '#f9fafb', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', fontSize: '13px', fontWeight: 600, color: '#6b7280', cursor: 'pointer'
                                }}>
                                Skip this
                            </button>
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Step {step + 1} of {totalSteps}
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {step > 0 && (
                            <button onClick={() => setStep(step - 1)}
                                style={{
                                    padding: '10px 14px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                                    borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#374151', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                <ChevronLeft size={18} />
                            </button>
                        )}
                        {step < totalSteps - 1 && (
                            <button onClick={() => setStep(step + 1)}
                                style={{
                                    padding: '10px 14px', background: '#0b1957', color: '#fff', border: 'none',
                                    borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                <ChevronRight size={18} />
                            </button>
                        )}
                        {step === totalSteps - 1 && (
                            <button onClick={onConfirm} disabled={loading}
                                style={{
                                    padding: '8px 16px', background: loading ? '#d1d5db' : '#10b981', color: '#fff', border: 'none',
                                    borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: loading ? 'default' : 'pointer'
                                }}>
                                {loading ? 'Refining...' : 'Confirm & Refine'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}

/* ═══════════════════════════════════════════════
   AI MESSAGE CONTEXT PANEL
   Inline expandable panel for AI Generate inputs.
   Rendered directly inside the settings card — no portals,
   no fixed positioning, no z-index issues.
   ═══════════════════════════════════════════════ */
function AiMsgContextPanel({
    valueProp, setValueProp,
    tone, setTone,
    goal, setGoal,
    targeting, leadsCount,
    loading, onGenerate,
}: {
    valueProp: string; setValueProp: (v: string) => void;
    tone: string; setTone: (v: string) => void;
    goal: string; setGoal: (v: string) => void;
    targeting: any; leadsCount: number;
    loading: boolean; onGenerate: () => void;
}) {
    const tones = [
        { id: 'professional', label: '🤝 Professional' },
        { id: 'casual', label: '😊 Casual' },
        { id: 'direct', label: '⚡ Direct' },
    ];
    const goals = [
        { id: 'get_meeting', label: '📅 Book a call' },
        { id: 'share_resource', label: '📄 Share a resource' },
        { id: 'explore_collab', label: '🤝 Explore collab' },
        { id: 'general', label: '💬 Start a chat' },
    ];
    const targetingTags = [
        ...(targeting?.job_titles || []).slice(0, 2),
        ...(targeting?.industries || []).slice(0, 2),
    ].filter(Boolean);

    return (
      <div
        className="border-[1.5px] border-[#c2d6eb] dark:border-[#1e3a8a] bg-[#f8faff] dark:bg-[#060b21]"
        style={{
          marginTop: '10px',
          borderRadius: '12px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
            {/* Header */}
        <div className="text-[#0b1957] dark:text-blue-300" style={{ fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
          ✨ AI Generate — tell us about your offer
          <span className="text-[#9ca3af] dark:text-slate-300"style={{ fontWeight: 400, fontSize: '11px' }}>
              Will use lead&apos;s web presence &amp; posts
          </span>
        </div>

            {/* Value prop */}
          <div>
              <label
                className="text-[#374151] dark:text-gray-300"
                style={{ fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '4px' }}
              >
                  What do you offer? <span className="text-[#9ca3af] dark:text-gray-500" style={{ fontWeight: 400 }}>product / service / value prop</span>
              </label>
              <textarea
                value={valueProp}
                onChange={e => setValueProp(e.target.value)}
                placeholder="e.g. We help SaaS companies reduce churn with AI-powered customer success..."
                rows={2}
                className="w-full border border-[#c2d6eb] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#111827] dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-600 outline-none"
                style={{
                    width: '100%',
                    borderRadius: '8px',
                    padding: '7px 10px',
                    fontSize: '12px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box'
                }}
              />
          </div>

            {/* Tone + Goal */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                    <div className="text-[#374151] dark:text-gray-300" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>Tone</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {tones.map(t => (
                          <div
                            key={t.id}
                            onClick={() => setTone(t.id)}
                            className={`flex items-center gap-[6px] px-[8px] py-[6px] border-[1.5px] rounded-[7px] cursor-pointer text-[12px] transition-colors
                                ${tone === t.id
                                          ? 'border-[#0b1957] dark:border-blue-400 bg-[#e8ecfa] dark:bg-blue-900/40 text-[#0b1957] dark:text-blue-100 font-semibold'
                                          : 'border-[#e5e7eb] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#374151] dark:text-gray-400 font-normal'
                                        }
                            `}
                                >
                              {tone === t.id && (
                                <span
                                  className="w-[6px] h-[6px] rounded-full bg-[#0b1957] dark:bg-blue-400 flex-shrink-0"
                                />
                              )}
                              {t.label}
                          </div>
                        ))}
                    </div>
                </div>
                <div>
                    <div className="text-[#374151] dark:text-gray-300" style={{ fontSize: '11px', fontWeight: 600, marginBottom: '5px' }}>Goal</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {goals.map(g => (
                          <div
                            key={g.id}
                            onClick={() => setGoal(g.id)}
                            className={`flex items-center gap-[6px] px-[8px] py-[6px] border-[1.5px] rounded-[7px] cursor-pointer text-[12px] transition-colors
                            ${goal === g.id
                                      ? 'border-[#0b1957] dark:border-blue-400 bg-[#e8ecfa] dark:bg-blue-900/40 text-[#0b1957] dark:text-blue-100 font-semibold'
                                      : 'border-[#e5e7eb] dark:border-[#1e3a8a] bg-white dark:bg-[#060b21] text-[#374151] dark:text-gray-400 font-normal'
                                    }
                        `}
                            >
                              {goal === g.id && (
                                <span
                                  className="w-[6px] h-[6px] rounded-full bg-[#0b1957] dark:bg-blue-400 flex-shrink-0"
                                />
                              )}
                              {g.label}
                          </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Targeting badge */}
            {targetingTags.length > 0 && (
              <div
                className="bg-[#e8ecfa] dark:bg-blue-900/40 border border-[#c2d6eb] dark:border-blue-700 text-[#0b1957] dark:text-blue-100"
                style={{
                    borderRadius: '7px',
                    padding: '6px 10px',
                    fontSize: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '4px'
                }}
              >
                  <span style={{ fontWeight: 700 }}>🎯</span>
                  {targetingTags.join(' · ')}
                  {leadsCount > 0 && (
                    <span
                      className="text-[#0b1957] dark:text-blue-200"
                      style={{ marginLeft: '4px' }}
                    >
                    · {leadsCount} lead{leadsCount !== 1 ? 's' : ''} with live web insights
                </span>
                  )}
              </div>
            )}

            {/* Generate button */}
          <button
            onClick={onGenerate}
            disabled={loading}
            className={`rounded-[9px] text-white transition-all
                ${loading
                      ? 'bg-[#9ca3af] dark:bg-gray-700'
                      : 'bg-gradient-to-br from-[#0b1957] to-[#1a3a8f] dark:from-[#1e3a8a] dark:to-[#3b82f6] shadow-[0_3px_10px_rgba(11,25,87,.35)] dark:shadow-none'
                    }
            `}
            style={{
                border: 'none',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                boxShadow: loading ? 'none' : '0 3px 10px rgba(11,25,87,.35)'
            }}
          >
              {loading ? '⏳ Generating...' : '✨ Generate Message'}
          </button>
        </div>
    );
}

function TagRow({ label, items }: { label: string; items: string[] }) {
    const safe = Array.isArray(items) ? items : [];
    return (
        <div className="adv-tag-row">
            <span className="adv-tag-label">{label}:</span>
            {safe.map((t, i) => <span key={i} className="adv-tag">{String(t)}</span>)}
        </div>
    );
}

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */
function buildSummary(t: LeadTargeting): string {
    const p: string[] = ['✨ **Here\'s what I found from your request:**\n'];
    if (t.job_titles.length) p.push(`🎯 **Job Titles:** ${t.job_titles.join(', ')}`);
    if (t.industries.length) p.push(`🏢 **Industries:** ${t.industries.join(', ')}`);
    if (t.locations.length) p.push(`📍 **Locations:** ${t.locations.join(', ')}`);
    if (t.nationality_filter?.length) p.push(`🌍 **Nationality Filter:** ${t.nationality_filter.join(', ')} (results filtered by inferred nationality)`);
    if (t.keywords.length) p.push(`🔑 **Keywords:** ${t.keywords.join(', ')}`);
    if (t.functions?.length) p.push(`⚙️ **Functions:** ${t.functions.join(', ')}`);
    if (t.seniority?.length) p.push(`⭐ **Seniority:** ${t.seniority.join(', ')}`);
    if (t.company_headcount?.length) p.push(`👥 **Company Size:** ${t.company_headcount.join(', ')}`);
    if (t.company_names?.length) p.push(`🏢 **Company:** ${t.company_names.join(', ')}`);
    p.push('\n✅ Your leads are shown in the panel. You can refine or start connecting.');
    return p.join('\n');
}

/**
 * Builds a structured search-preview message so the user can confirm or correct
 * the parsed intent before the actual LinkedIn search runs.
 */
function buildConfirmationMessage(intent: LeadTargeting, _originalQuery: string): string {
    const p: string[] = ['🤔 **Here\'s what I understood from your request:**\n'];
    if (intent.keywords?.length) p.push(`👤 **Person / Keywords:** ${intent.keywords.join(', ')}`);
    if (intent.job_titles?.length) p.push(`🎯 **Job Titles:** ${intent.job_titles.join(', ')}`);
    if (intent.company_names?.length) p.push(`🏢 **Company:** ${intent.company_names.join(', ')}`);
    if (intent.locations?.length) p.push(`📍 **Location:** ${intent.locations.join(', ')}`);
    if (intent.industries?.length) p.push(`🏭 **Industries:** ${intent.industries.join(', ')}`);
    if (intent.nationality_filter?.length) p.push(`🌍 **Nationality Filter:** ${intent.nationality_filter.join(', ')}`);
    if (intent.seniority?.length) p.push(`⭐ **Seniority:** ${intent.seniority.join(', ')}`);
    if (intent.functions?.length) p.push(`⚙️ **Functions:** ${intent.functions.join(', ')}`);

    // Warn when only a first name is detected alongside a company — single-word names
    // give poor results because Apollo/Unipile can't uniquely identify the person.
    const isFirstNameOnly =
        intent.keywords?.length === 1 &&
        !intent.keywords[0].includes(' ') &&
        (intent.company_names?.length ?? 0) > 0 &&
        !intent.job_titles?.length;
    if (isFirstNameOnly) {
        p.push(`\n⚠️ **Tip:** Only a first name was detected ("${intent.keywords![0]}"). Providing the **full name** (e.g. "${intent.keywords![0]} LastName") will significantly improve results when searching for a specific person.`);
    }

    p.push('\n**Does this look right?** Tap ✅ to search, or tell me what to change.');
    return p.join('\n');
}

/* ── MODULE-LEVEL HELPER COMPONENTS TO PREVENT FLICKERING ── */
function ThinkingIndicator({ generating }: { generating: boolean }) {
    const [index, setIndex] = React.useState(0);
    const steps = generating
        ? [
            "Waking up Mr. LADs...",
            "Analyzing your visual prompt...",
            "Generating unique design concepts...",
            "Finalizing visual assets...",
        ]
        : [
            "Waking up Mr. LADs...",
            "Aligning your media workspace...",
            "Loading design references...",
        ];

    React.useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % steps.length);
        }, 2500);
        return () => clearInterval(timer);
    }, [steps.length]);

    return (
        <div className="flex flex-col items-center space-y-4 my-6">
            <div className="relative size-20 flex items-center justify-center">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-[#0b1957]/10 rounded-full"
                />
                <motion.div
                    animate={{
                        rotate: 360,
                    }}
                    transition={{
                        duration: 10,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="size-14 border-2 border-dashed border-[#0b1957]/20 rounded-full flex items-center justify-center"
                >
                    <Sparkles className="size-6 text-[#0b1957] animate-pulse" />
                </motion.div>
            </div>
            <div className="h-6 flex items-center justify-center overflow-hidden">
                <AnimatePresence mode="wait">
                    <motion.p
                        key={index}
                        initial={{ y: 15, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -15, opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="text-xs font-semibold text-[#0b1957]/70"
                    >
                        {steps[index]}
                    </motion.p>
                </AnimatePresence>
            </div>
        </div>
    );
}

function AgentBuilderTrendOptions({
    title,
    description,
    options,
    onNext,
    generating,
    isActive = true,
    selectionText
}: {
    title?: string;
    description?: string;
    options: any[];
    onNext?: (selected: string[]) => void;
    generating?: boolean;
    isActive?: boolean;
    selectionText?: string;
}) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

    // Automatically parse selectionText and populate selectedIds when rendering history
    useEffect(() => {
        if (!isActive && selectionText) {
            const selectedTitles = selectionText.split(" | ").map(s => s.trim());
            const matchedIds: string[] = [];
            options.forEach(opt => {
                const text = opt.label || opt.text || "";
                const firstLine = (text.split("\n")[0] || "").trim();
                if (selectedTitles.includes(firstLine) || selectedTitles.includes(opt.title)) {
                    matchedIds.push(opt.id);
                }
            });
            setSelectedIds(matchedIds);
        }
    }, [isActive, selectionText, options]);

    const toggleSelect = (id: string, isSkip: boolean) => {
        if (!isActive) return; // Completely lock selections in history

        if (isSkip) {
            if (onNext) onNext(["Start Directly (Skip Trends)"]);
            return;
        }

        setSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const toggleSection = (optId: string, sectionTitle: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const key = `${optId}-${sectionTitle}`;
        setExpandedSections(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const parseSections = (markdownText: string) => {
        const lines = markdownText.split("\n");
        const optTitle = lines[0]?.trim() || "Option";
        
        const remainingText = lines.slice(1).join("\n").trim();
        const parts = remainingText.split(/(?=### )/);
        const sections: { title: string; content: string }[] = [];
        parts.forEach(part => {
            const trimmed = part.trim();
            if (!trimmed) return;
            if (trimmed.startsWith("### ")) {
                const partLines = trimmed.split("\n");
                const titleLine = partLines[0];
                const secTitle = titleLine.replace("### ", "").trim();
                const content = partLines.slice(1).join("\n").trim();
                sections.push({ title: secTitle, content });
            } else {
                sections.push({ title: "", content: trimmed });
            }
        });
        return { title: optTitle, sections };
    };

    const skipOption = options.find(o => {
        const text = o.label || o.text || "";
        const firstLine = text.split("\n")[0]?.toLowerCase() || "";
        return firstLine.includes("skip") || firstLine.includes("start directly");
    });
    const mainOptions = options.filter(o => o !== skipOption);

    const handleSubmit = () => {
        if (onNext && selectedIds.length > 0) {
            const selectedOptions = options.filter(o => selectedIds.includes(o.id));
            const selectedTitles = selectedOptions.map(o => {
                const text = o.label || o.text || "";
                return (text.split("\n")[0] || "").trim();
            });
            onNext(selectedTitles);
        }
    };

    return (
        <div className="w-full max-w-[620px] bg-slate-50/50 border border-slate-200/60 rounded-3xl p-5 shadow-sm mt-3 flex flex-col gap-4">
            <div className="flex flex-wrap gap-2.5 items-start justify-start w-full">
                {mainOptions.map((opt) => {
                    const isSelected = selectedIds.includes(opt.id);
                    const text = opt.label || opt.text || "";
                    const { title: optTitle, sections } = parseSections(text);
                    
                    if (!isSelected) {
                        return (
                            <button
                                key={opt.id}
                                onClick={() => toggleSelect(opt.id, false)}
                                disabled={!isActive}
                                className={`bg-white border border-slate-200 max-w-[240px] truncate max-h-[36px] text-left rounded-2xl px-4 py-2.5 text-xs font-semibold text-[#0b1957] transition-all duration-300 ease-in-out shadow-sm ${
                                    isActive 
                                        ? "hover:border-[#0b1957]/50 hover:-translate-y-[1px] cursor-pointer" 
                                        : "cursor-default opacity-50"
                                }`}
                                title={optTitle}
                            >
                                <span className="font-bold truncate text-[12px]">{optTitle}</span>
                            </button>
                        );
                    }

                    return (
                        <div 
                            key={opt.id} 
                            className={`bg-white border border-[#0b1957] bg-blue-50/20 w-full rounded-2xl p-4 shadow-sm text-left flex flex-col gap-3 ${
                                !isActive ? "opacity-85" : ""
                            }`}
                        >
                            <div 
                                onClick={() => toggleSelect(opt.id, false)}
                                className={`flex items-center justify-between gap-2 border-b border-slate-100/80 pb-2.5 ${
                                    isActive ? "cursor-pointer hover:opacity-80" : "cursor-default"
                                } transition-opacity`}
                                title={isActive ? "Click to deselect" : undefined}
                            >
                                <span className="font-bold text-[12px] text-[#0b1957]">{optTitle}</span>
                                <span className="text-[10px] bg-[#0b1957] text-white px-2.5 py-0.5 rounded-full select-none flex items-center gap-1 font-bold">
                                    <Check className="size-2.5" /> Selected
                                </span>
                            </div>

                            <div className="flex flex-col gap-3 w-full">
                                {sections.map((sec, idx) => {
                                    const isThemeHook = sec.title.toLowerCase().includes("theme") || sec.title.toLowerCase().includes("hook") || !sec.title;
                                    const secKey = `${opt.id}-${sec.title}`;
                                    const isSecExpanded = expandedSections[secKey] || false;

                                    if (isThemeHook) {
                                        return (
                                            <div key={idx} className="flex flex-col gap-1 w-full text-xs text-slate-700">
                                                {sec.title && <h4 className="text-[11px] font-bold text-[#0b1957]">{sec.title}</h4>}
                                                <div className="text-[11px] text-slate-600 leading-relaxed font-medium markdown-content">
                                                    <ReactMarkdown
                                                        components={{
                                                            h3: ({ ...props }) => <h3 className="text-xs font-bold text-[#0b1957] mt-2 mb-1" {...props} />,
                                                            p: ({ ...props }) => <p className="text-[11px] text-slate-600 leading-relaxed mb-2" {...props} />,
                                                            ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                            li: ({ ...props }) => <li className="text-[11px] text-slate-600 leading-relaxed" {...props} />,
                                                        }}
                                                    >
                                                        {sec.content}
                                                    </ReactMarkdown>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={idx} className="w-full border-t border-slate-100/60 pt-2 flex flex-col gap-1.5">
                                            <div 
                                                onClick={(e) => toggleSection(opt.id, sec.title, e)}
                                                className="flex items-center gap-1.5 cursor-pointer text-[#0b1957] hover:text-[#0b1957]/80 select-none w-fit"
                                            >
                                                <motion.span 
                                                    animate={{ rotate: isSecExpanded ? 90 : 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    className="flex items-center"
                                                >
                                                    <ChevronRight className="size-3 text-[#0b1957]/70" />
                                                </motion.span>
                                                <span className="text-[11px] font-bold tracking-wide">{sec.title}</span>
                                            </div>
                                            <AnimatePresence initial={false}>
                                                {isSecExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                        className="overflow-hidden w-full text-[11px] text-slate-600 leading-relaxed font-medium pl-4 markdown-content"
                                                    >
                                                        <ReactMarkdown
                                                            components={{
                                                                h3: ({ ...props }) => <h3 className="text-xs font-bold text-[#0b1957] mt-2 mb-1" {...props} />,
                                                                p: ({ ...props }) => <p className="text-[11px] text-slate-600 leading-relaxed mb-2" {...props} />,
                                                                ul: ({ ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                                                                li: ({ ...props }) => <li className="text-[11px] text-slate-600 leading-relaxed" {...props} />,
                                                            }}
                                                        >
                                                            {sec.content}
                                                        </ReactMarkdown>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 border-t border-slate-100 pt-4 mt-1">
                {onNext && (
                    <button
                        onClick={handleSubmit}
                        disabled={selectedIds.length === 0 || generating}
                        className="w-full sm:w-auto px-6 bg-[#0b1957] text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none cursor-pointer flex items-center justify-center gap-2"
                    >
                        {generating && <Loader2 className="size-3.5 animate-spin" />}
                        Proceed with {selectedIds.length} Selection{selectedIds.length > 1 ? 's' : ''}
                    </button>
                )}

                {onNext && (
                    <button
                        onClick={() => onNext(["Generate More"])}
                        disabled={generating}
                        className="w-full sm:w-auto text-center border border-slate-200 hover:border-slate-300 rounded-xl px-5 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <RefreshCw className="size-3" /> Generate More
                    </button>
                )}
                {skipOption && onNext && (
                    <button
                        onClick={() => toggleSelect(skipOption.id, true)}
                        className="w-full sm:w-auto text-center border border-dashed border-slate-300 hover:border-slate-400 rounded-xl px-5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                        {(skipOption.label || skipOption.text || "").split("\n")[0] || "Start Directly (Skip Trends)"}
                    </button>
                )}
            </div>
        </div>
    );
}

function MediaStepWidget({ 
    msg, 
    isActive, 
    mb, 
    submitMediaInput,
    userSelectionText
}: { 
    msg: any; 
    isActive: boolean; 
    mb: any; 
    submitMediaInput: (text: string, valueToSend?: string | string[]) => void; 
    userSelectionText?: string;
}) {
    switch (msg.step) {
        case "builder-image-output":
            return (
                <AgentBuilderImageOutput
                    title={msg.payload?.question}
                    description={msg.payload?.description}
                    images={isActive ? mb.uiPayload?.images || [] : msg.payload?.images || []}
                    video={msg.payload?.video}
                    onNext={isActive ? (val) => {
                        if (val && val.startsWith("[ANIMATE_IMAGE]")) {
                            const indexMatch = val.match(/index=(\d+)/);
                            const imgIdx = indexMatch ? parseInt(indexMatch[1]) : 0;
                            const imagesList = mb.uiPayload?.images || [];
                            const imageUrl = imagesList[imgIdx];
                            const customRefs = imageUrl ? [{ path: imageUrl, thumbnail: imageUrl }] : undefined;
                            submitMediaInput("Animate this concept", val, customRefs);
                        } else {
                            submitMediaInput("Proceed with layout", val);
                        }
                    } : undefined}
                    phase={msg.payload?.phase}
                    generating={isActive ? mb.generating : false}
                    references={isActive ? mb.references : []}
                    onUpload={isActive ? mb.uploadReference : undefined}
                    onRemove={isActive ? mb.removeReference : undefined}
                    isUploading={isActive ? mb.isUploading : false}
                    error={isActive ? mb.error : ""}
                    onBack={isActive ? () => mb.undoStep() : undefined}
                    hideHeader={true}
                />
            );
        case "builder-video-confirm": {
            const imgUrl = isActive ? mb.uiPayload?.images?.[0] : msg.payload?.images?.[0];
            if (!imgUrl) return null;
            return (
                <div className="mt-2 flex justify-start">
                    <div className="relative group overflow-hidden rounded-xl border border-slate-200/60 shadow-sm w-48 aspect-video">
                        <img 
                            src={imgUrl} 
                            alt="Selected Concept Frame" 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm text-[9px] font-bold text-white px-2 py-0.5 rounded-full select-none">
                            FRAME
                        </div>
                    </div>
                </div>
            );
        }
        case "builder-video-output":
            return (
                <div className="mt-2 flex justify-start w-full">
                    <AgentBuilderVideoOutput
                        title={isActive ? mb.uiPayload?.question : msg.payload?.question}
                        description={isActive ? mb.uiPayload?.description : msg.payload?.description}
                        videoUrl={isActive ? mb.uiPayload?.video : msg.payload?.video}
                        phase={isActive ? mb.uiPayload?.phase : msg.payload?.phase}
                        onNext={undefined}
                        onBack={undefined}
                        hideHeader={true}
                        hideFooter={true}
                    />
                </div>
            );
        case "builder-video-progress":
            if (isActive) return null;
            return (
                <div className="mt-2 w-[448px] max-w-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md">
                    <AgentBuilderVideoProgress
                        title={isActive ? mb.uiPayload?.question : msg.payload?.question}
                        description={isActive ? mb.uiPayload?.description : msg.payload?.description}
                        blocks={isActive ? mb.uiPayload?.blocks || [] : msg.payload?.blocks || []}
                        phase={isActive ? mb.uiPayload?.phase : msg.payload?.phase}
                        videoUrl={isActive ? mb.uiPayload?.video : msg.payload?.video}
                        status={isActive ? mb.uiPayload?.status || "active" : "completed"}
                        progress={isActive ? mb.uiPayload?.progress : 100}
                        onBack={undefined}
                        onNext={undefined}
                    />
                </div>
            );
        case "builder-brand-dna":
            if (isActive) return null;
            return (
                <div className="mt-4 max-w-full w-[448px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md">
                    <AgentBuilderBrandDNA
                        brandDna={msg.payload?.brand_dna}
                        onNext={() => {}}
                        phase={msg.payload?.phase}
                        onBack={undefined}
                        hideButtons={true}
                    />
                </div>
            );
        case "builder-trend-options":
            return (
                <AgentBuilderTrendOptions
                    title={isActive ? mb.uiPayload?.title || mb.uiPayload?.question : msg.payload?.title || msg.payload?.question}
                    description={isActive ? mb.uiPayload?.description : msg.payload?.description}
                    options={isActive ? mb.uiPayload?.options || [] : msg.payload?.options || []}
                    onNext={isActive ? (selectedLabels) => {
                        submitMediaInput(selectedLabels.join(" | "), selectedLabels.join(" | "));
                    } : undefined}
                    generating={isActive ? mb.generating : false}
                    isActive={isActive}
                    selectionText={userSelectionText}
                />
            );
        case "gallery":
            return (
                <div className="mt-4 max-w-full w-[700px] bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-md h-[550px]">
                    <AgentBuilderGallery
                        images={isActive ? mb.galleryImages : msg.payload?.images || []}
                        videos={isActive ? mb.galleryVideos : msg.payload?.videos || []}
                        loading={isActive ? mb.loadingGallery : false}
                        onBack={() => mb.setStep("welcome")}
                        onGenerateImages={isActive ? mb.generateImagesFromGallery : undefined}
                        onAnimateImage={isActive ? async (url) => {
                            setMediaMessages(prev => [
                                ...prev.filter(m => !m.loading),
                                {
                                    id: `user-${Date.now()}`,
                                    role: "user",
                                    text: "Animate this concept",
                                    references: [{ path: url, thumbnail: url }],
                                    timestamp: new Date()
                                }
                            ]);
                            await mb.animateImageFromGallery(url);
                        } : undefined}
                        onExtendVideo={isActive ? mb.extendVideoFromGallery : undefined}
                        onAddDialogues={isActive ? mb.addDialoguesFromGallery : undefined}
                        onDeleteAssets={isActive ? mb.deleteAssets : undefined}
                        isFullHistory={isActive ? mb.isGalleryFullHistory : false}
                        onLoadFullHistory={isActive ? () => mb.fetchGallery(true) : undefined}
                    />
                </div>
            );
        default:
            return null;
    }
}

function SessionSelector({ mb }: { mb: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { fetchPastSessions } = mb;

    useEffect(() => {
        if (isOpen) {
            fetchPastSessions();
        }
    }, [isOpen, fetchPastSessions]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="adv-media-header-exit cursor-pointer"
                style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
                <History className="size-4" />
                Saved Sessions
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '8px',
                    width: '320px',
                    maxHeight: '400px',
                    background: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    overflowY: 'auto',
                    padding: '8px 0'
                }}>
                    <div style={{ padding: '8px 16px', borderBottom: '1px solid #f3f4f6', fontWeight: 'bold', fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Saved Sessions
                    </div>
                    {mb.loadingSessions ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                            Loading sessions...
                        </div>
                    ) : mb.pastSessions?.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                            No saved sessions found.
                        </div>
                    ) : (
                        mb.pastSessions.map((s: any) => {
                            const isCurrent = s.session_id === mb.sessionId;
                            return (
                                <button
                                    key={s.session_id}
                                    onClick={() => {
                                        mb.loadSession(s.session_id);
                                        setIsOpen(false);
                                    }}
                                    style={{
                                        width: '100%',
                                        padding: '10px 16px',
                                        textAlign: 'left',
                                        background: isCurrent ? '#f1f5f9' : 'transparent',
                                        border: 'none',
                                        display: 'block',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    className="hover:bg-slate-50"
                                >
                                    <div style={{ fontWeight: 'bold', fontSize: '13px', color: isCurrent ? '#0f172a' : '#334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{s.title}</span>
                                        {isCurrent && <span style={{ fontSize: '10px', background: '#3b82f6', color: '#fff', padding: '1px 5px', borderRadius: '4px' }}>Active</span>}
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {s.description || 'No description available.'}
                                    </div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>
                                        {s.updated_at ? new Date(s.updated_at).toLocaleString() : 'Date unknown'}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}

function MediaBubble({ 
    msg, 
    isActive, 
    isLastUser,
    handleMediaBack,
    mb, 
    submitMediaInput,
    userSelectionText
}: { 
    msg: any; 
    isActive: boolean; 
    isLastUser?: boolean;
    handleMediaBack?: () => void;
    mb: any; 
    submitMediaInput: (text: string, valueToSend?: string | string[]) => void; 
    userSelectionText?: string;
}) {
    if (msg.role === 'user') return (
        <div className="adv-bubble adv-bubble-user fadeUp" style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            {isLastUser && handleMediaBack && (
                <button
                    onClick={handleMediaBack}
                    title="Undo last message / Revert"
                    className="adv-bubble-undo-btn"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        order: 0,
                        marginRight: '4px',
                        transition: 'all 0.15s',
                        alignSelf: 'center',
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>
                </button>
            )}
            <div className="adv-user-msg" style={{ margin: 0, order: 1 }}>
                <div>{msg.text}</div>
                {msg.references && msg.references.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', justifyContent: 'flex-end' }}>
                        {msg.references.map((ref: any, idx: number) => (
                            <img 
                                key={idx} 
                                src={ref.thumbnail} 
                                alt={ref.filename} 
                                style={{ width: '64px', height: '64px', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} 
                            />
                        ))}
                    </div>
                )}
            </div>
            <div style={{ order: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', borderRadius: '50%', backgroundColor: '#172560', color: 'white', fontSize: '13px', fontWeight: 'bold', flexShrink: 0 }}>
                M
            </div>
        </div>
    );

    const renderInline = (raw: string) => {
        const tokens = raw.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
        return tokens.map((t, j) => {
            if (t.startsWith('**') && t.endsWith('**')) return <strong key={j}>{t.slice(2, -2)}</strong>;
            if (t.startsWith('*') && t.endsWith('*')) return <em key={j} className="adv-ai-em">{t.slice(1, -1)}</em>;
            if (t.startsWith('`') && t.endsWith('`')) return <code key={j} style={{ background: '#f3f4f6', padding: '1px 5px', borderRadius: '4px', fontSize: '13px', fontFamily: 'monospace', color: '#0b1957' }}>{t.slice(1, -1)}</code>;
            return t;
        });
    };

    const renderMarkdownLines = (raw: string) => {
        return raw.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} style={{ height: '6px' }} />;
            
            // Check for lists
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                    <li key={i} className="ml-4 list-disc" style={{ margin: '3.5px 0' }}>
                        {renderInline(trimmed.substring(2))}
                    </li>
                );
            }
            if (trimmed.startsWith('### ')) return <div key={i} className="adv-ai-h3">{renderInline(trimmed.slice(4))}</div>;
            if (trimmed.startsWith('## ')) return <div key={i} className="adv-ai-h3" style={{ fontSize: '14.5px' }}>{renderInline(trimmed.slice(3))}</div>;
            return <p key={i} style={{ margin: '3.5px 0' }}>{renderInline(trimmed)}</p>;
        });
    };

    return (
        <div className="adv-bubble adv-bubble-ai fadeUp" style={{ maxWidth: '80%' }}>
            <div className="adv-ai-avatar adv-ai-avatar-viz">
                <AgentVisualizer state={msg.loading ? "thinking" : "idle"} size={36} />
            </div>
            <div className="adv-ai-body" style={{ width: '100%', minWidth: 0 }}>
                <div className="adv-ai-name">
                    LAD in Action
                    <span className="adv-ai-name-dot" />
                </div>

                {msg.loading ? (
                    <div className="mt-2 text-left">
                        <ThinkingIndicator generating={mb.generating} />
                    </div>
                ) : (
                    <div className="w-full text-left">
                        {/* Title and Description */}
                        {msg.step === "builder-video-progress" ? (
                            <div className="adv-ai-text">
                                <p style={{ margin: '3px 0' }}>Please wait for completion...</p>
                            </div>
                        ) : msg.step === "builder-video-confirm" ? (
                            <div className="adv-ai-text">
                                <div className="adv-ai-h3" style={{ fontSize: '11px', color: '#0b1957', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                    Prompt for Animation
                                </div>
                                <p style={{ margin: '4px 0', fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
                                    {renderInline(isActive ? mb.uiPayload?.description || "" : msg.payload?.description || "")}
                                </p>
                            </div>
                        ) : (
                            <>
                                {msg.text && (
                                    <div className="adv-ai-text">
                                        {renderMarkdownLines(msg.text)}
                                    </div>
                                )}
                                {msg.description && (
                                    <div className="text-sm text-slate-500 mt-2 leading-relaxed">
                                        {renderMarkdownLines(msg.description)}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Visual widget/output if applicable */}
                        <MediaStepWidget msg={msg} isActive={isActive} mb={mb} submitMediaInput={submitMediaInput} userSelectionText={userSelectionText} />
                    </div>
                )}
            </div>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════ */
const css = `
            /* ── RESET ── */
            .adv-landing, .adv-chat-root {font-family: 'Inter', system-ui, -apple-system, sans-serif; }
            * {box-sizing: border-box; }

            /* ── ANIMATIONS ── */
            @keyframes fadeUp {from {opacity:0; transform:translateY(14px); } to {opacity:1; transform:translateY(0); } }
            @keyframes slideIn {from {opacity:0; transform:translateX(50px); } to {opacity:1; transform:translateX(0); } }
            @keyframes slideInRight {from {opacity:0; transform:translateX(100%); } to {opacity:1; transform:translateX(0); } }
            @keyframes spin {to {transform: rotate(360deg); } }
            @keyframes pulse {0 %, 100 % { opacity: .4 } 50% {opacity:1 } }
            @keyframes recPulse {
                0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .recording-pulse {
                animation: recPulse 1.5s infinite;
            }
            .fadeUp {animation: fadeUp .35s ease both; }

            /* ── LANDING ── */
            .adv-landing {height:100vh; display:flex; flex-direction:column; background:linear-gradient(180deg,#f5f8fc 0%,#f2f6fa 30%,#eef4fa 60%,#c2d6eb 100%); overflow:hidden; position:relative; }
            .adv-topbar {padding:16px 28px; position:relative; z-index:2; display:flex; align-items:center; }
            .adv-back {width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-back:hover {background:#f3f4f6; }

            .adv-act-btn-refine {
                display: flex; align-items: center; justify-content: center; flex: 1; gap: 8px;
                padding: 12px 24px; border: 1.5px solid #e5e7eb;
                background: #fff;
                color: #374151; border-radius: 12px;
                font-size: 14px; font-weight: 700; cursor: pointer;
                box-shadow: none;
                transition: all 0.2s;
            }
            .adv-act-btn-refine:hover { background: #f0f4ff; border-color: #0b1957; color: #0b1957; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(11, 25, 87, 0.15); }
            .adv-act-btn-refine:active { transform: translateY(0); }

            .adv-act-btn-journey {
                display: flex; align-items: center; justify-content: center; flex: 1; gap: 8px;
                padding: 12px 24px; border: none;
                background: #172560;
                color: #fff; border-radius: 12px;
                font-size: 14px; font-weight: 700; cursor: pointer;
                box-shadow: 0 4px 12px rgba(23, 37, 96, 0.35);
                transition: all 0.2s;
            }
            .adv-act-btn-journey:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(23, 37, 96, 0.45); }
            .adv-act-btn-journey:active { transform: translateY(0); }
            .adv-center {flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 24px 60px; z-index:2; position:relative; }
            .adv-asterisk-wrap {width:90px; height:90px; border-radius:50%; background:#fff; border:1.5px solid #e0eaf5; display:flex; align-items:center; justify-content:center; margin-bottom:24px; box-shadow:0 4px 16px rgba(23,37,96,.10); animation:fadeUp .4s ease both; overflow:hidden; }
            .adv-lad-logo {width:80px; height:auto; display:block; }
            .adv-title {font-size:34px; font-weight:800; font-family:'Space Grotesk', system-ui, sans-serif; color:#111827; text-align:center; margin-bottom:28px; letter-spacing:-.03em; line-height:1.2; animation:fadeUp .4s ease .08s both; }
            .adv-title span {color:#0b1957; }
            /* ── INPUT BOX ── */
            .adv-input-outer {width:100%; max-width:680px; background:#fff; border:1.5px solid #e5e7eb; border-radius:22px; padding:18px 20px 14px; box-shadow:0 8px 32px rgba(0,0,0,.08); animation:fadeUp .4s ease .16s both; cursor:text; transition:border .2s, box-shadow .2s; }
            .adv-input-outer:focus-within {border-color:#0b1957; box-shadow:0 8px 32px rgba(11,25,87,.14); }
            .adv-ta {width:100%; border:none; outline:none; resize:none; font-size:16px; color:#111827; font-family:inherit; line-height:1.6; background:transparent; min-height:72px; }
            .adv-ta::placeholder {color:#9ca3af; }
            .adv-websearch-badge {display:inline-flex; align-items:center; gap:5px; background:#dbeafe; border:1px solid #bfdbfe; border-radius:20px; padding:3px 10px; font-size:12px; color:#1d4ed8; margin-bottom:8px; }
            .adv-input-foot {display:flex; align-items:center; justify-content:space-between; margin-top:8px; padding-top:10px; border-top:1px solid #f3f4f6; }
            /* ── ATTACH BUTTON ── */
            .adv-attach-btn {width:36px; height:36px; border-radius:50%; border:1.5px solid #e5e7eb; background:#f9fafb; color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .adv-attach-btn:hover {background:#e0eaf5; border-color:#c2d6eb; color:#0b1957; }
            /* ── ATTACH DROPDOWN MENU ── */
            .adv-attach-menu {position:absolute; bottom:calc(100% + 10px); left:0; background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:8px; min-width:260px; box-shadow:0 12px 40px rgba(0,0,0,.14); z-index:100; animation:fadeUp .15s ease both; }
            .adv-attach-item {display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:10px; cursor:pointer; transition:background .12s; }
            .adv-attach-item:hover {background:#f3f4f6; }
            .adv-attach-active {background:#eff6ff; }
            .adv-attach-icon {width:34px; height:34px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
            .adv-attach-label {font-size:13.5px; font-weight:600; color:#111827; margin-bottom:1px; }
            .adv-attach-sub {font-size:11.5px; color:#6b7280; }
            .adv-attach-divider {height:1px; background:#f3f4f6; margin:4px 0; }
            /* ── SEND BUTTON ── */
            .adv-send-circle {width:40px; height:40px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; cursor:pointer; }
            .adv-send-circle:disabled {cursor:default; }
            /* ── SUGGESTION CHIPS ── */
            .adv-chips-stack {display:flex; flex-direction:column; align-items:center; width:100%; }
            .adv-chips-row {display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:20px; max-width:680px; animation:fadeUp .4s ease .24s both; }
            .adv-chips-row-2 {margin-top:10px; animation-delay:.3s; }
            .adv-chip {display:flex; align-items:center; gap:6px; border:1px solid #c2d6eb; border-radius:22px; padding:8px 16px; font-size:13px; font-weight:500; color:#0b1957; background:rgba(255,255,255,.75); cursor:pointer; transition:all .15s; }
            .adv-chip:hover {background:#e0eaf5; border-color:#0b1957; }
            /* ── RECENT SEARCHES ── */
            .adv-recent-wrap {margin-top:24px; max-width:680px; width:100%; animation:fadeUp .4s ease .32s both; }
            .adv-recent-label {font-size:12px; font-weight:600; color:#9ca3af; margin-bottom:8px; padding-left:4px; text-transform:uppercase; letter-spacing:.06em; }
            .adv-recent-list {display:flex; flex-direction:column; gap:4px; }
            .adv-recent-item {display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; text-align:left; font-size:13.5px; color:#374151; font-weight:500; transition:all .15s; width:100%; }
            .adv-recent-item:hover {background:#f2f6fa; border-color:#0b1957; color:#111827; }
            .adv-recent-item span {flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

            /* ── CHAT SCREEN ── */
            .adv-chat-root {height:100vh; display:flex; flex-direction:column; background:#fff; position: relative; }
            .adv-yellow-bar {height:4px; background:linear-gradient(90deg,#0b1957,#1a3a8f,#2563eb); flex-shrink:0; }
            .adv-chat-main {flex:1; display:flex; overflow:hidden; }
            .adv-chat-back {position:absolute; top:16px; left:20px; z-index:10; width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-chat-back:hover {background:#f3f4f6; }
            .adv-chat-msgs {flex:1; overflow-y:auto; padding:72px 0 8px; display:flex; flex-direction:column; }
            .adv-msgs-inner {max-width:80%; margin:0 auto; padding:0 10px; width:100%; }
            .adv-msgs-inner + .adv-msgs-inner {padding-top:8px; }
            /* ── BUBBLES ── */
            .adv-bubble {padding:6px 0; }
            .adv-bubble-user {display:flex; justify-content:flex-end; margin-bottom:4px; }
            .adv-user-msg {background:#0b1957; color:#fff; border-radius:20px 20px 4px 20px; padding:12px 18px; max-width:72%; font-size:14.5px; line-height:1.65; box-shadow:0 2px 14px rgba(11,25,87,.2); font-weight:450; }
            /* ── Accelerators wizard: highlighted question ───────────────────
               Same #0b1957 navy as .adv-user-msg so the question reads as the
               other half of the conversation, with a pulsing "?" badge. */
            .adv-role-q {display:flex; align-items:flex-start; gap:10px; background:#0b1957; color:#fff; border-radius:14px; padding:12px 14px; margin-top:2px; box-shadow:0 2px 14px rgba(11,25,87,.2); font-size:13.5px; line-height:1.6; font-weight:450; }
            .adv-role-q-text {min-width:0; flex:1; }
            .adv-role-q-strong {font-weight:700; color:#fff; }
            .adv-role-q-mark {flex-shrink:0; width:22px; height:22px; border-radius:50%; background:rgba(255,255,255,.16); color:#fff; font-size:13px; font-weight:800; line-height:22px; text-align:center; margin-top:1px; animation:advRoleQPulse 1.8s ease-in-out infinite; }
            @keyframes advRoleQPulse {
                0%, 100% {transform:scale(1); box-shadow:0 0 0 0 rgba(255,255,255,.34); }
                50%      {transform:scale(1.12); box-shadow:0 0 0 7px rgba(255,255,255,0); }
            }
            @media (prefers-reduced-motion: reduce) {
                .adv-role-q-mark {animation:none; }
            }
            .dark .adv-role-q {background:#16305e; }
            .adv-bubble-ai {display:flex; gap:12px; align-items:flex-start; margin-bottom:4px; }
            .adv-ai-avatar {width:36px; height:36px; border-radius:50%; background:linear-gradient(135deg,#0b1957 0%,#1a3a8f 100%); display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#fff; font-size:15px; box-shadow:0 3px 10px rgba(11,25,87,.28); }
            .adv-ai-avatar-viz {background:transparent; box-shadow:none; overflow:visible; }
            .adv-ai-body {flex:1; max-width:90%; }
            .adv-ai-name {font-size:11px; font-weight:700; color:#0b1957; margin-bottom:8px; letter-spacing:.06em; text-transform:uppercase; display:inline-flex; align-items:center; gap:6px; }
            .adv-ai-name-dot {width:6px; height:6px; border-radius:50%; background:#10b981; display:inline-block; box-shadow:0 0 0 2px rgba(16,185,129,.2); }
            .adv-ai-text {font-size:14px; line-height:1.6; color:#374151; }
            .adv-ai-text p {margin:0 0 4px; }
            .adv-ai-text strong {color:#111827; font-weight:500; }
            .adv-ai-text em {color:#0b1957; font-style:normal; font-weight:500; }
            .adv-ai-h3 {font-size:13.5px; font-weight:700; color:#111827; margin:12px 0 5px; letter-spacing:.01em; }
            .adv-ai-hr {border:none; border-top:1px solid #f0f0f0; margin:10px 0; }
            .adv-ai-bullet {display:flex; align-items:flex-start; gap:8px; margin:2px 0; }
            .adv-ai-bullet-dot {width:5px; height:5px; border-radius:50%; background:#0b1957; flex-shrink:0; margin-top:8px; opacity:.6; }
            .adv-ai-num-item {display:flex; align-items:flex-start; gap:9px; margin:5px 0; }
            .adv-ai-num-badge {min-width:22px; height:22px; border-radius:50%; background:linear-gradient(135deg,#e8ecfa,#dce3f5); color:#0b1957; font-size:11px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
            .adv-web-searched {display:inline-flex; align-items:center; gap:5px; font-size:11px; font-weight:500; color:#6b7280; background:#f8faff; border:1px solid #e0e7ff; padding:3px 10px 3px 8px; border-radius:20px; margin-bottom:10px; }
            /* ── THINKING STATE ── */
            .adv-thinking-wrap{display:flex;align-items:center;gap:8px;height:22px;overflow:hidden;padding-top:2px}
            .adv-thinking-word{font-size:13px;color:#0b1957;font-style:italic;font-weight:500;display:inline-block;transition:opacity .28s ease,transform .28s ease;letter-spacing:.01em}
            .adv-tw-in{opacity:1;transform:translateY(0)}
            .adv-tw-out{opacity:0;transform:translateY(-6px)}
            /* ── CHAT INPUT ── */
            .adv-chat-input-wrap {
                border-top: none !important;
                background: linear-gradient(to top, #ffffff 65%, rgba(255,255,255,0.92) 85%, transparent 100%) !important;
                padding: 16px 20px 16px;
                transition: all 0.35s cubic-bezier(.4,0,.2,1);
            }
            .dark .adv-chat-input-wrap {
                background: linear-gradient(to top, #000724 65%, rgba(0,7,36,0.92) 85%, transparent 100%) !important;
                border-top: none !important;
            }
            .adv-chat-blur { pointer-events: none; opacity: 0.5; }
            .adv-msg-counter {font-size:11px; color:#9ca3af; padding:4px 0 8px; text-align:center; }
            .adv-chat-input-box {display:flex; flex-direction:column; background:#fff; border:1.5px solid transparent; border-radius:24px; padding:16px 20px 12px; max-width:70%; margin:0 auto; transition:all .2s; box-shadow:0 2px 12px rgba(11,25,87,0.06); position:relative; z-index:0; }
            .adv-chat-input-box::before {content:''; position:absolute; inset:-1.5px; border-radius:25.5px; padding:1.5px; background:linear-gradient(90deg,#0b1957,#1a3a8f,#2563eb,#3b82f6,#0b1957); background-size:300% 100%; animation:adv-border-move 4s linear infinite; -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0); -webkit-mask-composite:xor; mask-composite:exclude; z-index:-1; pointer-events:none; }
            .adv-chat-input-box:focus-within::before {animation:adv-border-move 2s linear infinite; opacity:1; }
            @keyframes adv-border-move {0%{background-position:0% 50%}100%{background-position:300% 50%}}
            .adv-chat-ta {width:100%; resize:none; border:none; outline:none; background:transparent; font-size:16px; color:#111827; font-family:inherit; line-height:1.6; padding:0; max-height:120px; }
            .adv-chat-ta::placeholder {color:#0b1957; font-weight:400; }
            .adv-chat-input-foot {display:flex; align-items:center; justify-content:space-between; margin-top:10px; padding-top:8px; border-top:1px solid #f3f4f6; }
            .adv-chat-attach-btn {width:32px; height:32px; border-radius:50%; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .adv-chat-attach-btn:hover {background:#e0eaf5; border-color:#c2d6eb; color:#0b1957; }
            .adv-roles-btn {display:inline-flex; align-items:center; gap:6px; white-space:nowrap; padding:7px 14px; border-radius:999px; border:1.5px solid #e5e7eb; background:#fff; color:#0b1957; font-size:12px; font-weight:600; cursor:pointer; transition:all .15s ease; }
            .adv-roles-btn:hover {border-color:#0b1957; box-shadow:0 4px 14px rgba(11,25,87,.14); transform:translateY(-1px); }
            .adv-roles-menu {position:absolute; bottom:calc(100% + 10px); left:50%; transform:translateX(-50%); background:#fff; border:1px solid #e5e7eb; border-radius:18px; padding:8px; width:370px; max-width:calc(100vw - 32px); max-height:440px; overflow-y:auto; box-shadow:0 16px 48px rgba(15,23,42,.16); z-index:100; animation:fadeUp .15s ease both; }
            .adv-model-label {display:flex; align-items:center; gap:4px; font-size:12px; color:#9ca3af; font-weight:500; cursor:pointer; }
            .adv-model-label:hover {color:#374151; }
            .adv-send-sm {width:34px!important; height:34px!important; }
            .adv-spinner {width:15px; height:15px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin .8s linear infinite; }

            /* ── TARGETING CARD ── */
            .adv-targeting-card {margin-top:12px; background:linear-gradient(135deg,#f2f6fa,#e0eaf5); border:1px solid #c2d6eb; border-radius:16px; padding:14px 16px; }
            .adv-tc-header {display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:13px; color:#0b1957; }
            .adv-tag-row {display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:6px; }
            .adv-tag-label {font-size:11px; font-weight:600; color:#0b1957; min-width:70px; }
            .adv-tag {font-size:11px; background:rgba(255,255,255,.85); color:#0a112e; padding:3px 11px; border-radius:20px; border:1px solid #c2d6eb; }

            /* ── MOBILE NAV SIDEBARS ── */
            .adv-mobile-icp-box {
                display: none;
                position: fixed;
                right: 12px;
                top: 12px;
                flex-direction: column;
                z-index: 101;
                background: transparent;
                padding: 0;
                border: none;
                border-radius: 20px;
                animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
            }
            @keyframes slideInRight {
                from { opacity: 0; transform: translateX(20px); }
                to { opacity: 1; transform: translateX(0); }
            }

            /* ── MINI LEADS IN CHAT ── */
            .adv-mini-leads {margin-top:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px; padding:12px 14px; }
            .adv-ml-header {display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:12px; font-weight:600; color:#166534; }
            .adv-ml-count {margin-left:auto; font-size:11px; color:#16a34a; background:#dcfce7; padding:2px 10px; border-radius:20px; font-weight:500; }
            .adv-ml-item {display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px solid #dcfce7; }
            .adv-ml-item:first-of-type {border-top:none; }
            .adv-ml-avatar {width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700; flex-shrink:0; }
            .adv-ml-info {flex:1; }
            .adv-ml-name {font-size:12px; font-weight:600; color:#111827; }
            .adv-ml-title {font-size:11px; color:#6b7280; }

            /* ── NAS.io RESULT CARDS ── */
            .adv-result-cards {display:flex; gap:10px; margin-top:14px; }
            .adv-rc {display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:16px; border:1.5px solid #e5e7eb; background:#fff; cursor:pointer; transition:all .15s; flex:1; min-width:0; }
            .adv-rc:hover {border-color:#0b1957; background:#f2f6fa; box-shadow:0 2px 8px rgba(11,25,87,.1); }
            .adv-rc-icon {width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:16px; }
            .adv-rc-icon-target {background:#e8ecfa; }
            .adv-rc-icon-leads {background:#e0eaf5; }
            .adv-rc-body {flex:1; min-width:0; }
            .adv-rc-label {font-size:14px; font-weight:700; color:#111827; }
            .adv-rc-sub {font-size:12px; color:#6b7280; margin-top:1px; }
            .adv-rc-leads .adv-rc-sub {color:#0b1957; font-weight:500; }

            /* ── NAS.io ACTION BUTTONS ── */
            .adv-action-btns {display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
            .adv-act-btn {padding:8px 18px; border-radius:22px; font-size:13px; font-weight:600; border:1.5px solid #0b1957; background:transparent; color:#0b1957; cursor:pointer; transition:all .15s; }
            .adv-act-btn:hover {background:#0b1957; color:#fff; box-shadow:0 2px 8px rgba(11,25,87,.25); }

            /* ── OPTION BUTTONS ── */
            .adv-opts {display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
            .adv-opt-btn {padding:10px 20px; border-radius:14px; font-size:13.5px; font-weight:600; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; transition:all .15s; }
            .adv-opt-btn:hover {border-color:#0b1957; background:#f2f6fa; color:#0b1957; }
            .adv-opt-btn:first-child {background:#0b1957; color:#fff; border-color:#0b1957; box-shadow:0 2px 8px rgba(11,25,87,.25); }
            .adv-opt-btn:first-child:hover {background:#0a1447; border-color:#0a1447; box-shadow:0 4px 14px rgba(11,25,87,.35); }

            /* ── LEADS PANEL ── */
            .adv-leads-panel {width:40%; background:#fff; animation:slideIn .35s cubic-bezier(.4,0,.2,1) both; display:flex; flex-direction:column; overflow:hidden; border-left:2px solid #e0eaf5; flex-shrink:0; }
            .adv-chat-left {display:flex; flex-direction:column; position:relative; background:#fff; transition:width .35s cubic-bezier(.4,0,.2,1); border-right:none; min-width:0; }
            .adv-chat-left-empty {justify-content:center; }
            .adv-chat-left-empty .adv-chat-msgs {flex:none; overflow:visible; padding-top:0; }
            .adv-chat-left-empty .adv-chat-input-wrap {border-top:none; background:transparent; padding-top:0; }
            .adv-chat-left-empty .adv-msg-counter {display:none; }
            .adv-panel-header {display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1.5px solid #e5e7eb; background:#fff; flex-shrink:0; }
            .adv-close-panel {width:32px; height:32px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; flex-shrink:0; }
            .adv-close-panel:hover {background:#f3f4f6; }
            .adv-unlock-btn {padding:8px 18px; border-radius:22px; border:none; background:#111827; color:#fff; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .15s; }
            .adv-unlock-btn:hover {background:#1f2937; box-shadow:0 4px 12px rgba(0,0,0,.15); }
            .adv-panel-body {flex:1; overflow-y:auto; padding:20px; }
            .adv-panel-title {font-size:18px; font-weight:800; font-family:'Space Grotesk', system-ui, sans-serif; color:#111827; margin:0 0 10px; line-height:1.3; letter-spacing:-.02em; }
            .adv-panel-desc {font-size:13px; color:#6b7280; line-height:1.6; margin:0 0 16px; padding:10px 14px; background:#f5f8fc; border-radius:12px; border:1px solid #e0eaf5; }
            .adv-leads-list {display:flex; flex-direction:column; gap:2px; }
            .adv-lead-card {display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:14px; transition:background .15s; cursor:pointer; }
            .adv-lead-card:hover {background:#f9fafb; }
            .adv-lead-locked {opacity:.55; filter:blur(1px); pointer-events:none; }
            .adv-lead-avatar {width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:700; flex-shrink:0; }
            .adv-lead-info {flex:1; min-width:0; }
            .adv-lead-name {font-size:14px; font-weight:700; color:#111827; display:flex; align-items:center; gap:4px; }
            .adv-verified {background:#10b981; color:#fff; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; }
            /* Placeholder chip shown while deferred ICP scoring is still running. */
            .adv-icp-pending-dot {width:7px; height:7px; border-radius:50%; background:#10b981; flex-shrink:0; animation:adv-icp-blink 1.1s ease-in-out infinite; }
            @keyframes adv-icp-blink {0%,100% {opacity:1; transform:scale(1); } 50% {opacity:.25; transform:scale(.75); } }
            @media (prefers-reduced-motion: reduce) { .adv-icp-pending-dot {animation:none; opacity:.6; } }
            .adv-lead-title {font-size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:10px}
            .adv-lead-company {font-size:12px; font-weight:600; color:#374151; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .adv-lead-platform {margin-top:4px; display:flex; gap:4px; }
            .adv-lead-action {width:36px; height:36px; border-radius:50%; border:1.5px solid #e5e7eb; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all .15s; }
            .adv-lead-action:hover:not(:disabled) {border-color:#0b1957; background:#f2f6fa; }
            .adv-lead-action:disabled {cursor:default; }
            .adv-lead-avatar-img {width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0; border:1.5px solid #e5e7eb; }
            .adv-lead-location {font-size:11px; color:#9ca3af; margin-top:2px; }
            .adv-panel-footer {text-align:center; padding:20px 0 8px; font-size:12px; color:#9ca3af; border-top:1px solid #f3f4f6; margin-top:16px; }

            /* ── GEMINI-STYLE LANDING ── */
            .adv-gemini-hero {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                flex: 1;
                padding: 0 24px;
                text-align: center;
                animation: fadeUp 0.5s ease both;
            }
            .adv-gemini-logo-wrap {
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 28px;
            }
            .adv-gemini-logo {
                width: 56px;
                height: auto;
                display: block;
            }
            .adv-gemini-title {
                font-size: 36px;
                font-weight: 400;
                font-family: 'Space Grotesk', system-ui, sans-serif;
                color: #1f2937;
                letter-spacing: -0.01em;
                line-height: 1.3;
                margin: 0 0 40px;
                display: inline-flex;
                align-items: center;
                gap: 12px;
            }
            .adv-gemini-sparkle {
                width: 32px;
                height: 32px;
                color: #1f2937;
                opacity: 0.7;
                animation: fadeUp 0.6s ease 0.2s both;
            }
            /* ── GEMINI SUGGESTION CHIPS ── */
            .adv-gemini-chips {
                display: flex;
                flex-wrap: wrap;              /* multi-line instead of a 1-line scroller */
                gap: 10px;
                padding: 0 20px 20px;
                width: 100%;
                /* Cap the row so the 6 chips break over 2-3 centred lines instead
                   of stretching edge-to-edge on wide screens. */
                max-width: 880px;
                margin: 0 auto;
                -webkit-overflow-scrolling: touch;
                scrollbar-width: none;
                animation: fadeUp 0.5s ease 0.15s both;
                justify-content: center;
            }
            .adv-gemini-chips::-webkit-scrollbar {display:none; }
            .adv-gemini-chip {
                display: inline-flex;
                align-items: center;
                gap: 9px;
                padding: 9px 15px 9px 9px;
                border: 1px solid #e4eaf5;
                border-radius: 14px;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: -0.006em;
                color: #55607a;
                background: #fff;
                cursor: pointer;
                transition: color .2s, border-color .2s, transform .2s cubic-bezier(.2,.7,.2,1), box-shadow .2s;
                white-space: nowrap;
                flex: 0 1 auto;               /* allow the row to break between chips */
                max-width: 100%;
            }
            .adv-gemini-chip svg {
                width: 26px;
                height: 26px;
                padding: 5.5px;
                box-sizing: border-box;
                border-radius: 9px;
                background: #f1f4fc;
                color: #2563eb;
                flex: none;
                transition: background .2s, color .2s;
            }
            .adv-gemini-chip:hover {
                color: #0b1330;
                border-color: #cfd9ee;
                transform: translateY(-2px);
                box-shadow: 0 10px 24px -10px rgba(11,25,87,.22);
            }
            .adv-gemini-chip:hover svg {
                background: #e4ecfb;
                color: #0b1957;
            }
            /* ── MOBILE RESPONSIVE ── */
            @media (max-width: 768px) {
                .adv-gemini-hero { width: 100% !important; margin: 0 !important; padding: 20px 20px 0 !important; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; flex: 0 0 auto !important; }
                .adv-gemini-title { font-size: 24px; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 0; width: 100%; text-align: center; font-weight: 500; }
                .adv-gemini-sparkle {width: 24px; height: 24px; }
                .adv-gemini-logo-wrap {width: 64px; height: 64px; margin-bottom: 8px; }
                .adv-gemini-logo {width: 50px; }
                .adv-gemini-chips { 
                    display: grid !important; 
                    grid-template-columns: repeat(2, 1fr) !important; 
                    gap: 10px !important; 
                    padding: 10px 20px 40px !important; 
                    width: 100% !important; 
                    max-width: 600px; 
                    margin: 0 auto !important; 
                    overflow-x: visible !important;
                }
                .adv-gemini-chip { 
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 12px 10px !important; 
                    font-size: 12px !important; 
                    line-height: 1.3 !important;
                    border-radius: 16px !important; 
                    white-space: normal !important; 
                    text-align: left !important; 
                    justify-content: flex-start !important; 
                    width: 100% !important;
                    min-height: 64px !important;
                    flex: 0 0 auto !important;
                }
                /* FIXED: Extracted background color overrides so dark utility classes do not get blocked by media reset queries */
                .adv-chat-input-box { width: 100% !important; max-width: 100% !important; border-radius: 20px; padding: 16px 18px 12px; border: none !important; box-shadow: none !important; outline: none !important; }
                .adv-chat-back { width: 36px; height: 36px; top: 82px; left: 12px; z-index: 10 !important; }
                .adv-leads-panel {width: 100% !important; position: fixed; top: 0; left: 0; right: 0; bottom: 0; z-index: 50; border-left: none; }
                
                /* FIXED: Combined height calculations with fallback thresholds to guarantee absolute full coverage on viewports */
                main { overflow: hidden !important; padding-top: 0 !important; }
                .adv-chat-root { height: calc(100vh - 64px) !important; min-height: calc(100vmax - 64px) !important; overflow: hidden !important; }
                
                .adv-chat-left { width: 100% !important; max-width: 100vw !important; overflow: hidden !important; display: flex; flex-direction: column; align-items: stretch !important; height: calc(100vh - 64px) !important; min-height: calc(100vmax - 64px) !important; position: relative; }
                .adv-chat-left-empty { justify-content: center !important; padding-bottom: 40px !important; gap: 20px; }
                .adv-chat-left-empty .adv-chat-msgs { flex: 0 0 auto !important; display: flex; flex-direction: column; justify-content: center; padding: 0 !important; height: auto !important; margin-bottom: 0 !important; }
                .adv-chat-left-empty .adv-msgs-inner { display: none !important; }
                .adv-chat-left-empty .adv-chat-input-wrap { padding-bottom: 0 !important; flex: 0 0 auto !important; }
                .adv-chat-left-empty .adv-chat-input-box { padding: 24px 30px !important; max-width: 90% !important; margin: 0 auto !important; }
                .adv-chat-left-empty .adv-chat-ta { font-size: 20px !important; }
                .adv-mobile-icp-box { display: flex; width: auto !important; left: auto !important; right: 12px !important; top: 82px !important; }
                /* Decrease width for a more contained look on mobile */
                .adv-chat-msgs { flex: 1 !important; overflow-y: auto !important; padding: 72px 0 10px !important; width: 100% !important; display: flex; flex-direction: column; overflow-x: hidden !important; border: none !important; }
                .adv-msgs-inner { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 0 20px !important; box-sizing: border-box !important; }
                .adv-chat-input-wrap { width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 1px 16px 20px !important; box-sizing: border-box !important; border-top: none !important; flex: 0 0 auto !important; position: relative; z-index: 10; }
                .adv-chat-input-box { width: 100% !important; max-width: 88% !important; margin: 0 auto !important; border-radius: 16px; padding: 10px 14px; }
                .adv-input-central-group { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
                .adv-chat-ta { width: 100% !important; border: none !important; background: none !important; font-size: 11px !important; text-align: left !important; padding: 2px 0 !important; min-height: 24px !important; height: 24px !important; line-height: 24px !important; }
                .adv-chat-input-foot { padding: 4px 0 2px !important; margin-top: 4px !important; border: none !important; background: none !important; justify-content: space-between !important; gap: 10px !important; }
                .adv-premium-btn { width: auto !important; min-width: 95px !important; justify-content: center !important; padding: 3px 10px !important; margin: 0 !important; font-size: 10px !important; }
                .adv-chat-attach-btn, .adv-send-sm { width: 28px !important; height: 28px !important; }
                .adv-chat-attach-btn svg, .adv-send-sm svg { width: 13px !important; height: 13px !important; }
                .adv-msg-counter { font-size: 10px !important; color: #9ca3af !important; margin: 4px 0 0 !important; padding: 0 !important; line-height: 1.2 !important; }
                
                .adv-mobile-add-btn, .adv-mobile-send-btn {
                    width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e5e7eb;
                    background: #fff; display: flex; align-items: center; justify-content: center;
                    cursor: pointer; color: #374151; flex-shrink: 0;
                }
                .adv-mobile-send-btn { border-color: #3b82f6; color: #3b82f6; }
                .adv-mobile-send-btn:disabled { border-color: #e5e7eb; color: #9ca3af; }

                .adv-mobile-floating-actions {
                    position: fixed; bottom: 200px; left: 16px; right: 16px;
                    display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; z-index: 998;
                }
                .adv-mobile-chip {
                    display: flex; align-items: center; gap: 6px; padding: 8px 16px;
                    border-radius: 20px; font-size: 12px; font-weight: 600; cursor: pointer;
                    border: 1px solid #e5e7eb; transition: all 0.2s;
                }
                .adv-chip-primary { background: #fff; color: #374151; }
                .adv-chip-navy { background: #0b1957; color: #fff; border: none; }
                
                .adv-opt-btn { 
                    width: auto !important; flex: 0 0 auto !important; 
                    padding: 8px 16px !important; border-radius: 20px !important;
                    font-size: 12px !important; border: 1px solid #e5e7eb !important;
                    background: #fff !important; color: #374151 !important;
                }
                .adv-opt-btn:first-child { background: #0b1957 !important; color: #fff !important; border: none !important; }
                .adv-bubble-user { width: 100% !important; margin-left: auto !important; margin-right: 0 !important; justify-content: flex-end !important; padding-right: 0 !important; }
                .adv-user-msg { max-width: 85% !important; word-wrap: break-word !important; }
                .adv-ai-name { justify-content: flex-start !important; }
                .adv-ai-avatar { width: 32px !important; height: 32px !important; flex-shrink: 0 !important; }
                .adv-bubble-ai { gap: 10px !important; width: 100% !important; max-width: 100% !important; align-items: flex-start !important; }
                .adv-ai-text { text-align: left !important; width: 100% !important; font-size: 13.5px !important; }
                .adv-rc { padding: 10px 12px !important; border-radius: 10px !important; gap: 8px !important; overflow-x: hidden !important; }
                .adv-rc-icon { width: 26px !important; height: 26px !important; border-radius: 6px !important; font-size: 14px !important; }
                .adv-rc-label { font-size: 12px !important; }
                .adv-rc-sub { font-size: 10px !important; }
                .adv-main-product-card { padding: 12px !important; border-radius: 10px !important; gap: 10px !important; }
                .adv-main-product-card > div:first-of-type { width: 36px !important; height: 36px !important; font-size: 16px !important; }
                .adv-main-product-card > div:nth-of-type(2) > div:first-of-type { font-size: 13px !important; }
                .adv-journey-stepper { margin-left: 10px !important; width: calc(100% - 10px) !important; justify-content: flex-start !important; }
                .adv-journey-stepper > div { flex: 1 !important; display: flex !important; min-width: 0 !important; align-items: flex-start !important; gap: 10px !important; }
                .adv-journey-stepper > div > div:first-child { flex: 1 1 auto !important; width: auto !important; display: flex !important; flex-direction: column !important; align-items: center !important; }
                .journey-icon-circle { width: 34px !important; height: 34px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
                .adv-journey-stepper svg { width: 14px !important; height: 14px !important; display: block !important; }
                /* Target the connector arrow svg containers cleanly with a fixed width to prevent overlap */
                .adv-journey-stepper > div > div:nth-of-type(2) { width: 12px !important; padding-top: 10px !important; flex: 0 0 auto !important; display: flex !important; justify-content: center !important; opacity: 0.6 !important; }
                .adv-journey-stepper span { font-size: 10px !important; }
                /* Align text and labels to be centered */
                .adv-journey-stepper > div > div:first-child > div { text-align: center !important; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 8px !important; }
                .adv-journey-stepper > div > div:first-child > div:nth-of-type(3) { white-space: normal !important; min-height: 40px; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; width: 100% !important; padding: 0 2px !important; line-height: 1.1 !important; }
                .adv-ai-text p, .adv-ai-text div { text-align: left !important; justify-content: flex-start !important; }
                .adv-ai-bullet { justify-content: flex-start !important; text-align: left !important; }
                .adv-result-cards { display: flex !important; flex-wrap: wrap !important; visibility: visible !important; opacity: 1 !important; justify-content: center !important; }
                .adv-rc { display: flex !important; width: 100% !important; }
                .adv-rc-leads { display: none !important; }
                .adv-icp-discover-btn { display: none !important; }
                .adv-mobile-icp-box { top: 90px !important; }
                .adv-mobile-icp-btn {
                    background: #172560;
                    color: #fff;
                    width: 50px;
                    height: 50px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: none;
                    cursor: pointer;
                    box-shadow: 0 4px 14px rgba(23, 37, 96, 0.3);
                    transition: all 0.2s;
                }
                .adv-mobile-icp-btn:hover {
                    background: #0f1842;
                    transform: scale(1.05);
                }
                .adv-ai-body { flex: 1 !important; min-width: 0 !important; width: auto !important; max-width: 100% !important; padding-right: 42px !important; box-sizing: border-box !important; display: block; }
                .adv-act-btn { flex: 1 1 0 !important; width: 0 !important; box-sizing: border-box !important; text-align: center; justify-content: center; font-size: 11px !important; padding: 9px 4px !important; display: flex !important; align-items: center !important; white-space: nowrap !important; height: 38px !important; }
                .adv-act-btn-journey svg { display: none !important; }
                .adv-opt-btn { width: calc(50% - 4px) !important; flex: 0 0 calc(50% - 4px) !important; box-sizing: border-box !important; text-align: left; font-size: 11px !important; padding: 8px 10px !important; }
                
                /* MOBILE FOOTER */
                .adv-mobile-footer {
                    display: flex; position: fixed; bottom: 10px; left: 6%; right: 6%;
                    height: 60px; border-radius: 40px; z-index: 1000;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                    justify-content: space-around; align-items: center;
                    padding: 0 10px; border: none;
                }
                .adv-footer-btn {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    gap: 2px; background: none; border: none; flex: 1; cursor: pointer;
                    color: #9ca3af; font-size: 9px; font-weight: 700; text-transform: uppercase;
                    transition: all 0.2s; position: relative;
                }
                .adv-footer-btn.has-data .adv-footer-btn-icon {
                    color: #3b82f6;
                    animation: adv-pulse-blue 2s infinite;
                }
                @keyframes adv-pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                }
                .adv-footer-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    filter: grayscale(1);
                    pointer-events: none;
                }
                .adv-footer-btn-icon {
                    width: 32px; height: 32px; border-radius: 50%;
                    display: flex; align-items: center; justify-content: center;
                    transition: all 0.2s; color: #4b5563;
                }
                .adv-footer-btn.active { color: #111827; }
                .adv-footer-btn.active .adv-footer-btn-icon { background: #111827; color: #fff; }

                .adv-journey-stepper { justify-content: space-between !important; width: 100% !important; }
                .adv-center { padding: 0 0 60px !important; align-items: center !important; }
                .adv-input-outer { width: 92% !important; max-width: 92% !important; margin: 0 auto 40px !important; }
                .adv-title { font-size: 24px !important; width: 88%; margin: 0 auto 24px !important; text-align: center; }
                .adv-chips-row-2 { margin-top: 0 !important; }
                .adv-chips-row { 
                    display: grid !important; 
                    grid-template-columns: repeat(2, 1fr) !important; 
                    gap: 10px !important; 
                    width: 90% !important; 
                    justify-content: center !important; 
                    padding: 0 0 20px !important; 
                    margin: 0 auto !important; 
                }
                .adv-chip {
                    display: flex !important;
                    align-items: center !important;
                    gap: 8px !important;
                    padding: 12px 10px !important;
                    font-size: 12px !important;
                    line-height: 1.3 !important;
                    border-radius: 16px !important;
                    white-space: normal !important;
                    text-align: left !important;
                    justify-content: flex-start !important;
                    width: 100% !important;
                    min-height: 64px !important;
                }
                .adv-recent-wrap { width: 90% !important; margin: 16px auto 0 !important; }

                /* ── MOBILE LIGHT THEME DEFAULTS ── */
                html, body, main, .adv-landing, .adv-chat-root, .adv-chat-main, .adv-chat-left, .adv-mobile-footer, .adv-chat-msgs, .adv-chat-input-wrap { background: #FFFFFF; }
                .adv-chat-input-box { background: #FFFFFF; border: 1.5px solid #e5e7eb; }
                .adv-chat-ta { background: transparent; }

                /* ── MOBILE DARK MODE OVERRIDES ── */
                .dark html, .dark body, .dark main, .dark #__next, .dark [data-reactroot], .dark .adv-landing, .dark .adv-chat-root, .dark .adv-chat-main, .dark .adv-chat-left { background: #000724 !important; }
                .dark .adv-chat-input-box { background: #1A2A43 !important; border: 1.5px solid #1e293b !important; }
                .dark .adv-chat-ta { background: transparent !important; }
                .dark .adv-chat-input-wrap { background: #000724 !important; }
                .dark .adv-mobile-footer { background: #000724 !important; border-top: 1px solid #1e293b !important; box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4) !important; }
                .dark .adv-footer-btn.active .adv-footer-btn-icon { background: #2B7CFF !important; color: #000724 !important; }
                .dark .adv-footer-btn { color: #7a8ba3; }
                .dark .adv-footer-btn-icon { color: #cbd5e1; }
                .dark .adv-footer-btn.active { color: #ffffff; }
                .dark .adv-mobile-add-btn { background: #1A2A43 !important; border-color: #1e293b !important; color: #ffffff !important; }
                .dark .adv-mobile-send-btn { background: #2B7CFF !important; border-color: #2B7CFF !important; color: #000724 !important; }
                .dark .adv-mobile-send-btn:disabled { background: #1A2A43 !important; border-color: #1e293b !important; color: #7a8ba3 !important; }
                .dark .adv-opt-btn { background: #1A2A43 !important; border-color: #1e293b !important; color: #ffffff !important; }
                .dark .adv-opt-btn:first-child { background: #2B7CFF !important; color: #000724 !important; border: none !important; }
                .dark .adv-mobile-chip { border-color: #1e293b !important; }
                .dark .adv-chip-primary { background: #1A2A43 !important; color: #ffffff !important; }
                .dark .adv-chip-navy { background: #2B7CFF !important; color: #000724 !important; }
                .dark .adv-chat-msgs { background: #000724 !important; }
            }
            @media (max-width: 480px) {
                .adv-gemini-title {font-size: 18px; margin-bottom: 20px; }
                .adv-gemini-chips { gap: 8px !important; padding: 0 12px 12px !important; }
                .adv-gemini-chip { padding: 10px 8px !important; font-size: 11px !important; gap: 6px !important; min-height: 56px !important; }

                /* ── MOBILE DARK MODE OVERRIDES (EXTRA SMALL DEVICES) ── */
                .dark .adv-gemini-chip { background: #0e1834 !important; border-color: #1e2a4a !important; }
            }

            /* Dark Mode Styling - uses .dark class on <html> */
            .dark .adv-landing { background: #000724; color: #ffffff; }
            .dark .adv-chat-root { background: #000724 !important; color: #ffffff; }
            .dark .adv-chat-body { background: #000724; }
            .dark .adv-chat-left { background: #000724; }
            .dark .adv-chat-left-empty .adv-chat-input-wrap { background: transparent; }
            /* ── Chat Input Wrap ── */
            .dark .adv-chat-input-wrap { 
                background: #000724; 
                border-top: 1px solid #000724; /* Prevents a light line appearing above the input */
            }
            /* Text & Titles */
            .dark .adv-title { color: #ffffff; }
            .dark .adv-gemini-title { color: #ffffff; }
            .dark .adv-message { color: #ffffff; }

            /* Input & Surface Elements */
            .dark .adv-input-outer { background: #1A2A43; border: 1px solid #000724; }
            .dark .adv-input-box { background: #1A2A43; color: #ffffff; border: none; }
            .dark .adv-input-box::placeholder { color: #7a8ba3; }

            /* Chips & Interactive Elements */
            .dark .adv-chip { background: #1A2A43; color: #ffffff; border: 1px solid #000724; }
            .dark .adv-chip:hover { background: #2B7CFF; color: #ffffff; }
            .dark .adv-gemini-chip { background: #0e1834; color: #9aa6c4; border: 1px solid #1e2a4a; }
            .dark .adv-gemini-chip svg { background: #131f3d; color: #5b8def; }
            .dark .adv-gemini-chip:hover { background: #0e1834; color: #eaeffb; border-color: #2c3b63; transform: translateY(-2px); box-shadow: 0 14px 30px -12px rgba(0,0,0,.6); }
            .dark .adv-gemini-chip:hover svg { background: #16234a; color: #7ba4f5; }

            /* Options & Dropdowns */
            .dark .adv-close-btn { color: #ffffff; }
            .dark .adv-options-container { background: #1A2A43; }
            .dark .adv-option-item { color: #ffffff; border-color: #000724; }
            .dark .adv-option-item:hover { background: #2B7CFF; color: #ffffff; }

            /* Buttons */
            .dark .adv-button { background: #2B7CFF; color: #ffffff; }
            .dark .adv-button:hover { background: #1e5fa8; }
            .dark .adv-send-btn { color: #2B7CFF; }
            .dark .adv-send-btn:hover { color: #ffffff; }
            .dark .adv-send-circle.adv-send-sm { background: #1A2A43 !important; border: 1px solid #484b4f !important; box-shadow: none !important; color: #ffffff; }
            .dark .adv-send-circle.adv-send-sm svg { stroke: #ffffff; }
            .dark .adv-send-circle.adv-send-sm:hover { background: #253456 !important; border-color: #484b4f !important; }

            /* Chat Input */
            .dark .adv-chat-input-box { background: #1A2A43; color: #ffffff; border-color: #000724; box-shadow: none; z-index: auto; }
            .dark .adv-chat-input-box::before { display: none; }
            .dark .adv-chat-input-box::placeholder { color: #7a8ba3; }
            .dark .adv-chat-input-box textarea,
            .dark .adv-chat-input-box input { color: #ffffff; }
            .dark .adv-chat-input-foot { border-top: none; }
            .dark .adv-chat-ta { color: #ffffff; }
            .dark .adv-chat-ta::placeholder { color: #cbd5e1; }

            /* Recent Items */
            .dark .adv-recent-item { color: #ffffff; background: #1A2A43; }
            .dark .adv-recent-item:hover { background: #2B7CFF; color: #ffffff; }

            /* Mobile Button */
            .dark .adv-mobile-icp-btn { background: #2B7CFF; color: #ffffff; }
            .dark .adv-mobile-icp-btn:hover { background: #1e5fa8; }

            /* CHAT BUBBLES & MESSAGES */
            .dark .adv-user-msg { background: #2563eb; color: #ffffff; box-shadow: 0 2px 14px rgba(37, 99, 235, 0.3); }
 
            .dark .adv-ai-name { color: #60a5fa; }
            .dark .adv-ai-text { color: #e5e7eb; }
            .dark .adv-ai-h3 { color: #f3f4f6; }
            .dark .adv-ai-bullet {
                color: #e5e7eb; 
            }
            .dark .adv-ai-bullet-dot {
                background: #60a5fa; 
                opacity: 1;
            }
            /* Dark Mode Override */
            .dark .adv-ai-text strong {
                color: #ffffff; 
                font-weight: 600;
            }
            .dark .adv-ai-num-badge { background: linear-gradient(135deg, #253456, #1A2A43); color: #60a5fa; }

            /* LEADS PANEL */
            .dark .adv-leads-panel { background: #000724; border-left-color: #000724; }
            .dark .adv-panel-header { background: #0f1629; border-bottom-color: #000724; }
            .dark .adv-panel-body { background: #000724; }
            .dark .adv-panel-title { color: #ffffff; }
            .dark .adv-panel-desc { background: #1A2A43; color: #e5e7eb; border-color: #000724; }
            .dark .adv-lead-card { background: transparent; }
            .dark .adv-lead-card:hover { background: #253456; }
            .dark .adv-lead-name { color: #ffffff; }
            .dark .adv-lead-title { color: #7a8ba3; }
            .dark .adv-lead-company { color: #b8c4d6; }
            .dark .adv-lead-action { background: #1A2A43; border-color: #000724; color: #ffffff; }
            .dark .adv-lead-action:hover:not(:disabled) { border-color: #000724; background: #253456; }
            .dark .adv-lead-avatar-img { border-color: #000724; }

            /* RESULT CARDS */
            .dark .adv-result-cards { color: #ffffff; }
            .dark .adv-rc { background: #1A2A43; border-color: #000724; color: #ffffff; }
            .dark .adv-rc:hover { border-color: #000724; background: #253456; box-shadow: 0 2px 8px rgba(43, 124, 255, 0.15); }
            .dark .adv-rc-icon { background: #253456; }
            .dark .adv-rc-label { color: #ffffff; }
            .dark .adv-rc-sub { color: #7a8ba3; }

            /* MINI LEADS */
            .dark .adv-mini-leads { background: #1A2A43; border-color: #000724; }
            .dark .dark .adv-ml-header { color: #60a5fa; }
            .dark .adv-ml-count { background: #253456; color: #60a5fa; }
            .dark .adv-ml-item { border-top-color: #000724; }
            .dark .adv-ml-name { color: #ffffff; }
            .dark .adv-ml-title { color: #7a8ba3; }

            /* ACTION BUTTONS */
            .dark .adv-act-btn { border-color: #000724; background: transparent; color: #2B7CFF; }
            .dark .adv-act-btn:hover { background: #2B7CFF; color: #000724; }
            .dark .adv-opt-btn { background: #1A2A43; border-color: #000724; color: #ffffff; }
            .dark .adv-opt-btn:hover { border-color: #000724; background: #253456; color: #ffffff; }
            .dark .adv-opt-btn:first-child { background: #2B7CFF; color: #000724; border-color: #000724; }
            .dark .adv-opt-btn:first-child:hover { background: #1e5fa8; border-color: #1e5fa8; }

            /* MOBILE NAVIGATION */
            .dark .adv-mobile-nav { background: rgba(10, 7, 36, 0.9); border-color: #000724; box-shadow: 0 8px 32px rgba(11, 25, 87, 0.4); }
            .dark .adv-nav-btn { background: transparent; color: #7a8ba3; }
            .dark .adv-nav-btn:hover { background: #1A2A43; color: #2B7CFF; }
            .dark .adv-nav-btn-active { background: #2B7CFF; color: #000724; box-shadow: 0 4px 12px rgba(43, 124, 255, 0.3); }

            /* BACK & CLOSE BUTTONS */
            .dark .adv-back, .dark .adv-chat-back { background: #1A2A43; border-color: #000724; color: #ffffff; }
            .dark .adv-back svg, .dark .adv-chat-back svg { stroke: #ffffff; }
            .dark .adv-back:hover, .dark .adv-chat-back:hover { background: #253456; border-color: #000724; }
            .dark .adv-close-panel { background: #1A2A43; border-color: #000724; color: #ffffff; }
            .dark .adv-close-panel:hover { background: #253456; border-color: #000724; }

            /* ATTACH & UNLOCK BUTTONS */
            .dark .adv-chat-attach-btn { background: #1A2A43; border: 1px solid #484b4f; color: #ffffff; box-shadow: none; }
            .dark .adv-roles-btn { background: #1A2A43; border-color: #484b4f; color: #ffffff; }
            .dark .adv-roles-btn:hover { border-color: #5b7cff; box-shadow: 0 4px 14px rgba(43,124,255,.18); }
            .dark .adv-roles-menu { background: #0f1b33; border-color: #31415f; }
            .dark .adv-chat-attach-btn svg { stroke: #ffffff; }
            .dark .adv-chat-attach-btn:hover { background: #253456; border-color: #484b4f; }
            .dark .adv-unlock-btn { background: #2B7CFF; color: #000724; }
            .dark .adv-unlock-btn:hover { background: #1e5fa8; box-shadow: 0 4px 12px rgba(43, 124, 255, 0.3); }

            /* TARGETING CARD */
            .dark .adv-targeting-card { background: linear-gradient(135deg, #1A2A43, #253456); border-color: #000724; }
            .dark .adv-tc-header { color: #60a5fa; }
            .dark .adv-tag-label { color: #7a8ba3; }
            .dark .adv-tag { background: #253456; color: #ffffff; border-color: #000724; }

            /* MISC ELEMENTS */
            .dark .adv-gemini-sparkle { color: white; }
            .dark .adv-web-searched { background: #1A2A43; border-color: #000724; color: #7a8ba3; }
            .dark .adv-thinking-wrap,
            .dark .adv-thinking-word {
              color: #ffffff !important;
            }
            .dark .adv-gemini-logo { filter: brightness(0) invert(1); }
            :root { --header-start: #f0f3ff; --header-end: #e8ecfa; }
            .dark { --header-start: #000c3b; --header-end: #000724; }
                        
            .dark .adv-attach-menu {
                background: #000724;
                border: 1px solid #1e293b;
                box-shadow: 0 12px 40px rgba(0,0,0,0.4);
            }
            
            .dark .adv-attach-item:hover {
                background: #1e293b;
            }
            
            .dark .adv-attach-label {
                color: #f3f4f6;
            }
            
            .dark .adv-attach-sub {
                color: #94a3b8;
            }
            
            .dark .adv-attach-divider {
                background: #1e293b;
            }
            .dark .adv-ai-body {
                background-color: #000724; 
                border-color: #1e293b;     
                color: #e5e7eb;            
            }
            
            .dark .adv-ta,
            .dark .adv-chat-ta {
                color: #f9fafb !important;
            }
            
            .dark .adv-ta::placeholder,
            .dark .adv-chat-ta::placeholder {
                color: #cbd5e1 !important;
            }
            
            .dark ::-webkit-scrollbar {
                width: 8px;
                height: 8px;
            }
            .dark ::-webkit-scrollbar-track {
                background: #000724;
            }
            .dark ::-webkit-scrollbar-thumb {
                background: #1e293b;
                border-radius: 4px;
            }
            .dark ::-webkit-scrollbar-thumb:hover {
                background: #334155;
            }
            
            .dark .adv-ai-text a {
                color: #60a5fa !important;
                text-decoration: underline;
                text-decoration-color: rgba(96, 165, 250, 0.3);
            }
            .dark .adv-ai-text a:hover {
                color: #93c5fd !important;
            }
            
            .dark .adv-ai-hr {
                border-top: 1px solid #1e293b;
            }
            
            .dark .adv-chat-input-foot {
                border-top: 1px solid #1e293b !important;
            }
            
            .dark .journey-tip {
                background: #1e293b !important;
                color: #f1f5f9 !important;
                border: 1px solid #334155 !important;
            }
            .dark .journey-tip div {
                border-top-color: #1e293b !important;
            }
            
            .dark .adv-ai-body a[target="_blank"] {
                background: #0f172a !important;
                border: 1px solid #1e293b !important;
                color: #94a3b8 !important;
            }
            .dark .adv-ai-body a[target="_blank"]:hover {
                background: #1e293b !important;
                color: #f8fafc !important;
            }
            
            .dark .adv-ai-text code {
                background: #1e293b !important;
                color: #cbd5e1 !important;
            }
            
            .dark .adv-ai-name {
                color: #60a5fa !important;
            }
            
.dark .adv-ai-avatar {
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0px;
}

.dark .adv-ai-avatar-viz svg,
.dark .adv-ai-avatar-viz img,
.dark .adv-ai-avatar-viz * {
  fill: #ffffff !important;
  stroke: #ffffff !important;
  color: #ffffff !important;
}

.dark .agent-avatar-wrapper {
  background: transparent !important;
  background-image: none !important;
  box-shadow: none !important;
}

.dark .agent-avatar-wrapper * {
  fill: #ffffff !important;
  stroke: #ffffff !important;
  color: #ffffff !important;
}
            .dark .adv-chat-root { background: #000724 !important; }
:root {
  /* Light mode variables matching image_d9ace3.png */
  --box-bg: #ffffff;
  --box-border: #e2e8f0; /* Soft border color */
  --box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

.dark            {
  /* Keep your dark mode variables here */
  --box-bg: #000724;
  --box-border: #1e293b;
  --box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}

:root {
  /* Light Mode */
  --opt-border: #e5e7eb;
  --opt-selected-border: #0b1957;
  --opt-bg: #fff;
  --opt-selected-bg: #e8ecfa;
  --opt-text: #374151;
  --opt-selected-text: #0b1957;
}

.dark {
  /* Dark Mode */
  --opt-border: #1e293b;
  --opt-selected-border: #6366f1; /* Indigo-500 */
  --opt-bg: #000724;
  --opt-selected-bg: #2563eb; /* Indigo-900/30 */
  --opt-text: #9ca3af;
  --opt-selected-text: #e2e8f0;
}

            /* ── MEDIA GENERATION CONNECTED OPTIONS PANEL ── */
            .adv-options-extension {
                background: #ffffff;
                border: 1.5px solid #c2d6eb;
                border-radius: 24px 24px 0 0; /* no bottom rounded corners */
                padding: 16px 20px 42px; /* stretch bottom padding */
                max-width: 70%;
                margin: 0 auto;
                margin-bottom: -32px; /* overlap with the input box */
                box-shadow: 0 -4px 12px rgba(11,25,87,0.03), 0 2px 12px rgba(11,25,87,0.06);
                position: relative;
                z-index: 5; /* sit behind the input box */
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .dark .adv-options-extension {
                background: #1A2A43;
                border-color: #000724;
                box-shadow: none;
            }
            /* Keep fully rounded corners and stack on top of extension */
            .adv-chat-input-box.has-extension {
                border-radius: 24px !important;
                z-index: 10 !important;
                position: relative;
            }
            .adv-chat-input-box.has-extension::before {
                border-radius: 25.5px !important;
                z-index: 10 !important;
            }
            
            /* Hide input wrap top border divide when mediaActive is true */
            .media-active-left .adv-chat-input-wrap {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                z-index: 100 !important;
                border-top: none !important;
                background: linear-gradient(to top, #ffffff 65%, rgba(255,255,255,0.92) 85%, transparent 100%) !important;
                padding-top: 16px !important;
            }
            .dark .media-active-left .adv-chat-input-wrap {
                background: linear-gradient(to top, #000724 65%, rgba(0,7,36,0.92) 85%, transparent 100%) !important;
            }
            
            /* Flow margins when mediaActive is true */
            .media-active-left .adv-chat-msgs {
                padding-top: 12px !important;
            }

            /* Sticky Header */
            .adv-media-header {
                position: sticky;
                top: 0;
                left: 0;
                right: 0;
                height: 60px;
                background: #ffffff;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 24px;
                border-bottom: none !important; /* no visible separation line */
                z-index: 100;
                transition: all 0.2s ease;
            }
            .dark .adv-media-header {
                background: #000724;
            }
            .adv-media-header-back {
                display: flex;
                align-items: center;
                justify-content: center;
                width: 34px;
                height: 34px;
                border-radius: 50%;
                border: 1.5px solid #e2e8f0;
                background: #ffffff;
                cursor: pointer;
                transition: all 0.15s;
            }
            .adv-media-header-back:hover {
                background: #f8fafc;
                border-color: #cbd5e1;
            }
            .dark .adv-media-header-back {
                background: #1a2a43;
                border-color: #253456;
            }
            .dark .adv-media-header-back svg {
                stroke: #ffffff;
            }
            .adv-media-header-title {
                font-family: 'Space Grotesk', system-ui, sans-serif;
                font-size: 15px;
                font-weight: 600;
                color: #0b1957;
                position: absolute;
                left: 50%;
                transform: translateX(-50%);
                pointer-events: none;
            }
            .dark .adv-media-header-title {
                color: #60a5fa;
            }
            .adv-media-header-exit {
                display: flex;
                align-items: center;
                gap: 6px;
                padding: 7px 14px;
                border-radius: 20px;
                border: 1.5px solid #ef4444;
                background: #fef2f2;
                color: #ef4444;
                font-size: 12px;
                font-weight: 600;
                transition: all 0.15s;
            }
            .adv-media-header-exit:hover {
                background: #fee2e2;
            }
            .dark .adv-media-header-exit {
                background: rgba(239,68,68,0.1);
                border-color: #ef4444;
            }
            .adv-media-header-exit-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0px;
                padding: 7px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1.5px solid #ef4444;
                background: #fef2f2;
                color: #ef4444;
                font-size: 12px;
                font-weight: 600;
                overflow: hidden;
                white-space: nowrap;
                transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.25s, padding 0.25s, gap 0.25s;
                cursor: pointer;
            }
            .adv-media-header-exit-btn span {
                opacity: 0;
                max-width: 0;
                transition: opacity 0.15s ease, max-width 0.25s ease;
                display: inline-block;
            }
            .adv-media-header-exit-btn:hover {
                width: 125px;
                border-radius: 20px;
                padding: 7px 14px;
                gap: 6px;
                background: #fee2e2;
                justify-content: flex-start;
            }
            .adv-media-header-exit-btn:hover span {
                opacity: 1;
                max-width: 100px;
            }
            .dark .adv-media-header-exit-btn {
                background: rgba(239,68,68,0.1);
                border-color: #ef4444;
            }
            .adv-media-header-back-btn {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0px;
                padding: 7px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: 1.5px solid #cbd5e1;
                background: #ffffff;
                color: #475569;
                font-size: 11px;
                font-weight: 600;
                overflow: hidden;
                white-space: nowrap;
                transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.25s, padding 0.25s, gap 0.25s;
                cursor: pointer;
            }
            .adv-media-header-back-btn span {
                opacity: 0;
                max-width: 0;
                transition: opacity 0.15s ease, max-width 0.25s ease;
                display: inline-block;
            }
            .adv-media-header-back-btn:hover {
                width: 155px;
                border-radius: 20px;
                padding: 7px 12px;
                gap: 6px;
                background: #f1f5f9;
                border-color: #64748b;
                color: #1e293b;
                justify-content: flex-start;
            }
            .adv-media-header-back-btn:hover span {
                opacity: 1;
                max-width: 110px;
            }
            .dark .adv-media-header-back-btn {
                background: #1a2a43;
                border-color: #253456;
                color: #cbd5e1;
            }
            .dark .adv-media-header-back-btn:hover {
                background: #253456;
                border-color: #475569;
                color: #f8fafc;
            }

            .adv-bubble-undo-btn {
                color: #94a3b8;
                border-radius: 4px;
                transition: all 0.15s;
            }
            .adv-bubble-undo-btn:hover {
                color: #ef4444 !important;
                background: #fef2f2 !important;
                transform: scale(1.1);
            }
            .dark .adv-bubble-undo-btn:hover {
                background: rgba(239, 68, 68, 0.15) !important;
            }
            /* transparency fade overlay */
            .adv-media-header-fade {
                position: absolute;
                top: 60px;
                left: 0;
                right: 0;
                height: 48px;
                background: linear-gradient(to bottom, #ffffff 15%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0));
                pointer-events: none;
                z-index: 99;
            }
            .dark .adv-media-header-fade {
                background: linear-gradient(to bottom, #000724 15%, rgba(0,7,36,0.8) 50%, rgba(0,7,36,0));
            }

            .adv-chat-input-wrap-full {
                position: absolute !important;
                bottom: 0 !important;
                left: 0 !important;
                right: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                z-index: 100 !important;
                border-top: none !important;
                background: linear-gradient(to top, #ffffff 65%, rgba(255,255,255,0.92) 85%, transparent 100%) !important;
                box-shadow: none !important;
                padding: 16px 20px 16px !important;
            }
            .dark .adv-chat-input-wrap-full {
                background: linear-gradient(to top, #000724 65%, rgba(0,7,36,0.92) 85%, transparent 100%) !important;
                border-top: none !important;
                box-shadow: none !important;
            }

            .adv-media-brand-dna-panel {
                background: #f8fafc;
                position: relative;
            }
            .dark .adv-media-brand-dna-panel {
                background: #0b132b;
            }
            .adv-media-brand-dna-panel::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: 0;
                width: 16px;
                background: linear-gradient(to right, #ffffff, transparent);
                pointer-events: none;
                z-index: 10;
            }
            .dark .adv-media-brand-dna-panel::before {
                background: linear-gradient(to right, #000724, transparent);
            }

            @media (max-width: 1024px) {
                .adv-options-extension {
                    max-width: 88% !important;
                }
            }
            @media (max-width: 768px) {
                .adv-options-extension {
                    max-width: 100% !important;
                    border-radius: 16px 16px 0 0;
                    margin-bottom: -24px;
                    padding-bottom: 32px;
                }
                .adv-chat-input-box.has-extension {
                    border-radius: 16px !important;
                }
            }
            `;
