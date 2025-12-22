export interface PipelineStage {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface PipelineLead {
  id: string;
  stage_id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  value?: number;
  custom_fields?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  stages: PipelineStage[];
  created_at: string;
  updated_at: string;
}
