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
          requirement_configs: suggestion.requirement_configs.map((obj: any) => obj.id)
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
      <section className="bg-white p-3 sm:p-8 rounded-xl sm:rounded-3xl shadow-sm border border-[#E5E7EB] overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EEF2FF] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#4F46E5]" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-lg font-bold text-[#1F2937] break-words">Concept Management</h3>
              <p className="text-[10px] sm:text-sm text-[#6B7280] break-words mt-0.5">Manage event concepts and costs.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
                onClick={() => handleAskAi(tenantId)}
                disabled={isAiLoading}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-4 h-4" />}
              Ask AI
            </button>
            <button
                onClick={onAdd}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Concept
            </button>
          </div>
        </div>

        {/* AI Suggestions Modal */}
        <AnimatePresence>
          {aiSuggestions && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                >
                  <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600">
                        <Brain className="w-4 h-4 sm:w-6 sm:h-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 text-base sm:text-xl">AI-Suggested Concepts</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Based on your requirement config</p>
                      </div>
                    </div>
                    <button onClick={() => setAiSuggestions(null)} className="p-1 sm:p-2 hover:bg-slate-50 rounded-full text-slate-400"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                  </div>

                  <div className="p-4 sm:p-8 overflow-y-auto space-y-3 sm:space-y-4">
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
                                "p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer group",
                                selectedSuggestions.includes(idx) ? "border-blue-600 bg-blue-50/10" : "border-slate-50 hover:border-slate-200"
                            )}
                        >
                          <div className="flex items-center justify-between mb-2 sm:mb-3">
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs sm:text-sm">{suggestion.name}</h4>
                            <div className={cn(
                                "w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2 rounded-md",
                                selectedSuggestions.includes(idx)
                                    ? "bg-blue-600 border-blue-600 shadow-md"
                                    : "bg-white border-slate-200"
                            )}>
                              {selectedSuggestions.includes(idx) && (
                                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[3px]" />
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] sm:text-xs text-slate-500 mb-3 sm:mb-4 font-medium line-clamp-2">{suggestion.description}</p>
                          <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                            {suggestion.requirement_configs.map((configObj: { id: string; name: string }) => {
                              const config = requirementConfigs.find(c => c.field_key === configObj.id || c.id === configObj.id);
                              return (
                                  <span key={configObj.id} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[8px] sm:text-[10px] font-bold rounded uppercase tracking-wider">
                            {config?.label || configObj.name || configObj.id}
                          </span>
                              );
                            })}
                          </div> <div className="flex items-center gap-2">
                            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Min. Cost:</span>
                            <span className="text-xs sm:text-sm font-black text-blue-600">${suggestion.minimum_cost}</span>
                          </div>
                        </div>
                    ))}
                  </div>

                  <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button
                        onClick={() => setAiSuggestions(null)}
                        className="order-2 sm:order-1 flex-1 py-3 sm:py-4 bg-white border border-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={handleAddSuggestions}
                        disabled={selectedSuggestions.length === 0}
                        className="order-1 sm:order-2 flex-[2] py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                    >
                      Add {selectedSuggestions.length} Concepts
                    </button>
                  </div>
                </motion.div>
              </div>
          )}
        </AnimatePresence>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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

        {/* Mobile grid view */}
        <div className="md:hidden space-y-3">
          {concepts.length === 0 ? (
              <div className="py-12 text-center text-[#9CA3AF] text-sm">
                No concepts found.
              </div>
          ) : (
              concepts.map(concept => (
                  <div key={concept.id} className="p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[#1F2937] text-sm break-words">{concept.name}</p>
                        <p className="text-[10px] text-blue-600 font-bold mt-1">Min. Cost: ${Number(concept.minimum_cost || 0).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                            onClick={() => onEdit(concept)}
                            className="p-1.5 sm:p-2 text-[#4F46E5] bg-white border border-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(concept.id)}
                            className="p-1.5 sm:p-2 text-red-500 bg-white border border-slate-100 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {concept.description && (
                        <p className="text-[10px] text-slate-500 line-clamp-3 italic break-words">{concept.description}</p>
                    )}

                    <div className="flex flex-wrap gap-1">

                      {concept.requirement_configs.map((config, index) => (
                        <span key={index} className="px-1.5 py-0.5 bg-white text-gray-500 text-[8px] rounded border border-slate-100 font-mono break-all max-w-full">
                      {config.field_key}
                    </span>
                    ))}

                    </div>
                  </div>
              ))
          )}
        </div>
      </section>
  );
};