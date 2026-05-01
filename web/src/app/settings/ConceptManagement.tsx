import React from 'react';
import { Sparkles, Plus, Edit2, Trash2 } from 'lucide-react';
import { Concept } from '../../types/concept';
import { RequirementConfig } from '../../types/requirement_config';
import { cn } from '../../lib/utils';

interface ConceptManagementProps {
  concepts: Concept[];
  requirementConfigs: RequirementConfig[];
  onEdit: (concept: Concept) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export const ConceptManagement: React.FC<ConceptManagementProps> = ({ 
  concepts, 
  requirementConfigs,
  onEdit, 
  onDelete, 
  onAdd 
}) => {
  return (
    <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#4F46E5]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1F2937]">Concept Management</h3>
            <p className="text-sm text-[#6B7280]">Manage event concepts, pricing ratios, and minimum costs.</p>
          </div>
        </div>
        <button 
          onClick={onAdd}
          className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-xs hover:bg-[#4338CA] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Concept
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#9CA3AF] uppercase bg-[#F9FAFB]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Included Services</th>
              <th className="px-4 py-3">Min. Cost</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {concepts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#9CA3AF]">
                  No concepts found. Click "Add Concept" to create one.
                </td>
              </tr>
            ) : (
              concepts.map(concept => (
                <tr key={concept.id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-4 font-bold text-[#1F2937]">{concept.name}</td>
                  <td className="px-4 py-4">
                    {concept.requirement_configs && concept.requirement_configs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {concept.requirement_configs.map((config, index) => (
                          <span key={index} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[9px] rounded font-mono border border-gray-200">
                            {config.field_key}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-[#9CA3AF]">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[#6B7280]">
                    {concept.minimum_cost ? `$${Number(concept.minimum_cost).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-[#6B7280] max-w-xs truncate">{concept.description || '-'}</td>
                  <td className="px-4 py-4 text-right space-x-2">
                    <button 
                      onClick={() => onEdit(concept)}
                      className="p-2 text-[#4F46E5] hover:bg-[#EEF2FF] rounded-lg transition-colors"
                      title="Edit Concept"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(concept.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Concept"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};
