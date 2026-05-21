import React, { useState } from 'react';
import { Gavel, Plus, Edit2, Trash2, Zap, ChevronDown, X, Loader2, Brain, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Concept } from '../../types/concept';
import { PricingRule } from '../../types/pricing_rule';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';

interface PricingRulesProps {
  pricingRules: PricingRule[];
  concepts: Concept[];
  tenantId: string;
  requirementConfigs: { id: string; field_key: string; label: string }[];
  onSave: (rule: Partial<PricingRule>) => Promise<void>;
  onDelete: (id: string) => void;
  afterSave: () => void;
}

export const PricingRules: React.FC<PricingRulesProps> = ({
  pricingRules,
  concepts,
  requirementConfigs,
  tenantId,
  onSave,
  onDelete,
  afterSave
}) => {
  const [editingRule, setEditingRule] = useState<Partial<PricingRule> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[] | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<number[]>([]);
  const handleAddSuggestions = async () => {
    if (!aiSuggestions) return;
    setIsSaving(true);

    const toAdd = aiSuggestions.filter((_, i) => selectedSuggestions.includes(i));

    try {
      for (const suggestion of toAdd) {
        const payload = {
          ...suggestion,
          tenant_id: tenantId,
          is_active: true,
          concept_id: suggestion.target_type === 'package' ? suggestion.condition_field : null,
          requirement_config_id: suggestion.target_type === 'service' ? suggestion.condition_field : null,
          metadata: { ...suggestion, generated_by: 'Gemini AI' }
        };
        await onSave(payload);
      }
      toast.success(`Successfully added ${toAdd.length} rules`);
      setAiSuggestions(null);
      setSelectedSuggestions([]);
      afterSave();
    } catch (error) {
      toast.error('Failed to save rules');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAskAi = async (tenantId: string) => {
    setIsAiLoading(true);
    try {
      const suggestions = await fetch(`${getApiBaseUrlForLocal()}/api/ai-response/suggest-pricing-rule/${tenantId}`);
      const resp = await suggestions.json();
      setAiSuggestions(resp.suggestions);
      setSelectedSuggestions([]);
    } catch (error) {
      console.error('AI Suggestion failed:', error);
      toast.error('Failed to get AI suggestions');
    } finally {
      setIsAiLoading(false);
    }
  };

  const getConceptName = (id: string) => {
    return concepts.find(c => c.id === id)?.name || 'Unknown';
  };

  const getConditionLabel = (rule: Partial<PricingRule> | any) => {
    if (rule.target_type === 'package') {
      return concepts.find(c => c.id === rule.condition_field)?.name || 'Unknown Package';
    }
    const config = requirementConfigs.find(c => c.id === rule.condition_field);
    return config ? config.label : (rule.condition_field === 'pax' ? 'people' : rule.condition_field);
  };

  const generateDescription = (rule: Partial<PricingRule>) => {
    console.log("Target Type:", rule.target_type + " rule : " + rule.name);
    if (!rule.condition_field || !rule.condition_operator || rule.condition_value === undefined) return "";

    const field = getConditionLabel(rule);

    const operator = rule.condition_operator === '>' ? 'greater than' :
        rule.condition_operator === '<' ? 'less than' :
            rule.condition_operator === '>=' ? 'at least' :
                rule.condition_operator === '<=' ? 'at most' : 'equal to';

    const action = rule.action_type === 'discount' ? 'discount' : 'surcharge';
    const value = rule.action_mode === 'percentage' ? `${rule.action_value}%` : `${rule.action_value}$`;
    const target = rule.action_value_type === 'final_price' ? 'extra units' : rule.action_value_type.replace('_', ' ');
    if (rule.target_type == 'package') {
      return `If package is ${field}, apply a ${value} ${action} on ${target}.`;
    }

    return `If ${field} is ${operator} ${rule.condition_value}, apply a ${value} ${action} on ${target}.`;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    console.log("Form Data:", Object.fromEntries(formData.entries()));
    console.log("Editing Rule Before Save:", editingRule);
    const ruleData: Partial<PricingRule> = {
      ...editingRule,
      name: formData.get('name') as string,
      target_type: formData.get('target_type') as 'package' | 'service',
      concept_id: (formData.get('target_type') === 'package')
        ? (formData.get('condition_field') as string)
        : (editingRule.concept_id || concepts[0]?.id),
      requirement_config_id: (formData.get('target_type') === 'service')
        ? (formData.get('condition_field') as string)
        : undefined,
      condition_field: formData.get('condition_field') as string,
      condition_operator: formData.get('condition_operator') as string,
      condition_value: parseFloat(formData.get('condition_value') as string) || 0,
      action_type: formData.get('action_type') as string,
      action_mode: formData.get('action_mode') as string,
      action_value: parseFloat(formData.get('action_value') as string) || 0,
      action_value_type: formData.get('action_value_type') as string,
      priority: parseInt(formData.get('priority') as string) || 1,
      is_active: formData.get('is_active') === 'on'
    };

    await onSave(ruleData);
    setEditingRule(null);
    setIsSaving(false);
  };

  const toggleActive = async (rule: PricingRule) => {
    await onSave({ ...rule, is_active: !rule.is_active });
  };

  return (
      <section className="bg-white p-4 sm:p-8 rounded-xl sm:rounded-3xl shadow-sm border border-[#E5E7EB]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EFF6FF] rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-[#2563EB]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1F2937]">Rule Builder</h3>
              <p className="text-[10px] sm:text-sm text-[#6B7280]">Create smart pricing logic that automatically adjusts based on volume.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
                onClick={() => handleAskAi(tenantId)}
                disabled={isAiLoading}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-slate-900 text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-black transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-4 h-4" />}
              Ask AI
            </button>

            <button
                onClick={() => setEditingRule({ is_active: true, priority: pricingRules.length + 1, target_type: 'service' })}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#2563EB] text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-[#1D4ED8] transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {pricingRules.length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Gavel className="w-6 h-6 sm:w-8 sm:h-8 text-gray-300" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">No rules yet</h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-6">Start by creating your first pricing rule.</p>
                <button
                    onClick={() => setEditingRule({ is_active: true, priority: 1, target_type: 'service' })}
                    className="text-[#2563EB] font-bold text-xs sm:text-sm hover:underline"
                >
                  Create your first rule
                </button>
              </div>
          ) : (
              pricingRules.sort((a, b) => a.priority - b.priority).map(rule => (
                  <div
                      key={rule.id}
                      className={cn(
                          "bg-white rounded-xl border border-gray-100 border-l-[4px] p-3 sm:p-4 shadow-sm transition-all hover:shadow-md relative group flex flex-col",
                          rule.is_active ? "border-l-[#10B981]" : "border-l-gray-300 opacity-75"
                      )}
                  >
                    <div className="flex items-start justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                  <span className="px-1.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[7px] sm:text-[8px] font-bold rounded-md uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
                    {getConceptName(rule.concept_id)}
                  </span>
                        <span className="text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
                    P{rule.priority}
                  </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setEditingRule(rule)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                            onClick={() => onDelete(rule.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[#1F2937] mb-1 truncate">{rule.name}</h4>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 mb-1.5">
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[6px] sm:text-[7px] font-bold rounded uppercase shrink-0">IF</span>
                        <span className="text-[9px] sm:text-[10px] font-medium text-gray-700 truncate max-w-[150px] sm:max-w-none">
                    {rule.target_type === 'package' ? `Package: ${getConditionLabel(rule)}` : `Service: ${getConditionLabel(rule)} ${rule.condition_operator} ${rule.condition_value}`}
                  </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[6px] sm:text-[7px] font-bold rounded uppercase shrink-0">THEN</span>
                        <span className={cn(
                            "text-[9px] sm:text-[10px] font-bold uppercase",
                            rule.action_type === 'discount' ? "text-blue-600" : "text-red-600"
                        )}>
                    {rule.action_type} {rule.action_value}{rule.action_mode === 'percentage' ? '%' : '$'}
                  </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                      <p className="text-[8px] sm:text-[9px] italic text-gray-400 font-medium truncate max-w-[80%]">
                        "{generateDescription(rule)}"
                      </p>
                      <button
                          onClick={() => toggleActive(rule)}
                          className={cn(
                              "relative inline-flex h-3.5 sm:h-4 w-6 sm:w-7 items-center rounded-full transition-colors focus:outline-none",
                              rule.is_active ? "bg-[#10B981]" : "bg-gray-200"
                          )}
                      >
                  <span
                      className={cn(
                          "inline-block h-2 sm:h-2.5 w-2 sm:w-2.5 transform rounded-full bg-white transition-transform shadow-sm",
                          rule.is_active ? "translate-x-3 sm:translate-x-3.5" : "translate-x-0.5"
                      )}
                  />
                      </button>
                    </div>
                  </div>
              ))
          )}
        </div>

        <AnimatePresence>
          {aiSuggestions && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-2xl sm:rounded-[32px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] sm:max-h-[80vh]"
                >
                  <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg sm:rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                        <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-800 text-base sm:text-xl truncate">AI-Suggested Rules</h3>
                        <p className="text-[8px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest truncate">Based on services and concepts</p>
                      </div>
                    </div>
                    <button onClick={() => setAiSuggestions(null)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 shrink-0"><X className="w-5 h-5" /></button>
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
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-black text-slate-800 uppercase tracking-tight text-xs sm:text-sm truncate">{suggestion.name}</h4>
                            <div className={cn(
                                "w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 flex items-center justify-center transition-all duration-200 border-2 rounded-md",
                                selectedSuggestions.includes(idx)
                                    ? "bg-blue-600 border-blue-600 shadow-md"
                                    : "bg-white border-slate-200"
                            )}>
                              {selectedSuggestions.includes(idx) && (
                                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" style={{ strokeWidth: 4 }} />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                            <span className="px-1 py-0.5 bg-gray-100 text-gray-500 text-[8px] sm:text-[10px] font-bold rounded uppercase shrink-0">IF</span>
                            <span className="text-[10px] sm:text-xs font-medium text-gray-700 truncate">
                        {suggestion.target_type === 'package' ? 'Package: ' : ''}
                              {suggestion.condition_name} {suggestion.condition_operator} {suggestion.condition_value}
                      </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="px-1 py-0.5 bg-gray-100 text-gray-500 text-[8px] sm:text-[10px] font-bold rounded uppercase shrink-0">THEN</span>
                            <span className={cn(
                                "text-[10px] sm:text-xs font-bold uppercase",
                                suggestion.action_type === 'discount' ? "text-blue-600" : "text-red-600"
                            )}>
                        {suggestion.action_type} {suggestion.action_value}{suggestion.action_mode === 'percentage' ? '%' : '$'} on {suggestion.action_value_type.replace('_', ' ')}
                      </span>
                          </div>
                        </div>
                    ))}
                  </div>

                  <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex gap-2 sm:gap-4">
                    <button
                        onClick={() => setAiSuggestions(null)}
                        className="flex-1 py-3 sm:py-4 bg-white border border-slate-200 text-slate-700 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-slate-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                        onClick={handleAddSuggestions}
                        disabled={selectedSuggestions.length === 0 || isSaving}
                        className="flex-[2] py-3 sm:py-4 bg-blue-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Add {selectedSuggestions.length} Rules
                    </button>
                  </div>
                </motion.div>
              </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {editingRule && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setEditingRule(null)}
                    className="absolute inset-0 bg-black/20 backdrop-blur-sm"
                />
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="relative w-full max-w-3xl bg-white rounded-2xl sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-gray-100 max-h-[95vh]"
                >
                  <div className="p-4 sm:p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900 text-sm sm:text-base">Visual Rule Builder</h3>
                    </div>
                    <button
                        onClick={() => setEditingRule(null)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  </div>

                  <form onSubmit={handleFormSubmit} className="p-4 sm:p-8 space-y-4 sm:space-y-6 overflow-y-auto">
                    <div className="flex items-center gap-4 sm:gap-6 mb-2">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="target_type"
                            value="service"
                            checked={(editingRule as any).target_type === 'service'}
                            onChange={() => setEditingRule({ ...editingRule, target_type: 'service' })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors", (editingRule as any).target_type === 'service' ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")}>Services</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                            type="radio"
                            name="target_type"
                            value="package"
                            checked={(editingRule as any).target_type === 'package'}
                            onChange={() => setEditingRule({ ...editingRule, target_type: 'package' })}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className={cn("text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors", (editingRule as any).target_type === 'package' ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600")}>Package</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Rule Name</label>
                        <input
                            name="name"
                            defaultValue={editingRule.name}
                            required
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g. Volume Discount"
                        />
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-gray-50/50 rounded-xl sm:rounded-[24px] border border-gray-100 space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[8px] sm:text-[10px] font-bold rounded uppercase">IF</span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition</span>
                      </div>
                      <div className={cn(
                          "grid gap-3",
                          editingRule.target_type === 'package' ? "grid-cols-1" : "grid-cols-3"
                      )}>
                        <div className="relative">
                          {editingRule.target_type === 'package' ? (
                              <select name="condition_field"
                                      required
                                      onChange={(e) => setEditingRule({ ...editingRule, condition_field: e.target.value, concept_id: e.target.value })}
                                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                              >
                                <option value="">Select Concept</option>
                                {concepts.map(c => (
                                    <option key={c.id} value={c.id} selected={c.id == editingRule.concept_id} >
                                      {c.name}
                                    </option>
                                ))}
                              </select>
                          ) : (
                              <select
                                  name="condition_field"
                                  required
                                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                              >
                                <option value="">Select Field</option>
                                {requirementConfigs.map(config => (
                                    <option key={config.id} value={config.id} selected={editingRule.requirement_config_id == config.id}>
                                      {config.label} ({config.field_key})
                                    </option>
                                ))}
                              </select>
                          )}
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>

                        {editingRule.target_type !== 'package' && (
                            <>
                              <div className="relative">
                                <select
                                    name="condition_operator"
                                    defaultValue={editingRule.condition_operator || '>'}
                                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none appearance-none"
                                >
                                  <option value=">">{'>'}</option>
                                  <option value="<">{'<'}</option>
                                  <option value=">=">{'>='}</option>
                                  <option value="<=">{'<='}</option>
                                  <option value="==">{'=='}</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                              </div>
                              <input
                                  name="condition_value"
                                  type="number"
                                  step="0.01"
                                  defaultValue={editingRule.condition_value || 0}
                                  required
                                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none"
                                  placeholder="0"
                              />
                            </>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-6 bg-gray-50/50 rounded-xl sm:rounded-[24px] border border-gray-100 space-y-3 sm:space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[8px] sm:text-[10px] font-bold rounded uppercase">THEN</span>
                        <span className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                        <div className="relative">
                          <select
                              name="action_type"
                              defaultValue={editingRule.action_type || 'discount'}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none appearance-none"
                          >
                            <option value="discount">Discount</option>
                            <option value="markup">Surcharge</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <select
                              name="action_mode"
                              defaultValue={editingRule.action_mode || 'percentage'}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none appearance-none"
                          >
                            <option value="percentage">Percentage (%)</option>
                            <option value="fixed">Fixed Amount ($)</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                          <input
                              name="action_value"
                              type="number"
                              step="0.01"
                              defaultValue={editingRule.action_value || 0}
                              required
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none"
                              placeholder="Value"
                          />
                          {editingRule.target_type === 'package' && editingRule.condition_field && (
                              <div className="absolute -top-5 right-0 text-[7px] sm:text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                                Final Price: <span className="text-blue-600">${concepts.find(c => c.id === editingRule.condition_field)?.minimum_cost || 0}</span>
                              </div>
                          )}
                        </div>
                        <div className="relative">
                          <select
                              name="action_value_type"
                              defaultValue={editingRule.action_value_type || 'final_price'}
                              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none appearance-none"
                          >
                            <option value="final_price">Final Price</option>
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="flex-1 w-full">
                        <label className="block text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Priority</label>
                        <input
                            name="priority"
                            type="number"
                            defaultValue={editingRule.priority || 1}
                            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-1 sm:pt-6">
                        <input
                            type="checkbox"
                            name="is_active"
                            id="is_active_form"
                            defaultChecked={editingRule.is_active ?? true}
                            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                        />
                        <label htmlFor="is_active_form" className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">Active</label>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                      <button
                          type="button"
                          onClick={() => setEditingRule(null)}
                          className="order-2 sm:order-1 flex-1 py-3 border border-gray-200 text-gray-500 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                          type="submit"
                          disabled={isSaving}
                          className="order-1 sm:order-2 flex-1 py-3 bg-[#2563EB] text-white rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {editingRule.id ? 'Update Rule' : 'Save Rule'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
          )}
        </AnimatePresence>
      </section >
  );
};