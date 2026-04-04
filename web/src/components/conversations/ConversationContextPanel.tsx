import { memo, useState, useEffect, useCallback } from 'react';
import { Conversation, ContactTag, Label, ConversationNote } from '@/types/conversation';
import { getCurrentUser } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Mail,
  Phone,
  Tag,
  MessageSquare,
  Clock,
  Send,
  X,
  Plus,
  Pencil,
  Trash2,
  Check,
  Globe,
  Linkedin,
  MapPin,
  Briefcase,
  Users,
  Target,
  Loader2,
  UserCheck,
  CreditCard,
  ShieldCheck,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ChannelIcon } from './ChannelIcon';
import { AssignmentPanel } from './AssignmentPanel';
import { mockInternalComments } from '@/data/mockConversations';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { formatDistanceToNow } from 'date-fns';

interface ConversationContextPanelProps {
  conversation: Conversation;
  onClose: () => void;
  backendChannel?: 'personal' | 'waba';
}

const tagColors: Record<ContactTag, string> = {
  hot: 'bg-destructive/10 text-destructive border-destructive/20',
  warm: 'bg-warning/10 text-warning border-warning/20',
  cold: 'bg-info/10 text-info border-info/20',
};

interface BusinessProfile {
  company_name: string | null;
  industry: string | null;
  designation: string | null;
  services_offered: string | null;
  ideal_customer_profile: string | null;
  email: string | null;
  website_url: string | null;
  website_about: string | null;
  website_clients: string | null;
  website_services: string | null;
  icp_top_clients: string | null;
  icp_decision_maker: string | null;
  icp_ideal_referrals: string | null;
  icp_extra: string | null;
  kpi_members_met: number | null;
  kpi_referrals_given: number | null;
  kpi_referrals_received: number | null;
  kpi_one_to_ones: number | null;
  kpi_visitors_invited: number | null;
}

const LABELS_API = '/api/whatsapp-conversations/labels';
const CONV_API = '/api/whatsapp-conversations/conversations';

const LABEL_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export const ConversationContextPanel = memo(function ConversationContextPanel({
  conversation,
  onClose,
  backendChannel = 'waba',
}: ConversationContextPanelProps) {
  const { contact, channel, createdAt } = conversation;
  const [newComment, setNewComment] = useState('');

  // Phone masking — loaded from current user's profile
  const [maskPhoneNumbers, setMaskPhoneNumbers] = useState(false);
  useEffect(() => {
    getCurrentUser()
      .then((u: any) => setMaskPhoneNumbers(!!(u?.maskPhoneNumber ?? u?.user?.maskPhoneNumber)))
      .catch(() => {});
  }, []);

  const displayPhone = useCallback((phone: string) => {
    if (!maskPhoneNumbers || !phone) return phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '••••';
    const visible = digits.slice(-4);
    const masked = Array(digits.length - 4).fill('•').join('');
    return `+${masked}${visible}`;
  }, [maskPhoneNumbers]);

  // Labels state
  const [allLabels, setAllLabels] = useState<Label[]>([]);
  const [convLabels, setConvLabels] = useState<Label[]>(conversation.labels || []);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');

  // Business profile state
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<ConversationNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');

  // MindBody payment state
  const [mbPanelOpen, setMbPanelOpen] = useState(false);
  const [mbLoading, setMbLoading] = useState(false);
  const [mbSending, setMbSending] = useState(false);
  const [mbVerifying, setMbVerifying] = useState(false);
  const [mbPaymentLink, setMbPaymentLink] = useState<{ portal_url: string; options: { id: number; name: string; price: string | null; description: string | null }[] } | null>(null);
  const [mbVerifyResult, setMbVerifyResult] = useState<{ paid: boolean; purchases: unknown[]; services: unknown[] } | null>(null);
  const [mbError, setMbError] = useState<string | null>(null);

  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // ── MindBody actions ──────────────────────────────────────────────
  const loadPaymentLink = useCallback(async () => {
    setMbLoading(true);
    setMbError(null);
    setMbVerifyResult(null);
    try {
      const res = await fetchWithTenant('/api/social-integration/mindbody/payment-link');
      const data = await res.json();
      if (data.success) {
        setMbPaymentLink(data);
      } else {
        setMbError(data.error || 'Failed to load payment link');
      }
    } catch {
      setMbError('Could not reach MindBody');
    } finally {
      setMbLoading(false);
    }
  }, []);

  const sendPaymentLink = useCallback(async (portalUrl: string) => {
    if (!conversation.id) return;
    setMbSending(true);
    try {
      const message = `Here is your booking and payment link for PAD Pilates & Dance Studio 🎉\n\n👉 ${portalUrl}\n\nPlease complete your booking through the link and let me know once you're done! 😊`;
      await fetchWithTenant(`${CONV_API}/${conversation.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: message }),
      });
    } catch {
      setMbError('Failed to send message');
    } finally {
      setMbSending(false);
    }
  }, [conversation.id]);

  const verifyPayment = useCallback(async () => {
    const phone = contact.phone;
    if (!phone) { setMbError('No phone number on this contact'); return; }
    setMbVerifying(true);
    setMbError(null);
    try {
      const res = await fetchWithTenant(
        `/api/social-integration/mindbody/verify-payment?phone=${encodeURIComponent(phone)}`
      );
      const data = await res.json();
      if (data.success) {
        setMbVerifyResult(data);
      } else {
        setMbError(data.error || 'Verification failed');
      }
    } catch {
      setMbError('Could not reach MindBody');
    } finally {
      setMbVerifying(false);
    }
  }, [contact.phone]);

  const toggleMbPanel = useCallback(() => {
    setMbPanelOpen(prev => {
      if (!prev && !mbPaymentLink) loadPaymentLink();
      return !prev;
    });
  }, [mbPaymentLink, loadPaymentLink]);

  const comments = mockInternalComments.filter(
    (c) => c.conversationId === conversation.id
  );

  // Fetch all labels
  useEffect(() => {
    fetchWithTenant(LABELS_API)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setAllLabels(data.data || []);
      })
      .catch(() => {});
  }, []);

  // Sync conversation labels when conversation changes
  useEffect(() => {
    setConvLabels(conversation.labels || []);
  }, [conversation.labels]);

  // Fetch notes when conversation changes
  useEffect(() => {
    if (!conversation.id) return;
    fetchWithTenant(`${CONV_API}/${conversation.id}/notes`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setNotes(data.data || []);
      })
      .catch(() => {});
  }, [conversation.id]);

  // Fetch business profile when conversation changes
  useEffect(() => {
    if (!conversation.id) return;
    setProfileLoading(true);
    fetchWithTenant(`${CONV_API}/${conversation.id}/business-profile`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setBusinessProfile(data.data);
        else setBusinessProfile(null);
      })
      .catch(() => setBusinessProfile(null))
      .finally(() => setProfileLoading(false));
  }, [conversation.id]);

  // ── Label actions ─────────────────────────────────────────────

  const attachLabel = useCallback(
    async (labelId: string) => {
      try {
        await fetchWithTenant(`${CONV_API}/${conversation.id}/labels`, {
          method: 'POST',
          body: JSON.stringify({ label_id: labelId }),
        });
        const label = allLabels.find((l) => l.id === labelId);
        if (label) setConvLabels((prev) => [...prev, label]);
      } catch {}
    },
    [conversation.id, allLabels]
  );

  const detachLabel = useCallback(
    async (labelId: string) => {
      try {
        await fetchWithTenant(`${CONV_API}/${conversation.id}/labels/${labelId}`, {
          method: 'DELETE',
        });
        setConvLabels((prev) => prev.filter((l) => l.id !== labelId));
      } catch {}
    },
    [conversation.id]
  );

  const createLabel = useCallback(async () => {
    if (!newLabelName.trim()) return;
    try {
      const res = await fetchWithTenant(LABELS_API, {
        method: 'POST',
        body: JSON.stringify({ name: newLabelName.trim(), color: newLabelColor }),
      });
      const data = await res.json();
      if (data.success) {
        setAllLabels((prev) => [...prev, data.data]);
        setNewLabelName('');
      }
    } catch {}
  }, [newLabelName, newLabelColor]);

  // ── Note actions ──────────────────────────────────────────────

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    try {
      const res = await fetchWithTenant(`${CONV_API}/${conversation.id}/notes`, {
        method: 'POST',
        body: JSON.stringify({ content: newNote.trim(), author_name: 'Agent' }),
      });
      const data = await res.json();
      if (data.success) {
        setNotes((prev) => [data.data, ...prev]);
        setNewNote('');
      }
    } catch {}
  }, [newNote, conversation.id]);

  const updateNote = useCallback(
    async (noteId: string) => {
      if (!editingNoteContent.trim()) return;
      try {
        const res = await fetchWithTenant(`/api/whatsapp-conversations/notes/${noteId}`, {
          method: 'PUT',
          body: JSON.stringify({ content: editingNoteContent.trim() }),
        });
        const data = await res.json();
        if (data.success) {
          setNotes((prev) => prev.map((n) => (n.id === noteId ? data.data : n)));
          setEditingNoteId(null);
          setEditingNoteContent('');
        }
      } catch {}
    },
    [editingNoteContent]
  );

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await fetchWithTenant(`/api/whatsapp-conversations/notes/${noteId}`, { method: 'DELETE' });
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch {}
  }, []);

  const unattachedLabels = allLabels.filter(
    (l) => !convLabels.some((cl) => cl.id === l.id)
  );

  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
        <h3 className="font-heading font-semibold text-sm">Contact Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4">
          {/* Profile */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={contact.avatar} alt={contact.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xl font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <ChannelIcon channel={channel} size={16} showBackground />
              </div>
            </div>
            <h4 className="font-semibold">{contact.name}</h4>
            {contact.position && (
              <p className="text-sm text-muted-foreground">{contact.position}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
              {(contact.tags || []).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className={`text-[10px] uppercase ${tagColors[tag]}`}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Labels Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold uppercase text-muted-foreground">Labels</h5>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setShowLabelPicker(!showLabelPicker)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {convLabels.map((label) => (
                <Badge
                  key={label.id}
                  variant="outline"
                  className="text-[10px] px-2 py-0.5 cursor-pointer group"
                  style={{ borderColor: label.color, color: label.color }}
                  onClick={() => detachLabel(label.id)}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full mr-1"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                  <X className="h-2.5 w-2.5 ml-1 opacity-0 group-hover:opacity-100" />
                </Badge>
              ))}
              {convLabels.length === 0 && !showLabelPicker && (
                <p className="text-xs text-muted-foreground">No labels assigned</p>
              )}
            </div>

            {/* Label picker */}
            {showLabelPicker && (
              <div className="mt-2 p-2.5 border rounded-lg bg-muted/30 space-y-2">
                {unattachedLabels.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {unattachedLabels.map((label) => (
                      <button
                        key={label.id}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border hover:bg-muted transition-colors"
                        style={{ borderColor: label.color, color: label.color }}
                        onClick={() => attachLabel(label.id)}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-1.5 items-center">
                  <Input
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <div className="flex gap-0.5">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c}
                        className={`h-4 w-4 rounded-full border-2 ${newLabelColor === c ? 'border-foreground' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </div>
                  <Button size="sm" className="h-7 text-xs px-2" onClick={createLabel}>
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {contact.company && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{contact.company}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{displayPhone(contact.phone)}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 flex-shrink-0" />
              <span>Conversation started {formatDistanceToNow(createdAt, { addSuffix: true })}</span>
            </div>
          </div>

          {/* Business Profile */}
          <div className="mb-6">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Business Profile</h5>
            {profileLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : businessProfile ? (
              <div className="space-y-3 p-3 rounded-lg bg-muted/30">
                {businessProfile.company_name && (
                  <div className="flex items-start gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium">{businessProfile.company_name}</span>
                      {businessProfile.industry && (
                        <p className="text-xs text-muted-foreground">{businessProfile.industry}</p>
                      )}
                    </div>
                  </div>
                )}

                {businessProfile.designation && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span>{businessProfile.designation}</span>
                  </div>
                )}

                {businessProfile.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{businessProfile.email}</span>
                  </div>
                )}

                {businessProfile.website_url && (
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={businessProfile.website_url.startsWith('http') ? businessProfile.website_url : `https://${businessProfile.website_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {businessProfile.website_url}
                    </a>
                  </div>
                )}

                {businessProfile.services_offered && (
                  <div className="flex items-start gap-3 text-sm">
                    <Target className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Services</span>
                      <p className="text-xs mt-0.5">{businessProfile.services_offered}</p>
                    </div>
                  </div>
                )}

                {businessProfile.ideal_customer_profile && (
                  <div className="flex items-start gap-3 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-medium text-muted-foreground">Ideal Customer</span>
                      <p className="text-xs mt-0.5">{businessProfile.ideal_customer_profile}</p>
                    </div>
                  </div>
                )}

                {/* Website scraped info */}
                {businessProfile.website_about && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">About (from website)</span>
                    <p className="text-xs mt-1 text-muted-foreground line-clamp-3">{businessProfile.website_about}</p>
                  </div>
                )}

                {businessProfile.website_clients && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Clients</span>
                    <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{businessProfile.website_clients}</p>
                  </div>
                )}

                {businessProfile.website_services && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Services (from website)</span>
                    <p className="text-xs mt-1 text-muted-foreground line-clamp-2">{businessProfile.website_services}</p>
                  </div>
                )}

                {/* ICP Discovery Answers */}
                {(businessProfile.icp_top_clients || businessProfile.icp_decision_maker || businessProfile.icp_ideal_referrals) && (
                  <div className="pt-2 border-t border-border space-y-2">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">ICP Discovery</span>
                    {businessProfile.icp_top_clients && (
                      <div>
                        <span className="text-[10px] text-muted-foreground">Top Clients</span>
                        <p className="text-xs">{businessProfile.icp_top_clients}</p>
                      </div>
                    )}
                    {businessProfile.icp_decision_maker && (
                      <div>
                        <span className="text-[10px] text-muted-foreground">Decision Maker</span>
                        <p className="text-xs">{businessProfile.icp_decision_maker}</p>
                      </div>
                    )}
                    {businessProfile.icp_ideal_referrals && (
                      <div>
                        <span className="text-[10px] text-muted-foreground">Ideal Referrals</span>
                        <p className="text-xs">{businessProfile.icp_ideal_referrals}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* KPI Metrics */}
                {(businessProfile.kpi_members_met != null || businessProfile.kpi_referrals_given != null) && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">BNI Metrics</span>
                    <div className="grid grid-cols-2 gap-2 mt-1.5">
                      {businessProfile.kpi_members_met != null && (
                        <div className="text-center p-1.5 bg-background rounded">
                          <p className="text-sm font-semibold">{businessProfile.kpi_members_met}</p>
                          <p className="text-[10px] text-muted-foreground">Members Met</p>
                        </div>
                      )}
                      {businessProfile.kpi_referrals_given != null && (
                        <div className="text-center p-1.5 bg-background rounded">
                          <p className="text-sm font-semibold">{businessProfile.kpi_referrals_given}</p>
                          <p className="text-[10px] text-muted-foreground">Referrals Given</p>
                        </div>
                      )}
                      {businessProfile.kpi_referrals_received != null && (
                        <div className="text-center p-1.5 bg-background rounded">
                          <p className="text-sm font-semibold">{businessProfile.kpi_referrals_received}</p>
                          <p className="text-[10px] text-muted-foreground">Referrals Rcvd</p>
                        </div>
                      )}
                      {businessProfile.kpi_one_to_ones != null && (
                        <div className="text-center p-1.5 bg-background rounded">
                          <p className="text-sm font-semibold">{businessProfile.kpi_one_to_ones}</p>
                          <p className="text-[10px] text-muted-foreground">1-to-1s</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">No business profile available</p>
            )}
          </div>

          {/* Metadata */}
          <div className="mb-6 p-3 rounded-lg bg-muted/30">
            <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Metadata</h5>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium capitalize">{conversation.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Owner</span>
                <span className="font-medium">{conversation.owner || 'AI'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Channel</span>
                <span className="font-medium capitalize">{channel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-medium">{conversation.messageCount || 0}</span>
              </div>
            </div>
          </div>

          {/* MindBody Payment Panel */}
          <div className="mb-6 border border-border rounded-lg overflow-hidden">
            <button
              onClick={toggleMbPanel}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">MindBody Payment</span>
              </div>
              {mbPanelOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>

            {mbPanelOpen && (
              <div className="p-3 space-y-3">
                {mbError && (
                  <div className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {mbError}
                  </div>
                )}

                {mbLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading pricing options…
                  </div>
                ) : mbPaymentLink ? (
                  <>
                    {/* Pricing options */}
                    {mbPaymentLink.options.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1.5">Available Plans</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                          {mbPaymentLink.options.map(opt => (
                            <div key={opt.id} className="flex items-center justify-between py-1 px-2 rounded bg-muted/30 text-xs">
                              <span className="truncate max-w-[130px]" title={opt.name}>{opt.name}</span>
                              {opt.price && <span className="font-medium text-primary shrink-0 ml-1">AED {opt.price}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portal URL */}
                    <div>
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground mb-1">Payment Link</p>
                      <p className="text-[10px] text-muted-foreground break-all mb-2">{mbPaymentLink.portal_url}</p>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        disabled={mbSending}
                        onClick={() => sendPaymentLink(mbPaymentLink.portal_url)}
                      >
                        {mbSending ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Send className="h-3 w-3 mr-1.5" />}
                        Send to Chat
                      </Button>
                    </div>

                    {/* Verify payment */}
                    <div className="border-t border-border pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-7 text-xs"
                        disabled={mbVerifying}
                        onClick={verifyPayment}
                      >
                        {mbVerifying ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <ShieldCheck className="h-3 w-3 mr-1.5" />}
                        Verify Payment in MindBody
                      </Button>

                      {mbVerifyResult && (
                        <div className={`mt-2 flex items-center gap-1.5 text-xs rounded px-2 py-1.5 ${mbVerifyResult.paid ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'}`}>
                          {mbVerifyResult.paid
                            ? <><ShieldCheck className="h-3 w-3 shrink-0" /> Payment confirmed ({mbVerifyResult.purchases.length} purchase{mbVerifyResult.purchases.length !== 1 ? 's' : ''}, {mbVerifyResult.services.length} service{mbVerifyResult.services.length !== 1 ? 's' : ''})</>
                            : <><AlertCircle className="h-3 w-3 shrink-0" /> No payment found in MindBody yet</>}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={loadPaymentLink}>
                    <CreditCard className="h-3 w-3 mr-1.5" />
                    Load Payment Options
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Tabs: Assignment, Notes & Internal Comments */}
          <Tabs defaultValue="assignment" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-9">
              <TabsTrigger value="assignment" className="text-xs">
                <UserCheck className="h-3 w-3 mr-1.5" />
                Assignment
              </TabsTrigger>
              <TabsTrigger value="notes" className="text-xs">
                <Tag className="h-3 w-3 mr-1.5" />
                Notes
              </TabsTrigger>
              <TabsTrigger value="comments" className="text-xs">
                <MessageSquare className="h-3 w-3 mr-1.5" />
                Internal
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignment" className="mt-3">
              <AssignmentPanel conversationId={conversation.id} channel={backendChannel} />
            </TabsContent>

            <TabsContent value="notes" className="mt-3">
              {/* Add note */}
              <div className="flex gap-2 mb-3">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[60px] text-xs"
                />
              </div>
              <Button size="sm" className="w-full mb-4" disabled={!newNote.trim()} onClick={addNote}>
                Add Note
              </Button>

              {/* Notes list */}
              <div className="space-y-2">
                {notes.length === 0 && (contact.notes || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No notes yet</p>
                ) : (
                  <>
                    {notes.map((note) => (
                      <div key={note.id} className="p-2.5 bg-muted/50 rounded-lg group">
                        {editingNoteId === note.id ? (
                          <div className="space-y-2">
                            <Textarea
                              value={editingNoteContent}
                              onChange={(e) => setEditingNoteContent(e.target.value)}
                              className="min-h-[40px] text-xs"
                            />
                            <div className="flex gap-1">
                              <Button size="sm" className="h-6 text-[10px] px-2" onClick={() => updateNote(note.id)}>
                                <Check className="h-3 w-3 mr-1" />
                                Save
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] px-2"
                                onClick={() => setEditingNoteId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-muted-foreground">
                                {note.author_name || 'Agent'} · {note.created_at ? formatDistanceToNow(new Date(note.created_at), { addSuffix: true }) : ''}
                              </span>
                              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => {
                                    setEditingNoteId(note.id);
                                    setEditingNoteContent(note.content);
                                  }}
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-destructive"
                                  onClick={() => deleteNote(note.id)}
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{note.content}</p>
                          </>
                        )}
                      </div>
                    ))}
                    {/* Legacy static notes fallback */}
                    {(contact.notes || []).map((note, i) => (
                      <div
                        key={`legacy-${i}`}
                        className="p-2.5 bg-muted/50 rounded-lg text-xs text-muted-foreground"
                      >
                        {note}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="comments" className="mt-3">
              {/* Add internal comment */}
              <div className="flex gap-2 mb-3">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add internal comment (not visible to contact)..."
                  className="min-h-[60px] text-xs"
                />
              </div>
              <Button size="sm" className="w-full mb-4" disabled={!newComment.trim()}>
                <Send className="h-3 w-3 mr-1.5" />
                Post Comment
              </Button>

              {/* Internal comments */}
              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No internal comments yet
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-2.5">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                            {comment.author.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium">{comment.author.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(comment.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{comment.content}</p>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
});
