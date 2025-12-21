import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Facebook,
  Linkedin,
  Instagram,
  MessageCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

type Lead = {
  id: number;
  name: string;
  channel: string;
  status: 'Active' | 'Inactive';
  avatar?: string;
};

type LeadsListProps = {
  onLeadSelect?: (id: number, leadData?: Lead) => void;
  compact?: boolean;
  isCollapsed?: boolean;
  onToggle?: () => void;
};

// Mock data for leads
const MOCK_LEADS: Lead[] = [
  { id: 1, name: 'Sarah Johnson', channel: 'WhatsApp', status: 'Active' },
  { id: 2, name: 'Michael Chen', channel: 'Facebook', status: 'Active' },
  { id: 3, name: 'Emily Rodriguez', channel: 'Instagram', status: 'Active' },
  { id: 4, name: 'David Kim', channel: 'LinkedIn', status: 'Inactive' },
  { id: 5, name: 'Jessica Williams', channel: 'Twitter', status: 'Active' },
  { id: 6, name: 'Robert Taylor', channel: 'LinkedIn', status: 'Active' },
  { id: 7, name: 'Amanda Martinez', channel: 'WhatsApp', status: 'Active' },
  { id: 8, name: 'Christopher Lee', channel: 'Facebook', status: 'Inactive' },
  { id: 9, name: 'Michelle Brown', channel: 'Instagram', status: 'Active' },
  { id: 10, name: 'James Anderson', channel: 'LinkedIn', status: 'Active' },
  { id: 11, name: 'Lisa Thompson', channel: 'Twitter', status: 'Active' },
  { id: 12, name: 'Daniel Garcia', channel: 'Instagram', status: 'Active' },
  { id: 13, name: 'Jennifer White', channel: 'WhatsApp', status: 'Active' },
  { id: 14, name: 'Matthew Harris', channel: 'Facebook', status: 'Active' },
  { id: 15, name: 'Ashley Clark', channel: 'Instagram', status: 'Inactive' },
];

const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 24 24" {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const badgeIcon = (channel: string): React.ReactNode => {
  const channelLower = channel?.toLowerCase() ?? '';
  const defaultBadge = (
    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-semibold text-white">
      {channel?.charAt(0).toUpperCase() ?? '?'}
    </span>
  );

  switch (channelLower) {
    case 'facebook':
      return <Facebook className="h-4 w-4 text-[#1877F2]" />;
    case 'whatsapp':
      return <MessageCircle className="h-4 w-4 text-[#25D366]" />;
    case 'instagram':
      return <Instagram className="h-4 w-4 text-[#E1306C]" />;
    case 'linkedin':
      return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
    case 'twitter':
      return <XIcon className="h-4 w-4 fill-slate-800 text-slate-800" />;
    default:
      return defaultBadge;
  }
};

const LeadsList: React.FC<LeadsListProps> = ({ onLeadSelect, compact = false, isCollapsed = false, onToggle }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const shouldShowExpanded = !isCollapsed;

  const handleLeadClick = (lead: Lead): void => {
    if (isCollapsed) {
      // If collapsed, just expand without selecting
      if (onToggle) {
        onToggle();
      }
    } else {
      // If expanded, select the lead and collapse
      if (onLeadSelect) {
        onLeadSelect(lead.id, lead);
      }
      if (onToggle) {
        onToggle();
      }
    }
  };

  const fetchLeads = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Loading mock leads:', MOCK_LEADS);
      setLeads(MOCK_LEADS);
    } catch (err) {
      console.error('Error loading mock leads:', err);
      setError('Failed to load leads. Please try again later.');
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const filtered = leads.filter((lead) =>
    lead.name.toLowerCase().includes(query.toLowerCase())
  );

  const renderLoading = (
    <div className="flex h-full w-full items-center justify-center rounded-3xl border border-slate-100 bg-white shadow-sm">
      <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
    </div>
  );

  const renderError = (
    <div className="flex h-full w-full items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-600">
      {error}
    </div>
  );

  const renderContent = (
    <div 
      className={`flex h-full flex-col overflow-hidden rounded-3xl transition-all duration-300 ${
        shouldShowExpanded ? 'w-80 p-5' : 'w-28 items-center p-3'
      }`}
      style={{
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 10px 60px 0px #E2ECF980'
      }}
    >
      {shouldShowExpanded ? (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 text-base font-bold tracking-normal text-slate-900">
              Leads
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search leads…"
                className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="h-px w-full bg-slate-100" />

          <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden">
            <ul className="space-y-2">
              {filtered.map((leadItem) => (
                <li
                  key={leadItem.id}
                  onClick={() => handleLeadClick(leadItem)}
                  className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-transparent px-2 py-2 transition hover:border-indigo-100 hover:bg-indigo-50"
                >
                  <div className="relative">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-semibold text-white shadow">
                      {leadItem.avatar ? (
                        <img src={leadItem.avatar} alt={leadItem.name} className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        leadItem.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white shadow">
                      {badgeIcon(leadItem.channel)}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col">
                    <p className="text-sm font-semibold text-slate-800">{leadItem.name}</p>
                    <p className="text-xs text-slate-500">
                      Lead Status:{' '}
                      <span
                        className={`font-semibold ${
                          leadItem.status === 'Active' ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {leadItem.status}
                      </span>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* Collapsed header with "Leads" text */}
          <div className="mb-3 flex flex-col items-center gap-2">
            <div className="text-base font-bold text-slate-900">Leads</div>
            <button
              type="button"
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 transition hover:bg-indigo-100"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          <div className="h-px w-full bg-slate-100" />

          <div className="mt-3 flex-1 overflow-y-auto overflow-x-hidden">
            <ul className="flex flex-col items-center gap-3">
              {filtered.map((leadItem) => (
                <li
                  key={leadItem.id}
                  onClick={() => handleLeadClick(leadItem)}
                  className="group cursor-pointer transition hover:opacity-80"
                >
                  <div className="relative">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500 text-lg font-semibold text-white shadow">
                      {leadItem.avatar ? (
                        <img src={leadItem.avatar} alt={leadItem.name} className="h-full w-full rounded-2xl object-cover" />
                      ) : (
                        leadItem.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white bg-white shadow">
                      {badgeIcon(leadItem.channel)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
  if (loading && !leads.length) return renderLoading;
  if (error) return renderError;
  return renderContent;
};

export default LeadsList;







