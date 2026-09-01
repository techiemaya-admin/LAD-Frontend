import { Concept as BaseConcept } from '@/types/concept';
import { RequirementConfig as BaseRequirementConfig } from '@/types/requirement_config';
import { PricingRule as BasePricingRule } from '@/types/pricing_rule';

export interface RequirementConfig extends BaseRequirementConfig {
  pricing_model_id?: string;
}

export interface PricingModelOption {
  id?: string;
  value: string;
  label: string;
}

export interface Concept extends Omit<BaseConcept, 'requirement_config'> {
  pricing_type?: string;
  requirement_configs?: { id: string; label?: string; field_key?: string }[];
  requirement_config?: any[];
}

export interface PricingRule extends Omit<BasePricingRule, 'requirement_config_id' | 'concept_id'> {
  requirement_config_id?: string;
  concept_id?: string;
}

export interface QuotationTemplate {
  id: string;
  name: string;
  created_at: string;
  html?: string;
  design?: any;
  is_default?: boolean;
  placeholders?: string[];
}

export interface Placeholder {
  id: string;
  placeholder_key: string;
  description: string;
  data_source_path: string;
  is_loop: boolean;
}

export type ProposalSubTabId =
  | 'lead_config'
  | 'concepts'
  | 'pricing_rules'
  | 'quotation-templates'
  | 'email_integration';

export interface LeadRequirementsProps {
  requirementConfigs: RequirementConfig[];
  pricingModels: PricingModelOption[];
  tenantId: string;
  onRefresh: () => void | Promise<void>;
}

export interface ConceptManagementProps {
  concepts: Concept[];
  requirementConfigs: RequirementConfig[];
  tenantId: string;
  onRefresh: () => void | Promise<void>;
}

export interface PricingRulesProps {
  pricingRules: PricingRule[];
  concepts: Concept[];
  requirementConfigs: RequirementConfig[];
  tenantId: string;
  onRefresh: () => void | Promise<void>;
}

export interface QuotationTemplatesProps {
  templates: QuotationTemplate[];
  placeholderList: Placeholder[];
  tenantId: string;
  onRefresh: () => void | Promise<void>;
}

export interface ProposalEmailIntegrationProps {
  tenantId: string;
  onStatusChange?: (status: { connected: boolean; email?: string }) => void;
}

