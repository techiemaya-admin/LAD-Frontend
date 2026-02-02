/**
 * Requirements Collection - Types and Constants
 */
export interface RequirementField {
  field: string;
  label: string;
  type?: 'text' | 'url' | 'email' | 'phone' | 'textarea' | 'file';
  required?: boolean;
}
export interface RequirementsCollectionProps {
  requirements: Record<string, boolean> | string[];
  message?: string;
  onComplete: (data: Record<string, any>) => void;
  workflow?: any[];
}
// Map requirement field names to user-friendly labels and types
export const FIELD_MAPPINGS: Record<string, { label: string; type: 'text' | 'url' | 'email' | 'phone' | 'textarea' | 'file' }> = {
  linkedin_url: { label: 'LinkedIn URL', type: 'url' },
  linkedin_url_or_keywords: { label: 'LinkedIn URL or Keywords', type: 'text' },
  connect_message: { label: 'Connection Message', type: 'textarea' },
  dm_message: { label: 'DM Message', type: 'textarea' },
  email: { label: 'Email Address', type: 'email' },
  subject: { label: 'Email Subject', type: 'text' },
  body: { label: 'Email Body', type: 'textarea' },
  phone: { label: 'Phone Number', type: 'phone' },
  whatsapp_message: { label: 'WhatsApp Message', type: 'textarea' },
  username: { label: 'Instagram Username', type: 'text' },
  instagram_username: { label: 'Instagram Username', type: 'text' },
  caption: { label: 'Post Caption', type: 'textarea' },
  image_url: { label: 'Image URL', type: 'url' },
  comment_text: { label: 'Comment Text', type: 'textarea' },
  post_url: { label: 'Post URL', type: 'url' },
  delay_amount: { label: 'Delay Amount', type: 'text' },
  condition_type: { label: 'Condition Type', type: 'text' },
  agent_template: { label: 'Voice Agent Template', type: 'text' },
  script: { label: 'Call Script', type: 'textarea' },
  company_name: { label: 'Company Name', type: 'text' },
};