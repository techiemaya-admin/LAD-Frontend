'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// NOTE: Do NOT import Header/Footer here. PublicLayout wraps every public
// route (including /pricing) and already renders both. Importing them on
// the page would render duplicates (the prior page had this bug too).

// ─── Section ids (collapsible groups) ────────────────────────────────────
type SectionId =
  | 'key' | 'broadcast' | 'linkedin' | 'email' | 'engage-ai'
  | 'voice' | 'ads' | 'analyse' | 'crm' | 'admin' | 'support';

// ─── Plan columns ────────────────────────────────────────────────────────
// The $39 "Broadcast" (No AI) plan is hidden from the public comparison.
// Flip this back to true to bring it back: the plan card renders again and
// cellGroup() stops dropping its column, so every <FRow> below keeps its
// Broadcast value authored in place - nothing else needs editing.
const SHOW_BROADCAST_PLAN = false;
/** Number of plan columns rendered - drives the CSS grid templates. */
const PLAN_COLUMNS = SHOW_BROADCAST_PLAN ? 5 : 4;

export default function PricingPage() {
  const router = useRouter();

  const handleGetStarted = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) router.push('/settings?tab=credits&action=add');
    else        router.push('/login');
  };
  const handleTalkToSales = () => router.push('/contact');

  // Only the "Key features" section is open by default,matches the original HTML.
  const [open, setOpen] = useState<Record<SectionId, boolean>>({
    key: true, broadcast: false, linkedin: false, email: false, 'engage-ai': false,
    voice: false, ads: false, analyse: false, crm: false, admin: false, support: false,
  });
  const toggle = (id: SectionId) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="pricing-root">
      <div className="wrap">

          <header className="page">
            <h1>Compare all Mr LAD plans &amp; features</h1>
            <p>
              From simple WhatsApp &amp; email broadcasting to a full agentic sales team that works your funnel across LinkedIn, WhatsApp, Instagram, email, ads and voice. Every plan drives toward your Sales-Accepted Handoff.
            </p>
            <div className="pillars">
              <span className="pillar o">Outreach</span>
              <span className="pillar e">Engage</span>
              <span className="pillar a">Analyse</span>
              <span className="pillar c">Convert</span>
            </div>
          </header>

          {/* ===== Comparison table scroll wrapper ===== */}
          <div className="table-scroll-wrapper">
            <div className="table-scroll-inner">
              {/* ===== Sticky plan header ===== */}
              <div className="plan-row bg-slate-50 dark:bg-[#000724] border-b border-slate-200 dark:border-[#262831]">
                <div className="grid">
                  <div className="corner text-slate-500 dark:text-slate-400 flex items-end">Features by plan</div>

              {SHOW_BROADCAST_PLAN && (
                <div className="plan-card noai bg-slate-50 dark:bg-[#0d152a] border border-slate-200 dark:border-[#262831]">
                  <span className="badge gray">No AI</span>
                  <h3 className="text-slate-800 dark:text-white">Broadcast</h3>
                  <div className="price text-slate-800 dark:text-white">$39<small>/mo</small></div>
                  <div className="seg text-slate-500 dark:text-slate-400">Email &amp; WhatsApp campaigns only</div>
                  <button type="button" className="cta" onClick={handleGetStarted}>Start free trial</button>
                </div>
              )}

                  <div className="plan-card bg-white dark:bg-[#101935] border border-slate-200 dark:border-[#262831]">
                    <h3 className="text-slate-800 dark:text-white">Starter</h3>
                    <div className="price text-slate-800 dark:text-white">$99<small>/mo</small></div>
                    <div className="seg text-slate-500 dark:text-slate-400">Solopreneurs · Outreach</div>
                    <button type="button" className="cta" onClick={handleGetStarted}>Start free trial</button>
                  </div>

                  <div className="plan-card popular bg-white dark:bg-[#101935] border-2 border-teal-600 dark:border-blue-500">
                    <span className="badge">Most popular</span>
                    <h3 className="text-slate-800 dark:text-white">Growth</h3>
                    <div className="price text-slate-800 dark:text-white">$199<small>/mo</small></div>
                    <div className="seg text-slate-500 dark:text-slate-400">Small teams · Outreach + Engage</div>
                    <button type="button" className="cta" onClick={handleGetStarted}>Start free trial</button>
                  </div>

                  <div className="plan-card bg-white dark:bg-[#101935] border border-slate-200 dark:border-[#262831]">
                    <h3 className="text-slate-800 dark:text-white">Scale</h3>
                    <div className="price text-slate-800 dark:text-white">$499<small>/mo</small></div>
                    <div className="seg text-slate-500 dark:text-slate-400">Sales teams · All pillars + Voice</div>
                    <button type="button" className="cta" onClick={handleGetStarted}>Start free trial</button>
                  </div>

                  <div className="plan-card bg-white dark:bg-[#101935] border border-slate-200 dark:border-[#262831]">
                    <h3 className="text-slate-800 dark:text-white">Enterprise</h3>
                    <div className="price text-slate-800 dark:text-white">Custom</div>
                    <div className="seg text-slate-500 dark:text-slate-400">10+ channels · Omnichannel layer</div>
                    <button type="button" className="cta" onClick={handleTalkToSales}>Talk to sales</button>
                  </div>
                </div>
              </div>

              {/* ============================================================
                  Sections are grouped by pillar in this order:
                  Key features → Outreach → Engage → Analyse → Convert → Admin
                  → Support. Bench text deliberately omits competitor product
                  names; price ranges below are category benchmarks. The
                  standalone-tool calculators that sit below the comparison
                  tables (further down the page) name competitors explicitly.
                  ============================================================ */}

              {/* ===== KEY FEATURES ===== */}
              <Section id="key" pillar="n" title="Key features"
                bench={<>The whole funnel in one subscription. A comparable point-solution stack runs <b>$285-$700+/mo</b> across 4-6 separate tools.</>}
                isOpen={open['key']} onToggle={() => toggle('key')}>
                <FRow name={<><b>Contacts / active prospects</b><span>Contacts you can store and message; prospects in live AI campaigns.</span></>}
                  cells={cellGroup(<Lim>2,000 contacts</Lim>, <Lim>500 prospects</Lim>, <Lim>2,500 prospects</Lim>, <Lim>10,000 prospects</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>AI agents</b><span>Autonomous agents that research, converse, qualify and book.</span></>}
                  cells={cellGroup(<No />, <Lim>Outreach</Lim>, <Lim>+ Engage</Lim>, <Lim>All + Voice</Lim>, <Lim>All + custom</Lim>)} />
                <FRow name={<><b>LinkedIn sender accounts</b><span>Connected LinkedIn profiles running outreach.</span></>}
                  cells={cellGroup(<No />, <Lim>1</Lim>, <Lim>2</Lim>, <Lim>5</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Users</b><span>Team members on your account.</span></>}
                  cells={cellGroup(<Lim>1</Lim>, <Lim>1</Lim>, <Lim>3</Lim>, <Lim>10</Lim>, <Lim>Unlimited</Lim>)} />
                <FRow name={<><b>Channels included</b><span>Where Mr LAD works for you.</span></>}
                  cells={cellGroup(<Lim>WhatsApp + Email broadcasts</Lim>, <Lim>LinkedIn + Email</Lim>, <Lim>+ WhatsApp, Instagram</Lim>, <Lim>+ Voice, Meta Ads</Lim>, <Lim>All + custom</Lim>)} />
                <FRow name={<><b>Sales-Accepted Handoff goal</b><span>Configure what counts as conversion: meeting booked, order placed, or quotation sent.</span></>}
                  cells={cellGroup(<No />, <Lim>Meeting booking</Lim>, <Lim>Meeting / quotation</Lim>, <Yes>✓ Any SAH type</Yes>, <Lim>Custom events</Lim>)} />
                <FRow name={<><b>AI usage wallet</b><span>Pre-paid wallet metering AI consumption across all agents. Top up any time.</span></>}
                  cells={cellGroup(<No />, <Lim>$25/mo included</Lim>, <Lim>$50/mo included</Lim>, <Lim>$125/mo included</Lim>, <Lim>Volume rates</Lim>)} />
                <FRow name={<><b>Customer support</b></>}
                  cells={cellGroup(<Lim>Email</Lim>, <Lim>Email + WhatsApp</Lim>, <Lim>Priority chat</Lim>, <Lim>Phone + onboarding call</Lim>, <Lim>Success manager</Lim>)} />
              </Section>

              {/* ===== OUTREACH : LINKEDIN ===== */}
              <Section id="linkedin" pillar="o" title="Outreach: LinkedIn"
                bench={<>Standalone LinkedIn outreach tools run <b>$59-$199/seat/mo</b>. None of them research each prospect or hand conversations off to other channels.</>}
                isOpen={open['linkedin']} onToggle={() => toggle('linkedin')}>
                <FRow name={<><b>ICP-based prospect discovery</b><span>Find prospects matching your Ideal Customer Profile automatically.</span></>}
                  cells={cellGroup(<No />, <Lim>250/mo</Lim>, <Lim>800/mo</Lim>, <Lim>2,000/mo</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Contact enrichment credits</b><span>Verified emails &amp; phone numbers for discovered prospects.</span></>}
                  cells={cellGroup(<No />, <Lim>250/mo</Lim>, <Lim>800/mo</Lim>, <Lim>2,000/mo</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Personalised connection requests &amp; sequences</b><span>Multi-step LinkedIn outreach with safe daily limits.</span></>}
                  cells={cellGroup(<No />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Per-prospect web research</b><span>Agent researches each prospect online before writing the first message.</span></>}
                  cells={cellGroup(<No />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>AI conversation agent on LinkedIn</b><span>Replies handled automatically and driven toward your SAH.</span></>}
                  cells={cellGroup(<No />, <Lim>First touch only</Lim>, <Yes>✓ Full conversation</Yes>, <Yes />, <Yes />)} />
                <FRow name={<><b>Warm Path relationship context</b><span>Surface mutual connections and CRM relationships before outreach.</span></>}
                  cells={cellGroup(<No />, <No />, <Road />, <Road />, <Road />)} />
              </Section>

              {/* ===== OUTREACH : EMAIL ===== */}
              <Section id="email" pillar="o" title="Outreach: Email"
                bench={<>Standalone cold-email senders run <b>$37-$159/seat/mo</b>, billed per mailbox before warm-up and rotation add-ons.</>}
                isOpen={open['email']} onToggle={() => toggle('email')}>
                <FRow name={<><b>Connected mailboxes</b><span>Sending mailboxes with warm-up and rotation.</span></>}
                  cells={cellGroup(<Lim>1</Lim>, <Lim>1</Lim>, <Lim>3</Lim>, <Lim>10</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Email sequences &amp; follow-ups</b><span>Multi-step nurture tied to the same prospect record as LinkedIn and WhatsApp.</span></>}
                  cells={cellGroup(<No />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Two-way email conversation agent</b><span>AI handles replies, objections and scheduling over email.</span></>}
                  cells={cellGroup(<No />, <No />, <Road />, <Road />, <Road />)} />
              </Section>

              {/* ===== ENGAGE : BROADCASTING ===== */}
              <Section id="broadcast" pillar="e" title="Engage: Broadcasting (Email & WhatsApp)"
                bench={<>Standalone broadcast platforms charge <b>$18-$60+/mo</b> and add a <b>20-60% markup</b> on every WhatsApp message you send. Mr LAD adds <b>0%</b>.</>}
                isOpen={open['broadcast']} onToggle={() => toggle('broadcast')}>
                <FRow name={<><b>WhatsApp Business API (WABA)</b><span>Official Meta Cloud API connection with green-tick eligibility.</span></>}
                  cells={cellGroup(<Yes />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Meta message fees,0% markup</b><span>Your card connects directly to Meta. We never touch your message billing.</span><Mkt>Other platforms mark up 20-60%</Mkt></>}
                  cells={cellGroup(<Lim>Direct to Meta</Lim>, <No />, <Lim>Direct to Meta</Lim>, <Lim>Direct to Meta</Lim>, <Lim>Direct to Meta</Lim>)} />
                <FRow name={<><b>WhatsApp broadcasts</b><span>Bulk template campaigns with scheduling, audience lists and delivery reports.</span></>}
                  cells={cellGroup(<Lim>Unlimited*</Lim>, <No />, <Lim>Unlimited*</Lim>, <Lim>Unlimited*</Lim>, <Lim>Unlimited*</Lim>)} />
                <FRow name={<><b>Email broadcasts</b><span>Bulk email campaigns with templates and scheduling.</span></>}
                  cells={cellGroup(<Lim>5,000/mo</Lim>, <Lim>10,000/mo</Lim>, <Lim>25,000/mo</Lim>, <Lim>100,000/mo</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Template &amp; campaign builder</b><span>Meta-approved WhatsApp templates and email designs without code.</span></>}
                  cells={cellGroup(<Yes />, <Lim>Email only</Lim>, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Shared inbox (manual replies)</b><span>See and answer broadcast replies yourself from one inbox.</span></>}
                  cells={cellGroup(<Yes />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Delivery, open &amp; click reports</b></>}
                  cells={cellGroup(<Yes />, <Yes />, <Yes />, <Yes />, <Yes />)} />
              </Section>

              {/* ===== ENGAGE : AI AGENTS ===== */}
              <Section id="engage-ai" pillar="e" title="Engage: AI conversation agents"
                bench={<>AI chat agents are extra-cost add-ons (<b>~$40/mo</b>) or gated to enterprise tiers (<b>$79+/mo</b>) on most platforms. With Mr LAD they&apos;re included from Growth onward.</>}
                isOpen={open['engage-ai']} onToggle={() => toggle('engage-ai')}>
                <FRow name={<><b>AI WhatsApp conversation agent</b><span>Qualifies, nurtures and books,24/7, in English and Arabic.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Instagram DM agent</b><span>Handles enquiries from posts, stories and ads.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Speed-to-lead first touch</b><span>New inbound leads contacted within seconds, any hour.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Database reactivation with AI follow-up</b><span>Re-engage cold lists with broadcast + agent conversations.</span></>}
                  cells={cellGroup(<Lim>Broadcast only</Lim>, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Unified inbox with human takeover</b><span>Watch every AI conversation; step in whenever you want.</span></>}
                  cells={cellGroup(<No />, <Lim>LinkedIn + email</Lim>, <Yes>✓ All channels</Yes>, <Yes />, <Yes />)} />
              </Section>

              {/* ===== ENGAGE : ADS ===== */}
              <Section id="ads" pillar="e" title="Engage: Meta Ads (managed)"
                bench={<>Standalone ad-automation tools run <b>$44-$99+/mo</b> tiered by spend; agencies charge <b>10-20% of ad spend</b>. Mr LAD runs the ads <i>and</i> answers every lead they generate.</>}
                isOpen={open['ads']} onToggle={() => toggle('ads')}>
                <FRow name={<><b>AI ad creation &amp; publishing</b><span>Upload a photo or video. Campaigns are created and published across Facebook, Instagram and WhatsApp.</span></>}
                  cells={cellGroup(<No />, <No />, <Road />, <Road />, <Road />)} />
                <FRow name={<><b>Ad spend management fee</b><span>Charged on managed spend, billed monthly.</span></>}
                  cells={cellGroup(<No />, <No />, <Lim>12% of spend</Lim>, <Lim>10% of spend</Lim>, <Lim>Negotiated</Lim>)} />
                <FRow name={<><b>Click-to-WhatsApp ad handling</b><span>Every ad click lands in an AI conversation, not a dead form.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
              </Section>

              {/* ===== ANALYSE ===== */}
              <Section id="analyse" pillar="a" title="Analyse: Reporting & attribution"
                bench={<>Comparable attribution &amp; analytics tooling is gated to <b>$300+/mo enterprise tiers</b> elsewhere, or sold as a separate product entirely.</>}
                isOpen={open['analyse']} onToggle={() => toggle('analyse')}>
                <FRow name={<><b>Campaign &amp; channel reports</b><span>Sends, replies, conversations, meetings by channel.</span></>}
                  cells={cellGroup(<Lim>Delivery &amp; opens</Lim>, <Lim>Basic</Lim>, <Lim>Advanced</Lim>, <Lim>Full studio</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>SAH attribution dashboard</b><span>Which channel and campaign actually produced each handoff.</span></>}
                  cells={cellGroup(<No />, <No />, <Lim>1 conversion metric</Lim>, <Lim>Unlimited metrics</Lim>, <Lim>Unlimited</Lim>)} />
                <FRow name={<><b>360° prospect view</b><span>Every touchpoint across every channel on one timeline.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Conversation analysis</b><span>AI reads every conversation and reports where each prospect stands.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Leakage detection</b><span>Find enquiries that went unanswered across your channels.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <No />, <Road />)} />
              </Section>

              {/* ===== CONVERT : VOICE ===== */}
              <Section id="voice" pillar="c" title="Convert: AI Voice agent"
                bench={<>Standalone voice AI: typical all-in cost <b>$0.13-$0.31/min</b>; bundled platforms <b>$0.11-$0.14/min</b> plus $499/mo plans at volume.</>}
                isOpen={open['voice']} onToggle={() => toggle('voice')}>
                <FRow name={<><b>Included voice minutes</b><span>Outbound follow-up and inbound answering, GCC numbers supported.</span></>}
                  cells={cellGroup(<No />, <No />, <Addon />, <Lim>1,500 min/mo</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Additional minutes</b><span>All-inclusive: telephony, speech and AI.</span></>}
                  cells={cellGroup(<No />, <No />, <Lim>$0.25/min</Lim>, <Lim>$0.12/min</Lim>, <Lim>Volume rates</Lim>)} />
                <FRow name={<><b>No-show &amp; abandoned-flow recovery calls</b><span>Automatic call-back when a lead books then disappears.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <Yes />, <Yes />)} />
                <FRow name={<><b>Call recordings &amp; transcripts</b><span>Every call logged on the prospect timeline.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <Yes />, <Yes />)} />
              </Section>

              {/* ===== CONVERT : SCHEDULING + CRM ===== */}
              <Section id="crm" pillar="c" title="Convert: Scheduling, quotations & CRM"
                bench={<>CRM seats run <b>$15-99/user/mo</b> elsewhere; Mr LAD is the lead store for solo tenants and syncs with your CRM when you have one.</>}
                isOpen={open['crm']} onToggle={() => toggle('crm')}>
                <FRow name={<><b>Automated meeting scheduling</b><span>Agents book straight into your calendar with reminders.</span></>}
                  cells={cellGroup(<No />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Quotation-driven SAH flows</b><span>Agent collects all required inputs and triggers a quotation.</span></>}
                  cells={cellGroup(<No />, <No />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>Post-conversion review &amp; referral capture</b><span>Automated review requests and referral asks after each win.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <Yes />, <Yes />)} />
                <FRow name={<><b>Built-in lead store</b><span>Full contact, conversation and activity record. Your CRM if you don&apos;t have one.</span></>}
                  cells={cellGroup(<Lim>Contact lists</Lim>, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>CRM sync (HubSpot, Zoho, Salesforce)</b><span>Bidirectional sync of qualified leads and activity.</span></>}
                  cells={cellGroup(<No />, <No />, <Addon />, <Yes />, <Yes />)} />
              </Section>

              {/* ===== ADMIN ===== */}
              <Section id="admin" pillar="n" title="Admin, data & security"
                bench={<>Dedicated tenant databases on every plan. Isolation most competitors reserve for enterprise contracts.</>}
                isOpen={open['admin']} onToggle={() => toggle('admin')}>
                <FRow name={<><b>Dedicated tenant database</b><span>Your conversation and contact data in its own database, never pooled.</span></>}
                  cells={cellGroup(<Yes />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>UAE PDPL / GDPR compliance tooling</b><span>Consent, retention and data-residency controls.</span></>}
                  cells={cellGroup(<Yes />, <Yes />, <Yes />, <Yes />, <Yes />)} />
                <FRow name={<><b>User roles &amp; permissions</b></>}
                  cells={cellGroup(<No />, <No />, <Lim>Basic</Lim>, <Lim>Full</Lim>, <Lim>Custom</Lim>)} />
                <FRow name={<><b>Multi-brand sub-accounts</b><span>Run multiple brands or business units under one master account.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <Addon />, <Yes />)} />
                <FRow name={<><b>SSO &amp; SAML</b></>}
                  cells={cellGroup(<No />, <No />, <No />, <No />, <Yes />)} />
                <FRow name={<><b>Uptime SLA</b></>}
                  cells={cellGroup(<No />, <No />, <No />, <No />, <Lim>99.9%</Lim>)} />
              </Section>

              {/* ===== SUPPORT ===== */}
              <Section id="support" pillar="n" title="Support & onboarding"
                bench={<>Local, GCC-timezone support on every plan.</>}
                isOpen={open['support']} onToggle={() => toggle('support')}>
                <FRow name={<><b>Onboarding</b><span>Get your ICP, channels and SAH configured.</span></>}
                  cells={cellGroup(<Lim>Self-serve</Lim>, <Lim>Self-serve wizard</Lim>, <Lim>Guided setup call</Lim>, <Lim>Done-with-you ($299 one-time)</Lim>, <Lim>Fully managed</Lim>)} />
                <FRow name={<><b>Support channel</b></>}
                  cells={cellGroup(<Lim>Email</Lim>, <Lim>Email + WhatsApp</Lim>, <Lim>Priority chat</Lim>, <Lim>Phone</Lim>, <Lim>Dedicated CSM</Lim>)} />
                <FRow name={<><b>Quarterly strategy review</b><span>Sit with our team to tune campaigns and ICP.</span></>}
                  cells={cellGroup(<No />, <No />, <No />, <Yes />, <Yes />)} />
              </Section>
            </div>
          </div>

          {/* ===== STACK COST CALCULATOR - Mr LAD vs standalone tools ===== */}
          <div className="scc-section">
            <h2 className="scc-h">What would this cost <span className="scc-dim">without Mr LAD?</span></h2>
            <p className="scc-sub">Set your monthly volume across the funnel. We price each capability on the leading standalone tools, then put it next to the Mr LAD plan that covers the same scope.</p>
            <StackCostCalculator onCta={handleGetStarted} />
            <p className="scc-foot">Standalone prices are published list prices for entry tiers as of mid-2026. The plan on the right is auto-picked to cover every capability you switch on. AED conversion uses the pegged 3.67 rate.</p>
          </div>

          <div className="note">
            <h4>How usage billing works</h4>
            AI plans include a monthly AI usage allowance; beyond it, usage is metered from your pre-paid wallet at transparent per-action rates, with voice minutes and enrichment credits ($0.20 each) billed the same way. WhatsApp message fees are billed directly by Meta to your own card on every plan. Mr LAD adds zero markup, ever. *Unlimited WhatsApp broadcasts means no platform cap; Meta&apos;s per-message fees still apply and are paid by you directly to Meta. No surprise invoices. Your wallet is the ceiling, and you control the top-ups.
          </div>

        </div>

        {/* All styles scoped to .pricing-root via styled-jsx; no global leakage. */}
        <style jsx>{`
          @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

          /* Color tokens mapped to the home/landing page palette:
             #222B45 = home heading text, #8F9BB3 = muted body text,
             #1A3F7F = primary brand accent (royal blue).
             Pillar accents stay as their own brand colors. */
          .pricing-root {
            --paper: #F8FAFC; --ink: #222B45; --ink-soft: #8F9BB3; --line: #E5EAF2;
            --teal: #1A3F7F; --teal-soft: #EEF3FB;
            --outreach: #1F6FEB; --engage: #1E9E5A; --analyse: #D98A04; --convert: #7C4DCC;
            --card: #FFFFFF;
            font-family: 'Inter', sans-serif;
            background: var(--paper);
            color: var(--ink);
            font-size: 14px;
            line-height: 1.5;
          }
          .pricing-root :global(*) { box-sizing: border-box; }

          .wrap { max-width: 1280px; margin: 0 auto; padding: 0 20px 80px; }

          header.page { padding: 48px 0 28px; text-align: center; }
          header.page :global(h1) { font-family: 'Space Grotesk', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: -.5px; }
          header.page :global(p) { color: var(--ink-soft); margin-top: 8px; max-width: 640px; margin-left: auto; margin-right: auto; }
          .pillars { display: flex; gap: 10px; justify-content: center; margin-top: 18px; flex-wrap: wrap; }
          .pillar { font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 600; padding: 5px 14px; border-radius: 999px; color: #fff; }
          .pillar.o { background: var(--outreach); }
          .pillar.e { background: var(--engage); }
          .pillar.a { background: var(--analyse); }
          .pillar.c { background: var(--convert); }

          .table-scroll-wrapper { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          .table-scroll-inner { min-width: 860px; width: 100%; }

          .plan-row { position: sticky; top: 0; z-index: 50; background: var(--paper); padding: 14px 0 10px; border-bottom: 2px solid var(--ink); }
          :global(.dark) .plan-row { background: var(--paper-dark); border-bottom-color: var(--line-dark); }
          .grid { display: grid; grid-template-columns: minmax(220px, 1.4fr) repeat(${PLAN_COLUMNS}, 1fr); gap: 0; align-items: stretch; }
          .plan-card { background: var(--card); border: 1px solid var(--line); border-radius: 10px; margin: 0 4px; padding: 14px 10px; text-align: center; position: relative; display: flex; flex-direction: column; justify-content: flex-start; }
          .plan-card.popular { border: 2px solid var(--teal); }
          .plan-card.noai { background: #FBFCFE; border-style: dashed; }
          .badge { position: absolute; top: -11px; left: 50%; transform: translateX(-50%); background: var(--teal); color: #fff; font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; }
          .badge.gray { background: var(--ink-soft); }
          .plan-card :global(h3) { font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; }
          .plan-card .price { font-family: 'Space Grotesk', sans-serif; font-size: 21px; font-weight: 700; margin-top: 4px; }
          .plan-card .price :global(small) { font-size: 11px; font-weight: 500; color: var(--ink-soft); }
          .plan-card .seg { font-size: 10.5px; color: var(--ink-soft); margin-top: 4px; }
          /* margin-top:auto pushes the CTA to the bottom of the flex card,
             so all CTAs sit on the same baseline regardless of how many
             lines the description occupies above. */
          .plan-card .cta { display: block; width: 100%; margin-top: auto; background: var(--ink); color: #fff; border: none; cursor: pointer; text-decoration: none; font-size: 12px; font-weight: 600; padding: 7px 0; border-radius: 7px; font-family: inherit; }
          .plan-card.popular .cta { background: var(--teal); }
          .corner { font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 13px; color: var(--ink-soft); display: flex; align-items: flex-end; padding: 0 12px 6px; }

          /* Section wrappers,styled by class on <section> rendered in <Section />.
             We use :global() because the markup is rendered by the Section/FRow
             helper components, not directly here. Class names remain scoped to
             the .pricing-root subtree via the leading descendant selector. */
          .pricing-root :global(section.fgroup) { margin-top: 26px; background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
          .pricing-root :global(.fgroup > .head) { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 16px 20px; cursor: pointer; border-left: 5px solid var(--ink-soft); }
          .pricing-root :global(.fgroup.o > .head) { border-left-color: var(--outreach); }
          .pricing-root :global(.fgroup.e > .head) { border-left-color: var(--engage); }
          .pricing-root :global(.fgroup.a > .head) { border-left-color: var(--analyse); }
          .pricing-root :global(.fgroup.c > .head) { border-left-color: var(--convert); }
          .pricing-root :global(.fgroup.n > .head) { border-left-color: var(--ink-soft); }
          .pricing-root :global(.head h2) { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 600; margin: 0; }
          .pricing-root :global(.head .bench) { font-size: 11.5px; color: var(--ink-soft); max-width: 520px; text-align: right; }
          .pricing-root :global(.head .bench b) { color: var(--teal); }
          .pricing-root :global(.chev) { flex: none; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--ink-soft); transition: transform .2s; }
          .pricing-root :global(.fgroup.open .chev) { transform: rotate(180deg); }
          .pricing-root :global(.body) { display: none; }
          .pricing-root :global(.fgroup.open .body) { display: block; }

          .pricing-root :global(.frow) { display: grid; grid-template-columns: minmax(220px, 1.4fr) repeat(${PLAN_COLUMNS}, 1fr); border-top: 1px solid var(--line); }
          .pricing-root :global(.frow:nth-child(even)) { background: #FBFCFE; }
          .pricing-root :global(.fname) { padding: 12px 16px; }
          .pricing-root :global(.fname b) { display: block; font-weight: 600; font-size: 13.5px; }
          .pricing-root :global(.fname span) { display: block; font-size: 11.5px; color: var(--ink-soft); margin-top: 2px; }
          .pricing-root :global(.fname .mkt) { display: inline-block; margin-top: 5px; font-size: 10.5px; color: var(--teal); background: var(--teal-soft); padding: 2px 8px; border-radius: 999px; }
          .pricing-root :global(.cell) { display: flex; align-items: center; justify-content: center; text-align: center; padding: 10px 6px; font-size: 12px; border-left: 1px dashed var(--line); }
          .pricing-root :global(.yes) { color: var(--teal); font-weight: 700; font-size: 15px; }
          .pricing-root :global(.no) { color: #C2CBD6; font-size: 14px; }
          .pricing-root :global(.lim) { color: var(--ink); font-weight: 500; }
          .pricing-root :global(.addon) { font-size: 11px; color: var(--ink-soft); background: #F0F3F7; padding: 2px 8px; border-radius: 999px; }
          .pricing-root :global(.road) { font-size: 10px; font-weight: 600; letter-spacing: .4px; color: #fff; background: var(--analyse); padding: 2px 7px; border-radius: 4px; margin-left: 6px; vertical-align: middle; }

          .note { margin-top: 26px; background: var(--teal-soft); border: 1px solid #D7E1F1; border-radius: 12px; padding: 18px 20px; font-size: 13px; color: var(--ink); }
          .note :global(h4) { font-family: 'Space Grotesk', sans-serif; font-size: 14px; margin-bottom: 6px; }

          /* ── Stack-cost calculator - typography sized to match the
             rest of the page: top-level h1 is 32px (header.page h1),
             section heads (.head h2) are 17px. The calculator h2 sits
             between at 22px so it reads as a major section break
             without competing with the page hero. */
          .scc-section { margin-top: 56px; }
          .scc-h { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; line-height: 1.2; letter-spacing: -.3px; color: var(--ink); margin: 0 0 8px; max-width: 720px; }
          .scc-h .scc-dim { color: var(--ink-soft); font-weight: 700; }
          .scc-sub { font-size: 13px; line-height: 1.55; color: var(--ink-soft); max-width: 640px; margin: 0 0 24px; }
          .scc-foot { color: var(--ink-soft); margin: 24px 0 0; font-size: 11.5px; line-height: 1.5; max-width: 820px; }

          /* Controls row - volume presets on the left, currency toggle on
             the right of the same line. .scc-controls is rendered inside
             StackCostCalculator (a child component), so the rule needs
             :global() to escape styled-jsx scoping - without it, the row
             would render as a plain block-level div and its two children
             would stack vertically. */
          .pricing-root :global(.scc-controls) { display: flex; justify-content: space-between; align-items: center; gap: 24px; margin-bottom: 36px; }
          .pricing-root :global(.scc-presets), .pricing-root :global(.scc-currency) { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
          @media (max-width: 640px) {
            .pricing-root :global(.scc-controls) { flex-direction: column; align-items: flex-start; gap: 14px; }
          }
          .pricing-root :global(.scc-plabel) { font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-soft); margin-right: 4px; }
          /* Pill buttons sized smaller - secondary controls; the stage labels
             below are the real visual landmarks of the calculator. */
          .pricing-root :global(.scc-preset) { font-family: inherit; font-size: 12.5px; font-weight: 500; color: var(--ink); background: var(--card); border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
          .pricing-root :global(.scc-preset:hover) { border-color: var(--teal); }
          .pricing-root :global(.scc-preset.on) { background: var(--teal); border-color: var(--teal); color: #fff; }

          /* Two-column grid */
          .pricing-root :global(.scc-grid) { display: grid; grid-template-columns: 1fr 460px; gap: 56px; align-items: start; }
          @media (max-width: 1080px) { .pricing-root :global(.scc-grid) { grid-template-columns: 1fr; gap: 32px; } }

          /* Numbered stage headers */
          .pricing-root :global(.scc-stages) { display: block; }
          .pricing-root :global(.scc-stage) { margin-bottom: 40px; }
          .pricing-root :global(.scc-stage:last-child) { margin-bottom: 0; }
          .pricing-root :global(.scc-stage-head) { display: flex; align-items: baseline; gap: 14px; margin-bottom: 22px; }
          /* Stage labels are the calculator's visual landmarks - sized up so
             they read clearly above each block of sliders. */
          .pricing-root :global(.scc-stage-num) { font-family: 'Space Grotesk', sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 1px; font-variant-numeric: tabular-nums; }
          .pricing-root :global(.scc-stage-outreach .scc-stage-num) { color: var(--outreach); }
          .pricing-root :global(.scc-stage-engage .scc-stage-num)   { color: var(--engage); }
          .pricing-root :global(.scc-stage-convert .scc-stage-num)  { color: var(--convert); }
          .pricing-root :global(.scc-stage-analyse .scc-stage-num)  { color: var(--analyse); }
          .pricing-root :global(.scc-stage-name) { font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700; letter-spacing: -.3px; margin: 0; color: var(--ink); }
          .pricing-root :global(.scc-stage-rule) { flex: 1; height: 1px; background: var(--line); align-self: center; }

          /* Item rows: label + value, slider, tool meta + per-tool price */
          .pricing-root :global(.scc-item) { padding: 2px 0 16px; }
          .pricing-root :global(.scc-item-top) { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; margin-bottom: 6px; }
          .pricing-root :global(.scc-item-label) { font-size: 13.5px; font-weight: 500; color: var(--ink); }
          .pricing-root :global(.scc-item-value) { font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: var(--ink-soft); transition: color .15s; font-variant-numeric: tabular-nums; }
          .pricing-root :global(.scc-item.active .scc-item-value) { color: var(--teal); }

          /* Custom range slider - track + thumb in our teal accent */
          .pricing-root :global(.scc-slider) { -webkit-appearance: none; appearance: none; width: 100%; height: 20px; background: transparent; cursor: pointer; }
          .pricing-root :global(.scc-slider::-webkit-slider-runnable-track) { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--teal) var(--fill, 0%), #D8DDE6 var(--fill, 0%)); }
          .pricing-root :global(.scc-slider::-webkit-slider-thumb) { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid var(--teal); margin-top: -7px; box-shadow: 0 1px 3px rgba(26, 63, 127, .35); transition: transform .1s; }
          .pricing-root :global(.scc-slider::-webkit-slider-thumb:hover) { transform: scale(1.15); }
          .pricing-root :global(.scc-slider::-moz-range-track) { height: 4px; border-radius: 2px; background: linear-gradient(to right, var(--teal) var(--fill, 0%), #D8DDE6 var(--fill, 0%)); }
          .pricing-root :global(.scc-slider::-moz-range-thumb) { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 3px solid var(--teal); }

          /* Tool meta + per-tool price ("+ $99/mo" when active) */
          .pricing-root :global(.scc-item-tool) { display: flex; align-items: baseline; gap: 8px; margin-top: 8px; font-size: 13px; color: var(--ink-soft); }
          .pricing-root :global(.scc-tool-name) { font-weight: 700; color: var(--ink); }
          .pricing-root :global(.scc-tool-vendors::before) { content: '· '; }
          .pricing-root :global(.scc-tool-price) { margin-left: auto; font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--ink-soft); font-variant-numeric: tabular-nums; }
          .pricing-root :global(.scc-item.active .scc-tool-price) { color: var(--teal); }

          /* Right panel - sticky on wide screens */
          .pricing-root :global(.scc-panel) { position: sticky; top: 32px; display: flex; flex-direction: column; gap: 18px; }
          @media (max-width: 1080px) { .pricing-root :global(.scc-panel) { position: static; } }

          /* Receipt card */
          .pricing-root :global(.scc-receipt) { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 24px 26px 20px; }
          .pricing-root :global(.scc-receipt-head) { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
          .pricing-root :global(.scc-receipt-title) { font-family: 'Space Grotesk', sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 3px; color: var(--ink-soft); margin: 0; }
          .pricing-root :global(.scc-receipt-empty) { font-size: 14px; font-style: italic; color: var(--ink-soft); line-height: 1.5; margin: 4px 0 10px; }

          .pricing-root :global(.scc-rline) { display: flex; align-items: baseline; gap: 10px; padding: 7px 0; font-size: 14px; }
          .pricing-root :global(.scc-rname) { color: var(--ink); font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
          .pricing-root :global(.scc-rname em) { display: block; font-style: normal; font-size: 11.5px; color: var(--ink-soft); }
          .pricing-root :global(.scc-rdots) { flex: 1; border-bottom: 1px dashed var(--line); transform: translateY(-3px); min-width: 14px; }
          .pricing-root :global(.scc-ramt) { font-family: 'Space Grotesk', sans-serif; font-weight: 700; color: var(--ink); white-space: nowrap; font-variant-numeric: tabular-nums; }

          .pricing-root :global(.scc-receipt-total) { display: flex; justify-content: space-between; align-items: baseline; border-top: 1px solid var(--line); margin-top: 12px; padding-top: 14px; }
          .pricing-root :global(.scc-tlabel strong) { display: block; font-family: 'Space Grotesk', sans-serif; font-size: 14px; color: var(--ink); margin-bottom: 2px; }
          .pricing-root :global(.scc-tlabel span) { font-size: 11.5px; color: var(--ink-soft); }
          .pricing-root :global(.scc-stack-total) { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; letter-spacing: -.3px; color: var(--ink-soft); line-height: 1; font-variant-numeric: tabular-nums; }

          /* Mr LAD card - teal accent, big teal price, feature checklist, verdict pill */
          .pricing-root :global(.scc-lad-card) { position: relative; background: var(--teal-soft); border: 2px solid var(--teal); border-radius: 16px; padding: 22px 24px 20px; }
          .pricing-root :global(.scc-lad-badge) { position: absolute; top: -12px; left: 22px; background: var(--teal); color: #fff; font-family: 'Space Grotesk', sans-serif; font-size: 10px; font-weight: 700; letter-spacing: 2px; padding: 5px 12px; border-radius: 999px; }
          .pricing-root :global(.scc-lad-head) { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 6px 0 2px; }
          .pricing-root :global(.scc-lad-title) { font-family: 'Space Grotesk', sans-serif; font-size: 17px; font-weight: 700; margin: 0; color: var(--ink); }
          .pricing-root :global(.scc-lad-title span) { color: var(--teal); }
          .pricing-root :global(.scc-lad-price) { font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 700; letter-spacing: -.6px; color: var(--teal); line-height: 1; font-variant-numeric: tabular-nums; }
          .pricing-root :global(.scc-lad-price small) { font-size: 13px; font-weight: 500; color: var(--ink-soft); letter-spacing: 0; }
          .pricing-root :global(.scc-lad-alt) { font-size: 12.5px; color: var(--ink-soft); margin: 0 0 14px; text-align: right; }
          .pricing-root :global(.scc-lad-covers) { font-family: 'Space Grotesk', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 2.5px; color: var(--ink-soft); margin: 0 0 10px; }
          .pricing-root :global(.scc-plan-features) { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; font-size: 14.5px; color: var(--ink); }
          .pricing-root :global(.scc-plan-features li) { display: flex; align-items: center; gap: 10px; }
          .pricing-root :global(.scc-plan-features svg) { flex: none; color: var(--teal); }

          /* Verdict pill - idle (gray) when neutral, win (teal-tinted) when saving */
          .pricing-root :global(.scc-verdict) { margin-top: 16px; padding: 12px 16px; border-radius: 10px; font-size: 14.5px; line-height: 1.45; }
          .pricing-root :global(.scc-verdict.idle) { background: var(--card); border: 1px solid var(--line); color: var(--ink-soft); }
          .pricing-root :global(.scc-verdict.win)  { background: rgba(26, 63, 127, .08); border: 1px solid rgba(26, 63, 127, .3); color: var(--ink); }
          .pricing-root :global(.scc-verdict strong) { color: var(--teal); font-weight: 700; }

          .pricing-root :global(.scc-cta) { display: block; width: 100%; margin-top: 16px; font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 700; text-align: center; padding: 13px 0; border-radius: 10px; border: none; background: var(--teal); color: #fff; cursor: pointer; transition: background .15s; }
          .pricing-root :global(.scc-cta:hover) { background: #142F5F; }

          @media (max-width: 920px) {
            .grid, .pricing-root :global(.frow) { grid-template-columns: minmax(130px, 1.3fr) repeat(${PLAN_COLUMNS}, 1fr); }
            .pricing-root :global(.head .bench) { display: none; }
            .plan-card .price { font-size: 14px; }
            .plan-card :global(h3) { font-size: 11px; }
            .plan-card .seg, .plan-card .cta { display: none; }
            .pricing-root :global(.fname span) { display: none; }
            .pricing-root :global(.cell) { font-size: 10.5px; padding: 8px 3px; }
          }
          
          /* --- Dark Mode Additions --- */
          
          .pricing-root {
        --paper: #F8FAFC; 
        --paper-dark: #000724;
        --card: #FFFFFF; 
        --card-dark: #101935;
        --ink: #222B45; 
        --ink-dark: #F1F5F9;
        --ink-soft: #8F9BB3; 
        --ink-soft-dark: #7a8ba3;
        --line: #E5EAF2; 
        --line-dark: #262831;
        --teal: #1A3F7F; 
        --teal-light: #EEF3FB;
        --teal-dark: #1e295d;
        
        background: var(--paper);
        color: var(--ink);
      }
      
      /* Dark Mode Overrides */
        :global(.dark) .pricing-root {
          background: var(--paper-dark);
          color: var(--ink-dark);
        }
  
        .pricing-root :global(section.fgroup) { 
          background: var(--card); 
          border: 1px solid var(--line); 
        }
        :global(.dark) .pricing-root :global(section.fgroup) { 
          background: var(--card-dark); 
          border: 1px solid var(--line-dark); 
        }
  
        .pricing-root :global(.frow:nth-child(even)) { background: #FBFCFE; }
        :global(.dark) .pricing-root :global(.frow:nth-child(even)) { background: #151f3d; }
  
        .pricing-root :global(.fname .mkt) { color: var(--teal); background: var(--teal-light); }
        :global(.dark) .pricing-root :global(.fname .mkt) { color: #93c5fd; background: #1e3a8a; }
  
        .note { 
          background: var(--teal-light); 
          border: 1px solid #D7E1F1; 
          color: var(--ink); 
        }
        :global(.dark) .note { 
          background: #1e295d; 
          border: 1px solid #334155; 
          color: #f1f5f9; 
        }
  
        /* Calculator Dark Mode */
        :global(.dark) .scc-slider::-webkit-slider-runnable-track { background: linear-gradient(to right, #3b82f6 var(--fill, 0%), #334155 var(--fill, 0%)); }
        :global(.dark) .scc-slider::-webkit-slider-thumb { border: 3px solid #3b82f6; background: #000724; }
        
        :global(.dark) .scc-receipt, 
        :global(.dark) .scc-lad-card { 
          background: var(--card-dark); 
          border-color: var(--line-dark); 
        }
  
        :global(.dark) .scc-rname em, 
        :global(.dark) .scc-item-label { color: var(--ink-soft-dark); }
  
        :global(.dark) .scc-verdict.idle { background: var(--card-dark); border-color: var(--line-dark); color: var(--ink-soft-dark); }

        :global(.dark) .pricing-root {
          --paper: #000724;
          --card: #101935;
          --ink: #F1F5F9;
          --ink-soft: #7a8ba3;
          --line: #262831;
          --teal: #3b82f6; /* Adjust to your preferred dark-mode accent */
          --teal-soft: #1e295d;
        }
        
        :global(.dark) .pricing-root :global(.frow:nth-child(even)) { 
          background: #151f3d; 
        }
        
        :global(.dark) .pricing-root :global(.fname .mkt) { 
          color: #93c5fd; 
          background: #1e3a8a; 
        }
        
        :global(.dark) .note { 
          background: #1e295d; 
          border: 1px solid #334155; 
          color: #f1f5f9; 
        }
        
        :global(.dark) .scc-slider::-webkit-slider-runnable-track { 
          background: linear-gradient(to right, var(--teal) var(--fill, 0%), #334155 var(--fill, 0%)); 
        }
        
        :global(.dark) .scc-slider::-webkit-slider-thumb { 
          border: 3px solid var(--teal); 
          background: #000724; 
        }
        
        :global(.dark) .scc-receipt, 
        :global(.dark) .scc-lad-card { 
          background: var(--card); 
          border-color: var(--line); 
        }
        
        :global(.dark) .scc-rname em, 
        :global(.dark) .scc-item-label { 
          color: var(--ink-soft); 
        }
        
        :global(.dark) .scc-verdict.idle { 
          background: var(--card); 
          border-color: var(--line); 
          color: var(--ink-soft); 
        }
        
        /* --- Dark Mode Additions for Plan Cards --- */
        
        /* Reset background for the "No AI" card in dark mode */
        :global(.dark) .plan-card.noai { 
          background: var(--paper); 
        }
        
        /* Ensure text colors within the plan card inherit the dark theme variables */
        :global(.dark) .plan-card :global(h3),
        :global(.dark) .plan-card .price { 
          color: var(--ink); 
        }
        
        /* The badge text is already white, so it remains visible; 
           we just ensure the gray badge looks appropriate in dark mode */
        :global(.dark) .badge.gray { 
          background: var(--ink-soft); 
          color: var(--paper); 
        }
        
        /* Ensure the CTA button colors invert or stay readable */
        :global(.dark) .plan-card .cta { 
          background: var(--ink); 
          color: var(--paper); 
        }
        :global(.dark) .plan-card.popular .cta { 
          background: var(--teal); 
          color: #fff; 
        }
        
        /* Ensure corner label is readable */
        :global(.dark) .corner { 
          color: var(--ink-soft); 
        }
        `}</style>
    </div>
  );
}

// ─── Helpers (presentational) ─────────────────────────────────────────────
// Lightweight wrappers so each row stays one line in JSX.

function Section({ id, pillar, title, bench, isOpen, onToggle, children }: {
  id: string;
  /** Left-border accent: o/e/a/c (Outreach/Engage/Analyse/Convert) or n (neutral). */
  pillar: 'o' | 'e' | 'a' | 'c' | 'n';
  title: string;
  bench: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className={`fgroup ${pillar}${isOpen ? ' open' : ''}`} id={`section-${id}`}>
      <div
        className="head"
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        aria-expanded={isOpen}
        aria-controls={`section-${id}-body`}
      >
        <h2>{title}</h2>
        <div className="bench">{bench}</div>
        <div className="chev" aria-hidden>▼</div>
      </div>
      <div className="body" id={`section-${id}-body`}>{children}</div>
    </section>
  );
}

// Every FRow below still authors 5 cells, Broadcast first. When the
// Broadcast plan is hidden we drop that leading cell here rather than
// editing ~45 rows, so the two stay in sync by construction.
function cellGroup(...cells: React.ReactNode[]) {
  return SHOW_BROADCAST_PLAN ? cells : cells.slice(1);
}

function FRow({ name, cells }: { name: React.ReactNode; cells: React.ReactNode[] }) {
  return (
    <div className="frow">
      <div className="fname">{name}</div>
      {cells.map((c, i) => React.isValidElement(c) ? React.cloneElement(c, { key: i }) : <div key={i}>{c}</div>)}
    </div>
  );
}

// Cell helpers,kept tiny so each <FRow cells={cellGroup(...)}/> reads like a row of values.
function Yes({ children }: { children?: React.ReactNode }) {
  return <div className="cell"><span className="yes">{children ?? '✓'}</span></div>;
}
function No() {
  return <div className="cell"><span className="no">-</span></div>;
}
function Lim({ children }: { children: React.ReactNode }) {
  return <div className="cell lim">{children}</div>;
}
function Addon() {
  return <div className="cell"><span className="addon">Add-on</span></div>;
}
function Road() {
  return <div className="cell">✓ <span className="road">ROADMAP</span></div>;
}
function Mkt({ children }: { children: React.ReactNode }) {
  return <span className="mkt">{children}</span>;
}

// ─── Stack-cost calculator (Mr LAD vs standalone tools) ──────────────────
// Numbered-stage funnel (Outreach → Engage → Convert → Analyse), with
// volume presets (Light / Typical / Heavy / Reset), per-slider standalone-
// tool pricing, a receipt-style breakdown, and a Mr LAD card that
// auto-picks the plan covering every active stage. USD/AED toggle.

const AED_RATE = 3.67;

type Currency = 'USD' | 'AED';
type StageId = 'outreach' | 'engage' | 'convert' | 'analyse';

interface StageItem {
  id: string;
  label: string;
  max: number;
  step: number;
  tool: string;
  vendors: string;
  /** Flat monthly fee in USD - engages the moment the slider goes above 0. */
  flat?: number;
  /** Per-unit USD price (e.g. $0.50 per reveal). Mutually exclusive with `flat`. */
  perUnit?: number;
}

interface Stage {
  id: StageId;
  /** Two-digit display label, e.g. '01'. */
  num: string;
  name: string;
  items: StageItem[];
}

const STAGES: Stage[] = [
  {
    id: 'outreach', num: '01', name: 'Outreach',
    items: [
      { id: 'prospects', label: 'Prospects discovered / month',  max: 5000,  step: 50,  tool: 'Sales database',  vendors: 'Apollo / ZoomInfo',          flat: 99 },
      { id: 'reveals',   label: 'Phone number reveals',           max: 1000,  step: 10,  tool: 'Data credits',     vendors: '$0.50 per reveal',           perUnit: 0.5 },
      { id: 'linkedin',  label: 'LinkedIn connection actions',    max: 2000,  step: 25,  tool: 'LinkedIn tool',    vendors: 'Expandi / Dripify',          flat: 129 },
      { id: 'emails',    label: 'Cold emails sent',               max: 20000, step: 250, tool: 'Email sender',     vendors: 'Instantly / Smartlead',      flat: 79 },
    ],
  },
  {
    id: 'engage', num: '02', name: 'Engage',
    items: [
      { id: 'whatsapp', label: 'WhatsApp template messages',   max: 10000, step: 100, tool: 'Broadcast platform', vendors: 'Wati / AiSensy',           flat: 49 },
      { id: 'aichats',  label: 'AI conversations handled',     max: 3000,  step: 50,  tool: 'AI chatbot add-on',  vendors: 'respond.io / Wati chatbot', flat: 79 },
      { id: 'igdms',    label: 'Instagram DM automations',     max: 5000,  step: 50,  tool: 'IG automation',      vendors: 'ManyChat / Chatfuel',       flat: 35 },
    ],
  },
  {
    id: 'convert', num: '03', name: 'Convert',
    items: [
      { id: 'voice',       label: 'AI voice-call minutes',  max: 2000, step: 25, tool: 'Voice AI platform', vendors: '$0.15 per minute',          perUnit: 0.15 },
      { id: 'meetings',    label: 'Meetings auto-booked',   max: 200,  step: 5,  tool: 'Scheduling tool',   vendors: 'Calendly / Chili Piper',     flat: 15 },
      { id: 'transcripts', label: 'Calls transcribed',      max: 500,  step: 10, tool: 'Transcription',     vendors: 'Fireflies / Otter',          flat: 18 },
    ],
  },
  {
    id: 'analyse', num: '04', name: 'Analyse',
    items: [
      { id: 'channels', label: 'Marketing channels to attribute', max: 10, step: 1, tool: 'Attribution platform', vendors: 'Triple Whale / Northbeam', flat: 300 },
    ],
  },
];

interface Plan {
  id: 'starter' | 'growth' | 'scale';
  name: string;
  price: number;
  /** Lower rank = cheaper / less capable. Used to pick the plan that covers all active stages. */
  rank: number;
  features: string[];
}

const PLANS: Plan[] = [
  { id: 'starter', name: 'Starter', price: 99,  rank: 0, features: ['LinkedIn DMs', 'Cold email', 'Prospect research'] },
  { id: 'growth',  name: 'Growth',  price: 199, rank: 1, features: ['Everything in Starter', 'WhatsApp inbound', 'Instagram DMs', 'Email replies', 'Follow-up sequences'] },
  { id: 'scale',   name: 'Scale',   price: 499, rank: 2, features: ['Everything in Growth', 'Outbound + inbound voice', 'Voice meeting booking', 'Full transcription'] },
];

/** Plan rank each stage requires once any item in it is active. */
const STAGE_PLAN_RANK: Record<StageId, number> = { outreach: 0, engage: 1, convert: 2, analyse: 1 };

/** Volume presets - picked so each tier maps cleanly to one Mr LAD plan:
 *   Light   = outreach only                       → Starter ($99)
 *   Typical = outreach + engage + analyse         → Growth  ($199)
 *   Heavy   = all four stages incl. voice/convert → Scale   ($499)
 * (Stage→plan rank: outreach=0, engage=1, analyse=1, convert=2.) */
const PRESETS: Record<'light' | 'typical' | 'heavy' | 'reset', Record<string, number>> = {
  light:   { prospects: 250,  reveals: 50,  linkedin: 200,  emails: 1000 },
  typical: { prospects: 1000, reveals: 200, linkedin: 600,  emails: 5000,  whatsapp: 2000, aichats: 500,  igdms: 1000, channels: 3 },
  heavy:   { prospects: 3000, reveals: 600, linkedin: 1500, emails: 15000, whatsapp: 6000, aichats: 1500, igdms: 3000, voice: 1200, meetings: 120, transcripts: 300, channels: 8 },
  reset:   {},
};

const ALL_ITEMS: (StageItem & { stage: StageId })[] = STAGES.flatMap(s => s.items.map(it => ({ ...it, stage: s.id })));

/** Format USD into the chosen currency (USD or AED at 3.67 peg). */
function formatMoney(usd: number, currency: Currency, opts: { cents?: boolean } = {}): string {
  const v = currency === 'AED' ? usd * AED_RATE : usd;
  const rounded = opts.cents && v < 100 ? Math.round(v * 100) / 100 : Math.round(v);
  const str = rounded.toLocaleString('en-US');
  return currency === 'AED' ? `AED ${str}` : `$${str}`;
}

function StackCostCalculator({ onCta }: { onCta: () => void }) {
  // ── State ─────────────────────────────────────────────────────────────
  const [values, setValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    ALL_ITEMS.forEach(it => { init[it.id] = 0; });
    return init;
  });
  const [currency, setCurrency] = useState<Currency>('USD');
  const [activePreset, setActivePreset] = useState<keyof typeof PRESETS | null>(null);

  // ── Derived ───────────────────────────────────────────────────────────
  const itemCost = (it: StageItem & { stage: StageId }): number => {
    const v = values[it.id] || 0;
    if (v <= 0) return 0;
    return it.perUnit != null ? v * it.perUnit : (it.flat || 0);
  };
  const active = ALL_ITEMS.filter(it => (values[it.id] || 0) > 0);
  const total  = active.reduce((sum, it) => sum + itemCost(it), 0);

  // Plan = highest rank required across all active stages
  let rank = 0;
  active.forEach(it => { rank = Math.max(rank, STAGE_PLAN_RANK[it.stage]); });
  const plan = active.length === 0 ? PLANS[0] : (PLANS.find(p => p.rank === rank) || PLANS[0]);

  const delta = total - plan.price;
  const mult  = plan.price > 0 ? total / plan.price : 0;
  const money = (usd: number, opts: { cents?: boolean } = {}) => formatMoney(usd, currency, opts);

  // ── Handlers ──────────────────────────────────────────────────────────
  const setItem = (id: string, v: number) => {
    setValues(prev => ({ ...prev, [id]: v }));
    setActivePreset(null); // manual change disengages preset
  };
  const applyPreset = (name: keyof typeof PRESETS) => {
    setActivePreset(name);
    const preset = PRESETS[name];
    const next: Record<string, number> = {};
    ALL_ITEMS.forEach(it => { next[it.id] = preset[it.id] ?? 0; });
    setValues(next);
  };

  return (
    <div>
      {/* ── Volume presets + currency toggle ─────────────────────────── */}
      <div className="scc-controls">
        <div className="scc-presets">
          <span className="scc-plabel">VOLUME</span>
          {(['light', 'typical', 'heavy', 'reset'] as const).map(name => (
            <button
              key={name}
              type="button"
              className={`scc-preset${activePreset === name ? ' on' : ''}`}
              onClick={() => applyPreset(name)}
            >
              {name === 'reset' ? 'Reset' : name.charAt(0).toUpperCase() + name.slice(1)}
            </button>
          ))}
        </div>
        <div className="scc-currency">
          <span className="scc-plabel">CURRENCY</span>
          {(['USD', 'AED'] as Currency[]).map(c => (
            <button
              key={c}
              type="button"
              className={`scc-preset${currency === c ? ' on' : ''}`}
              onClick={() => setCurrency(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="scc-grid">
        {/* ── Left column: numbered stages + sliders ─────────────────── */}
        <div className="scc-stages">
          {STAGES.map(stage => (
            <section key={stage.id} className={`scc-stage scc-stage-${stage.id}`}>
              <header className="scc-stage-head">
                <span className="scc-stage-num">{stage.num}</span>
                <h3 className="scc-stage-name">{stage.name}</h3>
                <span className="scc-stage-rule" aria-hidden />
              </header>
              {stage.items.map(it => {
                const v = values[it.id] || 0;
                const isActive = v > 0;
                const cost = itemCost({ ...it, stage: stage.id });
                const fillPct = (v / it.max) * 100;
                return (
                  <div key={it.id} className={`scc-item${isActive ? ' active' : ''}`}>
                    <div className="scc-item-top">
                      <label className="scc-item-label" htmlFor={`sl-${it.id}`}>{it.label}</label>
                      <output className="scc-item-value">{v.toLocaleString('en-US')}</output>
                    </div>
                    <input
                      id={`sl-${it.id}`}
                      type="range"
                      className="scc-slider"
                      min={0}
                      max={it.max}
                      step={it.step}
                      value={v}
                      onChange={e => setItem(it.id, Number(e.target.value))}
                      style={{ ['--fill' as string]: `${fillPct}%` } as React.CSSProperties}
                      aria-label={it.label}
                    />
                    <div className="scc-item-tool">
                      <span className="scc-tool-name">{it.tool}</span>
                      <span className="scc-tool-vendors">{it.vendors}</span>
                      {isActive && (
                        <span className="scc-tool-price">+ {money(cost, { cents: true })}/mo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {/* ── Right column: receipt + Mr LAD card ────────────────────── */}
        <aside className="scc-panel">
          {/* Receipt - line items per active tool */}
          <div className="scc-receipt">
            <div className="scc-receipt-head">
              <h4 className="scc-receipt-title">THE STANDALONE STACK</h4>
            </div>
            {active.length === 0 ? (
              <p className="scc-receipt-empty">Move a slider, each tool you&apos;d need shows up here as a line item.</p>
            ) : (
              <div>
                {active.map(it => (
                  <div key={it.id} className="scc-rline">
                    <span className="scc-rname">
                      {it.tool}{it.perUnit != null ? ` × ${(values[it.id] || 0).toLocaleString('en-US')}` : ''}
                      <em>{it.vendors}</em>
                    </span>
                    <span className="scc-rdots" aria-hidden />
                    <span className="scc-ramt">{money(itemCost(it), { cents: true })}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="scc-receipt-total">
              <div className="scc-tlabel">
                <strong>If you bought these separately</strong>
                <span>
                  {active.length === 0
                    ? 'No tools selected yet'
                    : `${active.length} ${active.length === 1 ? 'subscription' : 'separate subscriptions'}, billed monthly`}
                </span>
              </div>
              <div className="scc-stack-total">{money(total)}</div>
            </div>
          </div>

          {/* Mr LAD card - bordered, big plan price, AED conversion, feature checklist, verdict */}
          <div className="scc-lad-card">
            <div className="scc-lad-badge">SAME SCOPE, ONE AGENT</div>
            <div className="scc-lad-head">
              <h3 className="scc-lad-title">Mr LAD <span>{plan.name}</span></h3>
              <div className="scc-lad-price">{money(plan.price)}<small> /mo</small></div>
            </div>
            <p className="scc-lad-alt">
              {currency === 'USD'
                ? `≈ AED ${Math.round(plan.price * AED_RATE).toLocaleString('en-US')} / month`
                : `≈ $${plan.price.toLocaleString('en-US')} / month`}
            </p>
            <p className="scc-lad-covers">COVERS EVERYTHING YOU SELECTED</p>
            <ul className="scc-plan-features">
              {plan.features.map((f, i) => (
                <li key={i}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M4 12.5 L10 18.5 L20 6.5" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>

            <div className={`scc-verdict${active.length === 0 || delta <= 0 ? ' idle' : ' win'}`}>
              {active.length === 0 ? (
                <>One agent. One subscription. Every channel.</>
              ) : delta > 0 ? (
                <>You save <strong>{money(delta)}/mo</strong>{mult >= 1.5 ? <>, the stack costs <strong>{(Math.round(mult * 10) / 10)}×</strong> more</> : null}</>
              ) : (
                <>One subscription instead of {active.length}, same scope, zero glue work.</>
              )}
            </div>

            <button type="button" className="scc-cta" onClick={onCta}>Get Started</button>
          </div>
        </aside>
      </div>
    </div>
  );
}
