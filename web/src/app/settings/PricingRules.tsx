import React, { useState } from 'react';
import { Gavel, Plus, Edit2, Trash2, Zap, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PricingRule } from '../../types/pricing_rule';
import { Concept } from '../../types/concept';
import { cn } from '../../lib/utils';
import { RequirementConfig } from './LeadRequirements';

interface PricingRulesProps {
  pricingRules: PricingRule[];
  concepts: Concept[];
  requirementConfigs: RequirementConfig[];
  onSave: (rule: Partial<PricingRule>) => Promise<void>;
  onDelete: (id: string) => void;
}

export const PricingRules: React.FC<PricingRulesProps> = ({
  requirementConfigs, 
  pricingRules,
  concepts,
  onSave,
  onDelete
}) => {
  const [editingRule, setEditingRule] = useState<Partial<PricingRule> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const getConceptName = (id: string) => {
    return concepts.find(c => c.id === id)?.name || 'Unknown';
  };

  const generateDescription = (rule: Partial<PricingRule>) => {
    if (!rule.condition_field || !rule.condition_operator || rule.condition_value === undefined) return "";

    const field = rule.condition_field === 'pax' ? 'people' : rule.condition_field;
    const operator = rule.condition_operator === '>' ? 'greater than' :
      rule.condition_operator === '<' ? 'less than' :
        rule.condition_operator === '>=' ? 'at least' :
          rule.condition_operator === '<=' ? 'at most' : 'equal to';

    const action = rule.action_type === 'discount' ? 'discount' : 'surcharge';
    const value = rule.action_mode === 'percentage' ? `${rule.action_value}%` : `${rule.action_value}$`;
    const target = rule.action_value_type === 'final_price' ? 'final price' : 'base price';

    return `If ${field} is ${operator} ${rule.condition_value}, apply a ${value} ${action} on ${target}.`;
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);

    const ruleData: Partial<PricingRule> = {
      ...editingRule,
      name: formData.get('name') as string,
      concept_id: formData.get('concept_id') as string,
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
    <section className="bg-white p-8 rounded-3xl shadow-sm border border-[#E5E7EB]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center">
            <Gavel className="w-5 h-5 text-[#2563EB]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1F2937]">Rule Builder</h3>
            <p className="text-sm text-[#6B7280]">Create smart pricing logic that automatically adjusts based on volume.</p>
          </div>
        </div>
        <button
          onClick={() => setEditingRule({ is_active: true, priority: pricingRules.length + 1 })}
          className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-semibold text-xs hover:bg-[#1D4ED8] transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      {/* Rules List - Now Full Width and Styled like the image */}
      <div className="space-y-4">
        {pricingRules.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Gavel className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">No rules yet</h3>
            <p className="text-gray-500 mb-6">Start by creating your first pricing rule.</p>
            <button
              onClick={() => setEditingRule({ is_active: true, priority: 1 })}
              className="text-[#2563EB] font-bold text-sm hover:underline"
            >
              Create your first rule
            </button>
          </div>
        ) : (
          pricingRules.sort((a, b) => a.priority - b.priority).map(rule => (
            <div
              key={rule.id}
              className={cn(
                "bg-white rounded-[16px] border border-gray-100 border-l-[4px] p-4 shadow-sm transition-all hover:shadow-md relative group flex flex-col",
                rule.is_active ? "border-l-[#10B981]" : "border-l-gray-300 opacity-75"
              )}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[8px] font-bold rounded-md uppercase tracking-wider">
                    {getConceptName(rule.concept_id)}
                  </span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">
                    P{rule.priority}
                  </span>
                </div>
                <div className="flex items-center gap-1">
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

              <h4 className="text-sm font-bold text-[#1F2937] mb-1">{rule.name}</h4>

              <div className="flex items-center gap-3 mb-1.5">
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[7px] font-bold rounded uppercase">IF</span>
                  <span className="text-[10px] font-medium text-gray-700">
                    {rule.condition_field === 'pax' ? 'people' : rule.condition_field} {rule.condition_operator} {rule.condition_value}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="px-1 py-0.5 bg-gray-50 text-gray-400 text-[7px] font-bold rounded uppercase">THEN</span>
                  <span className={cn(
                    "text-[10px] font-bold uppercase",
                    rule.action_type === 'discount' ? "text-blue-600" : "text-red-600"
                  )}>
                    {rule.action_type} {rule.action_value}{rule.action_mode === 'percentage' ? '%' : '$'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1.5 border-t border-gray-50">
                <p className="text-[9px] italic text-gray-400 font-medium truncate max-w-[85%]">
                  "{generateDescription(rule)}"
                </p>
                <button
                  onClick={() => toggleActive(rule)}
                  className={cn(
                    "relative inline-flex h-4 w-7 items-center rounded-full transition-colors focus:outline-none",
                    rule.is_active ? "bg-[#10B981]" : "bg-gray-200"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform shadow-sm",
                      rule.is_active ? "translate-x-3.5" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Visual Rule Builder Modal */}
      <AnimatePresence>
        {editingRule && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
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
              className="relative w-full max-w-3xl bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-gray-100"
            >
              <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Visual Rule Builder</h3>
                </div>
                <button
                  onClick={() => setEditingRule(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleFormSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[85vh]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Rule Name</label>
                    <input
                      name="name"
                      defaultValue={editingRule.name}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      placeholder="e.g. Volume Discount"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Target Concept</label>
                    <div className="relative">
                      <select
                        name="concept_id"
                        defaultValue={editingRule.concept_id}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none"
                      >
                        <option value="">Select a concept</option>
                        {concepts.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Condition Block */}
                <div className="p-6 bg-gray-50/50 rounded-[24px] border border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold rounded uppercase">IF</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Condition</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="relative">
                      <select
                        name="condition_field"
                        defaultValue={editingRule.condition_field || 'pax'}
                        required
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                      >
                        <option value="">Select Field</option>
                        {requirementConfigs.map(config => (
                          <option key={config.id} value={config.field_key}>
                            {config.label} ({config.field_key})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="relative">
                      <select
                        name="condition_operator"
                        defaultValue={editingRule.condition_operator || '>'}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none"
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
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Action Block */}
                <div className="p-6 bg-gray-50/50 rounded-[24px] border border-gray-100 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-gray-200 text-gray-500 text-[10px] font-bold rounded uppercase">THEN</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="relative">
                      <select
                        name="action_type"
                        defaultValue={editingRule.action_type || 'discount'}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none"
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
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ($)</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                    <input
                      name="action_value"
                      type="number"
                      step="0.01"
                      defaultValue={editingRule.action_value || 0}
                      required
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                      placeholder="Value"
                    />
                    <div className="relative">
                      <select
                        name="action_value_type"
                        defaultValue={editingRule.action_value_type || 'final_price'}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none appearance-none"
                      >
                        <option value="final_price">Final Price</option>
                        <option value="base_price">Base Price</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2 tracking-wider">Priority</label>
                    <input
                      name="priority"
                      type="number"
                      defaultValue={editingRule.priority || 1}
                      className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      name="is_active"
                      id="is_active_form"
                      defaultChecked={editingRule.is_active ?? true}
                      className="w-5 h-5 text-blue-600 rounded-lg border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="is_active_form" className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active</label>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingRule(null)}
                    className="flex-1 py-3.5 border border-gray-200 text-gray-500 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3.5 bg-[#2563EB] text-white rounded-2xl font-bold text-sm hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    {isSaving && <Plus className="w-4 h-4 animate-spin" />}
                    {editingRule.id ? 'Update Rule' : 'Save Rule'}
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
