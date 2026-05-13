import { Template } from './template'; // adjust the import path if needed

export interface QuotationTemplatesProps {
  templates: Template[];
  onUpload: (name: string, isDefault: boolean, placeholders: string[], html: string) => void;
  onOpenBuilder: (template?: any) => void;
  onDelete: (id: string) => void;
  onPreview: (template: Template) => void;
  onSetDefault: (id: string) => void;
}
