import React, { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Brain, Loader2, Check, X } from 'lucide-react';
import { Concept, PricingModel, RequirementConfig } from '../../types';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';

interface ConceptManagementProps {
  concepts: Concept[];
  requirementConfigs: RequirementConfig[];
  tenantId: string;
  onEdit: (concept: Concept) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  afterSave: () => void;
}

export const ConceptManagement: React.FC<ConceptManagementProps> = ({
  concepts,
  requirementConfigs,
  tenantId,
  onEdit,
  onDelete,
  onAdd,
  afterSave
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  const handleAskAi = async (tenantId: string) => {
    setIsAiLoading(true);
    console.log("TEN>>  ai sug " + tenantId)
    try {
      const suggestions = await fetch(`${getApiBaseUrlForLocal()}/api/ai-response/suggest-concepts/${tenantId}`);
      const resp = await suggestions.json();
      console.log("concept sugges>> ")
      console.log(resp);
      console.log("Setting suggestions:", resp.suggestions)
      setAiSuggestions(resp.suggestions);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('AI Suggestion failed:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddSuggestions = async () => {
    if (!aiSuggestions) return;

    const toAdd = aiSuggestions.filter((_, i) => selectedSuggestions.includes(i));

    try {
      for (const suggestion of toAdd) {
        // FIX: You were calling 'onSave' which doesn't exist in props.
        // You should call an actual API endpoint or a passed-down handler.
        const body = JSON.stringify({
          ...suggestion,
          tenant_id: tenantId,
          // Extract just the IDs from the objects before sending to DB
          requirement_config_ids: suggestion.requirement_config_ids.map((obj: any) => obj.id)
        });
        console.log(body)
        await fetch(`${getApiBaseUrlForLocal()}/api/concepts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
        });
      }
      toast.success(`Successfully added ${toAdd.length} concepts`);
      setAiSuggestions(null);
      setSelectedSuggestions([]);
      // Refresh the list after adding
      afterSave();
    } catch (error) {
      toast.error('Failed to save some concepts');
    }
  };
  return (
    <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleAskAi(tenantId)}
            disabled={isAiLoading}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-xs hover:bg-black transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            Ask AI
          </button>
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-xs hover:bg-[#4338CA] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Concept
          </button>
        </div>
      </div>

      {/* AI Suggestions Modal */}
      <AnimatePresence>
        {aiSuggestions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-xl">AI-Suggested Concepts</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Based on your requirement config</p>
                  </div>
                </div>
                <button onClick={() => setAiSuggestions(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-4">
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (selectedSuggestions.includes(idx)) {
                        setSelectedSuggestions(selectedSuggestions.filter(s => s !== idx));
                      } else {
                        setSelectedSuggestions([...selectedSuggestions, idx]);
                      }
                    }}
                    className={cn(
                      "p-6 rounded-2xl border-2 transition-all cursor-pointer group",
                      selectedSuggestions.includes(idx) ? "border-blue-600 bg-blue-50/10" : "border-slate-50 hover:border-slate-200"
                    )}
                  ><div className="flex items-center justify-between mb-3">
                      <h4 className="font-black text-slate-800 uppercase tracking-tight">{suggestion.name}</h4>

                      <div className={cn(
                        "w-6 h-6 flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2  !rounded-none",
                        selectedSuggestions.includes(idx)
                          ? "bg-blue-600 border-blue-600 shadow-md"
                          : "bg-white border-slate-200",
                        "rounded-md !important" // Use !important if a global style is forcing rounded-full
                      )}>
                        {selectedSuggestions.includes(idx) && (
                          <Check className="w-4 h-4 text-white" style={{ strokeWidth: 4 }} />
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-4 font-medium">{suggestion.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {/* Update 'id' to reflect that it is now an object from the AI response */}
                      {suggestion.requirement_config_ids.map((configObj: { id: string; name: string }) => {
                        // 1. Use configObj.id for the lookup
                        const config = requirementConfigs.find(c => c.field_key === configObj.id || c.id === configObj.id);

                        return (
                          // 2. Use configObj.id as the unique key string
                          <span key={configObj.id} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase tracking-wider">
                            {config?.label || configObj.name || configObj.id}
                          </span>
                        );
                      })}
                    </div> <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min. Cost:</span>
                      <span className="text-sm font-black text-blue-600">${suggestion.minimum_cost}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button
                  onClick={() => setAiSuggestions(null)}
                  className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-sm hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSuggestions}
                  disabled={selectedSuggestions.length === 0}
                  className="flex-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  Add {selectedSuggestions.length} Concepts
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


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
