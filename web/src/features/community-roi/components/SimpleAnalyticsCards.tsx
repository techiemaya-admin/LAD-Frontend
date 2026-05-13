'use client';

import React from 'react';
import { useNetworkStats } from '@lad/frontend-features/community-roi';

/**
 * Simple Analytics Cards - can be embedded anywhere
 */
export default function SimpleAnalyticsCards() {
  const { data, isLoading, error } = useNetworkStats(true);

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: '#172461' }}></div>
        <p className="text-gray-600 mt-2">Loading analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 font-semibold">Unable to load analytics data</p>
        <p className="text-red-500 text-sm mt-2">{String(error)}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center p-8 bg-orange-50 border border-orange-200 rounded-lg">
        <p className="text-orange-600 font-semibold">No analytics data available</p>
      </div>
    );
  }

  // Extract values from nested data structure
  const members = data.connectivityAnalysis?.memberCount || 0;
  const meetings = data.networkBreakdown?.meetings || 0;
  const referrals = data.networkBreakdown?.referrals || 0;
  const density = data.connectivityAnalysis?.networkDensity || 0;

  // New KPIs
  const avgConnectionsPerMember = data.connectivityAnalysis?.avgConnectionsPerMember || 0;
  const avgRelationshipScore = data.relationshipStrength?.avgStrengthScore || 0;
  const totalBusinessValue = data.businessValue?.totalBusinessValue || 0;
  const avgReferralValue = data.businessValue?.avgReferralValue || 0;
  
  // Last refresh date
  const refreshedAt = data.calculatedAt ? new Date(data.calculatedAt).toLocaleString() : 'Unknown';

  return (
    <div className="space-y-4">
      {/* Header with Last Refreshed */}
      <div className="px-4 pt-4">
        <h2 className="text-lg font-semibold text-gray-800">Network Analytics</h2>
        <p className="text-sm text-gray-500">Last refreshed: {refreshedAt}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
        {/* Members - REAL DATA with custom blue #172461 */}
        <div className="rounded-lg p-6 text-center" style={{ backgroundColor: '#f0f2ff', border: '2px solid #172461' }}>
          <div className="text-5xl font-bold" style={{ color: '#172461' }}>{members}</div>
          <div className="text-sm mt-2 font-medium" style={{ color: '#172461' }}>Members</div>
          <div className="text-xs mt-1" style={{ color: '#172461', opacity: 0.7 }}>Active community members</div>
        </div>

        {/* Meetings - REAL DATA */}
        <div className="bg-green-100 border-2 border-green-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-green-900">{meetings.toLocaleString()}</div>
          <div className="text-sm text-green-700 mt-2 font-medium">Meetings</div>
          <div className="text-xs text-green-600 mt-1">One-to-one interactions</div>
        </div>

        {/* Referrals - REAL DATA */}
        <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-purple-900">{referrals.toLocaleString()}</div>
          <div className="text-sm text-purple-700 mt-2 font-medium">Referrals</div>
          <div className="text-xs text-purple-600 mt-1">Business referrals exchanged</div>
        </div>

        {/* Total Business Value */}
        <div className="bg-indigo-100 border-2 border-indigo-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-indigo-900">${totalBusinessValue.toLocaleString()}</div>
          <div className="text-sm text-indigo-700 mt-2 font-medium">Business Value</div>
          <div className="text-xs text-indigo-600 mt-1">Total value generated</div>
        </div>

        {/* Avg Connections Per Member */}
        <div className="bg-blue-100 border-2 border-blue-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-blue-900">{avgConnectionsPerMember.toFixed(1)}</div>
          <div className="text-sm text-blue-700 mt-2 font-medium">Avg Connections</div>
          <div className="text-xs text-blue-600 mt-1">Per member</div>
        </div>

        {/* Avg Relationship Score */}
        <div className="bg-teal-100 border-2 border-teal-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-teal-900">{avgRelationshipScore.toFixed(2)}</div>
          <div className="text-sm text-teal-700 mt-2 font-medium">Relationship Score</div>
          <div className="text-xs text-teal-600 mt-1">Average strength</div>
        </div>

        {/* Density - REAL DATA */}
        <div className="bg-orange-100 border-2 border-orange-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-orange-900">{density.toFixed(1)}%</div>
          <div className="text-sm text-orange-700 mt-2 font-medium">Network Density</div>
          <div className="text-xs text-orange-600 mt-1">Connection strength</div>
        </div>

        {/* Avg Referral Value */}
        <div className="bg-rose-100 border-2 border-rose-300 rounded-lg p-6 text-center">
          <div className="text-5xl font-bold text-rose-900">${avgReferralValue.toLocaleString()}</div>
          <div className="text-sm text-rose-700 mt-2 font-medium">Avg Referral Value</div>
          <div className="text-xs text-rose-600 mt-1">Per referral average</div>
        </div>
      </div>
    </div>
  );
}

