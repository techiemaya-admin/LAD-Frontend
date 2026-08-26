'use client';

import React, { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, Brain, Loader2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { Concept, ConceptManagementProps } from './types';

export const ConceptManagement: React.FC<ConceptManagementProps> = ({
  concepts,
  requirementConfigs,
  tenantId,
  onRefresh,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);

  // Add/Edit Concept Modal state
  const [isConceptModalOpen, setIsConceptModalOpen] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  const [selectedConceptServices, setSelectedConceptServices] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingConcept(null);
    setSelectedConceptServices([]);
    setIsConceptModalOpen(true);
  };

  const handleOpenEdit = (concept: Concept) => {
    setEditingConcept(concept);
    const requirementConfigIds = concept.requirement_configs?.map((item) => item.id) || [];
    setSelectedConceptServices(requirementConfigIds);
    setIsConceptModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsConceptModalOpen(false);
    setEditingConcept(null);
    setSelectedConceptServices([]);
  };

  const handleAskAi = async () => {
    if (!tenantId) {
      toast.error('Tenant ID is required');
      return;
    }
    setIsAiLoading(true);
    try {
      const suggestions = await fetch(
        `${getApiBaseUrlForLocal()}/api/ai-response/suggest-concepts/${tenantId}`
      );
      const resp = await suggestions.json();
      setAiSuggestions(resp.suggestions || []);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('AI Suggestion failed:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAddSuggestions = async () => {
    if (!aiSuggestions || selectedSuggestions.length === 0) return;

    const toAdd = aiSuggestions.filter((_, i) => selectedSuggestions.includes(i));

    try {
      for (const suggestion of toAdd) {
        const body = JSON.stringify({
          ...suggestion,
          tenant_id: tenantId,
          requirement_configs: suggestion.requirement_configs?.map((obj: any) => obj.id) || [],
        });
        await fetch(`${getApiBaseUrlForLocal()}/api/concepts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body,
        });
      }
      toast.success(`Successfully added ${toAdd.length} concepts`);
      setAiSuggestions(null);
      setSelectedSuggestions([]);
      onRefresh();
    } catch (error) {
      console.error('Failed to save concepts:', error);
      toast.error('Failed to save some concepts');
    }
  };

  const handleSaveConcept = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const conceptData = {
        tenant_id: tenantId,
        name: formData.get('name'),
        pricing_type: formData.get('pricing_type') || undefined,
        minimum_cost: parseFloat(formData.get('minimum_cost') as string) || 0,
        description: formData.get('description'),
        requirement_config_ids: selectedConceptServices,
      };

      const url = editingConcept
        ? `${getApiBaseUrlForLocal()}/api/concepts/${editingConcept.id}`
        : `${getApiBaseUrlForLocal()}/api/concepts`;
      const method = editingConcept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conceptData),
      });

      if (res.ok) {
        toast.success(editingConcept ? 'Concept updated' : 'Concept created');
        handleCloseModal();
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save concept');
      }
    } catch (error) {
      console.error('Save concept error:', error);
      toast.error('Failed to save concept');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConcept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this concept?')) return;

    try {
      const res = await fetch(`${getApiBaseUrlForLocal()}/api/concepts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Concept deleted');
        onRefresh();
      } else {
        toast.error('Failed to delete concept');
      }
    } catch (error) {
      console.error('Delete concept failed:', error);
      toast.error('Failed to delete concept');
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900 p-3 sm:p-8 rounded-xl sm:rounded-3xl shadow-sm border border-[#E5E7EB] dark:border-gray-800 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EEF2FF] dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-[#4F46E5] dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-bold text-[#1F2937] dark:text-gray-100 break-words">
              Concept Management
            </h3>
            <p className="text-[10px] sm:text-sm text-[#6B7280] dark:text-gray-400 break-words mt-0.5">
              Manage event concepts and costs.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={handleAskAi}
            disabled={isAiLoading}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-4 h-4" />}
            Ask AI
          </button>
          <button
            onClick={handleOpenAdd}
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
              className="bg-white dark:bg-gray-900 rounded-2xl sm:rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-4 sm:p-8 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Brain className="w-4 h-4 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 dark:text-gray-100 text-base sm:text-xl">
                      AI-Suggested Concepts
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-gray-400 font-bold uppercase tracking-widest">
                      Based on your requirement config
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAiSuggestions(null)}
                  className="p-1 sm:p-2 hover:bg-slate-50 dark:hover:bg-gray-800 rounded-full text-slate-400"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto space-y-3 sm:space-y-4">
                {aiSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (selectedSuggestions.includes(idx)) {
                        setSelectedSuggestions(selectedSuggestions.filter((s) => s !== idx));
                      } else {
                        setSelectedSuggestions([...selectedSuggestions, idx]);
                      }
                    }}
                    className={cn(
                      'p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 transition-all cursor-pointer group',
                      selectedSuggestions.includes(idx)
                        ? 'border-blue-600 bg-blue-50/10 dark:bg-blue-950/20'
                        : 'border-slate-50 dark:border-gray-800 hover:border-slate-200 dark:hover:border-gray-700'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <h4 className="font-black text-slate-800 dark:text-gray-100 uppercase tracking-tight text-xs sm:text-sm">
                        {suggestion.name}
                      </h4>
                      <div
                        className={cn(
                          'w-4 h-4 sm:w-6 sm:h-6 flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2 rounded-md',
                          selectedSuggestions.includes(idx)
                            ? 'bg-blue-600 border-blue-600 shadow-md'
                            : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-700'
                        )}
                      >
                        {selectedSuggestions.includes(idx) && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white stroke-[3px]" />
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-gray-400 mb-3 sm:mb-4 font-medium line-clamp-2">
                      {suggestion.description}
                    </p>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                      {suggestion.requirement_configs?.map((configObj: { id: string; name?: string }) => {
                        const config = requirementConfigs.find(
                          (c) => c.field_key === configObj.id || c.id === configObj.id
                        );
                        return (
                          <span
                            key={configObj.id}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-[8px] sm:text-[10px] font-bold rounded uppercase tracking-wider"
                          >
                            {config?.label || configObj.name || configObj.id}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Min. Cost:
                      </span>
                      <span className="text-xs sm:text-sm font-black text-blue-600 dark:text-blue-400">
                        ${suggestion.minimum_cost}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 sm:p-8 bg-slate-50 dark:bg-gray-800/50 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={() => setAiSuggestions(null)}
                  className="order-2 sm:order-1 flex-1 py-3 sm:py-4 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-gray-700 transition-all"
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
          <thead className="text-xs text-[#9CA3AF] uppercase bg-[#F9FAFB] dark:bg-gray-800/50">
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
              concepts.map((concept) => (
                <tr
                  key={concept.id}
                  className="border-b border-[#F3F4F6] dark:border-gray-800 hover:bg-[#F9FAFB] dark:hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-4 font-bold text-[#1F2937] dark:text-gray-100">{concept.name}</td>
                  <td className="px-4 py-4">
                    {concept.requirement_configs && concept.requirement_configs.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {concept.requirement_configs.map((config, index) => (
                          <span
                            key={index}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[9px] rounded font-mono border border-gray-200 dark:border-gray-700"
                          >
                            {config.field_key || config.label || config.id}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs italic text-[#9CA3AF]">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[#6B7280] dark:text-gray-300">
                    {concept.minimum_cost ? `$${Number(concept.minimum_cost).toLocaleString()}` : '-'}
                  </td>
                  <td className="px-4 py-4 text-[#6B7280] dark:text-gray-400 max-w-xs truncate">
                    {concept.description || '-'}
                  </td>
                  <td className="px-4 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(concept)}
                      className="p-2 text-[#4F46E5] dark:text-blue-400 hover:bg-[#EEF2FF] dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Edit Concept"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteConcept(concept.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
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

      {/* Mobile Grid View */}
      <div className="md:hidden space-y-3">
        {concepts.length === 0 ? (
          <div className="py-12 text-center text-[#9CA3AF] text-sm">No concepts found.</div>
        ) : (
          concepts.map((concept) => (
            <div
              key={concept.id}
              className="p-3 sm:p-4 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-100 dark:border-gray-700 space-y-3 overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#1F2937] dark:text-gray-100 text-sm break-words">{concept.name}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold mt-1">
                    Min. Cost: ${Number(concept.minimum_cost || 0).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleOpenEdit(concept)}
                    className="p-1.5 sm:p-2 text-[#4F46E5] dark:text-blue-400 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteConcept(concept.id)}
                    className="p-1.5 sm:p-2 text-red-500 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-700 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {concept.description && (
                <p className="text-[10px] text-slate-500 dark:text-gray-400 line-clamp-3 italic break-words">
                  {concept.description}
                </p>
              )}

              {concept.requirement_configs && concept.requirement_configs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {concept.requirement_configs.map((config, index) => (
                    <span
                      key={index}
                      className="px-1.5 py-0.5 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 text-[8px] rounded border border-slate-100 dark:border-gray-700 font-mono break-all max-w-full"
                    >
                      {config.field_key || config.label || config.id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Co-located Add/Edit Concept Modal */}
      <AnimatePresence>
        {isConceptModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseModal}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
            >
              <form onSubmit={handleSaveConcept}>
                <div className="p-6 border-b border-[#F3F4F6] dark:border-gray-800 flex items-center justify-between bg-[#F9FAFB] dark:bg-gray-800/50">
                  <h2 className="text-xl font-bold text-[#1F2937] dark:text-gray-100">
                    {editingConcept ? 'Edit Concept' : 'Add New Concept'}
                  </h2>
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-[#E5E7EB] dark:hover:bg-gray-700 rounded-full"
                  >
                    <X className="w-5 h-5 text-[#6B7280] dark:text-gray-400" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                      Concept Name
                    </label>
                    <input
                      name="name"
                      defaultValue={editingConcept?.name}
                      required
                      className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="e.g. LITE, IMPACT"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                      Minimum Cost
                    </label>
                    <input
                      name="minimum_cost"
                      type="number"
                      step="0.01"
                      defaultValue={editingConcept?.minimum_cost}
                      className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="e.g. 5000.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                      Included Services
                    </label>
                    <div className="space-y-3">
                      <select
                        className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-[#4F46E5]/20 focus:border-[#4F46E5] outline-none transition-all"
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !selectedConceptServices.includes(val)) {
                            setSelectedConceptServices([...selectedConceptServices, val]);
                          }
                          e.target.value = '';
                        }}
                      >
                        <option value="">Add a service...</option>
                        {requirementConfigs
                          .filter((c) => !selectedConceptServices.includes(c.id))
                          .map((config) => (
                            <option key={config.id} value={config.id}>
                              {config.label}
                            </option>
                          ))}
                      </select>

                      <div className="flex flex-wrap gap-2">
                        {selectedConceptServices.length === 0 && (
                          <p className="text-[10px] text-[#9CA3AF] italic">No services selected.</p>
                        )}
                        {selectedConceptServices.map((id) => {
                          const config = requirementConfigs.find((c) => c.id === id);
                          return (
                            <div
                              key={id}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#EEF2FF] dark:bg-blue-900/30 text-[#4F46E5] dark:text-blue-400 rounded-xl text-xs font-bold border border-[#C7D2FE] dark:border-blue-800 shadow-sm"
                            >
                              {config?.label || id}
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedConceptServices(selectedConceptServices.filter((sid) => sid !== id))
                                }
                                className="hover:text-[#4338CA] transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#9CA3AF] mt-2">
                      Select the services that are part of this concept. Pricing will be calculated based on these selections.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                      Description
                    </label>
                    <textarea
                      name="description"
                      defaultValue={editingConcept?.description}
                      className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm h-24 resize-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="Describe the concept..."
                    />
                  </div>
                </div>
                <div className="p-6 bg-[#F9FAFB] dark:bg-gray-800/50 border-t border-[#F3F4F6] dark:border-gray-800 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2.5 border border-[#E5E7EB] dark:border-gray-700 text-[#6B7280] dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {editingConcept ? 'Update Concept' : 'Create Concept'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
