'use client';
import React, { useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Calendar, Filter, DollarSign } from 'lucide-react';
import { useUsage, useUsageAggregation } from '@/sdk/features/billing';
import { LoadingSpinner } from '../LoadingSpinner';
type GroupBy = 'feature' | 'component' | 'provider' | 'model';
type TimeRange = '7d' | '30d' | '90d';
export const UsageBreakdown: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('component');
  const [selectedFeature, setSelectedFeature] = useState<string>('all');
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const daysMap = { '7d': 7, '30d': 30, '90d': 90 };
    const days = daysMap[timeRange];
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    };
  }, [timeRange]);
  // Fetch aggregated usage for charts and totals
  const { data: aggregation, isLoading: loadingAgg } = useUsageAggregation({
    startDate,
    endDate,
    groupBy,
    featureKey: selectedFeature !== 'all' ? selectedFeature : undefined,
  });
  // Fetch detailed usage for row-level breakdown
  const { data: usageData, isLoading: loadingUsage } = useUsage({
    startDate,
    endDate,
    featureKey: selectedFeature !== 'all' ? selectedFeature : undefined,
    limit: 100,
  });
  const isLoading = loadingAgg || loadingUsage;
  // Extract unique features for filter
  const features = useMemo(() => {
    if (!usageData?.events) return [];
    const featureSet = new Set(usageData.events.map((e) => e.feature_key));
    return Array.from(featureSet).sort();
  }, [usageData]);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount);
  };
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  if (isLoading) {
    return <LoadingSpinner size="md" message="Loading usage breakdown..." />;
  }
  const totalCost = aggregation?.total || 0;
  const groups = aggregation?.groups || [];
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usage Breakdown</h2>
          <p className="text-gray-600 mt-1">
            Analyze your credit spending across features and components
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-blue-600" />
          <span className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</span>
        </div>
      </div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Time Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Range
            </label>
            <div className="flex gap-2">
              {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors text-sm ${
                    timeRange === range
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === '7d' && '7 days'}
                  {range === '30d' && '30 days'}
                  {range === '90d' && '90 days'}
                </button>
              ))}
            </div>
          </div>
          {/* Group By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Group By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="feature">Feature</option>
              <option value="component">Component Type</option>
              <option value="provider">Provider</option>
              <option value="model">Model</option>
            </select>
          </div>
          {/* Feature Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feature
            </label>
            <select
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Features</option>
              {features.map((feature) => (
                <option key={feature} value={feature}>
                  {feature}
                </option>
              ))}
            </select>
          </div>
          {/* Stats Summary */}
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <div className="font-medium">Total Events</div>
              <div className="text-2xl font-bold text-gray-900">
                {usageData?.total || 0}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Aggregated Groups */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          Aggregated by {groupBy}
        </h3>
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <TrendingUp className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No usage data for selected period</p>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="font-medium text-gray-900">{group.groupValue}</div>
                    <div className="text-sm text-gray-500">{group.count} events</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {formatCurrency(group.totalCost)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {group.percentage?.toFixed(1)}% of total
                    </div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${group.percentage || 0}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Detailed Events */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Recent Usage Events
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Feature
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Component
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(usageData?.events || []).slice(0, 50).map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(event.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.feature_key}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.component_type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.provider || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.model || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.quantity} {event.unit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(parseFloat(event.cost))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {usageData?.events && usageData.events.length > 50 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Showing 50 of {usageData.total} events.{' '}
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Load more
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};