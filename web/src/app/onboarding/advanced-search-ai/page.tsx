'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Gem, Upload, FileSpreadsheet, Download, CheckCircle2, Trash2 } from 'lucide-react';
import { ProfileSummaryDialog } from '@/components/campaigns';

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
}

/* ═══════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════ */
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/+$/, '');

function getToken(): string {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('token') || document.cookie.split('token=')[1]?.split(';')[0] || '';
}

function headers(): Record<string, string> {
    const t = getToken();
    return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

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

/* ═══════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════ */
export default function AdvancedSearchAIPage() {
    const router = useRouter();
    const [screen, setScreen] = useState<'landing' | 'chat'>('landing');
    const [messages, setMessages] = useState<ChatMsg[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [targeting, setTargeting] = useState<LeadTargeting | null>(null);
    const [leads, setLeads] = useState<LeadProfile[]>([]);
    const [showPanel, setShowPanel] = useState<false | 'leads'>(false);
    // Checkpoint form state (inline in chat)
    const [cpStep, setCpStep] = useState(-1); // -1 = not started, 0-6 = steps
    const [cpIcpThreshold, setCpIcpThreshold] = useState('75');
    const [cpActions, setCpActions] = useState<string[]>(['connect']);
    const [cpConnMsg, setCpConnMsg] = useState('');
    const [cpFollowMsg, setCpFollowMsg] = useState('');
    const [cpNextChannels, setCpNextChannels] = useState<string[]>([]); // email, whatsapp, voice_call
    const [cpTriggerCondition, setCpTriggerCondition] = useState(''); // connection_accepted, message_replied, profile_visited
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
    const [convId, setConvId] = useState<string | null>(null);
    const [msgCount, setMsgCount] = useState(0);
    const [pendingIntent, setPendingIntent] = useState<string | null>(null);

    // Inbound CSV upload state
    const [inboundMode, setInboundMode] = useState(false);
    const [inboundLeads, setInboundLeads] = useState<ParsedInboundLead[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Search history (persisted in localStorage)
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_search_history');
            if (stored) setSearchHistory(JSON.parse(stored));
        } catch {}
    }, []);
    const addToHistory = (query: string) => {
        const trimmed = query.trim();
        if (!trimmed) return;
        setSearchHistory(prev => {
            const filtered = prev.filter(h => h.toLowerCase() !== trimmed.toLowerCase());
            const updated = [trimmed, ...filtered].slice(0, 10);
            try { localStorage.setItem('lad_search_history', JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    // Lead feedback state (persisted in localStorage)
    const [leadFeedback, setLeadFeedback] = useState<Record<string, 'good' | 'bad'>>({});
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_lead_feedback');
            if (stored) setLeadFeedback(JSON.parse(stored));
        } catch {}
    }, []);
    const toggleFeedback = (leadId: string, rating: 'good' | 'bad') => {
        setLeadFeedback(prev => {
            const updated = { ...prev };
            if (updated[leadId] === rating) { delete updated[leadId]; } else { updated[leadId] = rating; }
            try { localStorage.setItem('lad_lead_feedback', JSON.stringify(updated)); } catch {}
            return updated;
        });
    };

    // Search sessions (persisted in localStorage for campaign context)
    const [searchSessions, setSearchSessions] = useState<{ query: string; targeting: LeadTargeting | null; icp_description: string; timestamp: string }[]>([]);
    useEffect(() => {
        try {
            const stored = localStorage.getItem('lad_search_sessions');
            if (stored) setSearchSessions(JSON.parse(stored));
        } catch {}
    }, []);
    const addSearchSession = (query: string, tgt: LeadTargeting | null, icpDesc: string) => {
        setSearchSessions(prev => {
            const entry = { query, targeting: tgt, icp_description: icpDesc, timestamp: new Date().toISOString() };
            const updated = [entry, ...prev].slice(0, 20);
            try { localStorage.setItem('lad_search_sessions', JSON.stringify(updated)); } catch {}
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

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // Fetch credit balance on mount
    useEffect(() => {
        (async () => {
            try {
                const r = await fetch(`${API_BASE}/api/billing/wallet`, { headers: headers() });
                const d = await r.json();
                if (d.success !== false && d.wallet) {
                    setCreditBalance(d.wallet.availableBalance ?? d.wallet.currentBalance ?? 0);
                }
            } catch { setCreditBalance(0); }
        })();
    }, []);

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
            const response = await fetch(`${API_BASE}/api/campaigns/preview/lead-summary`, {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    profileData: {
                        name: lead.name,
                        title: lead.headline || '',
                        company: lead.current_company || '',
                        linkedin_url: lead.profile_url || ''
                    }
                })
            });

            const data = await response.json();
            if (data.success && data.summary) {
                setProfileSummary(data.summary);
            } else {
                throw new Error(data.error || 'Failed to generate summary');
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
        setScreen('chat');
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
            const parsed = await parseInboundCSV(file);
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

            let summaryText = `✅ **Successfully parsed ${counts.total} leads from your file!**\n\n📊 **Contact Channels Detected:**\n`;
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
                id: `a-${Date.now()}`, role: 'ai', text: `⚠️ **Error parsing file:** ${err.message}\n\nPlease make sure you're uploading a valid CSV file with the correct format. You can download the template above and try again.`,
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

        try {
            // Build history array for context (last 6 messages)
            const historySnapshot = messages.slice(-6).map(m => ({ role: m.role, text: m.text }));

            // ── CASE 1: Detect Intent (Always call /lead-chat first) ──
            const isFirstMessage = messages.filter(m => m.role === 'user').length === 0;
            let shouldRunSearch = false;
            let aiResponseText = '';
            let aiOpts: { label: string; value: string }[] | undefined;
            let updatedTargetState = targeting;

            // Always call lead-chat for AI conversation
            try {
                const chatR = await fetch(`${API_BASE}/api/ai-icp-assistant/lead-chat`, {
                    method: 'POST',
                    headers: headers(),
                    body: JSON.stringify({
                        message: text,
                        history: historySnapshot,
                        currentTargeting: targeting,
                        pendingIntent: (pendingIntent as string | null),
                    }),
                });
                const chatD = await chatR.json();
                if (chatD.success) {
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

            // ── CASE 2: Run LinkedIn search ──
            let ext: LeadTargeting | null = updatedTargetState;
            let realLeads: LeadProfile[] = [];
            let searchTotal = 0;
            let icpWasApplied = false;

            // If we have updated targeting from lead-chat or custom flows, use that for search query
            const searchQuery = shouldRunSearch && ext && !isFirstMessage
                ? [...(ext.job_titles || []), ...(ext.industries || []), ...(ext.locations || []), ...(ext.keywords || [])].join(' ')
                : text;

            try {
                // Enhance ICP description with user feedback on previous leads
                let icpDesc = text;
                const goodLeads = leads.filter(l => leadFeedback[l.id] === 'good');
                const badLeads = leads.filter(l => leadFeedback[l.id] === 'bad');
                if (goodLeads.length > 0 || badLeads.length > 0) {
                    const parts = [text];
                    if (goodLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as GOOD matches (find more like these):\n${goodLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`).join('\n')}`);
                    }
                    if (badLeads.length > 0) {
                        parts.push(`\n\nUser marked these leads as BAD matches (avoid similar profiles):\n${badLeads.map(l => `- ${l.name}: ${l.headline || ''} at ${l.current_company || ''}${l.icp_reasoning ? ` (${l.icp_reasoning})` : ''}`).join('\n')}`);
                    }
                    icpDesc = parts.join('');
                }

                const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/advanced`, {
                    method: 'POST', headers: headers(), body: JSON.stringify({ query: searchQuery, count: leadCount, targeting: ext || undefined, icp_description: icpDesc }),
                });
                const d = await r.json();
                if (d.success) {
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
                    setLastIcpDescription(text);
                    setLastTargeting(ext);
                    addSearchSession(searchQuery, ext, text);
                    setSearchPage(1);
                    setTotalResults(d.total || 0);
                    const nextCursor = d.cursor || null;
                    setSearchCursor(nextCursor);
                    setCursorHistory([null, nextCursor]); // page1=null(start), page2=nextCursor
                    icpWasApplied = !!d.icp_applied;
                    if (Array.isArray(d.results) && d.results.length > 0) {
                        realLeads = d.results.map((item: any, idx: number) => ({
                            id: item.id || item.provider_id || `lead-${idx}`,
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
                    const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/extract-intent`, {
                        method: 'POST', headers: headers(), body: JSON.stringify({ query: text }),
                    });
                    const d = await r.json();
                    if (d.success && d.intent) {
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
    }, [busy, messages, convId, targeting, pendingIntent]);

    const onChatSend = useCallback(() => {
        if (!input.trim() || busy) return;
        doSend(input.trim()); setInput('');
        if (taRef.current) taRef.current.style.height = 'auto';
    }, [input, busy, doSend]);

    const onOptClick = useCallback((v: string) => { doSend(v); }, [doSend]);

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); screen === 'landing' ? onLandingSubmit() : onChatSend(); }
    };

    const reset = () => { setScreen('landing'); setMessages([]); setTargeting(null); setLeads([]); setShowPanel(false); setConvId(null); setMsgCount(0); setPendingIntent(null); setSearchPage(1); setTotalResults(0); setSearchCursor(null); setCursorHistory([null]); setLastSearchQuery(''); setLastIcpDescription(''); setLastTargeting(null); };

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

            const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/advanced`, {
                method: 'POST', headers: headers(), body: JSON.stringify(body),
            });
            const d = await r.json();
            if (d.success && Array.isArray(d.results) && d.results.length > 0) {
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
       SCREEN 1: LANDING
       ═══════════════════════════════════════════════ */
    if (screen === 'landing') return (
        <div className="adv-landing">
            <div className="adv-topbar">
                <button className="adv-back" onClick={() => router.back()}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
            </div>
            <div className="adv-center">
                <h1 className="adv-title"><span className="adv-navy">Your AI Lead Finder.</span> At your service.</h1>
                <div className="adv-card">
                    <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
                        placeholder="Describe your ideal customer... e.g. VP of Engineering at SaaS companies in USA" rows={4} className="adv-ta" />
                    <div className="adv-card-foot">
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button className="adv-idea" onClick={() => { setInput('Marketing directors at fintech startups in London'); taRef.current?.focus(); }}>
                                <span>✦</span> Give me an idea
                            </button>
                            <button className="adv-idea" onClick={() => { setInput('I want to find leads at a specific company'); taRef.current?.focus(); }}>
                                <span>🎯</span> Target Specific Leads
                            </button>
                            <button className="adv-idea" style={{ borderColor: '#d1fae5', background: '#ecfdf5' }} onClick={() => { router.push('/onboarding'); }}>
                                <span>📋</span> I Have Leads Data
                            </button>
                        </div>
                        <button className="adv-send-circle" disabled={!input.trim()} onClick={onLandingSubmit}
                            style={{ background: input.trim() ? '#172560' : '#e5e7eb', boxShadow: input.trim() ? '0 4px 14px rgba(23,37,96,.3)' : 'none' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
                {searchHistory.length > 0 && (
                    <div style={{ maxWidth: '640px', width: '100%', marginTop: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', paddingLeft: '4px' }}>Recent searches</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {[...searchHistory].reverse().map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setInput(q); taRef.current?.focus(); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px', borderRadius: '12px', border: '1px solid #e5e7eb',
                                        background: '#fff', cursor: 'pointer', textAlign: 'left',
                                        fontSize: '14px', color: '#374151', fontWeight: 500,
                                        transition: 'all 0.15s', width: '100%',
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#172560'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M7 17L17 7M17 7H7M17 7v10"/></svg>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
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
                        {messages.map(m => <Bubble key={m.id} msg={m} onOpt={onOptClick} onShowPanel={setShowPanel} onStartCheckpoints={() => setCpStep(0)} hasPanel={!!showPanel} leadsCount={leads.length} />)}

                        {/* ── Inline Checkpoint Form (typeform-style) ── */}
                        {cpStep >= 0 && (
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
                                targeting={targeting}
                                leads={leads}
                                leadFeedback={leadFeedback}
                                searchSessions={searchSessions}
                                chatMessages={messages}
                            />
                        )}

                        <div ref={endRef} />
                    </div>

                    <div className="adv-chat-input-wrap">
                        <div className="adv-msg-counter">{creditBalance !== null && creditBalance > 0 ? `${msgCount} messages used` : `${msgCount}/10 messages used`}</div>
                        <div className="adv-chat-input-box">
                            <textarea ref={taRef} value={input} rows={1} disabled={busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10)}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                                onKeyDown={onKey} placeholder={creditBalance !== null && creditBalance <= 0 && msgCount >= 10 ? 'Message limit reached — add credits to continue' : 'Ask your AI Lead Finder...'} className="adv-chat-ta" />
                            <button className="adv-send-circle adv-send-sm" disabled={!input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10)} onClick={onChatSend}
                                style={{ background: !input.trim() || busy || (creditBalance !== null && creditBalance <= 0 && msgCount >= 10) ? '#e5e7eb' : '#172560' }}>
                                {busy ? <div className="adv-spinner" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                            </button>
                        </div>
                    </div>
                    {/* Hidden file input for inbound CSV upload */}
                    <input ref={fileInputRef} type="file" accept=".csv" className="hidden" style={{ display: 'none' }}
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleInboundFile(f); e.target.value = ''; }} />
                </div>

                {/* RIGHT: PANELS */}
                {showPanel === 'leads' && targeting && !inboundMode && (
                    <div className="adv-leads-panel">
                        <div className="adv-panel-header" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 20px' }}>
                            <button className="adv-close-panel" onClick={() => setShowPanel(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                                {leads.length} lead{leads.length !== 1 ? 's' : ''}{totalResults > 0 && <span style={{ color: '#9ca3af', fontWeight: 400 }}> of {totalResults}</span>}
                            </span>
                        </div>

                        <div className="adv-panel-body">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="adv-panel-title" style={{ margin: 0 }}>Start connecting with your potential customers</h2>
                                {totalResults > 0 && (
                                    <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                                        {((searchPage - 1) * leadCount) + 1}-{Math.min(searchPage * leadCount, totalResults)} of {totalResults}
                                    </span>
                                )}
                            </div>
                            <p className="adv-panel-desc">
                                <span className="adv-navy">✦</span>
                                {targeting.job_titles.length > 0 ? ` ${targeting.job_titles.join(', ')}` : ''}
                                {targeting.industries.length > 0 ? ` in ${targeting.industries.join(', ')}` : ''}
                                {targeting.locations.length > 0 ? ` located in ${targeting.locations.join(', ')}` : ''}
                                {' who are focused on growth and lead generation.'}
                            </p>

                            {/* Lead profiles */}
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
                                            <div className="adv-lead-title">{lead.headline || lead.current_company || 'LinkedIn User'}</div>
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
                                            <div className="adv-lead-platform">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                            </div>
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

                            {leads.some(l => l.locked) && (
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
                            {searchCursor && (
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
                                            <>
                                                Get More Leads →
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
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
function Bubble({ msg, onOpt, onShowPanel, onStartCheckpoints, hasPanel, leadsCount }: { msg: ChatMsg; onOpt: (v: string) => void; onShowPanel: (panel: 'leads') => void; onStartCheckpoints: () => void; hasPanel: boolean; leadsCount: number }) {
    if (msg.loading) return (
        <div className="adv-bubble adv-bubble-ai fadeUp">
            <div className="adv-ai-avatar"><span>✦</span></div>
            <div><div className="adv-ai-name">AI Lead Finder</div><div className="adv-thinking">Thinking...</div></div>
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
                        <div className="adv-rc" onClick={() => onOpt('Refine my targeting criteria')} style={{
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
                        <button onClick={() => onFileUpload?.()} style={{
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
}) {
    const totalSteps = CP_QUESTIONS.length;
    const q = CP_QUESTIONS[step];

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

    const toggleAction = (a: string) => setActions((p: string[]) => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
    const toggleNextChannel = (ch: string) => {
        if (ch === 'skip') { setNextChannels([]); return; }
        setNextChannels((p: string[]) => p.includes(ch) ? p.filter(x => x !== ch) : [...p, ch]);
        // Fetch voice agents and numbers when voice_call is first selected
        if (ch === 'voice_call' && voiceAgents.length === 0) {
            (async () => {
                try {
                    const [agentsRes, numbersRes] = await Promise.all([
                        fetch(`${API_BASE}/api/voice-agent/user/available-agents`, { headers: headers() }),
                        fetch(`${API_BASE}/api/voice-agent/user/available-numbers`, { headers: headers() }),
                    ]);
                    const agentsData = await agentsRes.json();
                    const numbersData = await numbersRes.json();
                    // Normalize agents — API returns agent_id/agent_name (aliased)
                    const agents = (agentsData.data || []).map((a: any) => ({
                        ...a,
                        id: a.agent_id || a.id || '',
                        name: a.agent_name || a.name || '',
                    }));
                    // Normalize phone numbers — build from country_code + base_number if phone_number is empty/invalid
                    const numbers = (numbersData.data || []).map((n: any) => {
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
                } catch (e) { console.warn('Failed to fetch voice agents/numbers', e); }
            })();
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
            const r = await fetch(`${API_BASE}/api/ai-icp-assistant/chat`, { method: 'POST', headers: headers(), body: JSON.stringify({ message: prompt }) });
            const d = await r.json();
            if (d.success) { type === 'connect' ? setConnMsg(d.response || d.text) : setFollowMsg(d.response || d.text); }
        } catch (e) { console.error('Gen msg error', e); }
        setGenLoading(false);
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
            if (actions.includes('connect')) actionSteps.push({ type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', order_index: orderIdx++, config: { message: connMsg || '' } });
            if (actions.includes('message')) actionSteps.push({ type: 'linkedin_message', title: 'Send Follow-up Message', channel: 'linkedin', order_index: orderIdx++, config: { message: followMsg || '' } });
            // Add wait_for_condition + next channel steps
            if (nextChannels.length > 0 && triggerCondition) {
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
                    if (ch === 'email') actionSteps.push({ type: 'email_send', title: 'Send Follow-up Email', channel: 'email', order_index: orderIdx++, config: { subject: '', body: '' } });
                    if (ch === 'whatsapp') actionSteps.push({ type: 'whatsapp_send', title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: orderIdx++, config: { message: '' } });
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
            } catch {}

            // Collect leads marked as "good match" by the user during setup
            const goodMatchLeads = leads
                .filter(l => leadFeedback[l.id] === 'good')
                .map(l => ({
                    id: l.id, name: l.name, first_name: l.first_name, last_name: l.last_name,
                    headline: l.headline, title: l.headline, location: l.location,
                    current_company: l.current_company, company_name: l.current_company,
                    profile_url: l.profile_url, linkedin_url: l.profile_url,
                    profile_picture: l.profile_picture, photo_url: l.profile_picture,
                    industry: l.industry, network_distance: l.network_distance,
                    icp_score: l.icp_score, match_level: l.match_level, icp_reasoning: l.icp_reasoning,
                    profile_summary: l.icp_reasoning || null,
                    enriched_profile: l.enriched_profile || null,
                    _source: 'user_good_match',
                }));

            const payload = {
                name: name || 'AI Growth Campaign', status: 'active', campaign_type: 'linkedin_outreach', leads_per_day: safeLeadsPerDay,
                campaign_start_date: startDate.toISOString(), campaign_end_date: endDate.toISOString(),
                initial_leads: goodMatchLeads.length > 0 ? goodMatchLeads : undefined,
                config: {
                    data_source: 'linkedin_search', search_intent: t, search_query: t.keywords?.join(' ') || '',
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
                    { type: 'lead_generation', title: 'LinkedIn Lead Search', channel: 'linkedin', order_index: 0, config: {
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
                    } },
                    ...actionSteps,
                ],
            };
            const res = await fetch(`${API_BASE}/api/campaigns`, { method: 'POST', headers: headers(), body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.success) { window.location.href = '/campaigns'; }
            else { alert('Failed to launch campaign: ' + (data.error || 'Unknown error')); setLaunching(false); }
        } catch (err: any) { console.error('Campaign creation error', err); alert('Error: ' + err.message); setLaunching(false); }
    };

    const canNext = () => {
        if (step === 0) return !!icpThreshold;
        if (step === 1) return actions.length > 0;
        if (step === 2) return true; // messages
        if (step === 3) return true; // next channels (skip is valid)
        if (step === 4) return nextChannels.length === 0 || !!triggerCondition; // trigger condition (skip if no channels)
        if (step === 5) return !!days;
        if (step === 6) return !!name.trim();
        return true;
    };

    // Auto-skip trigger condition step if no next channels selected
    const handleNext = () => {
        let next = step + 1;
        // Skip step 4 (trigger condition) if no next channels were selected
        if (next === 4 && nextChannels.length === 0) next = 5;
        setStep(next);
    };
    const handleBack = () => {
        let prev = step - 1;
        // Skip step 4 (trigger condition) going back if no next channels
        if (prev === 4 && nextChannels.length === 0) prev = 3;
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
                            {[
                                { id: 'email', label: 'Email', desc: 'Send a follow-up email to the lead', icon: '\u2709' },
                                { id: 'whatsapp', label: 'WhatsApp', desc: 'Send a WhatsApp message', icon: '\uD83D\uDCAC' },
                                { id: 'voice_call', label: 'Voice Call', desc: 'Trigger an AI voice call', icon: '\uD83D\uDCDE' },
                            ].map((ch, i) => (
                                <div key={ch.id} onClick={() => toggleNextChannel(ch.id)} style={optStyle(nextChannels.includes(ch.id))}>
                                    <div style={numBadge(i + 1, nextChannels.includes(ch.id))}>{nextChannels.includes(ch.id) ? '\u2713' : i + 1}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600 }}>{ch.icon} {ch.label}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{ch.desc}</div>
                                    </div>
                                </div>
                            ))}
                            <div onClick={() => { setNextChannels([]); setStep(step + 1); }} style={optStyle(nextChannels.length === 0)}>
                                <div style={numBadge(4, nextChannels.length === 0)}>{nextChannels.length === 0 ? '\u2713' : 4}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600 }}>Skip</div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>No additional channels — LinkedIn only</div>
                                </div>
                            </div>

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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', maxWidth: '520px' }}>
                    <div style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500 }}>{step + 1}/{totalSteps}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            disabled={step <= 0}
                            onClick={handleBack}
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px', border: '1px solid #e5e7eb',
                                background: step <= 0 ? '#f9fafb' : '#fff', cursor: step <= 0 ? 'default' : 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                            }}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={step <= 0 ? '#d1d5db' : '#172560'} strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
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

                {/* Dismiss */}
                <button onClick={() => setStep(-1)} style={{
                    background: 'none', border: 'none', fontSize: '12px', color: '#9ca3af', cursor: 'pointer',
                    marginTop: '8px', padding: 0, fontWeight: 500,
                }}>Dismiss</button>
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
            .adv-topbar {padding:16px 28px; position:relative; z-index:2; }
            .adv-back {width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-back:hover {background:#f3f4f6; }
            .adv-center {flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:0 24px; margin-top:-50px; z-index:2; position:relative; }
            .adv-title {font - size:38px; font-weight:800; color:#111827; text-align:center; margin-bottom:36px; letter-spacing:-.03em; line-height:1.15; animation:fadeUp .5s ease both; }
            .adv-navy {color:#172560; }
            .adv-card {width:100%; max-width:640px; background:#fff; border-radius:22px; border:1px solid #e5e7eb; box-shadow:0 10px 40px rgba(0,0,0,.08); padding:22px; animation:fadeUp .5s ease .1s both; }
            .adv-ta {width:100%; border:none; outline:none; resize:none; font-size:16px; color:#111827; font-family:inherit; line-height:1.6; background:transparent; min-height:90px; }
            .adv-card-foot {display:flex; align-items:center; justify-content:space-between; margin-top:14px; padding-top:14px; border-top:1px solid #f3f4f6; }
            .adv-idea {display:flex; align-items:center; gap:6px; border:1px solid #c2d6eb; border-radius:22px; padding:7px 16px; font-size:13px; font-weight:500; color:#172560; background:transparent; cursor:pointer; transition:all .15s; }
            .adv-idea:hover {background:#e0eaf5; }
            .adv-send-circle {width:42px; height:42px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; transition:all .15s; flex-shrink:0; cursor:pointer; }
            .adv-send-circle:disabled {cursor:default; }
            .adv-bottom {padding:0 24px 40px; display:flex; justify-content:center; z-index:2; position:relative; }
            .adv-feature-card {background:rgba(255,255,255,.85); backdrop-filter:blur(10px); border-radius:22px; padding:24px 32px; max-width:520px; width:100%; border:1px solid rgba(255,255,255,.6); animation:fadeUp .5s ease .2s both; }
            .adv-feature-card h3 {font - size:16px; font-weight:700; color:#111827; margin:0 0 14px; }
            .adv-feature-list {display:flex; flex-direction:column; gap:10px; }
            .adv-feat-row {display:flex; align-items:center; gap:8px; font-size:13px; color:#374151; }

            /* ── CHAT SCREEN ── */
            .adv-chat-root {height:100vh; display:flex; flex-direction:column; background:#fafafa; }
            .adv-yellow-bar {height:4px; background:linear-gradient(90deg,#3b82f6,#2563eb,#172560); flex-shrink:0; }
            .adv-chat-main {flex:1; display:flex; overflow:hidden; }
            .adv-chat-left {display:flex; flex-direction:column; position:relative; background:#fff; transition:all .4s cubic-bezier(.4,0,.2,1); border-right:1px solid #f0f0f0; }
            .adv-chat-back {position:absolute; top:16px; left:20px; z-index:10; width:42px; height:42px; border-radius:50%; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 6px rgba(0,0,0,.06); transition:all .15s; }
            .adv-chat-back:hover {background:#f3f4f6; }
            .adv-chat-msgs {flex:1; overflow-y:auto; padding:72px 0 8px; }
            .adv-chat-input-wrap {border - top:1px solid #f0f0f0; background:#fff; padding:8px 20px 18px; }
            .adv-msg-counter {font - size:11px; color:#9ca3af; padding:4px 0 8px; text-align:center; }
            .adv-chat-input-box {display:flex; align-items:flex-end; gap:8px; background:#f9fafb; border:1.5px solid #e5e7eb; border-radius:18px; padding:8px 14px; transition:border .15s; }
            .adv-chat-input-box:focus-within {border - color:#172560; }
            .adv-chat-ta {flex:1; resize:none; border:none; outline:none; background:transparent; font-size:14px; color:#111827; font-family:inherit; line-height:1.5; padding:4px 0; max-height:100px; }
            .adv-send-sm {width:36px!important; height:36px!important; }
            .adv-spinner {width:16px; height:16px; border:2px solid #fff; border-top:2px solid transparent; border-radius:50%; animation:spin .8s linear infinite; }

            /* ── BUBBLES ── */
            .adv-bubble {padding:14px 24px; }
            .adv-bubble-user {display:flex; justify-content:flex-end; }
            .adv-user-msg {background:#e0eaf5; color:#111827; border-radius:18px 18px 4px 18px; padding:14px 20px; max-width:70%; border:1px solid #c2d6eb; font-size:15px; line-height:1.6; }
            .adv-bubble-ai {display:flex; gap:12px; align-items:flex-start; }
            .adv-ai-avatar {width:34px; height:34px; border-radius:50%; background:#e0eaf5; border:1.5px solid #c2d6eb; display:flex; align-items:center; justify-content:center; flex-shrink:0; color:#172560; font-size:14px; }
            .adv-ai-body {flex:1; max-width:88%; }
            .adv-ai-name {font - size:12px; font-weight:700; color:#111827; margin-bottom:6px; letter-spacing:.02em; }
            .adv-ai-text {font - size:14.5px; line-height:1.7; color:#374151; }
            .adv-ai-text p {margin:0 0 4px; }
            .adv-ai-text strong {color:#111827; }
            .adv-thinking {font - size:14px; color:#9ca3af; font-style:italic; animation:pulse 1.5s ease infinite; }

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
            .adv-opt-btn {padding:10px 18px; border-radius:14px; font-size:13px; font-weight:500; border:1.5px solid #e5e7eb; background:#fff; color:#374151; cursor:pointer; transition:all .15s; }
            .adv-opt-btn:hover {border - color:#172560; background:#f2f6fa; color:#0f1842; }

            /* ── LEADS PANEL ── */
            .adv-leads-panel {width:50%; background:#fff; animation:slideIn .4s cubic-bezier(.4,0,.2,1) both; display:flex; flex-direction:column; overflow:hidden; border-left:1px solid #f0f0f0; }
            .adv-panel-header {display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid #f0f0f0; }
            .adv-close-panel {width:34px; height:34px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; }
            .adv-close-panel:hover {background:#f3f4f6; }
            .adv-unlock-btn {padding:8px 18px; border-radius:22px; border:none; background:#111827; color:#fff; font-size:13px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all .15s; }
            .adv-unlock-btn:hover {background:#1f2937; box-shadow:0 4px 12px rgba(0,0,0,.15); }
            .adv-panel-body {flex:1; overflow-y:auto; padding:24px; }
            .adv-panel-title {font - size:22px; font-weight:800; color:#111827; margin:0 0 12px; line-height:1.25; letter-spacing:-.02em; }
            .adv-panel-desc {font - size:14px; color:#6b7280; line-height:1.6; margin:0 0 24px; padding:12px 16px; background:#f5f8fc; border-radius:14px; border:1px solid #e0eaf5; }
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
