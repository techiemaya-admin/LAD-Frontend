'use client';
import React, { useState, useMemo } from 'react';
import { Search, DollarSign, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { usePricing } from '@/sdk/features/billing';
import { LoadingSpinner } from '../LoadingSpinner';
interface PricingGroup {
  component: string;
  providers: {
    [provider: string]: {
      models: Array<{
        model: string;
        unit: string;
        costPerUnit: number;
        isActive: boolean;
        effectiveFrom: string | null;
        effectiveUntil: string | null;
      }>;
    };
  };
}
export const PricingCatalog: React.FC = () => {
  const { data: pricing, isLoading, error } = usePricing();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedComponent, setSelectedComponent] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  // Group pricing by component → provider → model
  const groupedPricing = useMemo(() => {
    if (!pricing) return {};
    const groups: { [component: string]: PricingGroup } = {};
    pricing.forEach((item) => {
      const component = item.component_type;
      const provider = item.provider || 'default';
      const model = item.model || 'standard';
      if (!groups[component]) {
        groups[component] = { component, providers: {} };
      }
      if (!groups[component].providers[provider]) {
        groups[component].providers[provider] = { models: [] };
      }
      groups[component].providers[provider].models.push({
        model,
        unit: item.unit,
        costPerUnit: parseFloat(item.cost_per_unit),
        isActive: item.is_active,
        effectiveFrom: item.effective_from,
        effectiveUntil: item.effective_until,
      });
    });
    return groups;
  }, [pricing]);
  // Filter based on search and selections
  const filteredGroups = useMemo(() => {
    if (!groupedPricing) return {};
    const filtered: typeof groupedPricing = {};
    const search = searchTerm.toLowerCase();
    Object.entries(groupedPricing).forEach(([component, group]) => {
      // Component filter
      if (selectedComponent !== 'all' && component !== selectedComponent) return;
      // Search filter (component, provider, or model)
      if (
        search &&
        !component.toLowerCase().includes(search) &&
        !Object.keys(group.providers).some(p => p.toLowerCase().includes(search)) &&
        !Object.values(group.providers).some(p => 
          p.models.some(m => m.model.toLowerCase().includes(search))
        )
      ) {
        return;
      }
      const filteredProviders: typeof group.providers = {};
      Object.entries(group.providers).forEach(([provider, providerData]) => {
        // Provider filter
        if (selectedProvider !== 'all' && provider !== selectedProvider) return;
        const filteredModels = providerData.models.filter(model => {
          // Show inactive only filter
          if (showInactiveOnly) return !model.isActive;
          return true; // Show all by default
        });
        if (filteredModels.length > 0) {
          filteredProviders[provider] = { models: filteredModels };
        }
      });
      if (Object.keys(filteredProviders).length > 0) {
        filtered[component] = { component, providers: filteredProviders };
      }
    });
    return filtered;
  }, [groupedPricing, searchTerm, selectedComponent, selectedProvider, showInactiveOnly]);
  // Get unique components and providers for filters
  const components = useMemo(() => {
    return Object.keys(groupedPricing).sort();
  }, [groupedPricing]);
  const providers = useMemo(() => {
    const providerSet = new Set<string>();
    Object.values(groupedPricing).forEach(group => {
      Object.keys(group.providers).forEach(p => providerSet.add(p));
    });
    return Array.from(providerSet).sort();
  }, [groupedPricing]);
  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  const formatCost = (cost: number, unit: string) => {
    return `$${cost.toFixed(6)} per ${unit}`;
  };
  if (isLoading) {
    return <LoadingSpinner size="md" message="Loading pricing catalog..." />;
  }
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircle className="h-12 w-12 mx-auto text-red-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Pricing</h3>
        <p className="text-gray-600">Unable to retrieve pricing catalog. Please try again.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Pricing Catalog</h2>
          <p className="text-gray-600 mt-1">
            View all pricing for components, providers, and models
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <span className="text-sm text-gray-600">
            {pricing?.length || 0} pricing entries
          </span>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search components, providers, models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {/* Component Filter */}
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Components</option>
            {components.map((comp) => (
              <option key={comp} value={comp}>
                {comp}
              </option>
            ))}
          </select>
          {/* Provider Filter */}
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Providers</option>
            {providers.map((prov) => (
              <option key={prov} value={prov}>
                {prov}
              </option>
            ))}
          </select>
          {/* Show Inactive */}
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showInactiveOnly}
              onChange={(e) => setShowInactiveOnly(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Inactive Only</span>
          </label>
        </div>
      </div>
      {/* Pricing Groups */}
      <div className="space-y-6">
        {Object.keys(filteredGroups).length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pricing Found</h3>
            <p className="text-gray-600">
              Try adjusting your filters or search terms.
            </p>
          </div>
        ) : (
          Object.entries(filteredGroups).map(([component, group]) => (
            <div key={component} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Component Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                <h3 className="text-xl font-bold text-white">{component}</h3>
              </div>
              {/* Providers */}
              <div className="p-6 space-y-6">
                {Object.entries(group.providers).map(([provider, providerData]) => (
                  <div key={provider}>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      {provider}
                    </h4>
                    {/* Models Table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Model
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Unit
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Effective From
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Effective Until
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {providerData.models.map((model, idx) => (
                            <tr key={idx} className={!model.isActive ? 'bg-gray-50' : ''}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {model.isActive ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle className="h-5 w-5" />
                                    <span className="text-sm font-medium">Active</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-gray-400">
                                    <XCircle className="h-5 w-5" />
                                    <span className="text-sm font-medium">Inactive</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-medium text-gray-900">
                                  {model.model}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-600">{model.unit}</span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm font-semibold text-gray-900">
                                  {formatCost(model.costPerUnit, model.unit)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(model.effectiveFrom)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Calendar className="h-4 w-4" />
                                  {formatDate(model.effectiveUntil)}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};