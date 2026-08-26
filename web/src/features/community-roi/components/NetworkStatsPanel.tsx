'use client';

import React, { useEffect } from 'react';
import { useNetworkStats } from '@lad/frontend-features/community-roi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, TrendingUp, Users, Share2, GitBranch } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Network Stats Panel
 * Displays Community ROI Analytics KPIs
 */
export default function NetworkStatsPanel() {
  const authContext = useAuth();

  const isAuthenticated = authContext?.isAuthenticated ?? false;
  const token = authContext?.token;
  const isEnabled = isAuthenticated && !!token;
  const { data: stats, isLoading, error, refetch } = useNetworkStats(isEnabled);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    // Refetch returns a Promise
    refetch().catch((err: unknown) => {
      console.error(
        '%c[NetworkStatsPanel] ❌ Refetch failed',
        'color: #F44336; font-weight: bold;',
        err
      );
    });
  }, [isAuthenticated, token, isEnabled, refetch]);

  // Log stats changes and validate structure
  useEffect(() => {
    if (stats) {
      // Validate the expected structure
      const hasNetworkBreakdown = stats.networkBreakdown && typeof stats.networkBreakdown === 'object';
      const hasConnectivity = stats.connectivityAnalysis && typeof stats.connectivityAnalysis === 'object';

      if (!hasNetworkBreakdown || !hasConnectivity) {
        console.error('%c[NetworkStatsPanel] ❌ INVALID DATA STRUCTURE', 'color: #F44336; font-weight: bold;', {
          expected: 'networkBreakdown && connectivityAnalysis properties',
          received: stats,
        });
      }
    }

    if (error) {
      console.error('%c[NetworkStatsPanel] ❌ API Error:', 'color: #F44336; font-weight: bold;', {
        message: error instanceof Error ? error.message : String(error),
        error,
      });
    }
  }, [stats, error]);

  const handleManualLoad = () => {
    // Refetch returns a Promise
    refetch().catch((err: unknown) => {
      console.error('[NetworkStatsPanel] Manual refetch failed:', err);
    });
  };

  if (!isAuthenticated || !token) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-orange-600">
            <AlertCircle className="h-4 w-4" />
            <span>Please log in to view network statistics</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading network statistics...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="font-semibold">Error loading network stats</span>
            </div>
            <div className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700">
              <p className="font-mono">{error instanceof Error ? error.message : String(error)}</p>
              <p className="text-xs text-red-600 mt-2">
                Check the browser console for more details. Look for [ApiClient] and [NetworkStatsPanel] logs.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleManualLoad}
                className="px-3 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              >
                🔄 Retry
              </button>
              <button
                onClick={() => {
                  console.warn('[NetworkStatsPanel] Debug info:', {
                    isAuthenticated,
                    hasToken: !!token,
                    tokenLength: token?.length,
                    isLoading,
                    hasError: !!error,
                    hasData: !!stats,
                  });
                }}
                className="px-3 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 font-medium"
              >
                📋 Log Debug Info
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 text-center">
            <div className="text-slate-600 font-semibold">No network data available</div>
            <p className="text-xs text-slate-500">
              The API returned no data. This could mean the query wasn&apos;t executed or returned empty results.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleManualLoad}
                className="px-4 py-2 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
              >
                📊 Load Data
              </button>
              <button
                onClick={() => {
                  console.warn('[NetworkStatsPanel] Full Debug State', {
                    auth: { isAuthenticated, hasToken: !!token },
                    query: { isLoading, hasError: !!error, hasData: !!stats },
                    token: token ? `${token.substring(0, 50)}...` : null,
                  });
                }}
                className="px-4 py-2 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                🔍 Debug
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { networkBreakdown, relationshipStrength, connectivityAnalysis, businessValue } = stats;

  return (
    <div className="space-y-6">
      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {connectivityAnalysis?.memberCount ?? '?'}
            </div>
            <p className="text-xs text-slate-600 mt-1">Active community members</p>
          </CardContent>
        </Card>

        {/* Total Interactions (Meetings) */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-green-600" />
              Interactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {(networkBreakdown?.meetings ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-600 mt-1">One-to-one meetings conducted</p>
          </CardContent>
        </Card>

        {/* Total Referrals */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-purple-600" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-600">
              {(networkBreakdown?.referrals ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-slate-600 mt-1">Referrals exchanged</p>
          </CardContent>
        </Card>

        {/* Network Density */}
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              Network Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">
              {(connectivityAnalysis?.networkDensity ?? 0).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-600 mt-1">Connected member pairs</p>
          </CardContent>
        </Card>
      </div>

      {/* Network Metrics Detail Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📊</span> Network Connectivity Metrics
          </CardTitle>
          <CardDescription>Detailed analysis of network connectivity and interaction patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Average Connections Per Member */}
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <div className="text-xs text-blue-600 uppercase font-semibold">Avg Connections per Member</div>
              <div className="text-3xl font-bold text-blue-900 mt-1">
                {connectivityAnalysis.avgConnectionsPerMember.toFixed(1)}
              </div>
              <div className="text-xs text-blue-700 mt-2">
                Average number of unique members each person has met
              </div>
            </div>

            {/* Total Interactions */}
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <div className="text-xs text-green-600 uppercase font-semibold">Total Interactions</div>
              <div className="text-3xl font-bold text-green-900 mt-1">
                {networkBreakdown.totalInteractions.toLocaleString()}
              </div>
              <div className="text-xs text-green-700 mt-2">
                Meetings ({networkBreakdown.meetings.toLocaleString()}) + Referrals ({networkBreakdown.referrals.toLocaleString()})
              </div>
            </div>

            {/* Network Density */}
            <div className="p-4 bg-purple-50 rounded border border-purple-200">
              <div className="text-xs text-purple-600 uppercase font-semibold">Network Density</div>
              <div className="text-3xl font-bold text-purple-900 mt-1">
                {connectivityAnalysis.networkDensity.toFixed(1)}%
              </div>
              <div className="text-xs text-purple-700 mt-2">
                Percentage of possible connections realized
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📈</span> Community Performance Summary
          </CardTitle>
          <CardDescription>Overview of network performance and engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200">
              <span className="text-sm font-medium text-slate-700">Total Members in Network</span>
              <span className="text-lg font-bold text-slate-900">{connectivityAnalysis.memberCount}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200">
              <span className="text-sm font-medium text-blue-700">One-to-One Meetings</span>
              <span className="text-lg font-bold text-blue-900">{networkBreakdown.meetings.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-50 rounded border border-purple-200">
              <span className="text-sm font-medium text-purple-700">Referrals Exchanged</span>
              <span className="text-lg font-bold text-purple-900">{networkBreakdown.referrals.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
              <span className="text-sm font-medium text-orange-700">Network Connectivity</span>
              <span className="text-lg font-bold text-orange-900">{connectivityAnalysis.avgConnectionsPerMember.toFixed(1)} avg connections/member</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-sm text-slate-600">
            <p>Data updates automatically when new interactions are recorded</p>
            {stats.calculatedAt && (
              <p className="text-xs text-slate-500 mt-1">
                Last calculated: {new Date(stats.calculatedAt).toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
