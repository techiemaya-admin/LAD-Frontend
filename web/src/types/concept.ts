export interface Concept {
    id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    tenant_id: string;
    metadata?: any;
    name: string;
    pricing_type: string;
    base_price?: number;
    minimum_cost?: number;
    description?: string;
}
