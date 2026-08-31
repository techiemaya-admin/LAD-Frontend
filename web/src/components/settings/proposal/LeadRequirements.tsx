'use client';

import React, { useState } from 'react';
import { Settings, Plus, Edit2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { RequirementConfig, PricingModelOption, LeadRequirementsProps } from './types';

export const LeadRequirements: React.FC<LeadRequirementsProps> = ({
  requirementConfigs,
  pricingModels,
  tenantId,
  onRefresh,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<RequirementConfig | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingConfig(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (config: RequirementConfig) => {
    setEditingConfig(config);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingConfig(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const res = await fetchWithTenant(`${getApiBaseUrlForLocal()}/api/lead-requirement-config/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Configuration deleted');
        onRefresh();
      } else {
        toast.error('Failed to delete configuration');
      }
    } catch (error) {
      console.error('Delete configuration failed:', error);
      toast.error('Failed to delete configuration');
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const configData = {
        tenant_id: tenantId,
        field_key: formData.get('field_key'),
        label: formData.get('label'),
        is_active: formData.get('is_active') === 'on',
        base_price: parseFloat(formData.get('base_price') as string) || 0,
        pricing_model_id: formData.get('pricing_model_id'),
      };

      const url = editingConfig
        ? `${getApiBaseUrlForLocal()}/api/lead-requirement-config/${editingConfig.id}`
        : `${getApiBaseUrlForLocal()}/api/lead-requirement-config`;
      const method = editingConfig ? 'PUT' : 'POST';

      const res = await fetchWithTenant(url, {
        method,
        body: JSON.stringify(configData),
      });

      if (res.ok) {
        toast.success(editingConfig ? 'Configuration updated' : 'Configuration created');
        handleCloseModal();
        onRefresh();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.message || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Save configuration error:', error);
      toast.error('Failed to save configuration');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-900 p-3 sm:p-8 rounded-xl sm:rounded-3xl shadow-sm border border-[#E5E7EB] dark:border-gray-800 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#EEF2FF] dark:bg-blue-900/30 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-[#4F46E5] dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-lg font-bold text-[#1F2937] dark:text-gray-100 break-words">
              Lead Requirement Configuration
            </h3>
            <p className="text-[10px] sm:text-sm text-[#6B7280] dark:text-gray-400 break-words mt-0.5">
              Define the dynamic fields that AI should extract from incoming lead emails.
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-[#4F46E5] text-white rounded-xl font-semibold text-[10px] sm:text-xs hover:bg-[#4338CA] transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Field
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-[#9CA3AF] uppercase bg-[#F9FAFB] dark:bg-gray-800/50">
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
            {requirementConfigs.map((config) => (
              <tr key={config.id} className="border-b border-[#F3F4F6] dark:border-gray-800 hover:bg-[#F9FAFB] dark:hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-[#1F2937] dark:text-gray-100">{config.label}</td>
                <td className="px-4 py-3 text-[#6B7280] dark:text-gray-400">{config.field_key}</td>
                <td className="px-4 py-3 text-[#1F2937] dark:text-gray-100 font-bold">
                  ${config.base_price?.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-[#6B7280] dark:text-gray-400">
                  {pricingModels.find((m) => m.id === config.pricing_model_id)?.label || 'Fixed'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold',
                      config.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    )}
                  >
                    {config.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleOpenEdit(config)}
                    className="p-1.5 text-[#4F46E5] dark:text-blue-400 hover:bg-indigo-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
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
        {requirementConfigs.map((config) => (
          <div key={config.id} className="p-3 bg-slate-50 dark:bg-gray-800/60 rounded-xl border border-slate-100 dark:border-gray-700 space-y-3 overflow-hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-[#1F2937] dark:text-gray-100 text-sm break-words">{config.label}</p>
                <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1 font-mono">{config.field_key}</p>
              </div>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0',
                  config.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                )}
              >
                {config.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-100 dark:border-gray-700 shadow-sm">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Price</p>
                <p className="text-xs font-bold text-[#10B981]">${config.base_price?.toLocaleString()}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 p-2 rounded-lg border border-slate-100 dark:border-gray-700 shadow-sm">
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Model</p>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                  {pricingModels.find((m) => m.id === config.pricing_model_id)?.label || 'Fixed'}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenEdit(config)}
                className="flex-1 py-2 px-3 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 font-bold text-[10px] rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-gray-800 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button
                onClick={() => handleDelete(config.id)}
                className="p-2 bg-red-50 dark:bg-red-950/40 text-red-500 rounded-lg border border-red-100 dark:border-red-900/50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Co-located Add/Edit Config Modal */}
      <AnimatePresence>
        {isModalOpen && (
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
              <form onSubmit={handleSave}>
                <div className="p-6 border-b border-[#F3F4F6] dark:border-gray-800 flex items-center justify-between bg-[#F9FAFB] dark:bg-gray-800/50">
                  <h2 className="text-xl font-bold text-[#1F2937] dark:text-gray-100">
                    {editingConfig ? 'Edit Field' : 'Add New Field'}
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
                      Label
                    </label>
                    <input
                      name="label"
                      defaultValue={editingConfig?.label}
                      required
                      className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="e.g. Number of Guests"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                      Field Key
                    </label>
                    <input
                      name="field_key"
                      defaultValue={editingConfig?.field_key}
                      required
                      className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      placeholder="e.g. pax"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                        Base Price
                      </label>
                      <input
                        name="base_price"
                        type="number"
                        step="0.01"
                        defaultValue={editingConfig?.base_price}
                        className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#6B7280] dark:text-gray-400 uppercase mb-1">
                        Pricing Model
                      </label>
                      <select
                        name="pricing_model_id"
                        defaultValue={editingConfig?.pricing_model_id}
                        className="w-full p-2 border border-[#E5E7EB] dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                      >
                        {pricingModels.map((pm) => (
                          <option key={pm.id || pm.value} value={pm.id}>
                            {pm.value} ({pm.label})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-[#4B5563] dark:text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={editingConfig?.is_active ?? true}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />{' '}
                      Active
                    </label>
                  </div>
                </div>
                <div className="p-6 bg-[#F9FAFB] dark:bg-gray-800/50 border-t border-[#F3F4F6] dark:border-gray-800 flex gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 py-2 text-sm font-bold text-[#4B5563] dark:text-gray-300 bg-white dark:bg-gray-800 border border-[#E5E7EB] dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {editingConfig ? 'Save Changes' : 'Create Field'}
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
