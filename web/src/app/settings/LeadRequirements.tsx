import React from 'react';
import { Settings, Plus, Edit2, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { RequirementConfig } from '../../types/requirement_config';
import { PricingModel } from '../../types/pricing_model';
 
interface LeadRequirementsProps {
  requirementConfigs: RequirementConfig[];
  pricingModels: PricingModel[];
  onEdit: (config: RequirementConfig) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}
 
export const LeadRequirements: React.FC<LeadRequirementsProps> = ({ 
  requirementConfigs, 
  pricingModels,
  onEdit, 
  onDelete, 
  onAdd 
}) => {
  return (
      <section className="bg-white p-3 sm:p-8 rounded-xl sm:rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EEF2FF] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#4F46E5]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-bold text-[#1F2937] break-words">Lead Requirement Configuration</h3>
              <p className="text-[10px] sm:text-sm text-[#6B7280] break-words mt-0.5">Define the dynamic fields that AI should extract from incoming lead emails.</p>
            </div>
          </div>
          <button
              onClick={onAdd}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-[#9CA3AF] uppercase bg-[#F9FAFB]">
            <tr>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Base Price</th>
              <th className="px-4 py-3">Pricing Model</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {requirementConfigs.map(config => (
                <tr key={config.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3 font-medium text-[#1F2937]">{config.label}</td>
                  <td className="px-4 py-3 text-[#6B7280]">{config.field_key}</td>
                  <td className="px-4 py-3 text-[#1F2937] font-bold">${config.base_price?.toLocaleString()}</td>
                  <td className="px-4 py-3 text-[#6B7280]">
                    {pricingModels.find(m => m.id === config.pricing_model_id)?.label}
                  </td>
                  <td className="px-4 py-3">
                  <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", config.is_active ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-600")}>
                    {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                        onClick={() => onEdit(config)}
                        className="p-1.5 text-[#4F46E5] hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onDelete(config.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
            ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Grid View */}
        <div className="md:hidden space-y-3">
          {requirementConfigs.map(config => (
              <div key={config.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3 overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#1F2937] text-sm break-words">{config.label}</p>
                    <p className="text-[10px] text-slate-500 mt-1 font-mono">{config.field_key}</p>
                  </div>
                  <span className={cn(
                      "px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0",
                      config.is_active ? "bg-green-100 text-green-600" : "bg-gray-200 text-gray-500"
                  )}>
                {config.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
                    <p className="text-xs font-bold text-[#10B981]">${config.base_price?.toLocaleString()}</p>
                  </div>
                  <div className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Model</p>
                    <p className="text-xs font-medium text-gray-700 truncate">
                      {pricingModels.find(m => m.id === config.pricing_model_id)?.label || 'Fixed'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                      onClick={() => onEdit(config)}
                      className="flex-1 py-2 px-3 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] rounded-lg shadow-sm hover:bg-slate-50 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Edit2 className="w-3 h-3" /> Edit
                  </button>
                  <button
                      onClick={() => onDelete(config.id)}
                      className="p-2 bg-red-50 text-red-500 rounded-lg border border-red-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
          ))}
        </div>
      </section>
  );
};