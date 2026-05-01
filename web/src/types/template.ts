export interface Template {
  id: string;
  name: string;
  created_at: string;
  html?: string;
  design?: any;
  is_default?: boolean;
  placeholders?: string[];
}
