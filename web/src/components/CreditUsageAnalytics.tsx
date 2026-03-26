'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, Phone, Search, Brain, Linkedin, BarChart3, Calendar } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-utils';
import { getWalletUsageAnalytics } from '../../../sdk/features/billing/api';
interface FeatureUsage {
  featureName: string;
  totalCredits: number;
  usageCount: number;
  percentage: number;
  icon: string;
}
interface UsageAnalytics {
  totalCreditsUsed: number;
  topFeatures: FeatureUsage[];
  dailyUsage: Array<{
    date: string;
    credits: number;
  }>;
  monthlyTrend: {
    currentMonth: number;
    lastMonth: number;
    percentageChange: number;
  };
}
interface CreditUsageAnalyticsProps {
  timeRange?: '7d' | '30d' | '90d';
}
export const CreditUsageAnalytics: React.FC<CreditUsageAnalyticsProps> = ({
  timeRange = '30d'
}) => {
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRange);
  useEffect(() => {
    fetchAnalytics();
  }, [selectedRange]);
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const data = await getWalletUsageAnalytics({ timeRange: selectedRange });
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setAnalytics({
        totalCreditsUsed: 0,
        topFeatures: [],
        dailyUsage: [],
        monthlyTrend: {
          currentMonth: 0,
          lastMonth: 0,
          percentageChange: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };
  const getFeatureIcon = (icon: string) => {
    switch (icon) {
      case 'phone':
        return <Phone className="h-5 w-5" />;
      case 'search':
        return <Search className="h-5 w-5" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5" />;
      case 'brain':
        return <Brain className="h-5 w-5" />;
      default:
        return <BarChart3 className="h-5 w-5" />;
    }
  };
  const getFeatureColor = (icon: string) => {
    switch (icon) {
      case 'phone':
        return 'bg-blue-100 text-blue-600';
      case 'search':
        return 'bg-orange-100 text-orange-600';
      case 'linkedin':
        return 'bg-green-100 text-green-600';
      case 'brain':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }
  if (!analytics) {
    return null;
  }
  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-gray-900">Credit Usage Analytics</h2>
          <p className="text-gray-600">Track your credit consumption across features</p>
        </div>
        <div className="flex gap-3 justify-between md:justify-end">
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setSelectedRange(range as '7d' | '30d' | '90d')}
              className={`flex-1 md:flex-none p-3 rounded-2xl font-medium transition-all duration-300 border-2 flex flex-col items-center justify-center min-w-[70px] md:min-w-[80px] ${selectedRange === range
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xl shadow-blue-100 scale-105'
                  : 'bg-white text-gray-500 border-gray-100 hover:border-blue-200 hover:bg-blue-50'
                }`}
            >
              <span className="text-[10px] uppercase tracking-widest opacity-80 mb-0.5">Last</span>
              <span className="text-xl font-black leading-none">
                {range === '7d' && '7'}
                {range === '30d' && '30'}
                {range === '90d' && '90'}
              </span>
              <span className="text-[10px] uppercase tracking-widest opacity-80 mt-0.5">days</span>
            </button>
          ))}
        </div>
      </div>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Credits Used */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Total Credits Used</span>
            <BarChart3 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {analytics.totalCreditsUsed.toLocaleString()}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            in the last {selectedRange === '7d' ? '7' : selectedRange === '30d' ? '30' : '90'} days
          </p>
        </div>
        {/* Monthly Trend */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Monthly Trend</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-gray-900">
              {analytics.monthlyTrend.percentageChange > 0 ? '+' : ''}
              {analytics.monthlyTrend.percentageChange.toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            vs last month ({analytics.monthlyTrend.lastMonth.toLocaleString()} credits)
          </p>
        </div>
        {/* Top Feature */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-600">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm font-medium">Most Used Feature</span>
            <Calendar className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-gray-900">
            {analytics.topFeatures[0]?.featureName || 'N/A'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {analytics.topFeatures[0]?.totalCredits.toLocaleString()} credits (
            {analytics.topFeatures[0]?.percentage.toFixed(1)}%)
          </p>
        </div>
      </div>
      {/* Feature Breakdown */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Feature</h3>
        <div className="space-y-4">
          {analytics.topFeatures.map((feature, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getFeatureColor(feature.icon)}`}>
                    {getFeatureIcon(feature.icon)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{feature.featureName}</div>
                    <div className="text-sm text-gray-500">
                      {feature.usageCount.toLocaleString()} uses
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {feature.totalCredits.toLocaleString()} credits
                  </div>
                  <div className="text-sm text-gray-500">{feature.percentage.toFixed(1)}%</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${feature.percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Daily Usage Chart (Simple Text-based for now) */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Usage</h3>
        <div className="grid grid-cols-7 gap-2">
          {analytics.dailyUsage.slice(-7).map((day, index) => {
            const maxCredits = Math.max(...analytics.dailyUsage.map(d => d.credits));
            const heightPercent = (day.credits / maxCredits) * 100;
            return (
              <div key={index} className="text-center">
                <div className="h-32 flex items-end justify-center mb-2">
                  <div
                    className="w-full bg-blue-600 rounded-t-lg transition-all duration-500 hover:bg-blue-700 cursor-pointer relative group"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {day.credits} credits
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Hover over bars to see exact credit usage
        </p>
      </div>
    </div>
  );
};
