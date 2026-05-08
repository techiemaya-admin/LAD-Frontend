'use client';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  User, Loader2, ExternalLink,
  Twitter, Github, Youtube, Instagram, Globe,
  BookOpen, Mic, Trophy, Newspaper, Presentation,
  Linkedin, ThumbsUp, MessageSquare, FileText,
  RefreshCw, Clock,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialProfile {
  url: string;
  handle?: string;
  title?: string;
}

interface ContentItem {
  title: string;
  url: string;
  source?: string;
  event?: string;
  show?: string;
  date?: string | null;
  snippet?: string;
}

interface RecentPost {
  id?: string;
  text?: string;
  content?: string;
  message?: string;
  title?: string;
  description?: string;
  body?: string;
  post_text?: string;
  content_text?: string;
  date?: string;
  parsed_datetime?: string;
  likes_count?: number;
  reaction_counter?: number;
  reactions?: number;
  comments_count?: number;
  comment_counter?: number;
  url?: string;
  share_url?: string;
  social_id?: string;
  media?: Array<{ url?: string; type?: string }>;
  author?: { name?: string };
  attachments?: Array<{ url?: string; type?: string }>;
}

interface KnowledgeGraph {
  title?: string | null;
  type?: string | null;
  description?: string | null;
  image?: string | null;
  website?: string | null;
  attributes?: Record<string, string>;
}

interface WebPresence {
  social_profiles?: Record<string, SocialProfile>;
  articles_written?: ContentItem[];
  speaking_engagements?: ContentItem[];
  news_mentions?: ContentItem[];
  podcast_appearances?: ContentItem[];
  awards?: ContentItem[];
  knowledge_graph?: KnowledgeGraph | null;
  enriched_at?: string;
}

interface ProfileSummaryDialogProps {
  open: boolean;
  onClose: () => void;
  employee: {
    id?: string;
    name?: string;
    first_name?: string;
    last_name?: string;
    title?: string;
    photo_url?: string;
    [key: string]: any;
  } | null;
  summary: string | null;
  webPresence?: WebPresence | null;
  recentPosts?: RecentPost[] | null;
  loading: boolean;
  error: string | null;
  /** How many days old the cached research data is. null = fresh research just ran. */
  dataAgeDays?: number | null;
  /** Called when user clicks "Get Latest Data" — triggers a force-refresh. */
  onRefresh?: () => void;
  /** True while the refresh request is in-flight. */
  refreshLoading?: boolean;
}

// ── Social platform config ────────────────────────────────────────────────────

const SOCIAL_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  twitter:      { icon: Twitter,    label: 'Twitter / X',  color: '#1DA1F2' },
  x:            { icon: Twitter,    label: 'X',            color: '#000000' },
  github:       { icon: Github,     label: 'GitHub',       color: '#333333' },
  youtube:      { icon: Youtube,    label: 'YouTube',      color: '#FF0000' },
  instagram:    { icon: Instagram,  label: 'Instagram',    color: '#E1306C' },
  linkedin:     { icon: Linkedin,   label: 'LinkedIn',     color: '#0A66C2' },
  medium:       { icon: BookOpen,   label: 'Medium',       color: '#000000' },
  substack:     { icon: BookOpen,   label: 'Substack',     color: '#FF6719' },
  crunchbase:   { icon: Globe,      label: 'Crunchbase',   color: '#0288D1' },
  wellfound:    { icon: Globe,      label: 'Wellfound',    color: '#5C6BC0' },
  slideshare:   { icon: Presentation, label: 'SlideShare', color: '#00A0DC' },
  personal_site:{ icon: Globe,      label: 'Website',      color: '#374151' },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-[#0b1957]" />
      <h6 className="font-semibold text-[#1E293B] text-sm uppercase tracking-wide">{label}</h6>
      <span className="ml-auto text-xs text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-full">{count}</span>
    </div>
  );
}

function ContentCard({ item, urlLabel }: { item: ContentItem; urlLabel?: string }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-lg border border-[#E2E8F0] hover:border-[#0b1957] hover:bg-[#F8FAFF] transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#1E293B] group-hover:text-[#0b1957] leading-snug line-clamp-2">
          {item.title}
        </p>
        <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
      </div>
      <div className="flex items-center gap-2 mt-1.5">
        {(item.source || item.event || item.show) && (
          <span className="text-xs text-[#64748B]">{item.source || item.event || item.show}</span>
        )}
        {item.date && (
          <span className="text-xs text-[#94A3B8]">· {item.date}</span>
        )}
      </div>
      {item.snippet && (
        <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2 leading-relaxed">{item.snippet}</p>
      )}
    </a>
  );
}

function PostCard({ post }: { post: RecentPost }) {
  // Check all possible Unipile post content field names
  const text = post.text || 
    post.content || 
    post.message || 
    post.title || 
    post.description || 
    post.body || 
    post.post_text || 
    post.content_text || 
    '';
  const displayDate = post.date || (post.parsed_datetime
    ? new Date(post.parsed_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null);
  const reactions = post.likes_count ?? post.reactions;

  return (
    <div className="p-3 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFF] transition-all">
      <p className="text-sm text-[#1E293B] leading-relaxed whitespace-pre-wrap line-clamp-4">{text}</p>
      <div className="flex items-center gap-3 mt-2">
        {displayDate && (
          <span className="text-xs text-[#94A3B8]">{displayDate}</span>
        )}
        {reactions != null && (
          <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
            <ThumbsUp className="w-3 h-3" /> {reactions}
          </span>
        )}
        {post.comments_count != null && (
          <span className="inline-flex items-center gap-1 text-xs text-[#64748B]">
            <MessageSquare className="w-3 h-3" /> {post.comments_count}
          </span>
        )}
        {post.url && (
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-[#0b1957] hover:underline"
          >
            View <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProfileSummaryDialog({
  open,
  onClose,
  employee,
  summary,
  webPresence,
  recentPosts,
  loading,
  error,
  dataAgeDays,
  onRefresh,
  refreshLoading = false,
}: ProfileSummaryDialogProps) {
  const employeeName = employee
    ? employee.name ||
      `${employee.first_name || ''} ${employee.last_name || ''}`.trim() ||
      'Unknown'
    : '';

  const social    = webPresence?.social_profiles     || {};
  const articles  = webPresence?.articles_written    || [];
  const speaking  = webPresence?.speaking_engagements|| [];
  const news      = webPresence?.news_mentions       || [];
  const podcasts  = webPresence?.podcast_appearances || [];
  const awards    = webPresence?.awards              || [];
  const kg        = webPresence?.knowledge_graph;
  // Filter posts to those with actual content (check multiple possible field names from Unipile)
  const posts     = (recentPosts || []).filter(p => !!(
    p.text || 
    p.content || 
    p.message || 
    p.title || 
    p.description || 
    p.body || 
    p.post_text || 
    p.content_text ||
    (p.media && p.media.length > 0) // Posts with media but no text are still valid
  ));

  const hasSocial   = Object.keys(social).length > 0;
  const hasContent  = articles.length + speaking.length + news.length + podcasts.length + awards.length > 0;
  const hasKg       = !!kg?.description || !!kg?.attributes && Object.keys(kg.attributes || {}).length > 0;
  const hasPosts    = posts.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] rounded-2xl overflow-y-auto p-0">

        {/* ── Header ── */}
        <DialogHeader className="flex-row items-center gap-4 p-6 pb-4 border-b sticky top-0 bg-white z-10">
          <Avatar className="w-14 h-14 border-[3px] border-[#0b1957] shrink-0">
            <AvatarImage src={employee?.photo_url} alt={employeeName} />
            <AvatarFallback className="bg-[#0b1957] text-white">
              <User className="w-8 h-8" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <DialogTitle className="font-bold text-[#1E293B] m-0 truncate">
              {employeeName}
            </DialogTitle>
            {employee?.title && (
              <Badge className="mt-1 font-semibold text-xs h-6 max-w-full truncate block w-fit">
                {employee.title}
              </Badge>
            )}
            {/* ── Data age indicator (shown only when serving cached data) ── */}
            {!loading && dataAgeDays != null && dataAgeDays > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span className="text-xs text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full font-medium">
                  Research data from {dataAgeDays === 1 ? '1 day' : `${dataAgeDays} days`} ago
                </span>
              </div>
            )}
            {!loading && (dataAgeDays === 0 || dataAgeDays === null) && !error && (summary || webPresence) && (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="text-xs text-[#065F46] bg-[#D1FAE5] border border-[#6EE7B7] px-2 py-0.5 rounded-full font-medium">
                  ✓ Fresh research
                </span>
              </div>
            )}
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-6">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0b1957] mb-4" />
              <p className="text-sm text-[#64748B]">Generating profile summary...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-base text-[#EF4444] font-semibold mb-2">Error</p>
              <p className="text-sm text-[#64748B]">{error}</p>
            </div>
          ) : (
            <>
              {/* ── AI Profile Summary ── */}
              {summary && (
                <section>
                  <h6 className="font-semibold text-[#1E293B] mb-3 text-base">Profile Summary</h6>
                  <p className="text-[#475569] leading-relaxed whitespace-pre-wrap text-[15px]">
                    {summary}
                  </p>
                </section>
              )}

              {/* ── Knowledge Graph attributes ── */}
              {hasKg && (
                <section>
                  <div className="rounded-xl bg-[#F8FAFF] border border-[#E2E8F0] p-4 space-y-2">
                    {kg?.description && (
                      <p className="text-sm text-[#475569] leading-relaxed">{kg.description}</p>
                    )}
                    {kg?.attributes && Object.keys(kg.attributes).length > 0 && (
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 pt-2 border-t border-[#E2E8F0]">
                        {Object.entries(kg.attributes).slice(0, 8).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-1.5">
                            <span className="text-xs font-medium text-[#64748B] shrink-0">{k}:</span>
                            <span className="text-xs text-[#1E293B]">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {kg?.website && (
                      <a href={kg.website} target="_blank" rel="noopener noreferrer"
                         className="inline-flex items-center gap-1 text-xs text-[#0b1957] hover:underline pt-1">
                        <Globe className="w-3 h-3" /> {kg.website}
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* ── Social Profiles ── */}
              {hasSocial && (
                <section>
                  <h6 className="font-semibold text-[#1E293B] mb-3 text-base">Social & Online Profiles</h6>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(social).map(([platform, profile]) => {
                      const cfg = SOCIAL_CONFIG[platform] || { icon: Globe, label: platform, color: '#374151' };
                      const Icon = cfg.icon;
                      return (
                        <a
                          key={platform}
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E2E8F0]
                                     bg-white hover:bg-[#F8FAFF] hover:border-[#0b1957] transition-all text-sm font-medium text-[#1E293B]"
                        >
                          <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                          {cfg.label}
                          {profile.handle && (
                            <span className="text-xs text-[#64748B]">@{profile.handle}</span>
                          )}
                          <ExternalLink className="w-3 h-3 text-[#94A3B8]" />
                        </a>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Awards & Recognition ── */}
              {awards.length > 0 && (
                <section>
                  <SectionHeader icon={Trophy} label="Awards & Recognition" count={awards.length} />
                  <div className="space-y-2">
                    {awards.map((item, i) => <ContentCard key={i} item={item} />)}
                  </div>
                </section>
              )}

              {/* ── Articles Written ── */}
              {articles.length > 0 && (
                <section>
                  <SectionHeader icon={BookOpen} label="Articles & Publications" count={articles.length} />
                  <div className="space-y-2">
                    {articles.map((item, i) => <ContentCard key={i} item={item} />)}
                  </div>
                </section>
              )}

              {/* ── Speaking Engagements ── */}
              {speaking.length > 0 && (
                <section>
                  <SectionHeader icon={Presentation} label="Speaking Engagements" count={speaking.length} />
                  <div className="space-y-2">
                    {speaking.map((item, i) => <ContentCard key={i} item={item} />)}
                  </div>
                </section>
              )}

              {/* ── Podcast Appearances ── */}
              {podcasts.length > 0 && (
                <section>
                  <SectionHeader icon={Mic} label="Podcast Appearances" count={podcasts.length} />
                  <div className="space-y-2">
                    {podcasts.map((item, i) => <ContentCard key={i} item={item} />)}
                  </div>
                </section>
              )}

              {/* ── News Mentions ── */}
              {news.length > 0 && (
                <section>
                  <SectionHeader icon={Newspaper} label="News & Press Mentions" count={news.length} />
                  <div className="space-y-2">
                    {news.slice(0, 5).map((item, i) => <ContentCard key={i} item={item} />)}
                  </div>
                </section>
              )}

              {/* ── Recent LinkedIn Posts ── */}
              {hasPosts && (
                <section>
                  <SectionHeader icon={FileText} label="Recent LinkedIn Posts" count={posts.length} />
                  <div className="space-y-2">
                    {posts.map((post, i) => <PostCard key={i} post={post} />)}
                  </div>
                </section>
              )}

              {/* Empty state */}
              {!summary && !hasContent && !hasSocial && !hasKg && !hasPosts && (
                <div className="text-center py-8">
                  <p className="text-sm text-[#64748B]">No summary available</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="px-6 pb-6 pt-4 border-t sticky bottom-0 bg-white flex items-center gap-3">
          {/* "Get Latest Data" — shown when cached data is being displayed */}
          {!loading && dataAgeDays != null && dataAgeDays > 0 && onRefresh && (
            <Button
              onClick={onRefresh}
              disabled={refreshLoading}
              variant="outline"
              className="flex items-center gap-2 border-[#0b1957] text-[#0b1957] hover:bg-[#F0F4FF] font-semibold px-5"
            >
              {refreshLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {refreshLoading ? 'Refreshing…' : 'Get Latest Data'}
            </Button>
          )}
          <Button
            onClick={onClose}
            className="bg-[#0b1957] hover:bg-[#0a1440] font-semibold px-6 ml-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
