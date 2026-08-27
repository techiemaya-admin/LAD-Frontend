'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Sparkles, DollarSign, FileText, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/contexts/TenantContext';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';
import { LeadRequirements } from './LeadRequirements';
import { ConceptManagement } from './ConceptManagement';
import { PricingRules } from './PricingRules';
import { QuotationTemplates } from './QuotationTemplates';
import {
  RequirementConfig,
  Concept,
  PricingRule,
  PricingModelOption,
  QuotationTemplate,
  Placeholder,
  ProposalSubTabId,
} from './types';

export const ProposalSettings: React.FC = () => {
  const { tenant } = useTenant();
  const tenantId = tenant?.id || '';

  const [proposalSubTab, setProposalSubTab] = useState<ProposalSubTabId | ''>('lead_config');
  const [requirementConfigs, setRequirementConfigs] = useState<RequirementConfig[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [pricingModels, setPricingModels] = useState<PricingModelOption[]>([]);
  const [quotationTemplates, setQuotationTemplates] = useState<QuotationTemplate[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchConfigs = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setRequirementConfigs(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error('Failed to fetch lead requirement configs', error);
    }
  };

  const fetchConcepts = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/concepts/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setConcepts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error('Failed to fetch concepts', error);
    }
  };

  const fetchPricingRules = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/pricing-rules/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setPricingRules(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error('Failed to fetch pricing rules', error);
    }
  };

  const fetchPricingModels = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/pricing-models/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setPricingModels(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error('Failed to fetch pricing models', error);
    }
  };

  const fetchQuotationTemplates = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/quotation-templates/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setQuotationTemplates(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      logger.error('Failed to fetch quotation templates', error);
    }
  };

  const fetchPlaceholders = async (tId: string) => {
    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/template-placeholder/${tId}`);
      if (res.ok) {
        const data = await res.json();
        setPlaceholders(data.data || (Array.isArray(data) ? data : []));
      }
    } catch (error) {
      logger.error('Failed to fetch placeholders', error);
    }
  };

  const fetchAllDetails = useCallback(async (targetTenantId?: string) => {
    const idToUse = targetTenantId || tenantId;
    if (!idToUse || idToUse === 'default') return;

    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId && tenantId !== 'default') {
      fetchAllDetails(tenantId);
    }
  }, [tenantId, fetchAllDetails]);

  const sections = [
    {
      id: 'lead_config' as ProposalSubTabId,
      label: 'Lead requirement',
      icon: Settings,
      count: `${requirementConfigs.length} fields configured`,
    },
    {
      id: 'concepts' as ProposalSubTabId,
      label: 'Concept management',
      icon: Sparkles,
      count: `${concepts.length} concepts active`,
    },
    {
      id: 'pricing_rules' as ProposalSubTabId,
      label: 'Pricing rules',
      icon: DollarSign,
      count: `${pricingRules.length} rules`,
    },
    {
      id: 'quotation-templates' as ProposalSubTabId,
      label: 'Quotation template',
      icon: FileText,
      count: `${quotationTemplates.length} ${
        quotationTemplates.length === 1 ? 'template' : 'templates'
      }`,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {sections.map((sub) => {
        const isExpanded = proposalSubTab === sub.id;
        return (
          <div
            key={sub.id}
            className={cn(
              'bg-white dark:bg-gray-900 rounded-2xl border transition-all overflow-hidden flex flex-col',
              isExpanded
                ? 'border-slate-200 dark:border-gray-700 shadow-sm'
                : 'border-slate-100 dark:border-gray-800 hover:border-slate-200 dark:hover:border-gray-700'
            )}
          >
            <button
              onClick={() => setProposalSubTab(isExpanded ? '' : sub.id)}
              className="flex items-center justify-between p-6 w-full text-left transition-colors hover:bg-slate-50/50 dark:hover:bg-gray-800/50"
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm',
                    isExpanded
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-slate-50 dark:bg-gray-800 text-slate-400 dark:text-gray-500'
                  )}
                >
                  <sub.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-gray-100">{sub.label}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-400 font-medium">{sub.count}</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-slate-400 dark:text-gray-500 transition-transform duration-300',
                  isExpanded && 'rotate-180'
                )}
              />
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
                  <div className="p-4 sm:p-8">
                    {sub.id === 'lead_config' && (
                      <LeadRequirements
                        requirementConfigs={requirementConfigs}
                        pricingModels={pricingModels}
                        tenantId={tenantId}
                        onRefresh={() => fetchConfigs(tenantId)}
                      />
                    )}

                    {sub.id === 'concepts' && (
                      <ConceptManagement
                        concepts={concepts}
                        requirementConfigs={requirementConfigs}
                        tenantId={tenantId}
                        onRefresh={() => fetchConcepts(tenantId)}
                      />
                    )}

                    {sub.id === 'pricing_rules' && (
                      <PricingRules
                        pricingRules={pricingRules}
                        concepts={concepts}
                        requirementConfigs={requirementConfigs}
                        tenantId={tenantId}
                        onRefresh={() => fetchPricingRules(tenantId)}
                      />
                    )}

                    {sub.id === 'quotation-templates' && (
                      <QuotationTemplates
                        templates={quotationTemplates}
                        placeholderList={placeholders}
                        tenantId={tenantId}
                        onRefresh={() => fetchQuotationTemplates(tenantId)}
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
  );
};
