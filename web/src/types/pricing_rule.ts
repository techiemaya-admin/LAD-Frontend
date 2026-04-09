
export interface PricingRule {
  id: string;
  concept_id: string;
  name: string;
  priority: number;
  is_active: boolean;
  condition_field: string;
  condition_operator: string;
  condition_value: number;
  action_type: string;
  action_mode: string;
  action_value: number;
  action_value_type: string;
  created_at: string;
  is_deleted: boolean;
  updated_at: string;
  metadata?: any;
  tenant_id: string;
}