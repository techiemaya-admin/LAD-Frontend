'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Gem } from 'lucide-react';
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
    const [showPanel, setShowPanel] = useState<false | 'leads' | 'checkpoints'>(false);
    const [convId, setConvId] = useState<string | null>(null);
    const [msgCount, setMsgCount] = useState(0);
    const [pendingIntent, setPendingIntent] = useState<string | null>(null);

    const endRef = useRef<HTMLDivElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null);
    const [profileSummary, setProfileSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
        setScreen('chat');
        setTimeout(() => doSend(input.trim()), 100);
        setInput('');
    }, [input]);

    /* ── Core send logic ── */
    const doSend = useCallback(async (text: string) => {
        if (!text.trim() || busy) return;
        const uid = `u-${Date.now()}`;
        const lid = `l-${Date.now()}`;
        setMessages(p => [...p, { id: uid, role: 'user', text, ts: new Date() }, { id: lid, role: 'ai', text: '', ts: new Date(), loading: true }]);
        setBusy(true);
        setMsgCount(c => c + 1);

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

            // If we have updated targeting from lead-chat or custom flows, use that for search query
            const searchQuery = shouldRunSearch && ext && !isFirstMessage
                ? [...(ext.job_titles || []), ...(ext.industries || []), ...(ext.locations || []), ...(ext.keywords || [])].join(' ')
                : text;

            try {
                const r = await fetch(`${API_BASE}/api/campaigns/linkedin/search/advanced`, {
                    method: 'POST', headers: headers(), body: JSON.stringify({ query: searchQuery, count: 10, targeting: ext || undefined }),
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

    const reset = () => { setScreen('landing'); setMessages([]); setTargeting(null); setLeads([]); setShowPanel(false); setConvId(null); setMsgCount(0); setPendingIntent(null); };

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
                        </div>
                        <button className="adv-send-circle" disabled={!input.trim()} onClick={onLandingSubmit}
                            style={{ background: input.trim() ? '#172560' : '#e5e7eb', boxShadow: input.trim() ? '0 4px 14px rgba(23,37,96,.3)' : 'none' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
            <div className="adv-bottom">
                <div className="adv-feature-card">
                    <h3>Find your perfect leads 🎯</h3>
                    <div className="adv-feature-list">
                        {['AI-powered lead targeting from natural language', 'LinkedIn search with extracted intent', 'Smart ICP profiling with Gemini AI'].map(t => (
                            <div key={t} className="adv-feat-row">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#172560" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                                <span>{t}</span>
                            </div>
                        ))}
                    </div>
                </div>
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
                        {messages.map(m => <Bubble key={m.id} msg={m} onOpt={onOptClick} onShowPanel={setShowPanel} hasPanel={!!showPanel} leadsCount={leads.length} />)}
                        <div ref={endRef} />
                    </div>

                    <div className="adv-chat-input-wrap">
                        <div className="adv-msg-counter">{msgCount}/10 messages used</div>
                        <div className="adv-chat-input-box">
                            <textarea ref={taRef} value={input} rows={1} disabled={busy}
                                onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
                                onKeyDown={onKey} placeholder="Ask your AI Lead Finder..." className="adv-chat-ta" />
                            <button className="adv-send-circle adv-send-sm" disabled={!input.trim() || busy} onClick={onChatSend}
                                style={{ background: !input.trim() || busy ? '#e5e7eb' : '#172560' }}>
                                {busy ? <div className="adv-spinner" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: PANELS */}
                {showPanel === 'leads' && targeting && (
                    <div className="adv-leads-panel">
                        <div className="adv-panel-header">
                            <button className="adv-close-panel" onClick={() => setShowPanel(false)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                            <button className="adv-unlock-btn" onClick={() => setShowPanel('checkpoints')}>✨ Create Campaign Checkpoints</button>
                        </div>

                        <div className="adv-panel-body">
                            <h2 className="adv-panel-title">Start connecting with your potential customers</h2>
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
                                            <a href={lead.profile_url || '#'} target="_blank" rel="noopener noreferrer" className="adv-lead-name" style={{ textDecoration: 'none', color: 'inherit' }}>
                                                {lead.name} {!lead.locked && <span className="adv-verified">✓</span>}
                                            </a>
                                            <div className="adv-lead-title">{lead.headline || lead.current_company || 'LinkedIn User'}</div>
                                            {lead.location && <div className="adv-lead-location">📍 {lead.location}</div>}
                                            <div className="adv-lead-platform">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="#0a66c2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                                            </div>
                                        </div>
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
                                    </div>
                                ))}
                            </div>

                            {leads.some(l => l.locked) && (
                                <div className="adv-panel-footer" style={{ display: 'flex', justifyContent: 'center', padding: '16px 0', borderTop: '0px solid #e5e7eb', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setLeads(prev => prev.map(l => ({ ...l, locked: false })))}
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
                        </div>
                    </div>
                )}

                {showPanel === 'checkpoints' && (
                    <CheckpointsPanel onClose={() => setShowPanel(false)} targeting={targeting} />
                )}

                <ProfileSummaryDialog
                    open={summaryDialogOpen}
                    onClose={handleCloseSummaryDialog}
                    employee={selectedEmployee}
                    summary={profileSummary}
                    loading={summaryLoading}
                    error={summaryError}
                />
            </div>
            <style>{css}</style>
        </div>
    );
}

/* ═══════════════════════════════════════════════
   CHAT BUBBLE
   ═══════════════════════════════════════════════ */
function Bubble({ msg, onOpt, onShowPanel, hasPanel, leadsCount }: { msg: ChatMsg; onOpt: (v: string) => void; onShowPanel: (panel: 'leads' | 'checkpoints') => void; hasPanel: boolean; leadsCount: number }) {
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
                        onClick={() => onShowPanel('checkpoints')}
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
                        }} onClick={() => onShowPanel('checkpoints')}>Create Campaign Checkpoints</button>
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
   CHECKPOINTS PANEL
   ═══════════════════════════════════════════════ */
function CheckpointsPanel({ onClose, targeting }: { onClose: () => void; targeting: LeadTargeting | null }) {
    const [openIdx, setOpenIdx] = useState(0);
    const [actions, setActions] = useState<string[]>(['connect']);
    const [connMsg, setConnMsg] = useState('');
    const [followMsg, setFollowMsg] = useState('');
    const [connLoading, setConnLoading] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [days, setDays] = useState('30');
    const [name, setName] = useState('');

    const toggleAction = (a: string) => {
        setActions(p => p.includes(a) ? p.filter(x => x !== a) : [...p, a]);
    };

    const suggestName = async () => {
        const titlePart = targeting?.job_titles?.length ? targeting.job_titles[0] + 's' : 'Leads';
        const locPart = targeting?.locations?.length ? ` in ${targeting.locations[0].split(',')[0]}` : '';
        const indPart = targeting?.industries?.length && !locPart ? ` (${targeting.industries[0]})` : '';
        const datePart = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

        setName(`${titlePart}${locPart}${indPart} - ${datePart}`);
    };

    const generateConnMsg = async () => {
        setConnLoading(true);
        try {
            const jobDesc = targeting?.job_titles?.length ? targeting.job_titles.join(' / ') : 'professionals';
            const indDesc = targeting?.industries?.length ? ` in the ${targeting.industries[0]} industry` : '';
            const locDesc = targeting?.locations?.length ? ` in ${targeting.locations[0]}` : '';

            const msg = `System Settings:
- You are an automated script that outputs raw string data.
- NEVER talk to the user.
- NEVER ask questions.
- NEVER say "Here is the message".
- OUTPUT THE ACTUAL MESSAGE AND NOTHING ELSE.

Task: Write a short, casual LinkedIn connection request (max 300 chars) for a ${jobDesc}${indDesc}${locDesc}. 
Start exactly with: "Hi {first_name},"
Focus on networking. No sales pitches.`;

            const r = await fetch(`${API_BASE}/api/ai-icp-assistant/chat`, { method: 'POST', headers: headers(), body: JSON.stringify({ message: msg }) });
            const d = await r.json();
            if (d.success) setConnMsg(d.response || d.text);
        } catch (e) { console.error('Gen conn error', e); }
        setConnLoading(false);
    };

    const generateFollowMsg = async () => {
        setFollowLoading(true);
        try {
            const jobDesc = targeting?.job_titles?.length ? targeting.job_titles.join(' / ') : 'professionals';
            const indDesc = targeting?.industries?.length ? ` in the ${targeting.industries[0]} industry` : '';

            const msg = `System Settings:
- You are an automated script that outputs raw string data.
- NEVER talk to the user.
- NEVER ask questions.
- NEVER say "Here is your follow-up".
- OUTPUT THE ACTUAL MESSAGE AND NOTHING ELSE.

Task: Write a concise, professional LinkedIn follow-up message (under 300 chars) to send AFTER someone accepts a connection request. Target audience is: ${jobDesc}${indDesc}.
Start exactly with: "Thanks for connecting! "
Ask a relevant, polite question to spark conversation. Do not pitch.`;

            const r = await fetch(`${API_BASE}/api/ai-icp-assistant/chat`, { method: 'POST', headers: headers(), body: JSON.stringify({ message: msg }) });
            const d = await r.json();
            if (d.success) setFollowMsg(d.response || d.text);
        } catch (e) { console.error('Gen follow error', e); }
        setFollowLoading(false);
    };

    return (
        <div className="adv-leads-panel bg-gradient-to-br from-[#f2f6fa] to-[#e0eaf5]" style={{ flex: 1, overflowY: "auto" }}>
            <div className="adv-panel-header" style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(10px)", borderBottom: "1px solid #c2d6eb" }}>
                <button className="adv-close-panel" onClick={onClose} style={{ borderColor: "#c2d6eb" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
                <div style={{ fontSize: "15px", fontWeight: 700, color: "#111827", marginLeft: "14px" }}>Campaign Checkpoints</div>
            </div>
            <div className="adv-panel-body" style={{ background: "transparent", padding: "32px 24px" }}>
                <div style={{ background: "rgba(255,255,255,0.75)", border: "1px solid #c2d6eb", borderRadius: "18px", padding: "20px", marginBottom: "20px", boxShadow: "0 8px 32px rgba(23,37,96,0.04)" }}>
                    <h2 style={{ fontSize: "16px", fontWeight: 800, margin: "0 0 20px", color: "#172560" }}>4 Checkpoints</h2>

                    {/* CP 1: Actions */}
                    <div style={{ borderBottom: "1px solid #e0eaf5", paddingBottom: "16px", marginBottom: "16px", opacity: openIdx !== 0 && openIdx > 0 ? 0.6 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => setOpenIdx(0)}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: openIdx > 0 ? "#10b981" : "#172560", color: "#fff", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px" }}>
                                    {openIdx > 0 ? "✓" : "🏳️"}
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: "#111827", textDecoration: openIdx > 0 ? "line-through" : "none" }}>1. LinkedIn Actions</div>
                            </div>
                            <div style={{ transform: openIdx === 0 ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "#9ca3af" }}>▼</div>
                        </div>
                        {openIdx === 0 && (
                            <div style={{ marginTop: "16px", paddingLeft: "36px", display: "flex", gap: "8px", flexWrap: "wrap", animation: "fadeUp 0.3s ease both" }}>
                                {[
                                    { id: 'connect', label: 'Send connection request' },
                                    { id: 'message', label: 'Send message (after accepted)' }
                                ].map(a => (
                                    <div key={a.id} onClick={() => toggleAction(a.id)} style={{
                                        padding: "8px 14px", border: `1.5px solid ${actions.includes(a.id) ? '#172560' : '#e5e7eb'}`,
                                        background: actions.includes(a.id) ? '#e0eaf5' : '#fff', borderRadius: "20px", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: actions.includes(a.id) ? "#172560" : "#4b5563"
                                    }}>
                                        {a.label} {actions.includes(a.id) && '✓'}
                                    </div>
                                ))}
                                <button className="adv-unlock-btn" style={{ marginTop: "12px", width: "100%", justifyContent: "center", background: "#172560" }} onClick={() => setOpenIdx(1)}>Save Actions</button>
                            </div>
                        )}
                    </div>

                    {/* CP 2: Messages */}
                    <div style={{ borderBottom: "1px solid #e0eaf5", paddingBottom: "16px", marginBottom: "16px", opacity: openIdx !== 1 && openIdx > 1 ? 0.6 : openIdx < 1 ? 0.4 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => { if (openIdx >= 1) setOpenIdx(1); }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: openIdx > 1 ? "#10b981" : "#e5e7eb", color: openIdx > 1 ? "#fff" : "#9ca3af", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px" }}>
                                    {openIdx > 1 ? "✓" : "🏳️"}
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: openIdx < 1 ? "#9ca3af" : "#111827", textDecoration: openIdx > 1 ? "line-through" : "none" }}>2. Outreach Messages</div>
                            </div>
                            <div style={{ transform: openIdx === 1 ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "#9ca3af" }}>▼</div>
                        </div>
                        {openIdx === 1 && (
                            <div style={{ marginTop: "16px", paddingLeft: "36px", animation: "fadeUp 0.3s ease both" }}>
                                {actions.includes('connect') && (
                                    <div style={{ marginBottom: "16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Connection Request Message</label>
                                            <button disabled={connLoading} style={{ background: "transparent", border: "none", fontSize: "12px", fontWeight: 700, color: connLoading ? "#9ca3af" : "#f59e0b", cursor: connLoading ? "not-allowed" : "pointer", padding: 0, opacity: connLoading ? 0.7 : 1 }} onClick={generateConnMsg}>
                                                {connLoading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="16 16"><circle cx="12" cy="12" r="10" /></svg> Loading...</span> : "✨ Generate"}
                                            </button>
                                        </div>
                                        <textarea className="adv-ta" style={{ width: "100%", border: "1px solid #c2d6eb", borderRadius: "10px", padding: "12px", fontSize: "13px", height: "80px", background: "#fff", opacity: connLoading ? 0.5 : 1, transition: "opacity 0.2s" }} disabled={connLoading} value={connMsg} onChange={e => setConnMsg(e.target.value)} placeholder="Hi {first_name}, I'd love to connect!" />
                                    </div>
                                )}
                                {actions.includes('message') && (
                                    <div style={{ marginBottom: "16px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                            <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151" }}>Follow-up Message</label>
                                            <button disabled={followLoading} style={{ background: "transparent", border: "none", fontSize: "12px", fontWeight: 700, color: followLoading ? "#9ca3af" : "#f59e0b", cursor: followLoading ? "not-allowed" : "pointer", padding: 0, opacity: followLoading ? 0.7 : 1 }} onClick={generateFollowMsg}>
                                                {followLoading ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="16 16"><circle cx="12" cy="12" r="10" /></svg> Loading...</span> : "✨ Generate"}
                                            </button>
                                        </div>
                                        <textarea className="adv-ta" style={{ width: "100%", border: "1px solid #c2d6eb", borderRadius: "10px", padding: "12px", fontSize: "13px", height: "80px", background: "#fff", opacity: followLoading ? 0.5 : 1, transition: "opacity 0.2s" }} disabled={followLoading} value={followMsg} onChange={e => setFollowMsg(e.target.value)} placeholder="Thanks for connecting! ..." />
                                    </div>
                                )}
                                {!actions.includes('connect') && !actions.includes('message') && (
                                    <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px", fontStyle: "italic" }}>No messaging actions selected. Checkpoint complete.</div>
                                )}
                                <button className="adv-unlock-btn" style={{ width: "100%", justifyContent: "center", background: "#172560" }} onClick={() => setOpenIdx(2)}>Save Messages</button>
                            </div>
                        )}
                    </div>

                    {/* CP 3: Duration */}
                    <div style={{ borderBottom: "1px solid #e0eaf5", paddingBottom: "16px", marginBottom: "16px", opacity: openIdx !== 2 && openIdx > 2 ? 0.6 : openIdx < 2 ? 0.4 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => { if (openIdx >= 2) setOpenIdx(2); }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: openIdx > 2 ? "#10b981" : "#e5e7eb", color: openIdx > 2 ? "#fff" : "#9ca3af", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px" }}>
                                    {openIdx > 2 ? "✓" : "🏳️"}
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: openIdx < 2 ? "#9ca3af" : "#111827", textDecoration: openIdx > 2 ? "line-through" : "none" }}>3. Campaign Duration</div>
                            </div>
                            <div style={{ transform: openIdx === 2 ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "#9ca3af" }}>▼</div>
                        </div>
                        {openIdx === 2 && (
                            <div style={{ marginTop: "16px", paddingLeft: "36px", animation: "fadeUp 0.3s ease both" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>How many days to run?</label>
                                <input type="number" style={{ width: "100%", border: "1px solid #c2d6eb", borderRadius: "10px", padding: "10px 12px", fontSize: "14px", outline: "none", background: "#fff" }} value={days} onChange={e => setDays(e.target.value)} />
                                <button className="adv-unlock-btn" style={{ marginTop: "16px", width: "100%", justifyContent: "center", background: "#172560" }} onClick={() => setOpenIdx(3)}>Save Duration</button>
                            </div>
                        )}
                    </div>

                    {/* CP 4: Name */}
                    <div style={{ opacity: openIdx < 3 ? 0.4 : 1, transition: "opacity 0.2s" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", cursor: "pointer" }} onClick={() => { if (openIdx >= 3) setOpenIdx(3); }}>
                            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: openIdx > 3 ? "#10b981" : "#e5e7eb", color: openIdx > 3 ? "#fff" : "#9ca3af", display: "flex", justifyContent: "center", alignItems: "center", fontSize: "12px" }}>
                                    {openIdx > 3 ? "✓" : "🏳️"}
                                </div>
                                <div style={{ fontSize: "14px", fontWeight: 600, color: openIdx < 3 ? "#9ca3af" : "#111827" }}>4. Campaign Name</div>
                            </div>
                            <div style={{ transform: openIdx === 3 ? "rotate(180deg)" : "", transition: "transform 0.2s", color: "#9ca3af" }}>▼</div>
                        </div>
                        {openIdx === 3 && (
                            <div style={{ marginTop: "16px", paddingLeft: "36px", animation: "fadeUp 0.3s ease both" }}>
                                <label style={{ fontSize: "12px", fontWeight: 600, color: "#374151", display: "block", marginBottom: "6px" }}>Name your campaign</label>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input type="text" style={{ flex: 1, border: "1px solid #c2d6eb", borderRadius: "10px", padding: "10px 12px", fontSize: "13px", outline: "none", background: "#fff", minWidth: 0 }} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q3 Outreach Strategy" />
                                    <button style={{ background: "#e0eaf5", border: "1.5px solid #172560", borderRadius: "10px", padding: "0 14px", fontSize: "12px", fontWeight: 700, color: "#172560", cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0 }} onClick={suggestName} onMouseLeave={e => { e.currentTarget.style.background = "#e0eaf5"; e.currentTarget.style.color = "#172560" }} onMouseEnter={e => { e.currentTarget.style.background = "#172560"; e.currentTarget.style.color = "#fff" }}>✨ Auto Suggest</button>
                                </div>
                                <button className="adv-unlock-btn" style={{ marginTop: "24px", width: "100%", justifyContent: "center", background: "#10b981", padding: "12px", fontSize: "14px", fontWeight: 700 }} onClick={async (e) => {
                                    const btn = e.currentTarget;
                                    const oldHtml = btn.innerHTML;
                                    btn.innerHTML = '🚀 Launching...';
                                    btn.style.opacity = '0.7';
                                    btn.style.pointerEvents = 'none';

                                    try {
                                        const campaignDays = parseInt(days) || 30;
                                        const startDate = new Date();
                                        const endDate = new Date();
                                        endDate.setDate(endDate.getDate() + campaignDays);

                                        const actionSteps: any[] = [];
                                        let orderIdx = 1;

                                        if (actions.includes('connect')) {
                                            actionSteps.push({
                                                type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', order_index: orderIdx++,
                                                config: { message: connMsg || '' }
                                            });
                                        }
                                        if (actions.includes('message')) {
                                            actionSteps.push({
                                                type: 'linkedin_message', title: 'Send Follow-up Message', channel: 'linkedin', order_index: orderIdx++,
                                                config: { message: followMsg || '' }
                                            });
                                        }

                                        const processedTargeting = targeting || {
                                            keywords: [], industries: [], locations: [], job_titles: [], profile_language: []
                                        };

                                        const campaignPayload = {
                                            name: name || 'AI Growth Campaign',
                                            status: 'active',
                                            campaign_type: 'linkedin_outreach',
                                            leads_per_day: 40,
                                            campaign_start_date: startDate.toISOString(),
                                            campaign_end_date: endDate.toISOString(),
                                            config: {
                                                data_source: 'linkedin_search',
                                                search_intent: processedTargeting,
                                                search_query: processedTargeting.keywords?.join(' ') || '',
                                                leads_per_day: 40,
                                                daily_lead_limit: 40,
                                                working_days: 'monday-friday',
                                                campaign_days: campaignDays,
                                                linkedin_actions: actions,
                                                connection_message: connMsg || '',
                                                followup_message: followMsg || '',
                                                location: processedTargeting.locations?.[0] || '',
                                                industries: processedTargeting.industries || [],
                                                job_titles: processedTargeting.job_titles || [],
                                                profile_language: processedTargeting.profile_language || [],
                                                search_filters: {
                                                    keywords: processedTargeting.keywords?.join(' ') || '',
                                                    industries: processedTargeting.industries || [],
                                                    locations: processedTargeting.locations || [],
                                                    job_titles: processedTargeting.job_titles || [],
                                                    profile_language: processedTargeting.profile_language || [],
                                                }
                                            },
                                            steps: [
                                                {
                                                    type: 'lead_generation',
                                                    title: 'LinkedIn Lead Search',
                                                    channel: 'linkedin',
                                                    order_index: 0,
                                                    config: {
                                                        source: 'linkedin_search',
                                                        leadGenerationFilters: {
                                                            keywords: processedTargeting.keywords?.join(' ') || '',
                                                            industries: processedTargeting.industries || [],
                                                            locations: processedTargeting.locations || [],
                                                            job_titles: processedTargeting.job_titles || [],
                                                        },
                                                        leadGenerationLimit: 40,
                                                    }
                                                },
                                                ...actionSteps,
                                            ],
                                        };

                                        const res = await fetch(`${API_BASE}/api/campaigns`, {
                                            method: 'POST',
                                            headers: headers(),
                                            body: JSON.stringify(campaignPayload)
                                        });

                                        const data = await res.json();
                                        if (data.success) {
                                            window.location.href = '/campaigns';
                                        } else {
                                            alert('Failed to launch campaign: ' + (data.error || 'Unknown error'));
                                            btn.innerHTML = oldHtml;
                                            btn.style.opacity = '1';
                                            btn.style.pointerEvents = 'auto';
                                        }
                                    } catch (err: any) {
                                        console.error('Campaign creation error', err);
                                        alert('Error launching campaign: ' + err.message);
                                        btn.innerHTML = oldHtml;
                                        btn.style.opacity = '1';
                                        btn.style.pointerEvents = 'auto';
                                    }
                                }}>🚀 Finalize & Launch Campaign</button>
                            </div>
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
