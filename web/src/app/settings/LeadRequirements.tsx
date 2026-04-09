import React from 'react';
import { Settings, Plus, Edit2, X } from 'lucide-react';
import { cn } from '../../lib/utils';

 export interface RequirementConfig {
  id: string;
  tenant_id: string;
  field_key: string;
  label: string;
  is_active: boolean;
  default_value: any;
  order_index: number;
  created_at: string;
}

interface LeadRequirementsProps {
  requirementConfigs: RequirementConfig[];
  onEdit: (config: RequirementConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export const LeadRequirements: React.FC<LeadRequirementsProps> = ({ 
  requirementConfigs, 
  onEdit, 
  onDelete, 
  onAdd 
}) => {
  return (
    <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-[#1F2937] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#4F46E5]" /> Lead Requirement Configuration
        </h3>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-xs hover:bg-[#4338CA] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Field
        </button>
      </div>
      <p className="text-sm text-[#6B7280] mb-6">Define the dynamic fields that AI should extract from incoming lead emails.</p>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#9CA3AF] uppercase bg-[#F9FAFB]">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Default Value</th>
              <th className="px-4 py-3">Order Index</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirementConfigs?.map(config => (
              <tr key={config.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB]">
                <td className="px-4 py-3 font-medium text-[#1F2937]">{config.label}</td>
                <td className="px-4 py-3 text-[#6B7280]">{config.field_key}</td>
                <td className="px-4 py-3 text-[#6B7280] capitalize">{config.default_value}</td>
                <td className="px-4 py-3 text-[#6B7280]">{config.order_index}</td>
                <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", config.is_active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600")}>
                    {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button 
                    onClick={() => onEdit(config)}
                    className="text-[#4F46E5] hover:text-[#4338CA]"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => onDelete(config.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
