'use client';
// Force dynamic rendering
export const dynamic = 'force-dynamic';
import React, { useState, useEffect, use } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCompanyName, setCompanyLogo } from '../../store/slices/settingsSlice';
import { IntegrationsSettings } from '../../components/settings/IntegrationsSettings';
import { VoiceAgentSettings } from '../../components/voice-agent/VoiceAgentSettings';
import { ChatSettings } from '../../components/settings/ChatSettings';
import { BillingSettings } from '../../components/settings/BillingSettings';
import { CreditsSettings } from '../../components/settings/CreditsSettings';
import { CompanySettings } from '../../components/settings/CompanySettings';
import { TeamManagement } from '../../components/settings/TeamManagement';
import { Toaster, toast } from 'sonner';
import { Concept } from '../../types/concept';
import { cn } from '../../lib/utils';
// Import the LeadRequirements component (ensure path is correct based on your project)
import { LeadRequirements } from './LeadRequirements';
import { RequirementConfig } from '../../types/requirement_config';
import { ConceptManagement } from './ConceptManagement';
import { PricingRules } from './PricingRules';
import {
  Building2, Users, UserCircle, Globe, Plug,
  Terminal, CreditCard, Coins, Upload, ClipboardCheck,
  X, // Added ClipboardCheck icon
  Sparkles,
  Tag,
  Settings,
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrl, getApiBaseUrlForLocal } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { PricingRule } from '@/types/pricing_rule';

type ActiveTab = 'company' | 'team' | 'accounts' | 'website' | 'integrations' | 'chat' | 'api' | 'billing' | 'credits'| 'proposal_settings';
const SettingsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authed, setAuthed] = useState<boolean | null>(null);
  // --- ADD THESE TOP-LEVEL STATES ---
  // Inside SettingsPage component
  const [requirementConfigs, setRequirementConfigs] = useState<RequirementConfig[]>([]);
  const [proposalSubTab, setProposalSubTab] = useState<'lead_config' | 'concepts' | 'pricing_rules'>('lead_config');
  const [editingConfig, setEditingConfig] = useState<RequirementConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false); // Move this HERE
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [pricingModels, setpricingModels] = useState<{ value: string; label: string }[]>([]);
  const [selectedConceptServices, setSelectedConceptServices] = useState<string[]>([]);

  // Get tenant_id from current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        console.log('Fetching current user to get tenant_id...');
        const user: any = await getCurrentUser();
        const userTenantId = user?.user?.tenantId
        console.log('Fetched user tenant_id:', userTenantId);
        if (userTenantId) {
          setTenantId(userTenantId);
        }
        setAuthed(true); // <--- ADD THIS
        // 2. ONLY call fetchConfigs AFTER we have the tenant_id
        await fetchConfigs(userTenantId);
        await fetchConcepts(userTenantId);
        await fetchPricingRules(userTenantId);
        await fetchpricingModels(userTenantId); // Fetch pricing modals after getting tenant_id
      } catch (error) {
        setAuthed(false); // <--- ADD THIS
        logger.error("[Call Logs] Failed to get user tenant_id", error);
      }
    };
    fetchUser();
  }, []);
  // ----------------------------------
  const handleDeleteConfig = async (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Configuration deleted');
        fetchConfigs(tenantId);
      }
    }
  };
  const fetchpricingModels = async (tenantId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/pricing-models/${tenantId}`); // Your backend endpoint [cite: 238, 256]
      const data = await res.json();
      console.log('Fetched pricing modals:', data);
      setpricingModels(data); // Expecting [{ value: 'per_person', label: 'Per Person (Event)' }, ...] [cite: 238]
    } catch (error) {
      logger.error("Failed to fetch pricing modals", error); // 
    }
  };

  const fetchConfigs = async (tenantId: string) => {
    try {
      console.log("FEtch config >>> Tenant ID: " + tenantId);
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${tenantId}`);
      console.log('Fetch lead configs response:', res);
      const data = await res.json();
      setRequirementConfigs(data);
    } catch (error) {
      logger.error("Failed to fetch lead requirement configs", error);
    }
  };

  const fetchConcepts = async (tenantId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/concepts/${tenantId}`);
      const data = await res.json();
      console.log('Fetched concepts:', data);
      setConcepts(data);
    } catch (error) {
      logger.error("Failed to fetch concepts", error);

    }
  };


  const fetchPricingRules = async (tenantId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/pricing-rules/${tenantId}`);
      const data = await res.json();
      console.log('Fetched pricing rules:', data);
      setPricingRules(data);
    } catch (error) {
      logger.error("Failed to fetch pricing rules", error);
    }
  };


  const handleSavePricingRule = async (ruleData: Partial<PricingRule>) => {
    const url = ruleData.id ? `${getApiBaseUrlForLocal()}/api/pricing-rules/${ruleData.id}` : `${getApiBaseUrlForLocal()}/api/pricing-rules`;
    const method = ruleData.id ? 'PUT' : 'POST';
    ruleData.tenant_id = tenantId; // Ensure tenant_id is included
    console.log('Saving pricing rule:', ruleData);
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ruleData),
    });

    if (res.ok) {
      toast.success(ruleData.id ? 'Pricing rule updated' : 'Pricing rule created');
      fetchPricingRules(tenantId);
    }
  };

  const handleDeletePricingRule = async (id: string) => {
    if (confirm('Are you sure you want to delete this pricing rule?')) {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/pricing-rules/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Pricing rule deleted');
        fetchPricingRules(tenantId);
      }
    }
  };

  const handleSaveConcept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const conceptData = {
      tenant_id: tenantId, // Ensure this is populated
      name: formData.get('name'),
      pricing_type: formData.get('pricing_type'),
      minimum_cost: parseFloat(formData.get('minimum_cost') as string) || 0,
      description: formData.get('description'),
      requirement_config_ids: selectedConceptServices // Assuming this is an array of selected requirement config IDs
    };
    console.log('Saving concept:', conceptData);
    const url = editingConcept ? `${getApiBaseUrlForLocal()}/api/concepts/${editingConcept.id}` : `${getApiBaseUrlForLocal()}/api/concepts`;
    const method = editingConcept ? 'PUT' : 'POST';
    console.log('Concept API URL: ', url + " method: " + method);

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(conceptData),
    });

    if (res.ok) {
      toast.success(editingConcept ? 'Concept updated' : 'Concept created');
      fetchConcepts(tenantId);
      setIsConceptModalOpen(false);
      setEditingConcept(null);
    }
  };

  const handleDeleteConcept = async (id: string) => {
    if (confirm('Are you sure you want to delete this concept?')) {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/concepts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Concept deleted');
        fetchConcepts(tenantId);
      }
    }
  };

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // You must get the tenant_id from your auth state/context
    const configData = {
      tenant_id: tenantId, // Ensure this is populated
      field_key: formData.get('field_key'),
      label: formData.get('label'),
      is_active: formData.get('is_active') === 'on',
      base_price: parseFloat(formData.get('base_price') as string) || 0,
      pricing_model_id: formData.get('pricing_model_id') // Assuming this is a select input with pricing model IDs as values
    };
    console.log('Saving config:', configData);
    // ... rest of your fetch logic [cite: 13, 20, 21]

    const url = editingConfig ? `${getApiBaseUrlForLocal()}/api/lead-requirement-config/${editingConfig.id}` : `${getApiBaseUrlForLocal()}/api/lead-requirement-config`;
    const method = editingConfig ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData),
    });

    if (res.ok) {
      toast.success(editingConfig ? 'Configuration updated' : 'Configuration created');
      fetchConfigs(tenantId);
      setIsConfigModalOpen(false);
      setEditingConfig(null);
    }
  };

  const dispatch = useDispatch();
  const companyName = useSelector((state: any) => state.settings.companyName);
  const companyLogo = useSelector((state: any) => state.settings.companyLogo);
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations');
  const [renewalDate, setRenewalDate] = useState<string>('');
  const [logoError, setLogoError] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  useEffect(() => {
    if (authed !== true) return;
    // Initialize active tab from URL query param if present
    const tabParam = (searchParams.get('tab') || '').toLowerCase();

    const allowed: ActiveTab[] = ['company', 'team', 'accounts', 'website', 'integrations', 'chat', 'api', 'billing', 'credits', 'proposal_settings'];
    if (allowed.includes(tabParam as ActiveTab)) {
      setActiveTab(tabParam as ActiveTab);
    }
    // Fetch subscription data to get renewal date
    const fetchRenewalDate = async () => {
      try {
        // Calculate renewal date from current_period_end (15 days from now based on mock data)
        const periodEnd = Date.now() + 86400 * 15 * 1000; // 15 days from now in milliseconds
        const date = new Date(periodEnd);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        setRenewalDate(formattedDate);
      } catch (error) {
        console.error('Error fetching renewal date:', error);
        setRenewalDate('November 29th, 2025'); // Fallback
      }
    };
    fetchRenewalDate();
  }, [authed, searchParams]);
  if (authed === null) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!authed) return <></>;

  // 3. Add Lead Requirements to the tabs array
  const tabs = [
    { id: 'company' as ActiveTab, label: 'Company', icon: Building2 },
    { id: 'team' as ActiveTab, label: 'Team', icon: Users },
    // { id: 'accounts' as ActiveTab, label: 'Accounts', icon: UserCircle },
    // { id: 'website' as ActiveTab, label: 'Website', icon: Globe },
    { id: 'integrations' as ActiveTab, label: 'Integrations', icon: Plug },
    { id: 'chat' as ActiveTab, label: 'Chat Settings', icon: MessageSquare },
    { id: 'api' as ActiveTab, label: 'Voice Settings', icon: Terminal },
    { id: 'billing' as ActiveTab, label: 'Billing', icon: CreditCard },
    { id: 'credits' as ActiveTab, label: 'Credits', icon: Coins },
    { id: 'proposal_settings' as ActiveTab, label: 'Proposal Settings', icon: ClipboardCheck },
  ];
  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Combined Header with Logo, Company Name, Renewal Date, and Tabs */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Section: Logo, Company Name, and Renewal */}
        <div className="p-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white shadow-md flex items-center justify-center border-2 border-white">
                {logoError || !companyLogo ? (
                  <Building2 className="w-8 h-8 text-gray-400" />
                ) : (
                  <img
                    src={companyLogo}
                    alt="Company Logo"
                    className="w-full h-full object-cover"
                    onError={() => setLogoError(true)}
                  />
                )}
              </div>
              <div>
                <h1 className="text-gray-900 font-semibold text-xl">{companyName}</h1>
                <p className="text-gray-600 text-sm">
                  Renews on {renewalDate || 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Section: Tabs Navigation */}
        <div className="border-t border-gray-200/50 bg-white/30 backdrop-blur-sm">
          <div className="flex space-x-1 overflow-x-auto p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  const sp = new URLSearchParams(Array.from(searchParams.entries()));
                  sp.set('tab', tab.id);
                  router.replace(`/settings?${sp.toString()}`);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id
                    ? 'bg-white text-blue-700 shadow-md font-semibold'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-white/50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'company' && (
          <CompanySettings
            companyName={companyName}
            setCompanyName={(name: string) => dispatch(setCompanyName(name))}
            companyLogo={companyLogo}
            setCompanyLogo={(logo: string) => dispatch(setCompanyLogo(logo))}
          />
        )}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'chat' && <ChatSettings />}
        {activeTab === 'api' && <VoiceAgentSettings />}
        {/* Placeholder for other tabs */}
        {activeTab === 'team' && <TeamManagement />}
        {false && activeTab === 'accounts' && (
          <div className="space-y-6">
            {/* Enrichment Preferences */}
            <div>
              <h2 className="text-gray-900 text-xl font-semibold mb-4">Enrichment Preferences</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-6 border-2 border-blue-500 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium">Work emails + Premium database</h3>
                      <p className="text-gray-600 text-sm mt-1">50 Credits per row</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                  <div className="flex items-start space-x-3">
                    <div className="bg-gray-100 p-3 rounded-lg">
                      <svg className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-gray-900 font-medium">Personal emails + Premium database</h3>
                      <p className="text-gray-600 text-sm mt-1">100 Credits per row</p>
                    </div>
                  </div>
                </div>
              </div>
              <button className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span>Save Changes</span>
              </button>
            </div>
            {/* Email Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">Email Accounts</h2>
                <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Add Account</span>
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          <span>Account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Name</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>Job title</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Sending limits</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Use this mailbox</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Managed deliverability</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={8} className="text-center text-gray-500 py-12">
                        No results.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* LinkedIn Accounts */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">LinkedIn Accounts</h2>
                <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Add Account</span>
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Sending limits</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Use this account</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-12">
                        No results.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            {/* Power Dialer Numbers */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-gray-900 text-xl font-semibold">Power Dialer Numbers</h2>
                <div className="flex space-x-3">
                  <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Existing Phone</span>
                  </button>
                  <button className="text-blue-600 hover:text-blue-700 flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Add Phone</span>
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>Phone number</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>Name</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Status</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Region</span>
                        </div>
                      </th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Capability</th>
                      <th className="text-left text-gray-600 text-sm font-medium px-6 py-4">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="text-center text-gray-500 py-12">
                        No phone numbers configured.
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {false && activeTab === 'website' && (
          <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-lg p-8 border border-gray-200 shadow-sm">
            <h2 className="text-gray-900 text-xl font-semibold mb-2">Website Settings</h2>
            <p className="text-gray-600">Configure website tracking and integration options.</p>
          </div>
        )}
        {activeTab === 'billing' && <BillingSettings />}
        {activeTab === 'credits' && <CreditsSettings />}
        {/* 4. Render LeadRequirements component when tab is active */}
        {activeTab === 'proposal_settings' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-[#E5E7EB] pb-4">
              {[
                { id: 'lead_config', label: 'Lead Requirement', icon: Settings },
                { id: 'concepts', label: 'Concept Management', icon: Sparkles },
                { id: 'pricing_rules', label: 'Pricing Rules', icon: DollarSign },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setProposalSubTab(subTab.id as any)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium transition-colors relative",
                    proposalSubTab === subTab.id
                      ? "text-[#4F46E5]"
                      : "text-[#6B7280] hover:text-[#1F2937]"
                  )}
                >
                  {subTab.label}
                  {proposalSubTab === subTab.id && (
                    <motion.div
                      layoutId="proposalSubTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4F46E5]"
                    />
                  )}
                </button>
              ))}
            </div>

            {proposalSubTab === 'lead_config' && (
              <LeadRequirements
                requirementConfigs={requirementConfigs}
                pricingModels={pricingModels}
                onEdit={(config) => {
                  setEditingConfig(config);
                  setIsConfigModalOpen(true);
                }}
                onDelete={handleDeleteConfig}
                onAdd={() => {
                  setEditingConfig(null);
                  setIsConfigModalOpen(true);
                }}
              />
            )}

            {proposalSubTab === 'concepts' && (
              <ConceptManagement
                concepts={concepts}
                requirementConfigs={requirementConfigs}
                onEdit={(concept) => {
                  setEditingConcept(concept);
                  
                  const requirementConfigIds = concept.requirement_configs.map(item => item.id);
                  console.log('Editing concept with requirement config IDs:', requirementConfigIds);
                  setSelectedConceptServices(requirementConfigIds || []);
                  setIsConceptModalOpen(true);
                }}
                onDelete={handleDeleteConcept}
                onAdd={() => {
                  setEditingConcept(null);
                  setSelectedConceptServices([]);
                  setIsConceptModalOpen(true);
                }}
              />
            )}

            {proposalSubTab === 'pricing_rules' && (
              <PricingRules
                pricingRules={pricingRules}
                concepts={concepts}
                requirementConfigs={requirementConfigs}
                onSave={handleSavePricingRule}
                onDelete={handleDeletePricingRule}
              />
            )}
          </div>
        )}

        {/* Concept Modal */}
        <AnimatePresence>
          {isConceptModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConceptModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <form onSubmit={handleSaveConcept}>
                  <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between bg-[#F9FAFB]">
                    <h2 className="text-xl font-bold text-[#1F2937]">{editingConcept ? 'Edit Concept' : 'Add New Concept'}</h2>
                    <button type="button" onClick={() => setIsConceptModalOpen(false)} className="p-2 hover:bg-[#E5E7EB] rounded-full">
                      <X className="w-5 h-5 text-[#6B7280]" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Concept Name</label>
                      <input name="name" defaultValue={editingConcept?.name} required className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm" placeholder="e.g. LITE, IMPACT" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Minimum Cost</label>
                      <input name="minimum_cost" type="number" step="0.01" defaultValue={editingConcept?.minimum_cost} className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm" placeholder="e.g. 5000.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Included Services</label>
                      <div className="space-y-3">
                        <select
                          className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !selectedConceptServices.includes(val)) {
                              setSelectedConceptServices([...selectedConceptServices, val]);
                            }
                            e.target.value = "";
                          }}
                        >
                          <option value="">Add a service...</option>
                          {requirementConfigs.filter(c => !selectedConceptServices.includes(c.id)).map(config => (
                            <option key={config.id} value={config.id}>{config.label}</option>
                          ))}
                        </select>

                        <div className="flex flex-wrap gap-2">
                          {selectedConceptServices.length === 0 && (
                            <p className="text-[10px] text-[#9CA3AF] italic">No services selected.</p>
                          )}
                          {selectedConceptServices.map(id => {
                            const config = requirementConfigs.find(c => c.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EEF2FF] text-[#4F46E5] rounded-xl text-xs font-bold border border-[#C7D2FE] shadow-sm">
                                {config?.label || id}
                                <button
                                  type="button"
                                  onClick={() => setSelectedConceptServices(selectedConceptServices.filter(sid => sid !== id))}
                                  className="hover:text-[#4338CA] transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-[10px] text-[#9CA3AF] mt-2">Select the services that are part of this concept. Pricing will be calculated based on these selections.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Description</label>
                      <textarea name="description" defaultValue={editingConcept?.description} className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm h-24 resize-none" placeholder="Describe the concept..." />
                    </div>
                  </div>
                  <div className="p-6 bg-[#F9FAFB] border-t border-[#F3F4F6] flex gap-3">
                    <button type="button" onClick={() => setIsConceptModalOpen(false)} className="flex-1 py-2.5 border border-[#E5E7EB] text-[#6B7280] rounded-xl font-bold text-sm hover:bg-white transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-[#4F46E5] text-white rounded-xl font-bold text-sm hover:bg-[#4338CA] transition-colors">
                      {editingConcept ? 'Update Concept' : 'Create Concept'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Config Modal */}
        <AnimatePresence>
          {isConfigModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsConfigModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <form onSubmit={handleSaveConfig}>
                  <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between bg-[#F9FAFB]">
                    <h2 className="text-xl font-bold text-[#1F2937]">{editingConfig ? 'Edit Field' : 'Add New Field'}</h2>
                    <button type="button" onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-[#E5E7EB] rounded-full">
                      <X className="w-5 h-5 text-[#6B7280]" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Label</label>
                      <input name="label" defaultValue={editingConfig?.label} required className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Field Key</label>
                      <input name="field_key" defaultValue={editingConfig?.field_key} required className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Base Price</label>
                        <input name="base_price" type="number" step="0.01" defaultValue={editingConfig?.base_price} className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] uppercase mb-1">Pricing Model</label>
                        <select name="pricing_model_id" defaultValue={editingConfig?.pricing_model_id} className="w-full p-2 border border-[#E5E7EB] rounded-lg text-sm">
                          {pricingModels.map(pm => (
                            <option key={pm.id} value={pm.id}>{pm.value} ({pm.label})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-[#4B5563]">
                        <input type="checkbox" name="is_active" defaultChecked={editingConfig?.is_active ?? true} /> Active
                      </label>
                    </div>
                  </div>
                  <div className="p-6 bg-[#F9FAFB] border-t border-[#F3F4F6] flex gap-3">
                    <button type="button" onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-2 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-2 text-sm font-bold text-white bg-[#4F46E5] rounded-xl">Save</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Requirements & Pricing Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsModalOpen(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between bg-[#F9FAFB]">
                  <div>
                    <h2 className="text-xl font-bold text-[#1F2937]">Lead Requirements & Pricing</h2>
                    <p className="text-xs text-[#6B7280] mt-1">Review and edit lead details for {activeLead?.name}</p>
                  </div>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-[#E5E7EB] rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-[#6B7280]" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8">
                  {/* Requirements Section */}
                  <div className="mb-10">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Lead Details
                      </h3>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="text-xs font-semibold text-[#4F46E5] hover:underline flex items-center gap-1"
                      >
                        {isEditing ? <><Check className="w-3 h-3" /> Done</> : <><Edit2 className="w-3 h-3" /> Edit Fields</>}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      {requirements.map(req => (
                        <div key={req.id} className="space-y-1.5">
                          <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide ml-1">
                            {req.field_key.replace('_', ' ')}
                          </label>
                          {isEditing ? (
                            <input
                              type="text"
                              value={req.value}
                              onChange={(e) => updateRequirementValue(req.id, e.target.value)}
                              className="w-full p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all"
                            />
                          ) : (
                            <div className="p-3 bg-[#F3F4F6] rounded-xl text-sm font-medium text-[#1F2937]">
                              {req.value || 'Not specified'}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Section */}
                  {pricing && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-[#9CA3AF] mb-6 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Pricing Breakdown
                      </h3>

                      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl overflow-hidden">
                        <div className="p-6 space-y-4">
                          {Object.entries(pricing.breakdown).map(([key, value]) => (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-sm text-[#4B5563] capitalize">{key.replace('_', ' ')}</span>
                              {isEditing ? (
                                <input
                                  type="number"
                                  value={value}
                                  onChange={(e) => updateBreakdownValue(key, parseFloat(e.target.value) || 0)}
                                  className="w-32 p-1 text-right bg-white border border-[#E5E7EB] rounded text-sm font-bold text-[#1F2937]"
                                />
                              ) : (
                                <span className="text-sm font-bold text-[#1F2937]">${value.toLocaleString()}</span>
                              )}
                            </div>
                          ))}

                          <div className="pt-4 border-t border-[#E5E7EB] space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#6B7280]">Markup ({pricing.markup}%)</span>
                              <span className="text-[#10B981] font-medium">+${(Object.values(pricing.breakdown).reduce((a, b) => a + b, 0) * pricing.markup / 100).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#6B7280]">Discount ({pricing.discount}%)</span>
                              <span className="text-[#EF4444] font-medium">-${(Object.values(pricing.breakdown).reduce((a, b) => a + b, 0) * pricing.discount / 100).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-[#4F46E5] p-6 flex justify-between items-center">
                          <span className="text-white/80 font-medium">Final Quotation Price</span>
                          <span className="text-2xl font-bold text-white">${pricing.final_price.toLocaleString()}</span>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide ml-1">Markup %</label>
                            <input
                              type="number"
                              value={pricing.markup}
                              onChange={(e) => updatePricingField('markup', parseFloat(e.target.value) || 0)}
                              className="w-full p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wide ml-1">Discount %</label>
                            <input
                              type="number"
                              value={pricing.discount}
                              onChange={(e) => updatePricingField('discount', parseFloat(e.target.value) || 0)}
                              className="w-full p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-[#F9FAFB] border-t border-[#F3F4F6] flex gap-3">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 text-sm font-bold text-[#4B5563] bg-white border border-[#E5E7EB] rounded-2xl hover:bg-[#F3F4F6] transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleSaveRequirements}
                    className="flex-1 py-3.5 text-sm font-bold text-white bg-[#4F46E5] rounded-2xl hover:bg-[#4338CA] shadow-lg shadow-[#4F46E5]/20 transition-all"
                  >
                    Save & Generate Quotation
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
export default SettingsPage;
