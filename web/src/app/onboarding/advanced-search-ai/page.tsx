'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Gem, Upload, FileSpreadsheet, Download, CheckCircle2, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { ProfileSummaryDialog } from '@/components/campaigns';
import { useOnboardingStore } from '@/store/onboardingStore';
import WorkflowPreviewPanel from '@/components/onboarding/WorkflowPreviewPanel';
import { useEmailTemplates, useCreateEmailTemplate } from '@lad/frontend-features/email-templates';
import { useConnectedEmailSenders } from '@lad/frontend-features/email-senders';
import {
  useLinkedInSearch,
  useAIChat,
  useCampaignCreation,
  useVoiceAgent,
  useBilling,
} from '@lad/frontend-features/ai-icp-assistant';

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
    icp_score?: number;
    match_level?: 'strong' | 'moderate' | 'weak';
    icp_reasoning?: string;
    enriched_profile?: {
        summary: string | null;
        experience: { title: string; company: string; is_current: boolean }[];
        education: { school: string; degree: string; field_of_study: string }[];
        skills: string[];
    };
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
}

interface ChatMsg {
    id: string;
    role: 'user' | 'ai';
    text: string;
    ts: Date;
    targeting?: LeadTargeting;
    loading?: boolean;
    options?: { label: string; value: string }[];
    leads?: LeadProfile[];
    inboundAction?: 'download' | 'upload' | 'summary';
    inboundSummary?: { total: number; linkedin: number; email: number; whatsapp: number; phone: number; website: number };
    webSearchResult?: boolean;
    sources?: Array<{ title: string; url: string }>;
    leadDetailForm?: boolean;
}

/* ═══════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════ */

function toArr(v: any): string[] {
    if (Array.isArray(v)) return v.filter((x: any) => typeof x === 'string' && x.trim());
    if (typeof v === 'string' && v.trim()) return [v];
    return [];
}

function avatarColor(name: string): string {
    const colors = ['#6366f1', '#ec4899', '#2563eb', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return colors[Math.abs(h) % colors.length];
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

function parseInboundCSV(file: File): Promise<ParsedInboundLead[]> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result as string;
                const rows = parseCSVText(text);
                if (rows.length <= 1) { reject(new Error('File is empty or only has headers.')); return; }
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
                })).filter(l => {
                    const isExample = l.companyName.toLowerCase().includes('delete this') || l.notes.toLowerCase().includes('delete this') || l.email.toLowerCase().includes('example.com');
                    const hasData = (l.companyName && l.companyName.trim().length > 1) || (l.email && l.email.includes('@')) || (l.linkedinProfile && l.linkedinProfile.includes('linkedin.com'));
                    return !isExample && hasData;
                });
                if (leads.length === 0) { reject(new Error('No valid leads found. Please add your lead data.')); return; }
                resolve(leads);
            } catch (err: any) { reject(err); }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

function isInboundIntent(text: string): boolean {
    const lower = text.toLowerCase();
    return /\b(i have leads|i have .* data|upload.*leads|inbound|import.*leads|have.*csv|have.*excel|already have.*leads|my leads|upload.*file|have.*spreadsheet|bulk.*upload)\b/i.test(lower);
}

/** Returns true when the user's reply is a confirmation of a search preview. */
function isConfirmation(text: string): boolean {
    return /^\s*(yes|yeah|yep|yup|ok|okay|sure|go|proceed|correct|right|confirm|search it|search|find them|do it|go ahead|looks (good|right|correct)|that'?s? (right|correct|good|it)|sounds good|perfect|absolutely|definitely)\s*[!.]*\s*$/i.test(text.trim());
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
    const aiChat = useAIChat();
    const campaignCreation = useCampaignCreation();
    const voiceAgent = useVoiceAgent(true);
    const billing = useBilling(true);

    // Unified single-screen mode - always show chat interface
    // const [screen, setScreen] = useState<'landing' | 'chat'>('landing');
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [targeting, setTargeting] = useState<LeadTargeting | null>(null);
    const [leads, setLeads] = useState<LeadProfile[]>([]);
    const [showPanel, setShowPanel] = useState<false | 'leads' | 'workflow'>(false);
    const setWorkflowPreview = useOnboardingStore(s => s.setWorkflowPreview);
    // Activity tracking for SearchingThinker
    const [activities, setActivities] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    // Checkpoint form state (inline in chat)
    const [pendingContact, setPendingContact] = useState<any>(null); // detected contact from phone/email outreach
    const [cpStep, setCpStep] = useState(-1); // -1 = not started, 0-6 = steps
    const [cpIcpThreshold, setCpIcpThreshold] = useState('75');
    const [cpActions, setCpActions] = useState<string[]>([]);
    const [cpConnMsg, setCpConnMsg] = useState('');
    const [cpFollowMsg, setCpFollowMsg] = useState('');
    const [cpNextChannels, setCpNextChannels] = useState<string[]>([]); // email, whatsapp, voice_call
    const [cpTriggerCondition, setCpTriggerCondition] = useState(''); // connection_accepted, message_replied, profile_visited
    
    // Dynamically build workflow preview
    useEffect(() => {
        const steps: any[] = [];
        let order = 1;
        // Start node
        steps.push({
            id: 'lead-gen',
            type: 'lead_generation',
            title: 'LinkedIn Lead Search',
            description: 'Find target leads on LinkedIn',
            channel: 'linkedin',
            order_index: order++
        });

        if (cpActions.includes('connect')) {
            steps.push({
                id: 'connect',
                type: 'linkedin_connect',
                title: 'Send Connection Request',
                description: 'Auto-connect with leads on LinkedIn',
                channel: 'linkedin',
                order_index: order++
            });
        }

        if (cpActions.includes('message')) {
            steps.push({
                id: 'message',
                type: 'linkedin_message',
                title: 'Send Follow-up Message',
                description: 'Message after connection accepted',
                channel: 'linkedin',
                order_index: order++
            });
        }

        if (cpActions.includes('profile_view')) {
            steps.push({
                id: 'profile_view',
                type: 'linkedin_visit',
                title: 'View Profile',
                description: 'Visit their LinkedIn profile',
                channel: 'linkedin',
                order_index: order++
            });
        }

        if (cpNextChannels.length > 0 && cpTriggerCondition) {
            const condLabels: Record<string, string> = {
                connection_accepted: 'Wait for Connection Accepted',
                message_replied: 'Wait for Message Reply',
                profile_visited: 'Wait for Profile Visit'
            };
            steps.push({
                id: 'condition',
                type: 'wait_for_condition',
                title: condLabels[cpTriggerCondition] || 'Wait for Condition',
                description: 'Trigger condition',
                channel: 'system',
                order_index: order++
            });

            cpNextChannels.forEach((ch, idx) => {
                steps.push({
                    id: `ch-${ch}-${idx}`,
                    type: ch === 'voice_call' ? 'voice_agent_call' : `${ch}_send`,
                    title: ch === 'email' ? 'Send Follow-up Email' : ch === 'whatsapp' ? 'Send WhatsApp Message' : 'AI Voice Call',
                    description: `Follow up via ${ch}`,
                    channel: ch.split('_')[0],
                    order_index: order++
                });
            });
        }

        setWorkflowPreview(steps);
    }, [cpActions, cpNextChannels, cpTriggerCondition, setWorkflowPreview]);
    const [cpDays, setCpDays] = useState('30');
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
    // WhatsApp config (populated when whatsapp channel selected)
    const [cpWaBody, setCpWaBody] = useState('');
    const [cpWaFromNumber, setCpWaFromNumber] = useState('');
    const [cpWaGenLoading, setCpWaGenLoading] = useState(false);

    // Targeting form state (inline in chat)
    const [tgStep, setTgStep] = useState(-1); // -1 = not started, 0-6 = steps
    const [tgNationality, setTgNationality] = useState<string[]>([]);
    const [tgExperienceLevel, setTgExperienceLevel] = useState<string[]>([]);
    const [tgCompanySize, setTgCompanySize] = useState<string[]>([]);
    const [tgCompanyAge, setTgCompanyAge] = useState<string[]>([]);
    const [tgEducation, setTgEducation] = useState<string[]>([]);
    const [tgSkills, setTgSkills] = useState<string[]>([]);

    const [convId, setConvId] = useState<string | null>(null);
    const [msgCount, setMsgCount] = useState(0);
    const [pendingIntent, setPendingIntent] = useState<string | null>(null);
    // Pending search confirmation: stores the parsed intent for the user to confirm before search runs
    const [pendingSearchConfirmation, setPendingSearchConfirmation] = useState<{ intent: LeadTargeting; originalQuery: string } | null>(null);

    // Inbound CSV upload state
    const [inboundMode, setInboundMode] = useState(false);
    const [inboundLeads, setInboundLeads] = useState<ParsedInboundLead[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    const toggleFeedback = (leadId: string, rating: 'good' | 'bad') => {
        setLeadFeedback(prev => {
            const updated = { ...prev };
            if (updated[leadId] === rating) { delete updated[leadId]; } else { updated[leadId] = rating; }
            try { localStorage.setItem('lad_lead_feedback', JSON.stringify(updated)); } catch { }
            return updated;
        });
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

    // Credits & unlock state
    const [showRechargeModal, setShowRechargeModal] = useState(false);
    const [creditBalance, setCreditBalance] = useState<number | null>(null);

    const endRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [profileSummary, setProfileSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

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
        setTgCompanyAge([]); setTgEducation([]); setTgSkills([]);
        // Conversation meta
        setConvId(null); setMsgCount(0); setPendingIntent(null);
        setPendingSearchConfirmation(null); setPendingContact(null);
        // Inbound / upload
        setInboundMode(false); setInboundLeads([]);
        // Search / leads state
        setLeadFeedback({}); setSearchSessions([]); setSearchHistory([]);
        setLeadCount(10); setSearchPage(1); setTotalResults(0);
        setSearchCursor(null); setLastSearchQuery(''); setLastIcpDescription('');
        setLastTargeting(null); setLoadingMore(false);
        setWebSearchEnabled(false);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Sync credit balance from billing hook
    useEffect(() => {
        if (billing.wallet?.availableBalance !== undefined) {
            setCreditBalance(billing.wallet.availableBalance ?? billing.wallet.currentBalance ?? 0);
        } else if (billing.error) {
            setCreditBalance(0);
        }
    }, [billing.wallet, billing.error]);

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

    const handleViewSummary = async (lead: LeadProfile) => {
        setSelectedEmployee({
            id: 'temp',
            name: lead.name,
            title: lead.headline || lead.current_company || '',
            photo_url: lead.profile_picture || '',
        });
        setSummaryDialogOpen(true);
        setProfileSummary(null);
        setSummaryError(null);
        setSummaryLoading(true);

        try {
            const data = await campaignCreation.fetchLeadSummaryPreview({
                profileData: {
                    name: lead.name,
                    title: lead.headline || '',
                    company: lead.current_company || '',
                    linkedin_url: lead.profile_url || ''
                }
            });

            if (data?.summary) {
                setProfileSummary(data.summary);
            } else {
                throw new Error(data?.error || 'Failed to generate summary');
            }
        } catch (err: any) {
            setSummaryError(err.message || 'Failed to generate profile summary');
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleCloseSummaryDialog = () => {
        setSummaryDialogOpen(false);
        setSelectedEmployee(null);
        setProfileSummary(null);
        setSummaryError(null);
    };

    /* ── Landing submit ── */
    const onLandingSubmit = useCallback(() => {
        if (!input.trim()) return;
        addToHistory(input.trim());
        // setScreen('chat'); // Single-screen mode - no screen switching
        setTimeout(() => doSend(input.trim()), 100);
        setInput('');
    }, [input]);

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
                }));
            } else {
                // Use local CSV parsing for spreadsheet files
                parsed = await parseInboundCSV(file);
            }

            setInboundLeads(parsed);
            setInboundMode(true);

            const counts = {
                total: parsed.length,
                linkedin: parsed.filter(l => l.linkedinProfile).length,
                email: parsed.filter(l => l.email).length,
                whatsapp: parsed.filter(l => l.whatsapp).length,
                phone: parsed.filter(l => l.phone).length,
                website: parsed.filter(l => l.website).length,
            };

            // Convert inbound leads to LeadProfile format for the panel
            const panelLeads: LeadProfile[] = parsed.map((l, i) => ({
                id: `inbound-${i}`,
                name: `${l.firstName} ${l.lastName}`.trim() || `Lead ${i + 1}`,
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
            }));

            try {
                const saveResponse = await fetch('/api/campaigns/leads/import/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leads: leadsForSave,
                        detectedChannels: {
                            email: counts.email > 0,
                            whatsapp: counts.whatsapp > 0,
                            phone: counts.phone > 0,
                            linkedin: counts.linkedin > 0,
                            website: counts.website > 0,
                        },
                    }),
                });

                if (!saveResponse.ok) {
                    console.warn('Failed to save leads to database');
                }
            } catch (saveErr) {
                console.warn('Error saving leads:', saveErr);
            }

            let summaryText = `✅ **Successfully extracted ${counts.total} leads from your file!**\n\n📊 **Contact Channels Detected:**\n`;
            if (counts.linkedin > 0) summaryText += `\n🔗 **LinkedIn:** ${counts.linkedin} profiles`;
            if (counts.email > 0) summaryText += `\n✉️ **Email:** ${counts.email} addresses`;
            if (counts.whatsapp > 0) summaryText += `\n💬 **WhatsApp:** ${counts.whatsapp} numbers`;
            if (counts.phone > 0) summaryText += `\n📞 **Phone:** ${counts.phone} numbers`;
            if (counts.website > 0) summaryText += `\n🌐 **Website:** ${counts.website} URLs`;
            summaryText += `\n\n👉 Click **"Create Campaign Checkpoints"** to set up your campaign with these leads!`;

            setMessages(p => p.filter(m => m.id !== processingId).concat({
                id: `a-${Date.now()}`, role: 'ai', text: summaryText, ts: new Date(),
                targeting: inboundTargeting, inboundAction: 'summary', inboundSummary: counts,
            }));
            setTimeout(() => setShowPanel('leads'), 500);
        } catch (err: any) {
            setMessages(p => p.filter(m => m.id !== processingId).concat({
                id: `a-${Date.now()}`, role: 'ai', text: `⚠️ **Error parsing file:** ${err.message}\n\nTry uploading:\n• Images with business card or contact information\n• CSV/Excel files with structured lead data`,
                ts: new Date(), inboundAction: 'upload',
            }));
        } finally { setBusy(false); }
    }, []);

    const doSend = useCallback(async (text: string) => {
        if (!text.trim() || busy) return;
        // Enforce 10-message limit only when user has no credits
        if (creditBalance !== null && creditBalance <= 0 && msgCount >= 10) return;
        const uid = `u-${Date.now()}`;
        const lid = `l-${Date.now()}`;
        setMessages(p => [...p, { id: uid, role: 'user', text, ts: new Date() }, { id: lid, role: 'ai', text: '', ts: new Date(), loading: true }]);
        setBusy(true);
        setMsgCount(c => c + 1);

        // ── PRIORITY -1: Outreach / phone / email direct-contact commands ──
        // "Hey LAD outreach to +971...", "+971506341191", "reach out to john@x.com", etc.
        const hasPhone = /\+?\d[\d\s\-().]{8,}\d/.test(text);
        const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(text);
        const hasOutreachKeyword = /\b(outreach|reach out)\s+(to\s+)?[\+\d\w]/i.test(text);
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
                    text: `🎯 **Great question! Here's your next steps:**\n\nYou have **${leadsCount} leads** uploaded and ready to go${linkedinCount > 0 ? ` (${linkedinCount} with LinkedIn profiles)` : ''}${emailCount > 0 ? ` (${emailCount} with emails)` : ''}.\n\n**To create your campaign:**\n1. Click **"Create Campaign Checkpoints"** button above\n2. Select your **outreach actions** (Connect, Message, Follow-up)\n3. Set up your **message templates** (AI can generate them for you! ✨)\n4. Choose **campaign duration**\n5. **Name & launch** your campaign 🚀\n\n👉 Click the **"Create Campaign Checkpoints"** button to get started!`,
                    ts: new Date(),
                    targeting: targeting || undefined,
                }));
                setBusy(false);
                return;
            }

            if (isRefine) {
                setMessages(p => p.filter(m => m.id !== lid).concat({
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `✏️ **Want to refine your leads?**\n\nHere's what you can do:\n• **Remove leads** — Click the 🗑️ icon next to any lead in the panel\n• **Upload new file** — Upload a different CSV to replace your current leads\n• **View leads** — Click on the leads panel to review all your uploaded contacts\n\nYou currently have **${inboundLeads.length}** leads loaded. Once you're happy with the list, click **"Create Campaign Checkpoints"** to set up your campaign!`,
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
                let summaryParts = [`📊 **Your uploaded leads summary:**\n\n• **Total Leads:** ${counts.total}`];
                if (counts.linkedin > 0) summaryParts.push(`• **LinkedIn Profiles:** ${counts.linkedin}`);
                if (counts.email > 0) summaryParts.push(`• **Email Addresses:** ${counts.email}`);
                if (counts.whatsapp > 0) summaryParts.push(`• **WhatsApp Numbers:** ${counts.whatsapp}`);
                if (counts.phone > 0) summaryParts.push(`• **Phone Numbers:** ${counts.phone}`);
                if (counts.website > 0) summaryParts.push(`• **Websites:** ${counts.website}`);
                summaryParts.push(`\n👉 Ready to create a campaign? Click **"Create Campaign Checkpoints"**!`);
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
            // If user confirmed a search preview, start with the stored intent; otherwise use current targeting
            let updatedTargetState = confirmedForSearch ? confirmedForSearch.intent : targeting;

            if (confirmedForSearch) {
                // User confirmed the search preview — skip lead-chat and go straight to search
                shouldRunSearch = true;
            } else {
                // Normal flow: call lead-chat for AI conversation
                try {
                    const chatD = await aiChat.sendLeadChatMessage({
                        message: text,
                        history: historySnapshot,
                        currentTargeting: targeting,
                        pendingIntent: (pendingIntent as string | null),
                    });
                    if (chatD) {
                        aiResponseText = chatD.response || '';
                        shouldRunSearch = !!chatD.newSearch;
                        if (chatD.updatedTargeting) updatedTargetState = chatD.updatedTargeting;
                        setPendingIntent(chatD.pendingIntent || null);
                        if (Array.isArray(chatD.options) && chatD.options.length > 0) {
                            aiOpts = chatD.options;
                        }
                    }
                } catch (e) { console.warn('[Lead Chat] lead-chat error', e); }

                // If it's the first message and lead-chat didn't respond or failed, fallback to searching
                if (isFirstMessage && !aiResponseText && !shouldRunSearch) {
                    shouldRunSearch = true;
                }

                // Smart search detection: if the user explicitly asks to find/search someone or something
                // AND the query contains a specific entity (company, person name, location — not just vague intent)
                if (!shouldRunSearch && !isFirstMessage) {
                    const lowerText = text.toLowerCase();
                    const hasSearchIntent = /\b(find|search|look for|get me|show me|locate|who is|who are|people at|employees at|team at|leads? (in|at|from|for))\b/i.test(lowerText);
                    // Check if there's a specific entity (not just generic words like 'a specific company')
                    const hasVagueTarget = /\b(a specific|any|some|certain)\b/i.test(lowerText);
                    // Must have search intent AND NOT be vague to force search
                    if (hasSearchIntent && !hasVagueTarget) {
                        shouldRunSearch = true;
                        // Clear old targeting so Gemini parses this fresh query from scratch
                        // e.g. previous search was "founders at X", now user says "find all people at X"
                        updatedTargetState = null;
                        // Clear the AI response so we show search results, not the chat response
                        aiResponseText = '';
                    }
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

                    if (!hasUsableIntent) {
                        try {
                            const intentD = await linkedInSearch.extractIntent(text);
                            if (intentD?.intent) {
                                previewIntent = {
                                    job_titles: toArr(intentD.intent.job_titles),
                                    industries: toArr(intentD.intent.industries),
                                    locations: toArr(intentD.intent.locations),
                                    keywords: toArr(intentD.intent.keywords),
                                    profile_language: toArr(intentD.intent.profile_language),
                                    company_names: toArr(intentD.intent.company_names),
                                    seniority: toArr(intentD.intent.seniority),
                                    functions: toArr(intentD.intent.functions),
                                };
                            }
                        } catch (e) { console.warn('[Search] extract-intent for preview failed', e); }
                    }

                    const hasPreviewData = (previewIntent?.job_titles?.length ?? 0) > 0
                        || (previewIntent?.locations?.length ?? 0) > 0
                        || (previewIntent?.keywords?.length ?? 0) > 0
                        || (previewIntent?.company_names?.length ?? 0) > 0
                        || (previewIntent?.industries?.length ?? 0) > 0;

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

            // ── CASE 2: Run LinkedIn search ──
            let ext: LeadTargeting | null = updatedTargetState;
            let realLeads: LeadProfile[] = [];
            let searchTotal = 0;
            let icpWasApplied = false;

            // When the user confirmed a search preview, always send the ORIGINAL query to the backend
            // and let the server's Gemini re-parse it with the improved prompt (fixes "from Company" parsing).
            // The pre-parsed preview intent shown to the user is only for display — do not use it as the search input.
            let searchQuery: string;
            if (confirmedForSearch) {
                searchQuery = confirmedForSearch.originalQuery;
                ext = null; // Clear the preview intent — let the backend parse the original query fresh
            } else {
                // If we have updated targeting from lead-chat or custom flows, use that for search query
                searchQuery = shouldRunSearch && ext && !isFirstMessage
                    ? [...(ext.job_titles || []), ...(ext.industries || []), ...(ext.locations || []), ...(ext.keywords || [])].join(' ')
                    : text;
            }

            try {
                // Enhance ICP description with user feedback on previous leads
                // When running from a confirmed preview, use the original query, not "yes"
                const icpBase = confirmedForSearch ? confirmedForSearch.originalQuery : text;
                let icpDesc = icpBase;
                const goodLeads = leads.filter(l => leadFeedback[l.id] === 'good');
                const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
                if (goodLeads.length > 0 || badLeads.length > 0) {
                    const parts = [icpBase];
                    if (goodLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as GOOD matches (find more like these):\n${goodLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`).join('\n')}`);
                    }
                    if (badLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as BAD matches (avoid similar profiles):\n${badLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`).join('\n')}`);
                    }
                    icpDesc = parts.join('');
                }

                setIsSearching(true);
                setActivities([]);

                const d = await linkedInSearch.search({
                    query: searchQuery,
                    count: leadCount,
                    targeting: ext || undefined,
                    icp_description: icpDesc
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
                    addSearchSession(searchQuery, ext, icpBase);
                    setSearchPage(1);
                    setTotalResults(d.total || 0);
                    const nextCursor = d.cursor || null;
                    setSearchCursor(nextCursor);
                    setCursorHistory([null, nextCursor]); // page1=null(start), page2=nextCursor
                    icpWasApplied = !!d.icp_applied;
                    if (Array.isArray(d.results) && d.results.length > 0) {
                        realLeads = d.results.map((item: any, idx: number) => ({
                            id: item.id || item.provider_id || `lead-${idx}`,
                            name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.phone || item.email || (item.profile_url ? 'LinkedIn User' : 'Contact'),
                            first_name: item.first_name || '',
                            last_name: item.last_name || '',
                            headline: item.headline || '',
                            location: item.location || '',
                            current_company: item.current_company || '',
                            profile_url: item.profile_url || '',
                            profile_picture: item.profile_picture || '',
                            industry: item.industry || '',
                            network_distance: item.network_distance || '',
                            locked: idx >= 5,
                            icp_score: item.icp_score != null ? item.icp_score : undefined,
                            match_level: item.match_level || undefined,
                            icp_reasoning: item.icp_reasoning || undefined,
                            enriched_profile: item.enriched_profile || undefined,
                        }));
                        setLeads(realLeads);
                        searchTotal = d.total || realLeads.length;
                    }
                }
            } catch (e) { console.warn('[Search] advanced search err', e); }

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
                // First message: build summary
                if (ext && (ext.job_titles.length || ext.industries.length || ext.locations.length || (ext.keywords && ext.keywords.length > 0) || (ext.company_names && ext.company_names.length > 0))) {
                    finalText = buildSummary(ext);
                    if (realLeads.length > 0) {
                        finalText += `\n\n🔍 **Found ${searchTotal} real leads** on LinkedIn via Sales Navigator.`;
                        if (icpWasApplied) {
                            const strongCount = realLeads.filter(l => l.match_level === 'strong').length;
                            const moderateCount = realLeads.filter(l => l.match_level === 'moderate').length;
                            finalText += `\n\n🎯 **ICP Qualification:** ${strongCount} strong match${strongCount !== 1 ? 'es' : ''}, ${moderateCount} moderate — sorted by relevance.`;
                        }
                    }
                    setTimeout(() => setShowPanel('leads'), 500);
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

            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai', text: finalText, ts: new Date(),
                targeting: ext || undefined, options: aiOpts, leads: realLeads.length > 0 ? realLeads.slice(0, 3) : undefined,
            }));
        } catch (err) {
            console.error('Error:', err);
            setMessages(p => p.filter(m => m.id !== lid).concat({
                id: `a-${Date.now()}`, role: 'ai', text: '⚠️ Something went wrong. Please try again.', ts: new Date(),
            }));
        } finally { setBusy(false); }
    }, [busy, messages, convId, targeting, pendingIntent, pendingSearchConfirmation, webSearchEnabled]);

    const onChatSend = useCallback(() => {
        if (!input.trim() || busy) return;
        doSend(input.trim()); setInput('');
        if (taRef.current) taRef.current.style.height = 'auto';
    }, [input, busy, doSend]);

    const onOptClick = useCallback((v: string) => {
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
                // Ensure targeting is set so campaign overview bubble renders
                if (!targeting) {
                    setTargeting({ keywords: [], industries: [], locations: [], job_titles: [], profile_language: [] });
                }
                // Add campaign overview message — msg.targeting triggers the 3-card UI
                setMessages(p => [...p, {
                    id: `a-${Date.now()}`, role: 'ai',
                    text: `✅ **Contact added!** Here's your campaign overview — click **"Create Campaign Checkpoints"** to proceed:`,
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
        doSend(v);
    }, [doSend, targeting, pendingContact, setCpStep]);

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
        } as LeadTargeting;

        // Update targeting state
        setTargeting(updatedTargeting);

        // Build a message for the AI to interpret these filters
        const filterParts: string[] = [];
        if (tgNationality.length > 0) filterParts.push(`Nationality: ${tgNationality.join(', ')}`);
        if (tgExperienceLevel.length > 0) filterParts.push(`Experience Level: ${tgExperienceLevel.join(', ')}`);
        if (tgCompanySize.length > 0) filterParts.push(`Company Size: ${tgCompanySize.join(', ')}`);
        if (tgCompanyAge.length > 0) filterParts.push(`Company Age: ${tgCompanyAge.join(', ')}`);
        if (tgEducation.length > 0) filterParts.push(`Education: ${tgEducation.join(', ')}`);
        if (tgSkills.length > 0) filterParts.push(`Skills: ${tgSkills.join(', ')}`);

        const refinementMessage = filterParts.length > 0
            ? `Refine my targeting with these additional criteria:\n${filterParts.join('\n')}`
            : 'Confirm my current targeting criteria';

        // Close the targeting form
        setTgStep(-1);

        // Send to AI for refinement - this will trigger the search
        doSend(refinementMessage);
    }, [targeting, tgNationality, tgExperienceLevel, tgCompanySize, tgCompanyAge, tgEducation, tgSkills, doSend]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); screen === 'landing' ? onLandingSubmit() : onChatSend(); }
    };

    const reset = () => {
        // setScreen('landing'); // Single-screen mode - no screen switching
        setMessages([]);
        setTargeting(null);
        setLeads([]);
        setShowPanel(false);
        setConvId(null);
        setMsgCount(0);
        setPendingIntent(null);
        setPendingSearchConfirmation(null);
        setSearchPage(1);
        setTotalResults(0);
        setSearchCursor(null);
        setCursorHistory([null]);
        setLastSearchQuery('');
        setLastIcpDescription('');
        setLastTargeting(null);
        setCpStep(-1);
        setTgStep(-1);
        setTgNationality([]);
        setTgExperienceLevel([]);
        setTgCompanySize([]);
        setTgCompanyAge([]);
        setTgEducation([]);
        setTgSkills([]);
    };

    /* ── Load more leads (append to existing list) ── */
    const loadMoreLeads = useCallback(async () => {
        if (loadingMore || !lastSearchQuery || !searchCursor) return;

        setLoadingMore(true);
        try {
            // Enhance ICP description with feedback for paginated results too
            let icpDesc = lastIcpDescription || undefined;
            const goodLeads = leads.filter(l => leadFeedback[l.id] === 'good');
            const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
            if (icpDesc && (goodLeads.length > 0 || badLeads.length > 0)) {
                const parts = [icpDesc];
                if (goodLeads.length > 0) parts.push(`\n\nUser marked these as GOOD matches (find more like these):\n${goodLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}`).join('\n')}`);
                if (badLeads.length > 0) parts.push(`\n\nUser marked these as BAD matches (avoid similar):\n${badLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}`).join('\n')}`);
                icpDesc = parts.join('');
            }

            const body: Record<string, any> = {
                query: lastSearchQuery,
                count: leadCount,
                targeting: lastTargeting || undefined,
                icp_description: icpDesc,
                filters: { cursor: searchCursor },
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
                const moreLeads: LeadProfile[] = d.results.map((item: any, idx: number) => ({
                    id: item.id || item.provider_id || `lead-${existingCount + idx}`,
                    name: item.name || `${item.first_name || ''} ${item.last_name || ''}`.trim() || 'LinkedIn User',
                    first_name: item.first_name || '',
                    last_name: item.last_name || '',
                    headline: item.headline || '',
                    location: item.location || '',
                    current_company: item.current_company || '',
                    profile_url: item.profile_url || '',
                    profile_picture: item.profile_picture || '',
                    industry: item.industry || '',
                    network_distance: item.network_distance || '',
                    locked: (existingCount + idx) >= 5,
                    icp_score: item.icp_score || undefined,
                    match_level: item.match_level || undefined,
                    icp_reasoning: item.icp_reasoning || undefined,
                    enriched_profile: item.enriched_profile || undefined,
                }));
                setLeads(prev => [...prev, ...moreLeads]);
                setSearchCursor(d.cursor || null);
                if (d.total) setTotalResults(d.total);
            } else {
                // No more results
                setSearchCursor(null);
            }
        } catch (e) { console.error('[LoadMore] error', e); }
        setLoadingMore(false);
    }, [loadingMore, lastSearchQuery, leadCount, lastTargeting, lastIcpDescription, searchCursor, leads.length]);

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
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        New Setup
                    </button>
                )}
            </div>

            {/* Center greeting */}
            <div className="adv-center">
                {/* Mr LAD logo */}
                <div className="adv-asterisk-wrap">
                    <img src="/MrLAD-logo.svg" alt="Mr LAD" className="adv-lad-logo" />
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
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                            Web search
                            <button onClick={(e) => { e.stopPropagation(); setWebSearchEnabled(false); }} style={{background:'none',border:'none',cursor:'pointer',padding:'0 0 0 4px',color:'#6b7280',fontSize:'11px'}}>x</button>
                        </div>
                    )}

                    {/* Input bottom row */}
                    <div className="adv-input-foot">
                        {/* + button with dropdown */}
                        <div style={{position:'relative'}}>
                            <button
                                className="adv-attach-btn"
                                onClick={(e) => { e.stopPropagation(); setShowAttachMenu(!showAttachMenu); }}
                                title="Add attachments or tools"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                            </button>

                            {showAttachMenu && (
                                <div className="adv-attach-menu" onClick={e => e.stopPropagation()}>
                                    <div className="adv-attach-item" onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}>
                                        <div className="adv-attach-icon" style={{background:'#dcfce7'}}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Import leads</div>
                                            <div className="adv-attach-sub">CSV, Excel, images, PDFs</div>
                                        </div>
                                    </div>
                                    <div className={`adv-attach-item${webSearchEnabled ? ' adv-attach-active' : ''}`} onClick={() => { setWebSearchEnabled(!webSearchEnabled); setShowAttachMenu(false); }}>
                                        <div className="adv-attach-icon" style={{background: webSearchEnabled ? '#dbeafe' : '#e0f2fe'}}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={webSearchEnabled ? '#2563eb' : '#0284c7'} strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Web search {webSearchEnabled ? '\u2713' : ''}</div>
                                            <div className="adv-attach-sub">Search LinkedIn &amp; web for leads</div>
                                        </div>
                                    </div>
                                    <div className="adv-attach-divider"/>
                                    <div className="adv-attach-item" onClick={() => { setShowAttachMenu(false); router.push('/settings'); }}>
                                        <div className="adv-attach-icon" style={{background:'#fef3c7'}}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                        </div>
                                        <div>
                                            <div className="adv-attach-label">Connect tools</div>
                                            <div className="adv-attach-sub">LinkedIn, HubSpot, Salesforce</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Send button */}
                        <button
                            className="adv-send-circle"
                            disabled={!input.trim()}
                            onClick={onLandingSubmit}
                            style={{
                                background: input.trim() ? '#172560' : '#e5e7eb',
                                boxShadow: input.trim() ? '0 4px 14px rgba(23,37,96,.3)' : 'none'
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>

                {/* Suggestion chips */}
                <div className="adv-chips-row">
                    <button className="adv-chip" onClick={() => { setInput('Marketing directors at fintech startups in London'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Find leads in fintech
                    </button>
                    <button className="adv-chip" onClick={() => { setInput('I want to find leads at a specific company'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        Target specific company
                    </button>
                    <button className="adv-chip" onClick={() => { setInput('VP of Sales in UAE SaaS companies with 50-250 employees'); taRef.current?.focus(); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                        VP of Sales in UAE
                    </button>
                </div>

                {/* Recent searches */}
                {searchHistory.length > 0 && (
                    <div className="adv-recent-wrap">
                        <div className="adv-recent-label">Recent searches</div>
                        <div className="adv-recent-list">
                            {[...searchHistory].reverse().slice(0, 3).map((q, i) => (
                                <button key={i} className="adv-recent-item" onClick={() => { setInput(q); taRef.current?.focus(); }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                    <span>{q}</span>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Hidden file input — accepts all supported lead import formats */}
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.pdf" style={{display:'none'}} onChange={e => { const f = e.target.files?.[0]; if (f) handleInboundFile(f); e.target.value = ''; }} />

            <style>{css}</style>
        </div>
    );

    /* ═══════════════════════════════════════════════
       SCREEN 2: CHAT + LEADS PANEL
       ═══════════════════════════════════════════════ */
    return (
        <div className="adv-chat-root">
            <div className="adv-yellow-bar" />
            <div className="adv-chat-main">
                {/* LEFT: CHAT */}
                <div className="adv-chat-left" style={{ width: showPanel ? '50%' : '100%' }}>
                    <button className="adv-chat-back" onClick={reset}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                    </button>

                    <div className="adv-chat-msgs">
                        {/* Landing Content - Show when no messages */}
                        {messages.length === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, padding: '40px 20px', textAlign: 'center' }}>
                                <div style={{ marginBottom: '30px' }}>
                                    <img src="/MrLAD-logo.svg" alt="Mr LAD" style={{ width: '64px', height: 'auto', margin: '0 auto', display: 'block' }} />
                                </div>
                                <h2 style={{ fontSize: '24px', fontWeight: '600', margin: '0 0 20px', color: '#172560' }}>
                                    Hey! I am LAD, How can I help you today?
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '30px' }}>
                                    <button onClick={() => { setInput('Find leads in fintech'); taRef.current?.focus(); }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#374151', transition: 'all .15s' }}>
                                        <span>🔍</span> Find leads in fintech
                                    </button>
                                    <button onClick={() => { setInput('I want to find leads at a specific company'); taRef.current?.focus(); }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#374151', transition: 'all .15s' }}>
                                        <span>🏢</span> Target specific company
                                    </button>
                                    <button onClick={() => { setInput('VP of Sales in UAE SaaS companies with 50-250 employees'); taRef.current?.focus(); }} style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: '#fff', color: '#374151', transition: 'all .15s' }}>
                                        <span>👤</span> VP of Sales in UAE
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="adv-msgs-inner">
                        {messages.map((m, idx) => {
                            // Show real activities in the AI's thinking indicator (replace "Thinking...")
                            const displayMsg = isSearching && idx === messages.length - 1 && messages[idx].role === 'ai'
                                ? {
                                    ...m,
                                    content: activities.length > 0
                                        ? activities[activities.length - 1].message
                                        : 'Qualifying...'
                                }
                                : m;
                            return <Bubble key={m.id} msg={displayMsg} onOpt={onOptClick} onShowPanel={setShowPanel} onStartCheckpoints={() => setCpStep(0)} onStartTargeting={() => setTgStep(0)} hasPanel={!!showPanel} leadsCount={leads.length} onUploadClick={() => fileInputRef.current?.click()} />;
                        })}
                        </div>

                        {/* ── Inline Checkpoint Form (typeform-style) ── */}
                        {cpStep >= 0 && (
                        <div className="adv-msgs-inner">
                            <CheckpointFormInline
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
                                searchSessions={searchSessions}
                                chatMessages={messages}
                                pendingContact={pendingContact}
                                inboundMode={inboundMode}
                                inboundLeads={inboundLeads}
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
                                currentTargeting={targeting}
                                onConfirm={handleTargetingConfirm}
                                loading={busy}
                                setLoading={setBusy}
                            />
                        </div>
                        )}

                        <div ref={endRef} />
                    </div>

                    <div className="adv-chat-input-wrap">
                        <div className="adv-chat-input-box">
                            <textarea ref={taRef} value={input} rows={1} disabled={busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10)}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                                onKeyDown={onKey}
                                placeholder={creditBalance !== null && creditBalance <= 0 && msgCount >= 10 ? 'Message limit reached — add credits to continue' : 'Ask your AI Lead Finder...'}
                                className="adv-chat-ta" />
                            <div className="adv-chat-input-foot">
                                <div style={{position:'relative'}}>
                                    <button className="adv-chat-attach-btn" title="Add files or tools" onClick={(e) => { e.stopPropagation(); setShowChatAttachMenu(!showChatAttachMenu); }}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                                    </button>
                                    {showChatAttachMenu && (
                                        <div className="adv-attach-menu" onClick={e => e.stopPropagation()}>
                                            <div className="adv-attach-item" onClick={() => { fileInputRef.current?.click(); setShowChatAttachMenu(false); }}>
                                                <div className="adv-attach-icon" style={{background:'#dcfce7'}}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                                </div>
                                                <div>
                                                    <div className="adv-attach-label">Import leads</div>
                                                    <div className="adv-attach-sub">CSV, Excel, images, PDFs</div>
                                                </div>
                                            </div>
                                            <div className="adv-attach-divider"/>
                                            <div className="adv-attach-item" onClick={() => { setShowChatAttachMenu(false); router.push('/settings'); }}>
                                                <div className="adv-attach-icon" style={{background:'#fef3c7'}}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                                                </div>
                                                <div>
                                                    <div className="adv-attach-label">Connect tools</div>
                                                    <div className="adv-attach-sub">LinkedIn, HubSpot, Salesforce</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <span className="adv-model-label">
                                    AI Lead Finder
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                                </span>
                                <button className="adv-send-circle adv-send-sm" disabled={!input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10)} onClick={onChatSend}
                                    style={{ background: !input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10) ? '#e5e7eb' : '#172560', boxShadow: !input.trim() || busy ? 'none' : '0 2px 8px rgba(23,37,96,.3)' }}>
                                    {busy ? <div className="adv-spinner" /> : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                                </button>
                            </div>
                        </div>
                        <div className="adv-msg-counter">{creditBalance !== null && creditBalance > 0 ? `${msgCount} messages used` : `${msgCount}/10 messages used`}</div>
                    </div>
                    {/* Hidden file input — accepts all supported lead import formats */}
                    <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.jpg,.jpeg,.png,.pdf" className="hidden" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleInboundFile(f); e.target.value = ''; }} />
                </div>

                {/* RIGHT: PANELS */}
                {(showPanel === 'leads' || showPanel === 'workflow') && (leads.length > 0 || inboundLeads.length > 0 || showPanel === 'workflow') && (
                    <div className="adv-leads-panel">
                        {/* Split-screen panel header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 20px',
                            borderBottom: '1.5px solid #e5e7eb', background: '#fff', flexShrink: 0,
                        }}>
                            <div style={{ display: 'flex', gap: '4px', flex: 1, background: '#f3f4f6', borderRadius: '10px', padding: '3px' }}>
                                <button onClick={() => setShowPanel('leads')} style={{
                                    flex: 1, background: showPanel === 'leads' ? '#fff' : 'transparent',
                                    border: 'none', fontSize: '13.5px', fontWeight: 600,
                                    color: showPanel === 'leads' ? '#172560' : '#6b7280',
                                    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                                    boxShadow: showPanel === 'leads' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                                    transition: 'all .15s',
                                }}>
                                    👤 Leads {leads.length > 0 || inboundLeads.length > 0 ? `(${inboundMode ? inboundLeads.length : leads.length})` : ''}
                                </button>
                                <button onClick={() => setShowPanel('workflow')} style={{
                                    flex: 1, background: showPanel === 'workflow' ? '#fff' : 'transparent',
                                    border: 'none', fontSize: '13.5px', fontWeight: 600,
                                    color: showPanel === 'workflow' ? '#172560' : '#6b7280',
                                    borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
                                    boxShadow: showPanel === 'workflow' ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                                    transition: 'all .15s',
                                }}>
                                    ⚡ Workflow
                                </button>
                            </div>
                            <button onClick={() => setShowPanel(false)} style={{
                                width: '32px', height: '32px', borderRadius: '8px', border: '1px solid #e5e7eb',
                                background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0, transition: 'all .15s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {showPanel === 'leads' ? (
                        <div className="adv-panel-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="adv-panel-title" style={{ margin: 0 }}>
                                    {inboundMode ? 'Your Imported Leads' : 'Your Lead Results'}
                                </h2>
                                {!inboundMode && totalResults > 0 && (
                                    <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                        {((searchPage - 1) * leadCount) + 1}-{Math.min(searchPage * leadCount, totalResults)} of {totalResults}
                                    </span>
                                )}
                                {inboundMode && inboundLeads.length > 0 && (
                                    <span style={{ fontSize: '12px', background: '#e0eaf5', color: '#172560', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
                                        {inboundLeads.length} contacts
                                    </span>
                                )}
                                {!inboundMode && leads.length > 0 && totalResults === 0 && (
                                    <span style={{ fontSize: '12px', background: '#e0eaf5', color: '#172560', padding: '3px 10px', borderRadius: '20px', fontWeight: 600 }}>
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

                            {/* Inbound leads (CSV upload) */}
                            {inboundMode && inboundLeads.length > 0 && (
                                <div className="adv-leads-list">
                                    {inboundLeads.map((lead, i) => (
                                        <div key={i} className="adv-lead-card">
                                            <div className="adv-lead-avatar" style={{ background: avatarColor(`${lead.firstName} ${lead.lastName}`) }}>
                                                {initials(`${lead.firstName} ${lead.lastName}`) || '?'}
                                            </div>
                                            <div className="adv-lead-info">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span className="adv-lead-name">{[lead.firstName, lead.lastName].filter(Boolean).join(' ') || 'Unknown'}</span>
                                                    <span className="adv-verified">✓</span>
                                                </div>
                                                <div className="adv-lead-title">{lead.companyName || 'No company'}</div>
                                                {lead.email && <div style={{ fontSize: '12px', color: '#6b7280' }}>✉️ {lead.email}</div>}
                                                {lead.phone && <div style={{ fontSize: '12px', color: '#6b7280' }}>📞 {lead.phone}</div>}
                                                {lead.linkedinProfile && <div style={{ fontSize: '12px', color: '#0a66c2' }}>💼 LinkedIn</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* LinkedIn search leads */}
                            {!inboundMode && (
                            <div className="adv-leads-list">
                                {leads.map((lead, i) => (
                                    <div key={i} className={`adv-lead-card ${lead.locked ? 'adv-lead-locked' : ''}`}>
                                        {lead.profile_picture ? (
                                            <img src={lead.profile_picture} alt={lead.name} className="adv-lead-avatar-img" />
                                        ) : (
                                            <div className="adv-lead-avatar" style={{ background: avatarColor(lead.name) }}>
                                                {initials(lead.name)}
                                            </div>
                                        )}
                                        <div className="adv-lead-info">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <a href={lead.profile_url || '#'} target="_blank" rel="noopener noreferrer" className="adv-lead-name" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                    {lead.name} {!lead.locked && <span className="adv-verified">✓</span>}
                                                </a>
                                                {lead.icp_score !== undefined && (
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                                                        background: lead.match_level === 'strong' ? '#dcfce7' : lead.match_level === 'moderate' ? '#fef9c3' : '#fee2e2',
                                                        color: lead.match_level === 'strong' ? '#166534' : lead.match_level === 'moderate' ? '#854d0e' : '#991b1b',
                                                    }}>
                                                        {lead.match_level === 'strong' ? '🟢' : lead.match_level === 'moderate' ? '🟡' : '🔴'} {lead.icp_score}%
                                                    </span>
                                                )}
                                            </div>
                                            <div className="adv-lead-title">
                                                {lead.headline || lead.current_company || (lead.profile_url ? 'LinkedIn User' : lead.phone ? 'Phone Contact' : lead.email ? 'Email Contact' : 'Contact')}
                                            </div>
                                            {lead.location && <div className="adv-lead-location">📍 {lead.location}</div>}
                                            {lead.icp_reasoning && (
                                                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: '1.4', fontStyle: 'italic' }}>
                                                    {lead.icp_reasoning}
                                                </div>
                                            )}
                                            {lead.enriched_profile?.skills && lead.enriched_profile.skills.length > 0 && (
                                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                                                    {lead.enriched_profile.skills.slice(0, 4).map((skill, si) => (
                                                        <span key={si} style={{
                                                            padding: '1px 6px', borderRadius: '8px', fontSize: '10px',
                                                            background: '#f3f4f6', color: '#4b5563', border: '1px solid #e5e7eb',
                                                        }}>{skill}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {lead.profile_url ? (
                                                <div className="adv-lead-platform">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                                </div>
                                            ) : lead.phone ? (
                                                <div className="adv-lead-platform" style={{ fontSize: '13px' }}>📞</div>
                                            ) : lead.email ? (
                                                <div className="adv-lead-platform" style={{ fontSize: '13px' }}>✉️</div>
                                            ) : null}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                            <button
                                                className="adv-lead-action"
                                                title="Generate Summary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!lead.locked) handleViewSummary(lead);
                                                }}
                                                style={{ pointerEvents: lead.locked ? 'none' : 'auto', border: 'none', background: 'transparent', cursor: lead.locked ? 'default' : 'pointer' }}
                                            >
                                                {lead.locked ? (
                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" /></svg>
                                                ) : (
                                                    <Sparkles size={18} color="#172560" />
                                                )}
                                            </button>
                                            {!lead.locked && (
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    <button
                                                        title="Good match"
                                                        onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'good'); }}
                                                        style={{
                                                            border: 'none', background: leadFeedback[lead.id] === 'good' ? '#dcfce7' : 'transparent',
                                                            borderRadius: '6px', padding: '3px 5px', cursor: 'pointer', fontSize: '14px', lineHeight: 1,
                                                            transition: 'all 0.15s',
                                                        }}
                                                    >
                                                        👍
                                                    </button>
                                                    <button
                                                        title="Bad match"
                                                        onClick={(e) => { e.stopPropagation(); toggleFeedback(lead.id, 'bad'); }}
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

                            {/* Get More Leads button */}
                            {!inboundMode && searchCursor && (
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
                                            background: loadingMore ? '#f9fafb' : '#172560',
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
                            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                                {/* Workflow panel header */}
                                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#fff', flexShrink: 0 }}>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#111827', marginBottom: '4px' }}>Campaign Workflow</div>
                                    <div style={{ fontSize: '12.5px', color: '#6b7280' }}>Live preview of your outreach sequence</div>
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden', padding: '4px 0' }}>
                                    <WorkflowPreviewPanel />
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                                        border: plan.popular ? '2px solid #172560' : '1px solid #e5e7eb',
                                        background: plan.popular ? '#f0f4ff' : '#fff',
                                        cursor: 'pointer',
                                    }} onClick={() => {
                                        window.location.href = '/settings?tab=credits&action=add';
                                    }}>
                                        <div style={{ textAlign: 'left' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#111827' }}>
                                                {plan.name} {plan.popular && <span style={{ fontSize: '10px', background: '#172560', color: '#fff', padding: '2px 6px', borderRadius: '8px', marginLeft: '6px' }}>Popular</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{plan.credits} credits</div>
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#172560' }}>{plan.price}</div>
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
                                        background: '#172560', fontSize: '14px', fontWeight: 600, color: '#fff', cursor: 'pointer',
                                    }}
                                >
                                    Recharge Now
                                </button>
                            </div>
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
                loading={summaryLoading}
                error={summaryError}
            />
            <style>{css}</style>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════════════════ */
function Bubble({ msg, onOpt, onShowPanel, onStartCheckpoints, onStartTargeting, hasPanel, leadsCount, onUploadClick }: { msg: ChatMsg; onOpt: (v: string) => void; onShowPanel: (panel: 'leads' | 'workflow') => void; onStartCheckpoints: () => void; onStartTargeting: () => void; hasPanel: boolean; leadsCount: number; onUploadClick?: () => void }) {
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
            <div className="adv-ai-avatar"><span>✦</span></div>
            <div>
                <div className="adv-ai-name">AI Lead Finder</div>
                <div className="adv-thinking-wrap">
                    <span className={`adv-thinking-word${thinkVisible ? ' adv-tw-in' : ' adv-tw-out'}`}>
                        {THINKING_WORDS[thinkIdx]}...
                    </span>
                    <span className="adv-thinking-dots"><span /><span /><span /></span>
                </div>
            </div>
        </div>
    );
    if (msg.role === 'user') return (
        <div className="adv-bubble adv-bubble-user fadeUp">
            <div className="adv-user-msg">{msg.text}</div>
        </div>
    );
    return (
        <div className="adv-bubble adv-bubble-ai fadeUp">
            <div className="adv-ai-avatar"><span>✦</span></div>
            <div className="adv-ai-body">
                {msg.webSearchResult && (
                    <div className="adv-web-searched">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Searched the web
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                    </div>
                )}
                <div className="adv-ai-name">AI Lead Finder</div>

                {/* ── Dynamic AI text (markdown-aware rendering) ── */}
                <div className="adv-ai-text" style={{ marginBottom: msg.targeting ? "16px" : "0" }}>
                    {msg.text.split('\n').map((line, i) => {
                        // Bold: **text**
                        const parts = line.split(/(\*\*[^*]+\*\*)/g);
                        const rendered = parts.map((p, j) =>
                            p.startsWith('**') && p.endsWith('**')
                                ? <strong key={j}>{p.slice(2, -2)}</strong>
                                : p
                        );
                        if (!line.trim()) return <br key={i} />;
                        if (line.startsWith('• ')) return <p key={i} style={{ margin: '2px 0', paddingLeft: '4px' }}>• {rendered.map((r, j) => <span key={j}>{typeof r === 'string' ? r.replace(/^• /, '') : r}</span>)}</p>;
                        return <p key={i} style={{ margin: '3px 0' }}>{rendered}</p>;
                    })}
                </div>

                {/* ── Web search source links ── */}
                {msg.sources && msg.sources.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', letterSpacing: '0.06em', marginBottom: '8px', textTransform: 'uppercase' }}>
                            Sources
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {msg.sources.slice(0, 5).map((src, i) => {
                                let hostname = '';
                                try { hostname = new URL(src.url).hostname.replace('www.', ''); } catch { hostname = src.url; }
                                return (
                                    <a
                                        key={i}
                                        href={src.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '7px',
                                            fontSize: '12px', color: '#2563eb', textDecoration: 'none',
                                            padding: '5px 8px', borderRadius: '8px', background: '#f8faff',
                                            border: '1px solid #e0eaf5', transition: 'background .12s',
                                        }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#eef2ff')}
                                        onMouseLeave={e => (e.currentTarget.style.background = '#f8faff')}
                                    >
                                        {/* Globe icon */}
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" flexShrink="0" style={{ flexShrink: 0 }}>
                                            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                        </svg>
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {src.title || hostname}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0 }}>{hostname}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ── NAS.io-style MAIN PRODUCT CARD (only for first search results) ── */}
                {msg.targeting && (
                    <div
                        className="adv-main-product-card"
                        onClick={onStartCheckpoints}
                        style={{
                            background: "#f9fafb",
                            border: "1px solid #e5e7eb",
                            borderRadius: "14px",
                            padding: "16px",
                            cursor: "pointer",
                            transition: "all 0.15s",
                            marginBottom: "12px",
                            marginTop: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "14px"
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#f3f4f6"; e.currentTarget.style.borderColor = "#172560"; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#f9fafb"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                    >
                        <div style={{
                            width: "48px", height: "48px", background: "#172560", borderRadius: "10px",
                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0
                        }}>
                            🏆
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginBottom: "4px" }}>
                                Automate Your Business Processes with AI Agents
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>V1</div>
                        </div>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                    </div>
                )}

                {/* ── NAS.io-style clickable result cards ── */}
                {msg.targeting && (
                    <div className="adv-result-cards" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        {/* Targeting card */}
                        <div className="adv-rc" onClick={onStartTargeting} style={{
                            flex: 1, padding: "14px", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "#fff"
                        }}>
                            <div className="adv-rc-icon adv-rc-icon-target" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center" }}>🎯</div>
                            <div className="adv-rc-body" style={{ flex: 1 }}>
                                <div className="adv-rc-label" style={{ fontSize: "13px", fontWeight: 700 }}>Targeting</div>
                                <div className="adv-rc-sub" style={{ fontSize: "11px", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <span style={{ color: "#10b981" }}>✓</span> Param extracted
                                </div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                        <div className="adv-rc adv-rc-leads" onClick={() => onShowPanel('leads')} style={{
                            flex: 1, padding: "14px", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "#fff"
                        }}>
                            <div className="adv-rc-icon adv-rc-icon-leads" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0eaf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#172560" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" /></svg>
                            </div>
                            <div className="adv-rc-body" style={{ flex: 1 }}>
                                <div className="adv-rc-label" style={{ fontSize: "13px", fontWeight: 700 }}>Leads</div>
                                <div className="adv-rc-sub" style={{ fontSize: "11px", color: "#172560", fontWeight: 500 }}>{leadsCount} Leads found</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                        <div className="adv-rc adv-rc-leads" onClick={() => onShowPanel('workflow')} style={{
                            flex: 1, padding: "14px", border: "1px solid #e5e7eb", borderRadius: "12px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "#fff"
                        }}>
                            <div className="adv-rc-icon" style={{ width: "32px", height: "32px", borderRadius: "8px", background: "#e0eaf5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                ⚡
                            </div>
                            <div className="adv-rc-body" style={{ flex: 1 }}>
                                <div className="adv-rc-label" style={{ fontSize: "13px", fontWeight: 700 }}>Workflow</div>
                                <div className="adv-rc-sub" style={{ fontSize: "11px", color: "#172560", fontWeight: 500 }}>Live preview</div>
                            </div>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                        </div>
                    </div>
                )}

                {/* ── NAS.io-style action buttons ── */}
                {msg.targeting && (
                    <div className="adv-action-btns" style={{ display: "flex", gap: "8px", flexWrap: "wrap", borderTop: "1px solid #e5e7eb", paddingTop: "12px" }}>
                        <button className="adv-act-btn" style={{
                            padding: "6px 14px", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "20px", fontSize: "12px", fontWeight: 600, color: "#374151"
                        }} onClick={() => onOpt('Refine my targeting criteria')}>Refine</button>
                        <button className="adv-act-btn" style={{
                            padding: "6px 14px", background: "#f2f6fa", border: "1px solid #172560", borderRadius: "20px", fontSize: "12px", fontWeight: 600, color: "#172560"
                        }} onClick={onStartCheckpoints}>Create Campaign Checkpoints</button>
                    </div>
                )}

                {/* ── Inbound: Download Template + Upload buttons ── */}
                {(msg.inboundAction === 'download' || msg.inboundAction === 'upload') && (
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e5e7eb' }}>
                        <button onClick={downloadInboundTemplate} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                            background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', color: '#fff',
                            border: 'none', borderRadius: '12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(16,185,129,0.25)', transition: 'all 0.2s',
                        }}><Download size={16} /> Download Template</button>
                        <button onClick={() => onUploadClick?.()} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 18px',
                            background: '#fff', color: '#172560', border: '2px solid #172560', borderRadius: '12px',
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s',
                        }}><Upload size={16} /> Upload CSV File</button>
                    </div>
                )}

                {/* ── Inbound: Summary with platform badges ── */}
                {msg.inboundAction === 'summary' && msg.inboundSummary && (
                    <div style={{ marginTop: '12px', padding: '14px', background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)', borderRadius: '14px', border: '1px solid #a7f3d0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <CheckCircle2 size={18} color="#059669" />
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#065f46' }}>{msg.inboundSummary.total} Leads Ready</span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {msg.inboundSummary.linkedin > 0 && <span style={{ fontSize: '11px', background: '#fff', color: '#1e40af', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}><LinkedInIcon size={12} /> LinkedIn ({msg.inboundSummary.linkedin})</span>}
                            {msg.inboundSummary.email > 0 && <span style={{ fontSize: '11px', background: '#fff', color: '#be185d', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid #fbcfe8' }}>✉️ Email ({msg.inboundSummary.email})</span>}
                            {msg.inboundSummary.whatsapp > 0 && <span style={{ fontSize: '11px', background: '#fff', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid #bbf7d0' }}>💬 WhatsApp ({msg.inboundSummary.whatsapp})</span>}
                            {msg.inboundSummary.phone > 0 && <span style={{ fontSize: '11px', background: '#fff', color: '#9a3412', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid #fed7aa' }}>📞 Phone ({msg.inboundSummary.phone})</span>}
                            {msg.inboundSummary.website > 0 && <span style={{ fontSize: '11px', background: '#fff', color: '#6b21a8', padding: '4px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid #e9d5ff' }}>🌐 Website ({msg.inboundSummary.website})</span>}
                        </div>
                    </div>
                )}

                {/* Option buttons from AI */}
                {msg.options && msg.options.length > 0 && (
                    <div className="adv-opts">
                        {msg.options.map((o, i) => <button key={i} className="adv-opt-btn" onClick={() => onOpt(o.value)}>{o.label}</button>)}
                    </div>
                )}

                {/* ── Lead Detail Form (inline card) ── */}
                {msg.leadDetailForm && (
                    <div style={{
                        marginTop: '12px', background: '#fff', border: '1.5px solid #e0eaf5',
                        borderRadius: '16px', padding: '20px', maxWidth: '460px',
                        boxShadow: '0 4px 16px rgba(23,37,96,0.06)',
                    }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#172560', marginBottom: '14px', letterSpacing: '.01em' }}>
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
                                width: '100%', padding: '11px', background: '#172560', color: '#fff',
                                border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                cursor: 'pointer', transition: 'all .15s', boxShadow: '0 2px 8px rgba(23,37,96,.2)',
                            }}
                            onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = '#0f1842'; }}
                            onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = '#172560'; }}
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
const CP_QUESTIONS = [
    { id: 'icp_threshold', question: 'What minimum ICP score should leads have?', type: 'select' },
    { id: 'actions', question: 'What LinkedIn actions should this campaign perform?', type: 'multi' },
    { id: 'messages', question: 'Customize your outreach messages', type: 'text' },
    { id: 'next_channels', question: 'Add follow-up channels after LinkedIn outreach?', type: 'multi' },
    { id: 'trigger_condition', question: 'When should the next channel step trigger?', type: 'select' },
    { id: 'duration', question: 'How many days should this campaign run?', type: 'select' },
    { id: 'name', question: 'Give your campaign a name', type: 'input' },
];

function CheckpointFormInline({
    step, setStep, icpThreshold, setIcpThreshold, actions, setActions, connMsg, setConnMsg, followMsg, setFollowMsg,
    nextChannels, setNextChannels, triggerCondition, setTriggerCondition,
    days, setDays, name, setName, genLoading, setGenLoading, launching, setLaunching, targeting, leads,
    leadFeedback, searchSessions, chatMessages,
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
    pendingContact, inboundMode, inboundLeads,
}: {
    step: number; setStep: (s: number) => void;
    icpThreshold: string; setIcpThreshold: (v: string) => void;
    actions: string[]; setActions: React.Dispatch<React.SetStateAction<string[]>>;
    connMsg: string; setConnMsg: (v: string) => void;
    followMsg: string; setFollowMsg: (v: string) => void;
    nextChannels: string[]; setNextChannels: React.Dispatch<React.SetStateAction<string[]>>;
    triggerCondition: string; setTriggerCondition: (v: string) => void;
    days: string; setDays: (v: string) => void;
    name: string; setName: (v: string) => void;
    genLoading: boolean; setGenLoading: (v: boolean) => void;
    launching: boolean; setLaunching: (v: boolean) => void;
    targeting: LeadTargeting | null;
    leads: LeadProfile[];
    leadFeedback: Record<string, 'good' | 'bad'>;
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

    // Auto-skip LinkedIn steps for direct contacts (step 0→3 on mount)
    // Also skip step 4 (trigger condition) for direct contacts — LinkedIn-only concept
    useEffect(() => {
        if (isDirectContact && step >= 0 && step < 3) {
            setIcpThreshold('0'); // all leads (only 1 contact)
            setStep(3);
        }
        if (isDirectContact && step === 4) {
            setStep(5); // jump over trigger condition
        }
    }, [isDirectContact, step]); // eslint-disable-line react-hooks/exhaustive-deps

    // SDK hooks — email templates fetched from communication_templates table
    const { data: emailTemplates = [] } = useEmailTemplates({ is_active: true });
    const createEmailTemplate = useCreateEmailTemplate();

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
            .catch(() => {});
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
            .catch(() => {});
    }, [nextChannels, waTemplatesLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

    // Sync waNewTmplChannelType with selected account type
    useEffect(() => {
        if (!waAccountId || !whatsAppAccounts.length) return;
        const acc = whatsAppAccounts.find((a: any) => a.id === waAccountId);
        if (acc) setWaNewTmplChannelType(acc.account_type === 'business_api' ? 'business_api' : 'personal_whatsapp');
    }, [waAccountId, whatsAppAccounts]); // eslint-disable-line react-hooks/exhaustive-deps

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
        } catch {}
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
        } catch {}
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
        } catch {}
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
    const LINKEDIN_DAILY_LIMIT = 25; // safe daily connection request limit
    const LINKEDIN_WEEKLY_LIMIT = 100; // safe weekly limit

    // Compute qualified leads count based on ICP threshold
    const qualifiedLeadCount = leads.filter(l => (l.icp_score ?? 0) >= (parseInt(icpThreshold) || 0)).length;

    // Compute LinkedIn capacity based on campaign duration
    const campaignDays = parseInt(days) || 30;
    const workingDays = Math.max(1, Math.floor(campaignDays * 5 / 7)); // Mon-Fri only, at least 1
    const campaignWeeks = Math.ceil(campaignDays / 7);
    const dailyCapacity = workingDays * LINKEDIN_DAILY_LIMIT;
    const weeklyCapacity = campaignWeeks * LINKEDIN_WEEKLY_LIMIT;
    const totalLinkedInCapacity = Math.min(dailyCapacity, weeklyCapacity);
    const safeLeadsPerDay = Math.min(LINKEDIN_DAILY_LIMIT, Math.max(1, Math.floor(qualifiedLeadCount / Math.max(workingDays, 1))));
    const exceedsLinkedInLimits = qualifiedLeadCount > totalLinkedInCapacity;

    const toggleAction = (a: string) => {
        const newActions = actions.includes(a) ? actions.filter(x => x !== a) : [...actions, a];
        console.log('✅ Action toggled:', a, '→ Actions now:', newActions);
        setActions(newActions);
    };
    const toggleNextChannel = (ch: string) => {
        if (ch === 'skip') { setNextChannels([]); return; }
        setNextChannels((p: string[]) => p.includes(ch) ? p.filter(x => x !== ch) : [...p, ch]);
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
        const titlePart = targeting?.job_titles?.length ? targeting.job_titles[0] + 's' : 'Leads';
        const locPart = targeting?.locations?.length ? ` in ${targeting.locations[0].split(',')[0]}` : '';
        const indPart = targeting?.industries?.length && !locPart ? ` (${targeting.industries[0]})` : '';
        const datePart = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        setName(`${titlePart}${locPart}${indPart} - ${datePart}`);
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
            console.log('🔍 Building actionSteps:', { inboundMode, isDirectContact, actions });
            if (!isDirectContact) {
                // LinkedIn flow: connect / message steps (not relevant for direct phone/email contacts)
                if (actions.includes('connect')) actionSteps.push({ type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', order_index: orderIdx++, config: { message: connMsg || '' } });
                if (actions.includes('message')) actionSteps.push({ type: 'linkedin_message', title: 'Send Follow-up Message', channel: 'linkedin', order_index: orderIdx++, config: { message: followMsg || '' } });
                // For inbound campaigns: add linkedin_visit if selected (view profile only)
                if (inboundMode && actions.includes('profile_view')) {
                    console.log('✅ Adding linkedin_visit step for inbound campaign');
                    actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: {} });
                }
            }
            console.log('📋 Final actionSteps:', actionSteps);

            if (isDirectContact && nextChannels.length > 0) {
                // Direct contact (phone/email only): add channel steps immediately — no LinkedIn trigger needed
                for (const ch of nextChannels) {
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { message: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined } });
                    if (ch === 'linkedin') actionSteps.push({ type: 'linkedin_visit', title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: orderIdx++, config: {} });
                }
            } else if (!isDirectContact && nextChannels.length > 0 && triggerCondition) {
                // LinkedIn flow: wait for LinkedIn condition, then trigger follow-up channels
                const conditionTitleMap: Record<string, string> = {
                    connection_accepted: 'Wait for Connection Accepted',
                    message_replied: 'Wait for Message Reply',
                    profile_visited: 'Wait for Profile Visit',
                };
                const conditionActionMap: Record<string, string> = {
                    connection_accepted: 'CONNECTION_ACCEPTED',
                    message_replied: 'REPLY_RECEIVED',
                    profile_visited: 'PROFILE_VISITED',
                };
                actionSteps.push({
                    type: 'wait_for_condition', title: conditionTitleMap[triggerCondition] || 'Wait for Condition',
                    channel: 'linkedin', order_index: orderIdx++,
                    config: {
                        condition: triggerCondition,
                        action_type: conditionActionMap[triggerCondition] || 'PROFILE_VISITED',
                        ...(triggerCondition === 'profile_visited' ? { icp_threshold: parseInt(icpThreshold) || 0 } : {}),
                    },
                });
                for (const ch of nextChannels) {
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Follow-up Email', channel: 'email', order_index: orderIdx++, config: { subject: emailSubject || '', body: emailBody || '', template_id: selectedEmailTemplateId || undefined, from_email: emailFromAddress || undefined, email_provider: emailProvider || undefined } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { message: waBody || '', whatsapp_account_id: waAccountId || undefined, whatsapp_template_id: selectedWaTemplateId || undefined } });
                    if (ch === 'voice_call') actionSteps.push({ type: 'voice_agent_call', title: 'AI Voice Call', channel: 'voice', order_index: orderIdx++, config: { agent_id: selectedAgentId || undefined, voice_id: selectedVoiceId || undefined, from_number: selectedFromNumber || undefined } });
                }
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
                linkedin_actions: actions,
                connection_message: connMsg || '',
                followup_message: followMsg || '',
                next_channels: nextChannels,
                trigger_condition: triggerCondition || null,
                campaign_days: campaignDays,
                campaign_name: name || 'AI Growth Campaign',
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

            // For direct contacts (phone/email only): include ALL leads (not just thumbs-up)
            // For LinkedIn search campaigns: only include user-approved "good match" leads
            const goodMatchLeads = leads
                .filter(l => leadFeedback[l.id] === 'good')
                .map(l => mapLead(l, 'user_good_match'));

            const directContactLeads = isDirectContact
                ? leads.map(l => mapLead(l, 'direct_contact'))
                : [];

            // Inbound leads from CSV/image upload
            const inboundContactLeads = inboundMode && inboundLeads.length > 0
                ? inboundLeads.map((il, idx) => mapLead({
                    id: `inbound-${idx}`,
                    name: `${il.firstName} ${il.lastName}`.trim() || `Lead ${idx + 1}`,
                    first_name: il.firstName,
                    last_name: il.lastName,
                    headline: il.companyName ? `at ${il.companyName}` : '',
                    location: '',
                    current_company: il.companyName,
                    profile_url: il.linkedinProfile,
                    profile_picture: '',
                    industry: '',
                    network_distance: '',
                }, 'inbound_lead'))
                : [];

            const payload = {
                name: name || 'AI Growth Campaign', status: 'active',
                campaign_type: inboundMode ? 'direct_outreach' : (isDirectContact ? 'direct_outreach' : 'linkedin_outreach'),
                leads_per_day: safeLeadsPerDay,
                campaign_start_date: startDate.toISOString(), campaign_end_date: endDate.toISOString(),
                // Inbound leads take priority; then direct contacts; then LinkedIn good matches
                initial_leads: inboundMode && inboundContactLeads.length > 0
                    ? inboundContactLeads
                    : (isDirectContact && directContactLeads.length > 0
                        ? directContactLeads
                        : (goodMatchLeads.length > 0 ? goodMatchLeads : undefined)),
                config: {
                    data_source: inboundMode ? 'csv_import' : (isDirectContact ? 'direct_contact' : 'linkedin_search'),
                    search_intent: (inboundMode || isDirectContact) ? null : t, search_query: (inboundMode || isDirectContact) ? '' : (t.keywords?.join(' ') || ''),
                    leads_per_day: safeLeadsPerDay, daily_lead_limit: safeLeadsPerDay, linkedin_daily_limit: LINKEDIN_DAILY_LIMIT, linkedin_weekly_limit: LINKEDIN_WEEKLY_LIMIT, working_days: 'monday-friday', campaign_days: campaignDays,
                    linkedin_actions: actions, connection_message: connMsg || '', followup_message: followMsg || '',
                    next_channels: nextChannels, trigger_condition: triggerCondition || null,
                    location: t.locations?.[0] || '', industries: t.industries || [], job_titles: t.job_titles || [],
                    profile_language: t.profile_language || [],
                    icp_threshold: icpMin,
                    icp_input: initialIcpInput,
                    checkpoint_selections: checkpointSelections,
                    search_filters: { keywords: t.keywords?.join(' ') || '', industries: t.industries || [], locations: t.locations || [], job_titles: t.job_titles || [], profile_language: t.profile_language || [] },
                    lead_feedback: feedbackSummary,
                    search_sessions: searchSessions.slice(0, 10),
                    user_messages: userMessages,
                    conversation_history: chatMessages.map(m => ({ role: m.role, text: m.text, ts: m.ts })).slice(0, 50),
                },
                steps: [
                    // Only include LinkedIn lead generation step for LinkedIn search campaigns.
                    // Direct contact and inbound lead campaigns skip this — leads are provided via initial_leads instead.
                    ...(!isDirectContact && !inboundMode ? [{
                        type: 'lead_generation', title: 'LinkedIn Lead Search', channel: 'linkedin', order_index: 0, config: {
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
                        }
                    }] : []),
                    ...actionSteps,
                ],
            };
            console.log('📤 Campaign creation payload:', {
                name: payload.name,
                stepsCount: payload.steps?.length || 0,
                steps: payload.steps || [],
                actionSteps: actionSteps,
                actions: actions,
                inboundMode: inboundMode,
                isDirectContact: isDirectContact
            });
            const data = await campaignCreation.createCampaign(payload);
            if (data?.success) { window.location.href = '/campaigns'; }
            else { alert('Failed to launch campaign: ' + (data?.error || 'Unknown error')); setLaunching(false); }
        } catch (err: any) { console.error('Campaign creation error', err); alert('Error: ' + err.message); setLaunching(false); }
    };

    const canNext = () => {
        if (step === 0) return !!icpThreshold;
        if (step === 1) return isDirectContact ? true : actions.length > 0; // LinkedIn actions not needed for direct contacts
        if (step === 2) return true; // messages
        if (step === 3) return true; // outreach/follow-up channels (skip is valid)
        if (step === 4) return nextChannels.length === 0 || !!triggerCondition; // trigger condition (skip if no channels)
        if (step === 5) return !!days;
        if (step === 6) return !!name.trim();
        return true;
    };

    // handleNext/handleBack: skip LinkedIn steps (0–2) AND trigger condition (4) for direct contacts
    const handleNext = () => {
        let next = step + 1;
        // Skip step 4 (trigger condition) if: no next channels selected, OR this is a direct contact
        // (trigger condition is only meaningful after LinkedIn actions, which direct contacts don't have)
        if (next === 4 && (nextChannels.length === 0 || isDirectContact)) next = 5;
        // For direct contacts (phone/email only), skip LinkedIn steps 0–2
        if (isDirectContact && next < 3) next = 3;
        setStep(next);
    };
    const handleBack = () => {
        let prev = step - 1;
        // Skip step 4 (trigger condition) going back if: no next channels, OR direct contact
        if (prev === 4 && (nextChannels.length === 0 || isDirectContact)) prev = 3;
        // For direct contacts, don't go back into LinkedIn steps
        if (isDirectContact && prev < 3) { setStep(-1); return; }
        setStep(Math.max(0, prev));
    };

    const baseBox: React.CSSProperties = {
        background: '#fff', border: '1px solid #e0eaf5', borderRadius: '16px',
        padding: '24px', maxWidth: '520px', width: '100%',
        boxShadow: '0 4px 20px rgba(23,37,96,0.06)', animation: 'fadeUp 0.3s ease both',
    };

    const optStyle = (selected: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        border: `2px solid ${selected ? '#172560' : '#e5e7eb'}`,
        background: selected ? '#eef2ff' : '#fff',
        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        fontSize: '14px', fontWeight: 500, color: selected ? '#172560' : '#374151',
    });

    const numBadge = (n: number, selected: boolean): React.CSSProperties => ({
        width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0,
        border: `2px solid ${selected ? '#172560' : '#d1d5db'}`,
        background: selected ? '#172560' : 'transparent',
        color: selected ? '#fff' : '#6b7280',
    });

    // Guard: if question isn't resolved yet (during auto-skip transition), show nothing
    if (!q) return null;

    return (
        <div className="adv-bubble adv-bubble-ai fadeUp" style={{ marginBottom: '16px' }}>
            <div className="adv-ai-avatar"><span>✦</span></div>
            <div style={{ flex: 1, maxWidth: '540px' }}>
                <div className="adv-ai-name" style={{ marginBottom: '8px' }}>AI Lead Finder</div>

                {/* Question header */}
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', marginBottom: '16px', lineHeight: 1.4 }}>
                    {q.question}
                </div>

                <div style={baseBox}>
                    {/* Step 0: ICP Threshold */}
                    {step === 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[
                                { value: '80', label: 'Above 80%', desc: 'Only top-tier matches' },
                                { value: '75', label: 'Above 75%', desc: 'High quality leads' },
                                { value: '50', label: 'Above 50%', desc: 'Moderate fit and above' },
                                { value: '25', label: 'Above 25%', desc: 'Include most leads' },
                                { value: '0', label: 'All Leads', desc: 'No filtering — include everyone' },
                            ].map((opt, i) => {
                                const selected = icpThreshold === opt.value;
                                const count = leads.filter(l => (l.icp_score ?? 0) >= parseInt(opt.value)).length;
                                return (
                                    <div key={opt.value} onClick={() => setIcpThreshold(opt.value)} style={optStyle(selected)}>
                                        <div style={numBadge(i + 1, selected)}>{selected ? '✓' : i + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{opt.label}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{opt.desc}</div>
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: selected ? '#172560' : '#9ca3af', whiteSpace: 'nowrap' }}>
                                            {count} lead{count !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Step 1: LinkedIn Actions */}
                    {step === 1 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* LinkedIn limits info banner */}
                            <div style={{
                                padding: '10px 14px', borderRadius: '10px', fontSize: '12px', lineHeight: 1.5,
                                background: exceedsLinkedInLimits ? '#fef3c7' : '#f0fdf4',
                                border: `1px solid ${exceedsLinkedInLimits ? '#f59e0b' : '#86efac'}`,
                                color: exceedsLinkedInLimits ? '#92400e' : '#166534',
                            }}>
                                <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                                    {qualifiedLeadCount} qualified lead{qualifiedLeadCount !== 1 ? 's' : ''} (ICP &ge; {icpThreshold}%)
                                </div>
                                <div>
                                    LinkedIn safe limits: <strong>{LINKEDIN_DAILY_LIMIT}/day</strong>, <strong>{LINKEDIN_WEEKLY_LIMIT}/week</strong>.
                                    {exceedsLinkedInLimits ? (
                                        <span> Over {campaignDays} days, LinkedIn actions will be limited to <strong>{totalLinkedInCapacity} leads</strong> ({safeLeadsPerDay}/day). Remaining leads will be queued beyond the campaign period.</span>
                                    ) : (
                                        <span> Your {qualifiedLeadCount} leads fit within the {campaignDays}-day campaign window.</span>
                                    )}
                                </div>
                            </div>
                            {[
                                { id: 'connect', label: 'Send connection request', desc: 'Auto-connect with leads on LinkedIn' },
                                { id: 'message', label: 'Send follow-up message', desc: 'Message after connection accepted' },
                                { id: 'profile_view', label: 'View profile only', desc: 'Just visit their profile (no action)' },
                            ].map((a, i) => (
                                <div key={a.id} onClick={() => toggleAction(a.id)} style={optStyle(actions.includes(a.id))}>
                                    <div style={numBadge(i + 1, actions.includes(a.id))}>{actions.includes(a.id) ? '✓' : i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{a.label}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{a.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 2: Messages */}
                    {step === 2 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {actions.includes('connect') && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Connection Request</label>
                                        <button disabled={genLoading} onClick={() => generateMsg('connect')} style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: genLoading ? '#9ca3af' : '#172560', cursor: genLoading ? 'default' : 'pointer' }}>
                                            {genLoading ? 'Generating...' : '✨ AI Generate'}
                                        </button>
                                    </div>
                                    <textarea style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '10px', padding: '12px', fontSize: '13px', height: '80px', background: '#fafbff', outline: 'none', resize: 'none', fontFamily: 'inherit' }} value={connMsg} onChange={e => setConnMsg(e.target.value)} placeholder='Hi {first_name}, I noticed we share interests in...' />
                                </div>
                            )}
                            {actions.includes('message') && (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                        <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Follow-up Message</label>
                                        <button disabled={genLoading} onClick={() => generateMsg('follow')} style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: genLoading ? '#9ca3af' : '#172560', cursor: genLoading ? 'default' : 'pointer' }}>
                                            {genLoading ? 'Generating...' : '✨ AI Generate'}
                                        </button>
                                    </div>
                                    <textarea style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '10px', padding: '12px', fontSize: '13px', height: '80px', background: '#fafbff', outline: 'none', resize: 'none', fontFamily: 'inherit' }} value={followMsg} onChange={e => setFollowMsg(e.target.value)} placeholder='Thanks for connecting! ...' />
                                </div>
                            )}
                            {!actions.includes('connect') && !actions.includes('message') && (
                                <div style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic', padding: '12px 0' }}>No messaging actions selected. You can proceed to the next step.</div>
                            )}
                        </div>
                    )}

                    {/* Step 3: Next Channel Sequence */}
                    {step === 3 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Context badge for direct contacts */}
                            {isDirectContact && (
                                <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', fontSize: '12px', color: '#166534', fontWeight: 500, marginBottom: '4px' }}>
                                    {hasPhone && hasEmail
                                        ? `📱✉️ Phone & email detected — select how you want to reach this contact${hasLinkedInInfo ? ' (LinkedIn available)' : ''}`
                                        : hasPhone
                                        ? `📱 Phone detected — WhatsApp or Voice Call recommended${hasLinkedInInfo ? ' · LinkedIn available' : ''}`
                                        : `✉️ Email detected — Email outreach recommended${hasLinkedInInfo ? ' · LinkedIn available' : ''}`}
                                </div>
                            )}
                            {[
                                { id: 'email', label: 'Email', desc: isDirectContact ? 'Send an email to this contact' : 'Send a follow-up email to the lead', icon: '✉️', disabled: isDirectContact && !hasEmail },
                                { id: 'whatsapp', label: 'WhatsApp', desc: isDirectContact ? 'Send a WhatsApp message to this contact' : 'Send a WhatsApp message', icon: '💬', disabled: isDirectContact && !hasPhone },
                                { id: 'voice_call', label: 'Voice Call', desc: isDirectContact ? 'Trigger an AI voice call to this contact' : 'Trigger an AI voice call', icon: '📞', disabled: isDirectContact && !hasPhone },
                                // LinkedIn: shown for non-direct contacts always; for direct contacts only if name+company detected
                                ...(hasLinkedInInfo ? [{
                                    id: 'linkedin', icon: '💼', label: 'LinkedIn',
                                    desc: isDirectContact
                                        ? 'Visit & connect on LinkedIn (name + company detected)'
                                        : 'Additional LinkedIn touchpoint',
                                    disabled: false,
                                }] : []),
                            ].filter(ch => !ch.disabled).map((ch, i) => (
                                <div key={ch.id} onClick={() => toggleNextChannel(ch.id)} style={optStyle(nextChannels.includes(ch.id))}>
                                    <div style={numBadge(i + 1, nextChannels.includes(ch.id))}>{nextChannels.includes(ch.id) ? '✓' : i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{ch.icon} {ch.label}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{ch.desc}</div>
                                    </div>
                                </div>
                            ))}
                            {!isDirectContact && (
                            <div onClick={() => { setNextChannels([]); setStep(step + 1); }} style={optStyle(nextChannels.length === 0)}>
                                <div style={numBadge(4, nextChannels.length === 0)}>{nextChannels.length === 0 ? '✓' : 4}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>Skip</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>No additional channels — LinkedIn only</div>
                                </div>
                            </div>
                            )}

                            {/* Email Config (inline when email selected) */}
                            {nextChannels.includes('email') && (
                                <div style={{ marginTop: '12px', padding: '14px', background: '#f8faff', border: '1px solid #e0eaf5', borderRadius: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#172560' }}>✉️ Email Settings</div>
                                        <button disabled={emailGenLoading} onClick={generateEmail}
                                            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: emailGenLoading ? '#9ca3af' : '#172560', cursor: emailGenLoading ? 'default' : 'pointer' }}>
                                            {emailGenLoading ? 'Generating...' : '✨ AI Generate'}
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* From account selector */}
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>
                                                Send From <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            {connectedSenders.length > 0 ? (
                                                <select
                                                    value={emailFromAddress}
                                                    onChange={e => {
                                                        const sender = connectedSenders.find(s => s.email === e.target.value);
                                                        setEmailFromAddress(e.target.value);
                                                        setEmailProvider(sender?.provider || '');
                                                    }}
                                                    style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none' }}>
                                                    <option value="">— Select sender account —</option>
                                                    {connectedSenders.map(s => (
                                                        <option key={s.email} value={s.email}>
                                                            {s.provider === 'google' ? '📧 Gmail' : '📨 Outlook'} — {s.email}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#ef4444', padding: '8px 10px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: '8px' }}>
                                                    No email account connected.{' '}
                                                    <a href="/settings?tab=integrations" style={{ color: '#172560', fontWeight: 600 }}>Connect Gmail or Outlook →</a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Template picker */}
                                        {emailTemplates.length > 0 && (
                                            <div>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Use Saved Template</label>
                                                <select
                                                    value={selectedEmailTemplateId}
                                                    onChange={e => {
                                                        const tpl = emailTemplates.find(t => t.id === e.target.value);
                                                        if (tpl) { setEmailSubject(tpl.subject); setEmailBody(tpl.body); }
                                                        setSelectedEmailTemplateId(e.target.value);
                                                    }}
                                                    style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none' }}>
                                                    <option value="">— Select a template —</option>
                                                    {emailTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        {/* Subject */}
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Subject <span style={{ color: '#ef4444' }}>*</span></label>
                                            <input
                                                type="text"
                                                value={emailSubject}
                                                onChange={e => setEmailSubject(e.target.value)}
                                                placeholder="e.g. Quick question for {{first_name}}"
                                                style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none', fontFamily: 'inherit' }}
                                            />
                                        </div>
                                        {/* Body */}
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>Email Body <span style={{ color: '#ef4444' }}>*</span></label>
                                            <textarea
                                                value={emailBody}
                                                onChange={e => setEmailBody(e.target.value)}
                                                placeholder={'Hi {{first_name}},\n\nI came across your profile at {{company}} and wanted to reach out...\n\nBest,\n[Your name]'}
                                                rows={6}
                                                style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', background: '#fff', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                                            />
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
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
                                                    style={{ padding: '8px 14px', background: '#172560', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
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

                            {/* WhatsApp Config (inline when whatsapp selected) */}
                            {nextChannels.includes('whatsapp') && (
                                <div style={{ marginTop: '12px', padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                                    {/* Header row */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#166534' }}>💬 WhatsApp Settings</div>
                                        <button disabled={waGenLoading} onClick={generateWhatsApp}
                                            style={{ background: 'none', border: 'none', fontSize: '12px', fontWeight: 700, color: waGenLoading ? '#9ca3af' : '#166534', cursor: waGenLoading ? 'default' : 'pointer' }}>
                                            {waGenLoading ? 'Generating...' : '✨ AI Generate'}
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {/* Send From selector */}
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>
                                                Send From <span style={{ color: '#ef4444' }}>*</span>
                                            </label>
                                            {whatsAppAccounts.length > 0 ? (
                                                <select value={waAccountId} onChange={e => setWaAccountId(e.target.value)}
                                                    style={{ width: '100%', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none' }}>
                                                    <option value="">— Select WhatsApp account —</option>
                                                    {whatsAppAccounts.map((acc: any) => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.display_name} ({acc.account_type === 'business_api' ? 'Business API' : 'Personal'})
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#b45309', padding: '8px 10px', background: '#fff', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
                                                    No WhatsApp account connected.{' '}
                                                    <a href="/settings?tab=integrations" style={{ color: '#166534', fontWeight: 600 }}>Connect an account →</a>
                                                </div>
                                            )}
                                        </div>

                                        {/* ── Template Selector ── */}
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>Message Template</label>
                                                <button onClick={() => { setShowWaTemplatePanel(p => !p); setShowWaNewTmplForm(false); }}
                                                    style={{ background: 'none', border: 'none', fontSize: '11px', fontWeight: 600, color: '#166534', cursor: 'pointer', padding: 0 }}>
                                                    {showWaTemplatePanel ? '✕ Close' : '📋 Browse templates'}
                                                </button>
                                            </div>

                                            {/* Selected template badge */}
                                            {selectedWaTemplateId && !showWaTemplatePanel && (() => {
                                                const tmpl = waTemplates.find(t => t.id === selectedWaTemplateId);
                                                return tmpl ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', fontSize: '12px' }}>
                                                        <span style={{ fontWeight: 600, color: '#166534', flex: 1 }}>✓ {tmpl.name}</span>
                                                        <span style={{ background: tmpl.channel_type === 'business_api' ? '#dbeafe' : '#f0fdf4', color: tmpl.channel_type === 'business_api' ? '#1d4ed8' : '#166534', border: `1px solid ${tmpl.channel_type === 'business_api' ? '#93c5fd' : '#86efac'}`, borderRadius: '4px', padding: '1px 6px', fontSize: '10px', fontWeight: 600 }}>
                                                            {tmpl.channel_type === 'business_api' ? 'WABA' : 'Personal'}
                                                        </span>
                                                        <button onClick={() => { setSelectedWaTemplateId(''); setWaBody(''); }}
                                                            style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '12px', padding: 0 }}>✕</button>
                                                    </div>
                                                ) : null;
                                            })()}

                                            {/* Template browser panel */}
                                            {showWaTemplatePanel && (
                                                <div style={{ border: '1px solid #bbf7d0', borderRadius: '8px', background: '#fff', overflow: 'hidden' }}>
                                                    {/* Existing templates list */}
                                                    {waTemplates.length > 0 && !showWaNewTmplForm && (
                                                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                            {waTemplates.map(tmpl => (
                                                                <div key={tmpl.id} onClick={() => applyWaTemplate(tmpl)}
                                                                    style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', cursor: 'pointer', borderBottom: '1px solid #f0fdf4', transition: 'background 0.15s', background: selectedWaTemplateId === tmpl.id ? '#dcfce7' : 'transparent' }}
                                                                    onMouseEnter={e => { if (selectedWaTemplateId !== tmpl.id) (e.currentTarget as HTMLDivElement).style.background = '#f0fdf4'; }}
                                                                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = selectedWaTemplateId === tmpl.id ? '#dcfce7' : 'transparent'; }}>
                                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#166534' }}>{tmpl.name}</span>
                                                                            <span style={{ background: tmpl.channel_type === 'business_api' ? '#dbeafe' : '#f0fdf4', color: tmpl.channel_type === 'business_api' ? '#1d4ed8' : '#166534', border: `1px solid ${tmpl.channel_type === 'business_api' ? '#93c5fd' : '#86efac'}`, borderRadius: '4px', padding: '1px 5px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                                                {tmpl.channel_type === 'business_api' ? 'WABA' : 'Personal'}
                                                                            </span>
                                                                            {tmpl.is_default && <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '4px', padding: '1px 5px', fontSize: '9px', fontWeight: 700 }}>Default</span>}
                                                                        </div>
                                                                        {tmpl.header_text && <div style={{ fontSize: '11px', color: '#6b7280', fontStyle: 'italic', marginBottom: '1px' }}>Header: {tmpl.header_text}</div>}
                                                                        <div style={{ fontSize: '11px', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>{tmpl.content}</div>
                                                                        {tmpl.footer_text && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>Footer: {tmpl.footer_text}</div>}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                        <button onClick={e => { e.stopPropagation(); applyWaTemplate(tmpl); }}
                                                                            style={{ background: '#166534', color: '#fff', border: 'none', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Use</button>
                                                                        <button onClick={e => deleteWaTemplate(tmpl.id, e)}
                                                                            style={{ background: 'none', border: '1px solid #fca5a5', color: '#dc2626', borderRadius: '4px', padding: '3px 6px', fontSize: '11px', cursor: 'pointer' }}>✕</button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {waTemplates.length === 0 && !showWaNewTmplForm && (
                                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>No saved templates yet.</div>
                                                    )}

                                                    {/* Create new template form */}
                                                    {/* Hidden file input for media upload */}
                                                    <input ref={waMediaUploadRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/3gp,application/pdf" style={{ display: 'none' }}
                                                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadWaTemplateMedia(f); e.target.value = ''; }} />

                                                    {showWaNewTmplForm ? (
                                                        <div style={{ borderTop: waTemplates.length > 0 ? '1px solid #bbf7d0' : 'none' }}>
                                                            {/* Form header with preview toggle */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 6px', background: '#f0fdf4' }}>
                                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>➕ New WhatsApp Template</div>
                                                                <button onClick={() => setWaNewTmplShowPreview(p => !p)}
                                                                    style={{ background: waNewTmplShowPreview ? '#166534' : 'none', color: waNewTmplShowPreview ? '#fff' : '#166534', border: '1px solid #166534', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                                                    {waNewTmplShowPreview ? '✕ Hide Preview' : '👁 Preview'}
                                                                </button>
                                                            </div>

                                                            {/* Side-by-side: Form + Preview */}
                                                            <div style={{ display: 'flex', gap: '0', background: '#f8fffe' }}>
                                                                {/* ── FORM (left) ── */}
                                                                <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: 0 }}>
                                                                    {/* Template Name */}
                                                                    <div>
                                                                        <label style={{ fontSize: '11px', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '3px' }}>Template Name <span style={{ color: '#ef4444' }}>*</span></label>
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
                                                                            {waNewTmplChannelType === 'business_api' ? '🏢 Business WABA' : '📱 Personal WhatsApp'}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div style={{ padding: '8px 12px', borderTop: waTemplates.length > 0 ? '1px solid #bbf7d0' : 'none', background: '#f8fffe' }}>
                                                            <button onClick={() => setShowWaNewTmplForm(true)}
                                                                style={{ width: '100%', background: 'none', border: '1px dashed #86efac', borderRadius: '6px', padding: '7px', fontSize: '12px', fontWeight: 600, color: '#166534', cursor: 'pointer', textAlign: 'center' }}>
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
                                <div style={{ marginTop: '12px', padding: '14px', background: '#f8faff', border: '1px solid #e0eaf5', borderRadius: '12px' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#172560', marginBottom: '10px' }}>Voice Call Settings</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>AI Agent</label>
                                            {voiceAgents.length > 0 ? (
                                                <select value={selectedAgentId} onChange={e => {
                                                    setSelectedAgentId(e.target.value);
                                                    const agent = voiceAgents.find((a: any) => a.id === e.target.value);
                                                    if (agent?.voice_id) setSelectedVoiceId(agent.voice_id);
                                                }} style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none' }}>
                                                    {voiceAgents.map((a: any) => <option key={a.id} value={a.id}>{a.name}{a.agent_language ? ` (${a.agent_language})` : ''}</option>)}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>No agents found — <a href="/voice-agent" style={{ color: '#172560' }}>set up an agent</a></div>
                                            )}
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px', display: 'block' }}>From Number</label>
                                            {voiceNumbers.length > 0 ? (
                                                <select value={selectedFromNumber} onChange={e => setSelectedFromNumber(e.target.value)} style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', background: '#fff', outline: 'none' }}>
                                                    {voiceNumbers.map((n: any) => {
                                                        const num = n.phone_number || n.number || n.phoneNumber || '';
                                                        const label = num + (n.number_type ? ` (${n.number_type})` : '') + (n.provider ? ` — ${n.provider}` : '');
                                                        return <option key={n.id || num} value={num}>{label || n.id || 'Unknown number'}</option>;
                                                    })}
                                                </select>
                                            ) : (
                                                <div style={{ fontSize: '12px', color: '#9ca3af' }}>No phone numbers found — <a href="/voice-agent" style={{ color: '#172560' }}>add a number</a></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Trigger Condition (only if next channels selected) */}
                    {step === 4 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                                Selected channels: {nextChannels.map(ch => ch === 'voice_call' ? 'Voice Call' : ch.charAt(0).toUpperCase() + ch.slice(1)).join(', ')}
                            </div>
                            {[
                                { id: 'connection_accepted', label: 'After connection accepted', desc: 'Trigger when the lead accepts your LinkedIn connection' },
                                { id: 'message_replied', label: 'After responding to message', desc: 'Trigger when the lead replies to your LinkedIn message' },
                                { id: 'profile_visited', label: 'After profile visit', desc: 'Trigger for all visited profiles with ICP score above your threshold' },
                            ].map((opt, i) => (
                                <div key={opt.id} onClick={() => setTriggerCondition(opt.id)} style={optStyle(triggerCondition === opt.id)}>
                                    <div style={numBadge(i + 1, triggerCondition === opt.id)}>{triggerCondition === opt.id ? '\u2713' : i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{opt.label}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{opt.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 5: Duration */}
                    {step === 5 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {['7', '14', '30', '60', '90'].map((d, i) => {
                                const dNum = parseInt(d);
                                const wd = Math.floor(dNum * 5 / 7);
                                const wk = Math.ceil(dNum / 7);
                                const cap = Math.min(wd * LINKEDIN_DAILY_LIMIT, wk * LINKEDIN_WEEKLY_LIMIT);
                                const over = qualifiedLeadCount > cap;
                                return (
                                    <div key={d} onClick={() => setDays(d)} style={optStyle(days === d)}>
                                        <div style={numBadge(i + 1, days === d)}>{days === d ? '✓' : i + 1}</div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600 }}>{d} days</div>
                                            <div style={{ fontSize: '11px', color: over ? '#b45309' : '#6b7280', marginTop: '2px' }}>
                                                {over
                                                    ? `Can process ~${cap} of ${qualifiedLeadCount} leads (${Math.min(LINKEDIN_DAILY_LIMIT, Math.max(1, Math.floor(qualifiedLeadCount / Math.max(wd, 1))))}/day)`
                                                    : `${qualifiedLeadCount} leads fit within this window (~${Math.max(1, Math.ceil(qualifiedLeadCount / Math.max(wd, 1)))}/day)`}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div style={{ marginTop: '8px' }}>
                                <input type="number" value={days} onChange={e => setDays(e.target.value)}
                                    placeholder="Or enter custom days..."
                                    style={{ width: '100%', border: '1px solid #e0eaf5', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', outline: 'none', background: '#fafbff', fontFamily: 'inherit' }}
                                />
                            </div>
                            {/* Warning when selected duration can't fit all leads */}
                            {exceedsLinkedInLimits && (
                                <div style={{
                                    padding: '10px 14px', borderRadius: '10px', fontSize: '12px', lineHeight: 1.5,
                                    background: '#fef3c7', border: '1px solid #f59e0b', color: '#92400e', marginTop: '4px',
                                }}>
                                    <strong>LinkedIn limit warning:</strong> You have {qualifiedLeadCount} qualified leads but only ~{totalLinkedInCapacity} can be reached in {campaignDays} {campaignDays === 1 ? 'day' : 'days'} at {LINKEDIN_DAILY_LIMIT} actions/day.
                                    Campaign will process {safeLeadsPerDay} leads/day. Consider extending the duration to {Math.max(2, Math.ceil(qualifiedLeadCount / LINKEDIN_DAILY_LIMIT * 7 / 5))} days or more.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 6: Campaign Name */}
                    {step === 6 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    placeholder="e.g. Q3 Outreach Strategy"
                                    style={{ flex: 1, border: '1px solid #e0eaf5', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', outline: 'none', background: '#fafbff', fontFamily: 'inherit', minWidth: 0 }}
                                />
                                <button onClick={suggestName} style={{
                                    background: '#eef2ff', border: '1.5px solid #172560', borderRadius: '10px', padding: '0 14px',
                                    fontSize: '12px', fontWeight: 700, color: '#172560', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                                    transition: 'all 0.15s',
                                }}>✨ Suggest</button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Navigation footer */}
                {(() => {
                    // Direct contacts skip steps 0,1,2,4 → only steps 3,5,6 remain (3 steps total)
                    // Map: step 3→1, step 5→2, step 6→3
                    const dispStep = isDirectContact ? (step <= 3 ? 1 : step - 3) : step + 1;
                    const dispTotal = isDirectContact ? 3 : totalSteps;
                    const isFirstStep = isDirectContact ? step <= 3 : step <= 0;
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
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isFirstStep ? '#d1d5db' : '#172560'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                        </button>
                        {step < totalSteps - 1 ? (
                            <button
                                disabled={!canNext()}
                                onClick={handleNext}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                                    background: canNext() ? '#172560' : '#e5e7eb', cursor: canNext() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                            </button>
                        ) : (
                            <button
                                disabled={!canNext() || launching}
                                onClick={launchCampaign}
                                style={{
                                    padding: '8px 20px', borderRadius: '10px', border: 'none',
                                    background: canNext() && !launching ? '#10b981' : '#e5e7eb',
                                    color: canNext() && !launching ? '#fff' : '#9ca3af',
                                    fontSize: '13px', fontWeight: 700, cursor: canNext() && !launching ? 'pointer' : 'default',
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

                {/* Dismiss */}
                <button onClick={() => setStep(-1)} style={{
                    background: 'none', border: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer',
                    marginTop: '8px', padding: 0, fontWeight: 500,
                }}>Dismiss</button>
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
    { id: 'review', question: 'Review your targeting criteria', type: 'review' },
];

function TargetingFormInline({
    step, setStep, nationality, setNationality, experienceLevel, setExperienceLevel,
    companySize, setCompanySize, companyAge, setCompanyAge, education, setEducation,
    skills, setSkills, currentTargeting, onConfirm, loading, setLoading
}: {
    step: number; setStep: (s: number) => void;
    nationality: string[]; setNationality: React.Dispatch<React.SetStateAction<string[]>>;
    experienceLevel: string[]; setExperienceLevel: React.Dispatch<React.SetStateAction<string[]>>;
    companySize: string[]; setCompanySize: React.Dispatch<React.SetStateAction<string[]>>;
    companyAge: string[]; setCompanyAge: React.Dispatch<React.SetStateAction<string[]>>;
    education: string[]; setEducation: React.Dispatch<React.SetStateAction<string[]>>;
    skills: string[]; setSkills: React.Dispatch<React.SetStateAction<string[]>>;
    currentTargeting: LeadTargeting | null;
    onConfirm: () => void;
    loading?: boolean;
    setLoading?: (v: boolean) => void;
}) {
    const totalSteps = TG_QUESTIONS.length;
    const q = TG_QUESTIONS[step];
    const [searchQuery, setSearchQuery] = React.useState('');

    const baseBox: React.CSSProperties = {
        background: '#fff', border: '1px solid #e0eaf5', borderRadius: '16px', padding: '24px',
        maxWidth: '520px', boxShadow: '0 4px 20px rgba(23,37,96,0.06)', animation: 'fadeUp 0.3s ease both',
    };

    const optStyle = (selected: boolean): React.CSSProperties => ({
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        border: `2px solid ${selected ? '#172560' : '#e5e7eb'}`, background: selected ? '#eef2ff' : '#fff',
        borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', width: '100%',
        fontSize: '14px', fontWeight: 500, color: selected ? '#172560' : '#374151',
    });

    const numBadge = (n: number, selected: boolean): React.CSSProperties => ({
        width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '12px', fontWeight: 700, flexShrink: 0, border: `2px solid ${selected ? '#172560' : '#d1d5db'}`,
        background: selected ? '#172560' : 'transparent', color: selected ? '#fff' : '#6b7280',
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
            <div className="adv-ai-avatar"><span>✦</span></div>
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
                                placeholder="Enter skills separated by commas (e.g., AI/ML, Cloud Architecture, DevOps)"
                                value={skills.join(', ')} onChange={e => setSkills(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                style={{
                                    width: '100%', minHeight: '100px', padding: '12px', border: '1px solid #e5e7eb',
                                    borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical'
                                }}
                            />
                        </div>
                    )}

                    {/* Step 6: Review */}
                    {step === 6 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {nationality.length > 0 && <div><strong>Nationalities:</strong> {nationality.join(', ')}</div>}
                            {experienceLevel.length > 0 && <div><strong>Experience Level:</strong> {experienceLevel.join(', ')}</div>}
                            {companySize.length > 0 && <div><strong>Company Size:</strong> {companySize.join(', ')}</div>}
                            {companyAge.length > 0 && <div><strong>Company Age:</strong> {companyAge.join(', ')}</div>}
                            {education.length > 0 && <div><strong>Education:</strong> {education.join(', ')}</div>}
                            {skills.length > 0 && <div><strong>Skills:</strong> {skills.join(', ')}</div>}
                            {nationality.length === 0 && experienceLevel.length === 0 && companySize.length === 0 && companyAge.length === 0 && education.length === 0 && skills.length === 0 && (
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
                                    padding: '10px 14px', background: '#172560', color: '#fff', border: 'none',
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
    if (intent.seniority?.length) p.push(`⭐ **Seniority:** ${intent.seniority.join(', ')}`);
    if (intent.functions?.length) p.push(`⚙️ **Functions:** ${intent.functions.join(', ')}`);
    p.push('\n**Does this look right?** Tap ✅ to search, or tell me what to change.');
    return p.join('\n');
}

/* ═══════════════════════════════════════════════
   CSS
   ═══════════════════════════════════════════════ */
const css = `
            /* ── RESET ── */
            .adv-landing, .adv-chat-root {font - family: 'Inter', system-ui, -apple-system, sans-serif; }
            * {box - sizing: border-box; }

            /* ── ANIMATIONS ── */
            @keyframes fadeUp {from {opacity:0; transform:translateY(14px); } to {opacity:1; transform:translateY(0); } }
            @keyframes slideIn {from {opacity:0; transform:translateX(50px); } to {opacity:1; transform:translateX(0); } }
            @keyframes spin {to {transform: rotate(360deg); } }
            @keyframes pulse {0 %, 100 % { opacity: .4 } 50% {opacity:1 } }
            .fadeUp {animation: fadeUp .35s ease both; }

            /* ── LANDING ── */
            .adv-landing {height:100vh; display:flex; flex-direction:column; background:linear-gradient(180deg,#f5f8fc 0%,#f2f6fa 30%,#eef4fa 60%,#c2d6eb 100%); overflow:hidden; position:relative; }
            .adv-topbar {padding:16px 28px; position:relative; z-index:2; display:flex; align-items:center; }
            .adv-back {width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-back:hover {background:#f3f4f6; }
            .adv-center {flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 24px 60px; z-index:2; position:relative; }
            .adv-asterisk-wrap {width:90px; height:90px; border-radius:50%; background:#fff; border:1.5px solid #e0eaf5; display:flex; align-items:center; justify-content:center; margin-bottom:24px; box-shadow:0 4px 16px rgba(23,37,96,.10); animation:fadeUp .4s ease both; overflow:hidden; }
            .adv-lad-logo {width:80px; height:auto; display:block; }
            .adv-title {font-size:34px; font-weight:800; color:#111827; text-align:center; margin-bottom:28px; letter-spacing:-.03em; line-height:1.2; animation:fadeUp .4s ease .08s both; }
            .adv-title span {color:#172560; }
            /* ── INPUT BOX ── */
            .adv-input-outer {width:100%; max-width:680px; background:#fff; border:1.5px solid #e5e7eb; border-radius:22px; padding:18px 20px 14px; box-shadow:0 8px 32px rgba(0,0,0,.08); animation:fadeUp .4s ease .16s both; cursor:text; transition:border .2s, box-shadow .2s; }
            .adv-input-outer:focus-within {border-color:#172560; box-shadow:0 8px 32px rgba(23,37,96,.14); }
            .adv-ta {width:100%; border:none; outline:none; resize:none; font-size:16px; color:#111827; font-family:inherit; line-height:1.6; background:transparent; min-height:72px; }
            .adv-ta::placeholder {color:#9ca3af; }
            .adv-websearch-badge {display:inline-flex; align-items:center; gap:5px; background:#dbeafe; border:1px solid #bfdbfe; border-radius:20px; padding:3px 10px; font-size:12px; color:#1d4ed8; margin-bottom:8px; }
            .adv-input-foot {display:flex; align-items:center; justify-content:space-between; margin-top:8px; padding-top:10px; border-top:1px solid #f3f4f6; }
            /* ── ATTACH BUTTON ── */
            .adv-attach-btn {width:36px; height:36px; border-radius:50%; border:1.5px solid #e5e7eb; background:#f9fafb; color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .adv-attach-btn:hover {background:#e0eaf5; border-color:#c2d6eb; color:#172560; }
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
            .adv-chips-row {display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-top:20px; max-width:680px; animation:fadeUp .4s ease .24s both; }
            .adv-chip {display:flex; align-items:center; gap:6px; border:1px solid #c2d6eb; border-radius:22px; padding:8px 16px; font-size:13px; font-weight:500; color:#172560; background:rgba(255,255,255,.75); cursor:pointer; transition:all .15s; }
            .adv-chip:hover {background:#e0eaf5; border-color:#172560; }
            /* ── RECENT SEARCHES ── */
            .adv-recent-wrap {margin-top:24px; max-width:680px; width:100%; animation:fadeUp .4s ease .32s both; }
            .adv-recent-label {font-size:12px; font-weight:600; color:#9ca3af; margin-bottom:8px; padding-left:4px; text-transform:uppercase; letter-spacing:.06em; }
            .adv-recent-list {display:flex; flex-direction:column; gap:4px; }
            .adv-recent-item {display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:12px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; text-align:left; font-size:13.5px; color:#374151; font-weight:500; transition:all .15s; width:100%; }
            .adv-recent-item:hover {background:#f2f6fa; border-color:#172560; color:#111827; }
            .adv-recent-item span {flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }

            /* ── CHAT SCREEN ── */
            .adv-chat-root {height:100vh; display:flex; flex-direction:column; background:#fafafa; }
            .adv-yellow-bar {height:4px; background:linear-gradient(90deg,#3b82f6,#2563eb,#172560); flex-shrink:0; }
            .adv-chat-main {flex:1; display:flex; overflow:hidden; }
            /* adv-chat-left defined below with split-screen update */
            .adv-chat-back {position:absolute; top:16px; left:20px; z-index:10; width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-chat-back:hover {background:#f3f4f6; }
            .adv-chat-msgs {flex:1; overflow-y:auto; padding:72px 0 8px; display:flex; flex-direction:column; }
            .adv-msgs-inner {max-width:700px; margin:0 auto; padding:0 20px; width:100%; }
            .adv-msgs-inner + .adv-msgs-inner {padding-top:8px; }
            /* ── BUBBLES ── */
            .adv-bubble {padding:10px 0; }
            .adv-bubble-user {display:flex; justify-content:flex-end; }
            .adv-user-msg {background:#e0eaf5; color:#111827; border-radius:18px 18px 4px 18px; padding:14px 20px; max-width:70%; border:1px solid #c2d6eb; font-size:15px; line-height:1.6; }
            .adv-bubble-ai {display:flex; gap:12px; align-items:flex-start; }
            .adv-ai-avatar {width:34px; height:34px; border-radius:50%; background:#e0eaf5; border:1.5px solid #c2d6eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#172560; font-size:14px; }
            .adv-ai-body {flex:1; max-width:88%; }
            .adv-ai-name {font-size:12px; font-weight:700; color:#111827; margin-bottom:6px; letter-spacing:.02em; }
            .adv-ai-text {font-size:14.5px; line-height:1.7; color:#374151; }
            .adv-ai-text p {margin:0 0 4px; }
            .adv-ai-text strong {color:#111827; }
            .adv-web-searched {display:inline-flex; align-items:center; gap:4px; font-size:12px; color:#9ca3af; margin-bottom:6px; cursor:default; }
            /* ── THINKING DOTS ── */
            .adv-thinking-wrap{display:flex;align-items:center;gap:8px;height:20px;overflow:hidden}
            .adv-thinking-word{font-size:13px;color:#6b7280;font-style:italic;font-weight:500;display:inline-block;transition:opacity .28s ease,transform .28s ease}
            .adv-tw-in{opacity:1;transform:translateY(0)}
            .adv-tw-out{opacity:0;transform:translateY(-7px)}
            .adv-thinking-dots{display:inline-flex;gap:3px;align-items:center}
            .adv-thinking-dots span{width:4px;height:4px;border-radius:50%;background:#9ca3af;display:inline-block;animation:adv-db 1.1s ease-in-out infinite}
            .adv-thinking-dots span:nth-child(2){animation-delay:.18s}
            .adv-thinking-dots span:nth-child(3){animation-delay:.36s}
            @keyframes adv-db{0%,80%,100%{transform:translateY(0);opacity:.35}40%{transform:translateY(-4px);opacity:1}}
            /* ── CHAT INPUT ── */
            .adv-chat-input-wrap {border-top:1px solid #f0f0f0; background:#fff; padding:8px 20px 18px; }
            .adv-msg-counter {font-size:11px; color:#9ca3af; padding:4px 0 8px; text-align:center; }
            .adv-chat-input-box {display:flex; flex-direction:column; background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:18px; padding:12px 16px 10px; max-width:700px; margin:0 auto; transition:border .15s; }
            .adv-chat-input-box:focus-within {border-color:#172560; }
            .adv-chat-ta {width:100%; resize:none; border:none; outline:none; background:transparent; font-size:15px; color:#111827; font-family:inherit; line-height:1.5; padding:0; max-height:120px; }
            .adv-chat-ta::placeholder {color:#9ca3af; }
            .adv-chat-input-foot {display:flex; align-items:center; justify-content:space-between; margin-top:10px; padding-top:8px; border-top:1px solid #f3f4f6; }
            .adv-chat-attach-btn {width:32px; height:32px; border-radius:50%; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; }
            .adv-chat-attach-btn:hover {background:#e0eaf5; border-color:#c2d6eb; color:#172560; }
            .adv-model-label {display:flex; align-items:center; gap:4px; font-size:12px; color:#9ca3af; font-weight:500; cursor:pointer; }
            .adv-model-label:hover {color:#374151; }
            .adv-send-sm {width:34px!important; height:34px!important; }
            .adv-spinner {width:15px; height:15px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin .8s linear infinite; }

            /* ── TARGETING CARD ── */
            .adv-targeting-card {margin - top:12px; background:linear-gradient(135deg,#f2f6fa,#e0eaf5); border:1px solid #c2d6eb; border-radius:16px; padding:14px 16px; }
            .adv-tc-header {display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:13px; color:#0f1842; }
            .adv-tag-row {display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin-bottom:6px; }
            .adv-tag-label {font - size:11px; font-weight:600; color:#0f1842; min-width:70px; }
            .adv-tag {font - size:11px; background:rgba(255,255,255,.85); color:#0a112e; padding:3px 11px; border-radius:20px; border:1px solid #c2d6eb; }

            /* ── MINI LEADS IN CHAT ── */
            .adv-mini-leads {margin - top:12px; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:16px; padding:12px 14px; }
            .adv-ml-header {display:flex; align-items:center; gap:6px; margin-bottom:10px; font-size:12px; font-weight:600; color:#166534; }
            .adv-ml-count {margin - left:auto; font-size:11px; color:#16a34a; background:#dcfce7; padding:2px 10px; border-radius:20px; font-weight:500; }
            .adv-ml-item {display:flex; align-items:center; gap:10px; padding:8px 0; border-top:1px solid #dcfce7; }
            .adv-ml-item:first-of-type {border - top:none; }
            .adv-ml-avatar {width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:10px; font-weight:700; flex-shrink:0; }
            .adv-ml-info {flex:1; }
            .adv-ml-name {font - size:12px; font-weight:600; color:#111827; }
            .adv-ml-title {font - size:11px; color:#6b7280; }

            /* ── NAS.io RESULT CARDS ── */
            .adv-result-cards {display:flex; gap:10px; margin-top:14px; }
            .adv-rc {display:flex; align-items:center; gap:12px; padding:14px 16px; border-radius:16px; border:1.5px solid #e5e7eb; background:#fff; cursor:pointer; transition:all .15s; flex:1; min-width:0; }
            .adv-rc:hover {border - color:#172560; background:#f2f6fa; box-shadow:0 2px 8px rgba(23,37,96,.1); }
            .adv-rc-icon {width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; font-size:16px; }
            .adv-rc-icon-target {background:#eef2ff; }
            .adv-rc-icon-leads {background:#e0eaf5; }
            .adv-rc-body {flex:1; min-width:0; }
            .adv-rc-label {font - size:14px; font-weight:700; color:#111827; }
            .adv-rc-sub {font - size:12px; color:#6b7280; margin-top:1px; }
            .adv-rc-leads .adv-rc-sub {color:#172560; font-weight:500; }

            /* ── NAS.io ACTION BUTTONS ── */
            .adv-action-btns {display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
            .adv-act-btn {padding:8px 18px; border-radius:22px; font-size:13px; font-weight:600; border:1.5px solid #172560; background:transparent; color:#172560; cursor:pointer; transition:all .15s; }
            .adv-act-btn:hover {background:#172560; color:#fff; box-shadow:0 2px 8px rgba(23,37,96,.25); }

            /* ── OPTION BUTTONS ── */
            .adv-opts {display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
            .adv-opt-btn {padding:10px 20px; border-radius:14px; font-size:13.5px; font-weight:600; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; transition:all .15s; }
            .adv-opt-btn:hover {border-color:#172560; background:#f2f6fa; color:#0f1842; }
            .adv-opt-btn:first-child {background:#172560; color:#fff; border-color:#172560; box-shadow:0 2px 8px rgba(23,37,96,.25); }
            .adv-opt-btn:first-child:hover {background:#0f1842; border-color:#0f1842; box-shadow:0 4px 14px rgba(23,37,96,.35); }

            /* ── LEADS PANEL ── */
            .adv-leads-panel {width:50%; background:#fafafa; animation:slideIn .35s cubic-bezier(.4,0,.2,1) both; display:flex; flex-direction:column; overflow:hidden; border-left:2px solid #e0eaf5; flex-shrink:0; }
            .adv-chat-left {display:flex; flex-direction:column; position:relative; background:#fff; transition:width .35s cubic-bezier(.4,0,.2,1); border-right:none; min-width:0; }
            .adv-panel-header {display:flex; justify-content:space-between; align-items:center; padding:14px 20px; border-bottom:1.5px solid #e5e7eb; background:#fff; flex-shrink:0; }
            .adv-close-panel {width:32px; height:32px; border-radius:8px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; flex-shrink:0; }
            .adv-close-panel:hover {background:#f3f4f6; }
            .adv-unlock-btn {padding:8px 18px; border-radius:22px; border:none; background:#111827; color:#fff; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .15s; }
            .adv-unlock-btn:hover {background:#1f2937; box-shadow:0 4px 12px rgba(0,0,0,.15); }
            .adv-panel-body {flex:1; overflow-y:auto; padding:20px; }
            .adv-panel-title {font-size:18px; font-weight:800; color:#111827; margin:0 0 10px; line-height:1.3; letter-spacing:-.02em; }
            .adv-panel-desc {font-size:13px; color:#6b7280; line-height:1.6; margin:0 0 16px; padding:10px 14px; background:#f5f8fc; border-radius:12px; border:1px solid #e0eaf5; }
            .adv-leads-list {display:flex; flex-direction:column; gap:2px; }
            .adv-lead-card {display:flex; align-items:center; gap:14px; padding:14px 16px; border-radius:14px; transition:background .15s; cursor:pointer; }
            .adv-lead-card:hover {background:#f9fafb; }
            .adv-lead-locked {opacity:.55; filter:blur(1px); pointer-events:none; }
            .adv-lead-avatar {width:42px; height:42px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:14px; font-weight:700; flex-shrink:0; }
            .adv-lead-info {flex:1; min-width:0; }
            .adv-lead-name {font - size:14px; font-weight:700; color:#111827; display:flex; align-items:center; gap:4px; }
            .adv-verified {background:#10b981; color:#fff; border-radius:50%; width:16px; height:16px; display:inline-flex; align-items:center; justify-content:center; font-size:9px; font-weight:800; }
            .adv-lead-title {font - size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
            .adv-lead-platform {margin - top:4px; display:flex; gap:4px; }
            .adv-lead-action {width:36px; height:36px; border-radius:50%; border:1.5px solid #e5e7eb; background:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; transition:all .15s; }
            .adv-lead-action:hover:not(:disabled) {border - color:#172560; background:#f2f6fa; }
            .adv-lead-action:disabled {cursor:default; }
            .adv-lead-avatar-img {width:42px; height:42px; border-radius:50%; object-fit:cover; flex-shrink:0; border:1.5px solid #e5e7eb; }
            .adv-lead-location {font - size:11px; color:#9ca3af; margin-top:2px; }
            .adv-panel-footer {text - align:center; padding:20px 0 8px; font-size:12px; color:#9ca3af; border-top:1px solid #f3f4f6; margin-top:16px; }
            `;
