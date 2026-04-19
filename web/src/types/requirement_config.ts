export interface RequirementConfig {
  id: string;
  tenant_id: string;
  field_key: string;
  label: string;
  is_active: boolean;
  base_price: number;
  pricing_model_id?: string;
  created_at: string;
}
