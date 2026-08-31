"use client";
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { AIPlayground } from './AIPlayground';
import { AILearningsPanel } from './AILearningsPanel';
import { LinkedInConversationView } from './LinkedInConversationView';
import { EmailChannelView } from './EmailChannelView';
import InstagramConversationView from './InstagramConversationView';
import { WABusinessView } from './WABusinessView';
import { Button } from '@/components/ui/button';
import { FlaskConical, GraduationCap, X } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { ChannelIcon } from './ChannelIcon';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────────────────────────────────────
type WaTab = 'personal' | 'waba' | 'instagram' | 'linkedin' | 'gmail' | 'outlook' | 'custom';


// ─────────────────────────────────────────────────────────────────────────────
// Utility: Check which channels are connected - uses the same endpoints as
// the Integrations settings page for consistency.
// All checks run in parallel so the tab bar appears in one paint.
// ─────────────────────────────────────────────────────────────────────────────
interface ChannelConnectionStatus {
  personal: boolean;
  waba: boolean;
  instagram: boolean;
  linkedin: boolean;
  gmail: boolean;
  gmailEmail: string | null;
  outlook: boolean;
  outlookEmail: string | null;
  custom: boolean;
  customEmail: string | null;
}

async function getConnectedChannels(): Promise<ChannelConnectionStatus> {
  const [personalResult, wabaResult, instagramResult, linkedinResult, emailResult] = await Promise.allSettled([
    // Personal WA
    fetchWithTenant('/api/personal-whatsapp/accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data ?? [];
        return accounts.some((a: any) => a.status === 'connected');
      })
      .catch(() => false),

    // WA Business
    fetchWithTenant('/api/whatsapp-conversations/admin/whatsapp-accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data ?? [];
        return accounts.some((a: any) => a.status === 'active' || a.status === 'connected');
      })
      .catch(() => false),

    // Instagram (LAD-Instagram-Comms via Next.js proxy)
    fetchWithTenant('/api/instagram-conversations/accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data?.data ?? data ?? [];
        return accounts.some(
          (a: any) => (a.status ?? 'active') !== 'inactive' && !a.is_deleted,
        );
      })
      .catch(() => false),

    // LinkedIn
    fetchWithTenant('/api/campaigns/linkedin/accounts')
      .then(async (res) => {
        if (!res.ok) return false;
        const data = await res.json();
        const accounts: any[] = data?.accounts ?? data?.data ?? data ?? [];
        return accounts.some((a: any) =>
          a.status === 'connected' || a.status === 'active' || a.is_connected === true
        );
      })
      .catch(() => false),

    // Gmail + Outlook + Custom SMTP (single status endpoint)
    fetchWithTenant('/api/email-conversations/status')
      .then(async (res) => {
        const empty = { gmail: false, gmailEmail: null, outlook: false, outlookEmail: null, custom: false, customEmail: null };
        if (!res.ok) return empty;
        const data = await res.json();
        return {
          gmail:        !!data?.gmail?.connected,
          gmailEmail:   data?.gmail?.email   || null,
          outlook:      !!data?.outlook?.connected,
          outlookEmail: data?.outlook?.email || null,
          custom:       !!data?.custom?.connected,
          customEmail:  data?.custom?.email  || null,
        };
      })
      .catch(() => ({ gmail: false, gmailEmail: null, outlook: false, outlookEmail: null, custom: false, customEmail: null })),
  ]);

  const emailStatus = emailResult.status === 'fulfilled'
    ? emailResult.value as {
        gmail: boolean; gmailEmail: string | null;
        outlook: boolean; outlookEmail: string | null;
        custom: boolean; customEmail: string | null;
      }
    : { gmail: false, gmailEmail: null, outlook: false, outlookEmail: null, custom: false, customEmail: null };

  return {
    personal:     personalResult.status === 'fulfilled' ? (personalResult.value as boolean) : false,
    waba:         wabaResult.status    === 'fulfilled' ? (wabaResult.value as boolean)    : false,
    instagram:    instagramResult.status === 'fulfilled' ? (instagramResult.value as boolean) : false,
    linkedin:     linkedinResult.status === 'fulfilled' ? (linkedinResult.value as boolean) : false,
    gmail:        emailStatus.gmail,
    gmailEmail:   emailStatus.gmailEmail,
    outlook:      emailStatus.outlook,
    outlookEmail: emailStatus.outlookEmail,
    custom:       emailStatus.custom,
    customEmail:  emailStatus.customEmail,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Determine default tab - prefer Personal WA, then WABA, then LinkedIn,
// then Gmail, then Outlook
// ─────────────────────────────────────────────────────────────────────────────
function getDefaultTab(status: ChannelConnectionStatus): WaTab {
  if (status.personal)  return 'personal';
  if (status.waba)      return 'waba';
  if (status.instagram) return 'instagram';
  if (status.linkedin)  return 'linkedin';
  if (status.gmail)     return 'gmail';
  if (status.outlook)   return 'outlook';
  if (status.custom)    return 'custom';
  return 'personal'; // fallback (nothing connected)
}

// All possible tabs in display order - matches the Integrations page order:
// Personal WA, WA Business, Instagram, LinkedIn, then Email channels
const ALL_TABS: { id: WaTab; label: string; sublabel: string }[] = [
  { id: 'personal',  label: 'WAPA',  sublabel: 'personal_whatsapp' },
  { id: 'waba',      label: 'WA Business',  sublabel: 'business_whatsapp' },
  { id: 'instagram', label: 'Instagram',    sublabel: 'instagram_dm' },
  { id: 'linkedin',  label: 'LinkedIn',     sublabel: 'linkedin' },
  { id: 'gmail',     label: 'Gmail',        sublabel: 'gmail' },
  { id: 'outlook',   label: 'Outlook',      sublabel: 'outlook' },
  { id: 'custom',    label: 'Custom Email', sublabel: 'custom_email' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Get brand color for tab
// ─────────────────────────────────────────────────────────────────────────────
function getTabColor(tabId: WaTab): string {
  switch (tabId) {
    case 'personal':  return '#25D366'; // WhatsApp green
    case 'waba':      return '#128C7E'; // WhatsApp Business teal
    case 'instagram': return '#E1306C'; // Instagram pink - pulled from the official gradient mid-stop
    case 'linkedin':  return '#0077B5'; // LinkedIn blue
    case 'gmail':     return '#EA4335'; // Gmail red
    case 'outlook':   return '#0078D4'; // Outlook blue
    case 'custom':    return '#059669'; // Emerald - matches integration tile
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page shell - handles only tab + AI playground state
// ─────────────────────────────────────────────────────────────────────────────
export function ConversationsPage() {
  const [activeTab, setActiveTab] = useState<WaTab>('personal');
  const [isPlaygroundOpen, setIsPlaygroundOpen] = useState(false);
  const [isLearningsOpen, setIsLearningsOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  // null = still loading; once resolved, only connected channels are shown
  const [channelStatus, setChannelStatus] = useState<ChannelConnectionStatus | null>(null);

  // Check which channels are connected on mount - all parallel requests
  useEffect(() => {
    getConnectedChannels().then((status) => {
      setChannelStatus(status);
      setActiveTab(getDefaultTab(status));
    });
  }, []);

  // Broadcast active tab change to sidebar and other components for dynamic theme adjustments
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('conversations:channel-changed', { detail: { channel: activeTab } }));
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('conversations:channel-changed', { detail: { channel: null } }));
      }
    };
  }, [activeTab]);

  // Show only tabs whose channel is actively connected.
  // While loading (null) render nothing so there's no flash of wrong tabs.
  const visibleTabs = channelStatus
    ? ALL_TABS.filter((t) => {
        // Email tabs use separate boolean fields on the status object
        if (t.id === 'gmail')   return channelStatus.gmail;
        if (t.id === 'outlook') return channelStatus.outlook;
        if (t.id === 'custom')  return channelStatus.custom;
        return channelStatus[t.id as keyof ChannelConnectionStatus] === true;
      })
    : [];

  const isBlackGrayDarkTheme = activeTab !== 'linkedin';

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top bar: WA channel tabs + AI toggle - now always visible */}
      <div
        className={cn(
          "h-10 flex items-center justify-between px-3 border-b shrink-0 gap-2 transition-colors duration-300",
          "bg-card border-border",
          isBlackGrayDarkTheme
            ? "dark:bg-zinc-900 dark:border-zinc-800"
            : "dark:bg-[#0C162F] dark:border-slate-800"
        )}
      >
        {/* Channel tabs - only connected channels are rendered */}
        <div className="flex items-center gap-1 overflow-x-auto min-w-0 no-scrollbar">
          {/* Loading skeleton while connection status is being resolved */}
          {channelStatus === null && (
            <>
              <div className="h-7 w-24 rounded-md bg-muted animate-pulse shrink-0" />
              <div className="h-7 w-24 rounded-md bg-muted animate-pulse shrink-0" />
            </>
          )}
          {visibleTabs.map(({ id, label, sublabel }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'group flex items-center gap-1.5 px-3 h-7 rounded-md text-xs font-medium transition-all shrink-0 whitespace-nowrap',
                activeTab === id
                  ? 'text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-gray-300/30 dark:hover:bg-zinc-500/30'
              )}
              style={
                activeTab === id
                  ? { backgroundColor: getTabColor(id) }
                  : undefined
              }
            >
              <ChannelIcon
                channel={sublabel as any}
                size={16}
                overrideColor={activeTab === id ? '#ffffff' : undefined}
                // className={cn(
                //   id === 'linkedin' && activeTab !== id && 'dark:group-hover:[&_svg]:!text-white'
                // )}
              />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          {/* AI Playground toggle */}
          <Button
            variant={isPlaygroundOpen ? 'secondary' : 'ghost'}
            size="sm"
            className={cn(
              'gap-1.5 text-xs h-7 shrink-0',
              isPlaygroundOpen && 'text-primary',
              isBlackGrayDarkTheme
                ? 'dark:hover:bg-black dark:hover:text-white'
                : 'dark:hover:bg-[#2B7CFF] dark:hover:text-white'
            )}
            onClick={() => setIsPlaygroundOpen((v) => !v)}
            title="Open AI Playground to test your system prompt"
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Test AI
          </Button>

          {/* AI Learnings - what the agent has been taught from thumbs-down
            feedback. Sits beside Test AI because both answer "why did it say
            that?": one lets you probe the prompt, the other shows what human
            review has since added to it. */}
          <Button
            variant={isLearningsOpen ? "secondary" : "ghost"}
            size="sm"
            className={`gap-1.5 text-xs h-7 shrink-0 ${isLearningsOpen ? "text-primary" : ""}`}
            onClick={() => setIsLearningsOpen((v) => !v)}
            title="View and manage what the AI has learned from feedback"
          >
            <GraduationCap className="h-3.5 w-3.5" />
            AI Learnings
          </Button>

          <AILearningsPanel
            open={isLearningsOpen}
            onClose={() => setIsLearningsOpen(false)}
          />
        </div>
      </div>
      {/* Channel views - only the active tab is mounted */}
      <div className="flex-1 flex overflow-hidden">
        {channelStatus === null ? (
          <div className="flex-1 bg-background" />
        ) : (
          <>
            {activeTab === "personal" && (
              // Personal WA reuses the rich WhatsApp-Business view (same UI as WABA),
              // driven against LAD-WAPA-Comms via backendChannel="personal".
              <WABusinessView
                backendChannel="personal"
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
              />
            )}
            {activeTab === "waba" && (
              <WABusinessView
                backendChannel="waba"
                isSidebarCollapsed={isSidebarCollapsed}
                setIsSidebarCollapsed={setIsSidebarCollapsed}
              />
            )}
            {activeTab === "instagram" && <InstagramConversationView />}
            {activeTab === "linkedin" && <LinkedInConversationView />}
            {activeTab === "gmail" && (
              <EmailChannelView
                provider="gmail"
                connectedEmail={channelStatus?.gmailEmail ?? undefined}
              />
            )}
            {activeTab === "outlook" && (
              <EmailChannelView
                provider="outlook"
                connectedEmail={channelStatus?.outlookEmail ?? undefined}
              />
            )}
            {activeTab === "custom" && (
              <EmailChannelView
                provider="custom"
                connectedEmail={channelStatus?.customEmail ?? undefined}
              />
            )}
          </>
        )}
      </div>

      {/* Broadcast Modal (WhatsApp-only) */}
      <AnimatePresence>
        {showBroadcastModal &&
          (activeTab === "personal" || activeTab === "waba") && (
            <BroadcastModal
              onClose={() => setShowBroadcastModal(false)}
              activeTab={activeTab as "personal" | "waba"}
            />
          )}
      </AnimatePresence>

      {/* AI Playground slide-over */}
      <AnimatePresence>
        {isPlaygroundOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 sm:hidden"
              onClick={() => setIsPlaygroundOpen(false)}
            />
            <AIPlayground
              onClose={() => setIsPlaygroundOpen(false)}
              variant={activeTab === 'personal' || activeTab === 'waba' ? 'whatsapp' : 'conversations'}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcast Modal Component
// ─────────────────────────────────────────────────────────────────────────────
interface BroadcastModalProps {
  onClose: () => void;
  onSent?: () => void;
  activeTab: 'personal' | 'waba';
}

function BroadcastModal({ onClose, onSent, activeTab }: BroadcastModalProps) {
  const queryClient = useQueryClient();
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, string[]>>({}); // group ID → conversation IDs
  const [contacts, setContacts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Load groups and contacts
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        // Load chat groups
        const groupsRes = await fetchWithTenant(
          `/api/whatsapp-conversations/chat-groups?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (groupsRes.ok) {
          const groupsData = await groupsRes.json();
          const groupsList = groupsData.data || groupsData || [];
          setGroups(groupsList);

          // Load members for each group
          const membersMap: Record<string, string[]> = {};
          for (const group of groupsList) {
            try {
              const membersRes = await fetchWithTenant(
                `/api/whatsapp-conversations/chat-groups/${group.id}?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
              );
              if (membersRes.ok) {
                const memberData = await membersRes.json();
                const conversationIds = (memberData.data?.conversations || memberData.conversations || [])
                  .map((c: any) => c.id || c.conversation_id)
                  .filter((id: any) => id);
                membersMap[group.id] = conversationIds;
              }
            } catch (err) {
              console.error(`Failed to load members for group ${group.id}:`, err);
              membersMap[group.id] = [];
            }
          }
          setGroupMembers(membersMap);
        }

        // Load contacts (from conversations)
        const contactsRes = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          setContacts(contactsData.data || contactsData || []);
        }

        // Load templates
        const templatesRes = await fetchWithTenant(
          `/api/whatsapp-conversations/conversations/templates?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
        );
        if (templatesRes.ok) {
          const templatesData = await templatesRes.json();
          setTemplates(templatesData.data || templatesData || []);
        }
      } catch (err) {
        console.error('Error loading broadcast data:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTab]);

  const handleSendBroadcast = async () => {
    if (selectedRecipients.length === 0 || !selectedTemplate) {
      alert('Please select at least one recipient and a template');
      return;
    }

    try {
      setIsSending(true);

      // Send broadcast to selected recipients
      // Fetch template content for personalization
      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) {
        alert('Template not found');
        return;
      }

      let sentCount = 0;
      let failedCount = 0;

      for (const recipientId of selectedRecipients) {
        try {
          // Fetch conversation/contact data for personalization
          const convRes = await fetchWithTenant(
            `/api/whatsapp-conversations/conversations/${recipientId}?channel=${activeTab === 'waba' ? 'waba' : 'personal'}`
          );
          const convData = convRes.ok ? await convRes.json() : {};
          const contact = convData.data?.contact || convData.contact || {};

          // Helper: derive first name from contact data
          const derivedFirstName = contact.name?.trim().split(/\s+/)[0] ||
                                  contact.contact_name?.trim().split(/\s+/)[0] ||
                                  '';

          // Personalize template content
          let personalizedContent = template.content || '';
          personalizedContent = personalizedContent
            .replace(/\{\{name\}\}/gi, derivedFirstName)
            .replace(/\{\{first_name\}\}/gi, derivedFirstName)
            .replace(/\{\{contact_name\}\}/gi, contact.contact_name || '')
            .replace(/\{\{email\}\}/gi, contact.email || '')
            .replace(/\{\{phone\}\}/gi, contact.phone || '');

          // Send personalized message
          const sendRes = await fetchWithTenant(
            `/api/whatsapp-conversations/conversations/${recipientId}/send-template`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: personalizedContent,
                channel: activeTab === 'waba' ? 'waba' : 'personal',
              }),
            }
          );

          if (sendRes.ok) {
            sentCount++;
          } else {
            failedCount++;
          }
        } catch (err) {
          console.error(`Failed to send to ${recipientId}:`, err);
          failedCount++;
        }
      }

      alert(`Broadcast sent! Sent: ${sentCount}, Failed: ${failedCount}`);
      // Refresh conversation list so newly created conversations (e.g. for new contacts) appear
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
      onSent?.();
      onClose();
    } catch (err) {
      console.error('Error sending broadcast:', err);
      alert('Failed to send broadcast');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed inset-x-4 top-1/2 z-50 transform -translate-y-1/2 max-w-5xl w-full sm:w-[90vw] h-[90vh] mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Send Broadcast</h2>
            <button
              onClick={onClose}
              title="Close"
              className="absolute right-4 top-4 rounded-lg p-2 text-muted-foreground opacity-70 transition-all hover:opacity-100 hover:bg-gray-100 focus:outline-hidden z-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : (
            <>
              {/* Template Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Template</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-sm"
                >
                  <option value="">Choose a template...</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipients Selection */}
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <label className="text-sm font-medium">Select Recipients</label>

                {/* Groups */}
                {groups.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Groups</h3>
                    {groups.map((group: any) => (
                      <label
                        key={group.id}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.some((id) => groupMembers[group.id]?.includes(id))}
                          onChange={(e) => {
                            const conversationIds = groupMembers[group.id] || [];
                            if (e.target.checked) {
                              // Add all members of this group
                              setSelectedRecipients([...new Set([...selectedRecipients, ...conversationIds])]);
                            } else {
                              // Remove all members of this group
                              setSelectedRecipients(
                                selectedRecipients.filter((id) => !conversationIds.includes(id))
                              );
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{group.name || `Group ${group.id.substring(0, 8)}`}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Contacts */}
                {contacts.length > 0 && (
                  <div className="border-t pt-2">
                    <h3 className="text-xs font-semibold text-muted-foreground mb-2">Contacts</h3>
                    {contacts.map((contact: any) => (
                      <label
                        key={contact.id}
                        className="flex items-center gap-2 py-1 px-2 hover:bg-muted rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipients.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRecipients([...selectedRecipients, contact.id]);
                            } else {
                              setSelectedRecipients(selectedRecipients.filter((id) => id !== contact.id));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">{contact.contact_name || contact.lead_name || `Contact ${contact.id.substring(0, 8)}`}</span>
                      </label>
                    ))}
                  </div>
                )}

                {groups.length === 0 && contacts.length === 0 && (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    No groups or contacts available
                  </div>
                )}
              </div>

              {/* Selected count */}
              <div className="text-sm text-muted-foreground">
                {selectedRecipients.length} recipient(s) selected
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-border rounded-md text-sm hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBroadcast}
                  disabled={isSending || selectedRecipients.length === 0 || !selectedTemplate}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSending ? 'Sending...' : 'Send Broadcast'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}
