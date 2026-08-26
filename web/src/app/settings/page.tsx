'use client';
// Force dynamic rendering
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCompanyName } from '../../store/slices/settingsSlice';
import { IntegrationsSettings } from '../../components/settings/IntegrationsSettings';
import { VoiceAgentSettings } from '../../components/voice-agent/VoiceAgentSettings';
import { ChatSettings } from '../../components/settings/ChatSettings';
import { BillingSettings } from '../../components/settings/BillingSettings';
import { CreditsSettings } from '../../components/settings/CreditsSettings';
import { BusinessProfileSettings } from '../../components/settings/BusinessProfileSettings';
import { TeamManagement } from '../../components/settings/TeamManagement';
import { toast } from 'sonner';
import { Concept } from '../../types/concept';
import { cn } from '../../lib/utils';
import { Template } from './EmailTemplates';
import { QuotationTemplates } from './QuotationTemplates';
import { LeadRequirements } from './LeadRequirements';
import { RequirementConfig } from '../../types/requirement_config';
import { ConceptManagement } from './ConceptManagement';
import { PricingRules } from './PricingRules';
import {
  Building2, Users, Plug, Terminal, CreditCard, Coins,
  MessageSquare, Target, Crosshair, Sparkles, Settings,
  DollarSign, FileText, ChevronDown, X, ClipboardCheck,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import { motion, AnimatePresence } from 'framer-motion';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { logger } from '@/lib/logger';
import { PricingRule } from '@/types/pricing_rule';

type ActiveTab = 'businessprofile' | 'team' | 'accounts' | 'website' | 'integrations' | 'chat' | 'api' | 'billing' | 'credits' | 'proposal_settings';

const SettingsPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { tenant } = useTenant();
  const { user, isLoading: isAuthLoading } = useAuth();
  
  const companyName = useSelector((state: any) => state.settings.companyName);
  const companyLogo = useSelector((state: any) => state.settings.companyLogo);
  const [activeTab, setActiveTab] = useState<ActiveTab>('integrations');
  const [renewalDate, setRenewalDate] = useState<string>('');
  const [logoError, setLogoError] = useState(false);

  // Proposal settings state
  const [requirementConfigs, setRequirementConfigs] = useState<RequirementConfig[]>([]);
  const [proposalSubTab, setProposalSubTab] = useState<'lead_config' | 'concepts' | 'pricing_rules' | 'quotation-templates' | ''>('lead_config');
  const [editingConfig, setEditingConfig] = useState<RequirementConfig | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const [pricingModels, setPricingModels] = useState<{ id?: string; value: string; label: string }[]>([]);
  const [selectedConceptServices, setSelectedConceptServices] = useState<string[]>([]);
  const [placeholders, setPlaceholders] = useState<any[]>([]);
  const [quotationTemplates, setQuotationTemplates] = useState<any[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewQuotationUrl, setPreviewQuotationUrl] = useState<string | null>(null);
  const [isPreviewQuotationModalOpen, setIsPreviewQuotationModalOpen] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  // Redirect if not authenticated and not loading
  useEffect(() => {
    if (!isAuthLoading && !user) {
      const redirect = encodeURIComponent('/settings');
      router.replace(`/login?redirect_url=${redirect}`);
    }
  }, [isAuthLoading, user, router]);

  // Update company name from tenant or user profile
  useEffect(() => {
    if (!user) return;

    const sessionName = (tenant?.name && tenant.name !== 'Default') 
      ? tenant.name 
      : ((user as any)?.company_name || user?.name);
      
    if (sessionName && sessionName !== companyName && sessionName !== 'Default') {
      dispatch(setCompanyName(sessionName));
    }
  }, [tenant?.name, user, companyName, dispatch]);

  const fetchConfigs = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${tId}`);
      const data = await res.json();
      setRequirementConfigs(data);
    } catch (error) {
      logger.error('Failed to fetch lead requirement configs', error);
    }
  };

  const fetchConcepts = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/concepts/${tId}`);
      const data = await res.json();
      setConcepts(data);
    } catch (error) {
      logger.error('Failed to fetch concepts', error);
    }
  };

  const fetchPricingRules = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/pricing-rules/${tId}`);
      const data = await res.json();
      setPricingRules(data);
    } catch (error) {
      logger.error('Failed to fetch pricing rules', error);
    }
  };

  const fetchPricingModels = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/pricing-models/${tId}`);
      const data = await res.json();
      setPricingModels(data);
    } catch (error) {
      logger.error('Failed to fetch pricing models', error);
    }
  };

  const fetchQuotationTemplates = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/quotation-templates/${tId}`);
      const data = await res.json();
      setQuotationTemplates(data);
    } catch (error) {
      logger.error('Failed to fetch quotation templates', error);
    }
  };

  const fetchPlaceholders = async (tId: string) => {
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/template-placeholder/${tId}`);
      const data = await res.json();
      setPlaceholders(data.data || []);
    } catch (error) {
      logger.error('Failed to fetch placeholders', error);
    }
  };

  const fetchProposalSettingDetails = async (targetTenantId?: string) => {
    const idToUse = targetTenantId || tenant?.id;
    if (!idToUse || idToUse === 'default') return;

    try {
      setTenantId(idToUse);
      await Promise.all([
        fetchConfigs(idToUse),
        fetchConcepts(idToUse),
        fetchPricingRules(idToUse),
        fetchPricingModels(idToUse),
        fetchQuotationTemplates(idToUse),
        fetchPlaceholders(idToUse),
      ]);
    } catch (error) {
      logger.error('[Proposal Settings] Failed to fetch details', error);
    }
  };

  const handleDeleteConfig = async (id: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Configuration deleted');
        fetchConfigs(tenantId);
      }
    }
  };

  const handleUploadQuotationTemplate = async (template_name: string, isDefault: boolean, file: File) => {
    try {
      const formData = new FormData();
      formData.append('template_name', template_name);
      formData.append('is_default', String(isDefault));
      formData.append('file', file);

      const response = await fetch(`${getApiBaseUrlForLocal()}/api/quotation-templates/upload/${tenantId}`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        toast.success('Quotation template uploaded and saved');
        fetchQuotationTemplates(tenantId);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload Quotation template');
      }
    } catch (error: any) {
      console.error('Upload Quotation template failed:', error);
      toast.error(error.message || 'Failed to upload Quotation template');
    }
  };

  const handlePreviewQuotationTemplate = async (template: Template) => {
    try {
      const response = await fetch(`${getApiBaseUrlForLocal()}/api/quotation-templates/${template.id}/preview`);
      if (!response.ok) throw new Error('Failed to fetch Quotation preview');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setPreviewQuotationUrl(url);
      setIsPreviewQuotationModalOpen(true);
    } catch (error) {
      toast.error('Visual preview failed to load for quotation');
      console.error(error);
    }
  };

  const closePreview = () => {
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setIsPreviewModalOpen(false);
    if (previewQuotationUrl) window.URL.revokeObjectURL(previewQuotationUrl);
    setPreviewQuotationUrl(null);
    setIsPreviewQuotationModalOpen(false);
  };

  const handleSetDefaultQuotationTemplate = async (id: string) => {
    try {
      await fetch(`${getApiBaseUrlForLocal()}/api/quotation-templates/${tenantId}/set-default/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });
      toast.success('Default quotation template updated');
      fetchQuotationTemplates(tenantId);
    } catch (error) {
      console.error('Set default quotation template failed:', error);
    }
  };

  const handleDeleteQuotationTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation template?')) return;
    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/quotation-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Quotation template deleted');
        fetchQuotationTemplates(tenantId);
      }
    } catch (error) {
      console.error('Delete quotation template failed:', error);
      toast.error('Failed to delete quotation template');
    }
  };

  const handleSavePricingRule = async (ruleData: Partial<PricingRule>) => {
    const url = ruleData.id ? `${getApiBaseUrlForLocal()}/api/pricing-rules/${ruleData.id}` : `${getApiBaseUrlForLocal()}/api/pricing-rules`;
    const method = ruleData.id ? 'PUT' : 'POST';
    ruleData.tenant_id = tenantId;
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
      tenant_id: tenantId,
      name: formData.get('name'),
      pricing_type: formData.get('pricing_type'),
      minimum_cost: parseFloat(formData.get('minimum_cost') as string) || 0,
      description: formData.get('description'),
      requirement_config_ids: selectedConceptServices,
    };
    const url = editingConcept ? `${getApiBaseUrlForLocal()}/api/concepts/${editingConcept.id}` : `${getApiBaseUrlForLocal()}/api/concepts`;
    const method = editingConcept ? 'PUT' : 'POST';

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
    const configData = {
      tenant_id: tenantId,
      field_key: formData.get('field_key'),
      label: formData.get('label'),
      is_active: formData.get('is_active') === 'on',
      base_price: parseFloat(formData.get('base_price') as string) || 0,
      pricing_model_id: formData.get('pricing_model_id'),
    };

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

  // Source of truth for display: prioritize tenant/user data over Redux if they exist
  const displayCompanyName = (tenant?.name && tenant.name !== 'Default')
    ? tenant.name
    : ((user as any)?.company_name || user?.name || (companyName !== 'My Organization' ? companyName : ''));

  useEffect(() => {
    if (!user) return;
    const tabParam = (searchParams.get('tab') || '').toLowerCase();
    const allowed: ActiveTab[] = ['businessprofile', 'team', 'accounts', 'website', 'integrations', 'chat', 'api', 'billing', 'credits', 'proposal_settings'];
    if (tabParam === 'company') {
      const sp = new URLSearchParams(Array.from(searchParams.entries()));
      sp.set('tab', 'businessprofile');
      router.replace(`/settings?${sp.toString()}`);
      setActiveTab('businessprofile');
    } else if (allowed.includes(tabParam as ActiveTab)) {
      setActiveTab(tabParam as ActiveTab);
      if (tabParam === 'proposal_settings' && tenant?.id) {
        fetchProposalSettingDetails(tenant.id);
      }
    }

    const fetchRenewalDate = async () => {
      try {
        const periodEnd = Date.now() + 86400 * 15 * 1000;
        const date = new Date(periodEnd);
        const formattedDate = date.toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
        setRenewalDate(formattedDate);
      } catch (error) {
        console.error('Error fetching renewal date:', error);
        setRenewalDate('November 29th, 2025');
      }
    };
    fetchRenewalDate();
  }, [user, searchParams, tenant?.id]);

  if (isAuthLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0B1957]"></div>
      </div>
    );
  }

  if (!user) return null;
  const tabs = [
    { id: 'businessprofile' as ActiveTab, label: 'Business Profile', icon: Target },
    { id: 'team' as ActiveTab, label: 'Team', icon: Users },
    { id: 'integrations' as ActiveTab, label: 'Integrations', icon: Plug },
    { id: 'chat' as ActiveTab, label: 'Chat Settings', icon: MessageSquare },
    { id: 'api' as ActiveTab, label: 'Voice Settings', icon: Terminal },
    { id: 'billing' as ActiveTab, label: 'Billing', icon: CreditCard },
    { id: 'credits' as ActiveTab, label: 'Credits', icon: Coins },
    { id: 'proposal_settings' as ActiveTab, label: 'Proposal Settings', icon: ClipboardCheck },
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#000724] space-y-6 p-4 sm:p-6">
      {/* Combined Header with Logo, Company Name, Renewal Date, and Tabs */}
      <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
        {/* Top Section: Logo, Company Name, and Renewal */}
        <div className="p-6 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-white dark:bg-gray-800 shadow-md flex items-center justify-center border-2 border-white dark:border-gray-700">
                {logoError || !companyLogo ? (
                  <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
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
                <h1 className="text-gray-900 dark:text-gray-100 font-semibold text-xl">{displayCompanyName}</h1>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Renews on {renewalDate || 'Loading...'}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Bottom Section: Tabs Navigation */}
        <div className="border-t border-gray-200/50 dark:border-gray-800/60 bg-white/30 dark:bg-black/20 backdrop-blur-sm">
          <div className="flex space-x-1 overflow-x-auto p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'proposal_settings') {
                    fetchProposalSettingDetails();
                  }
                  const sp = new URLSearchParams(Array.from(searchParams.entries()));
                  sp.set('tab', tab.id);
                  router.replace(`/settings?${sp.toString()}`);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-[#0B1957] dark:text-blue-400 shadow-md font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
            <button
              onClick={() => router.push('/settings/icp-search-strategy')}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/50 dark:hover:bg-gray-800/50"
            >
              <Crosshair className="w-4 h-4" />
              ICP Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'businessprofile' && <BusinessProfileSettings />}
        {activeTab === 'integrations' && <IntegrationsSettings />}
        {activeTab === 'chat' && <ChatSettings />}
        {activeTab === 'api' && <VoiceAgentSettings />}
        {activeTab === 'team' && <TeamManagement />}
        {activeTab === 'billing' && <BillingSettings />}
        {activeTab === 'credits' && <CreditsSettings />}

        {/* Proposal Settings Tab */}
        {activeTab === 'proposal_settings' && (
          <div className="flex flex-col gap-4">
            {[
              { id: 'lead_config', label: 'Lead requirement', icon: Settings, count: `${requirementConfigs.length} fields configured` },
              { id: 'concepts', label: 'Concept management', icon: Sparkles, count: `${concepts.length} concepts active` },
              { id: 'pricing_rules', label: 'Pricing rules', icon: DollarSign, count: `${pricingRules.length} rules` },
              { id: 'quotation-templates', label: 'Quotation template', icon: FileText, count: `${quotationTemplates.length} ${quotationTemplates.length === 1 ? 'template' : 'templates'}` },
            ].map((sub) => {
              const isExpanded = proposalSubTab === sub.id;
              return (
                <div
                  key={sub.id}
                  className={cn(
                    'bg-white dark:bg-gray-900 rounded-2xl border transition-all overflow-hidden flex flex-col',
                    isExpanded ? 'border-slate-200 dark:border-gray-700 shadow-sm' : 'border-slate-100 dark:border-gray-800 hover:border-slate-200'
                  )}
                >
                  <button
                    onClick={() => setProposalSubTab(isExpanded ? '' as any : sub.id as any)}
                    className="flex items-center justify-between p-6 w-full text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm',
                        isExpanded ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                      )}>
                        <sub.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-gray-100">{sub.label}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-400 font-medium">{sub.count}</p>
                      </div>
                    </div>
                    <ChevronDown className={cn(
                      'w-5 h-5 text-slate-400 dark:text-gray-500 transition-transform duration-300',
                      isExpanded && 'rotate-180'
                    )} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="border-t border-slate-50 dark:border-gray-800 bg-white dark:bg-gray-900"
                      >
                        <div className="p-8">
                          {sub.id === 'lead_config' && (
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

                          {sub.id === 'concepts' && (
                            <ConceptManagement
                              concepts={concepts}
                              tenantId={tenantId}
                              requirementConfigs={requirementConfigs}
                              onEdit={(concept) => {
                                setEditingConcept(concept);
                                const requirementConfigIds = concept.requirement_configs?.map(item => item.id) || [];
                                setSelectedConceptServices(requirementConfigIds);
                                setIsConceptModalOpen(true);
                              }}
                              onDelete={handleDeleteConcept}
                              onAdd={() => {
                                setEditingConcept(null);
                                setSelectedConceptServices([]);
                                setIsConceptModalOpen(true);
                              }}
                              afterSave={() => {
                                fetchConcepts(tenantId);
                                setIsConceptModalOpen(false);
                                setEditingConcept(null);
                              }}
                            />
                          )}

                          {sub.id === 'pricing_rules' && (
                            <PricingRules
                              pricingRules={pricingRules}
                              concepts={concepts}
                              tenantId={tenantId}
                              requirementConfigs={requirementConfigs}
                              onSave={handleSavePricingRule}
                              onDelete={handleDeletePricingRule}
                              afterSave={() => {
                                fetchPricingRules(tenantId);
                              }}
                            />
                          )}

                          {sub.id === 'quotation-templates' && (
                            <QuotationTemplates
                              templates={quotationTemplates}
                              onUpload={handleUploadQuotationTemplate}
                              onDelete={handleDeleteQuotationTemplate}
                              onPreview={handlePreviewQuotationTemplate}
                              onSetDefault={handleSetDefaultQuotationTemplate}
                              placeholderList={placeholders}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Quotation Template Modal */}
        <AnimatePresence>
          {isPreviewQuotationModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[90vh] rounded-[32px] overflow-hidden flex flex-col shadow-2xl"
              >
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
                  <h2 className="font-bold text-slate-800 dark:text-gray-100 text-lg">Quotation Template Preview</h2>
                  <button onClick={closePreview} className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X className="w-5 h-5 text-slate-500 dark:text-gray-400" />
                  </button>
                </div>

                <div className="flex-1 bg-slate-100 dark:bg-gray-950 p-4">
                  {previewQuotationUrl && (
                    <iframe
                      src={`${previewQuotationUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full rounded-xl border-none shadow-lg"
                      title="Visual Preview"
                    />
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

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
                className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <form onSubmit={handleSaveConcept}>
                  <div className="p-6 border-b border-[#F3F4F6] dark:border-gray-800 flex items-center justify-between bg-[#F9FAFB] dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-[#1F2937] dark:text-gray-100">{editingConcept ? 'Edit Concept' : 'Add New Concept'}</h2>
                    <button type="button" onClick={() => setIsConceptModalOpen(false)} className="p-2 hover:bg-[#E5E7EB] dark:hover:bg-gray-700 rounded-full">
                      <X className="w-5 h-5 text-[#6B7280] dark:text-gray-400" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Concept Name</label>
                      <input name="name" defaultValue={editingConcept?.name} required className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm" placeholder="e.g. LITE, IMPACT" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Minimum Cost</label>
                      <input name="minimum_cost" type="number" step="0.01" defaultValue={editingConcept?.minimum_cost} className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm" placeholder="e.g. 5000.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Included Services</label>
                      <div className="space-y-3">
                        <select
                          className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all"
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && !selectedConceptServices.includes(val)) {
                              setSelectedConceptServices([...selectedConceptServices, val]);
                            }
                            e.target.value = '';
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
                              <div key={id} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EEF2FF] dark:bg-blue-900/30 text-[#4F46E5] dark:text-blue-400 rounded-xl text-xs font-bold border border-[#C7D2FE] dark:border-blue-800 shadow-sm">
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
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Description</label>
                      <textarea name="description" defaultValue={editingConcept?.description} className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm h-24 resize-none" placeholder="Describe the concept..." />
                    </div>
                  </div>
                  <div className="p-6 bg-[#F9FAFB] dark:bg-gray-800/50 border-t border-[#F3F4F6] dark:border-gray-800 flex gap-3">
                    <button type="button" onClick={() => setIsConceptModalOpen(false)} className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-gray-700 text-[#6B7280] dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-white dark:hover:bg-gray-800 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors">
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
                className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
              >
                <form onSubmit={handleSaveConfig}>
                  <div className="p-6 border-b border-[#F3F4F6] dark:border-gray-800 flex items-center justify-between bg-[#F9FAFB] dark:bg-gray-800/50">
                    <h2 className="text-xl font-bold text-[#1F2937] dark:text-gray-100">{editingConfig ? 'Edit Field' : 'Add New Field'}</h2>
                    <button type="button" onClick={() => setIsConfigModalOpen(false)} className="p-2 hover:bg-[#E5E7EB] dark:hover:bg-gray-700 rounded-full">
                      <X className="w-5 h-5 text-[#6B7280] dark:text-gray-400" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Label</label>
                      <input name="label" defaultValue={editingConfig?.label} required className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Field Key</label>
                      <input name="field_key" defaultValue={editingConfig?.field_key} required className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Base Price</label>
                        <input name="base_price" type="number" step="0.01" defaultValue={editingConfig?.base_price} className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm" placeholder="0.00" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">Pricing Model</label>
                        <select name="pricing_model_id" defaultValue={editingConfig?.pricing_model_id} className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white">
                          {pricingModels.map((pm: any) => (
                            <option key={pm.id} value={pm.id}>{pm.value} ({pm.label})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-[#4B5563] dark:text-gray-300">
                        <input type="checkbox" name="is_active" defaultChecked={editingConfig?.is_active ?? true} /> Active
                      </label>
                    </div>
                  </div>
                  <div className="p-6 bg-[#F9FAFB] dark:bg-gray-800/50 border-t border-[#F3F4F6] dark:border-gray-800 flex gap-3">
                    <button type="button" onClick={() => setIsConfigModalOpen(false)} className="flex-1 py-2 text-sm font-bold text-[#4B5563] dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-700 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl">Save</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsPage;
