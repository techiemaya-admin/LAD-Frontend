import { RequirementConfig } from "./requirement_config";

export interface Concept {
    id: string;
    is_deleted: boolean;
    created_at: string;
    updated_at: string;
    tenant_id: string;
    metadata?: any;
    name: string;
    minimum_cost?: number;
    description?: string;
    requirement_config?: RequirementConfig[]; // For mapping
}