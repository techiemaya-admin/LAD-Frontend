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
  // BASIC DEBUG - IF THIS DOESN'T APPEAR, COMPONENT ISN'T RENDERING AT ALL
  console.log('%c🔴 [NetworkStatsPanel] COMPONENT FUNCTION EXECUTING NOW', 'color: red; font-weight: bold; font-size: 14px;');
  
  let authContext: any;
  try {
    authContext = useAuth();
  } catch (e) {
    console.error('[NetworkStatsPanel] ERROR: useAuth failed. AuthProvider may not be wrapping this component:', e);
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>Auth context error - check component setup</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { isAuthenticated, token } = authContext;
  const isEnabled = isAuthenticated && !!token;
  const { data: stats, isLoading, error, refetch } = useNetworkStats(isEnabled);

  console.log(
    '%c[NetworkStatsPanel] 📍 COMPONENT RENDER',
    'color: #FF00FF; font-weight: bold; font-size: 12px;',
    {
      isAuthenticated,
      isEnabled,
      isLoading,
      hasError: !!error,
      hasStats: !!stats,
      statsType: stats ? typeof stats : 'undefined',
    }
  );

  useEffect(() => {
    console.log(
      '%c[NetworkStatsPanel] Auth/Query State Changed',
      'color: #FF9800; font-weight: bold;',
      {
        isAuthenticated,
        hasToken: !!token,
        isEnabled,
        isLoading,
        hasData: !!stats,
        hasError: !!error,
        timestamp: new Date().toISOString(),
      }
    );

    if (!isEnabled) {
      console.warn('%c[NetworkStatsPanel] ⚠️ Query disabled - not authenticated', 'color: #FF9800;');
      return;
    }

    console.log(
      '%c[NetworkStatsPanel] 🔄 Triggering refetch (auth confirmed)',
      'color: #2196F3; font-weight: bold;'
    );
    
    const result = refetch();
    if (result && 'then' in result) {
      result
        .then(queryResult => {
          console.log(
            '%c[NetworkStatsPanel] ✅ Refetch completed',
            'color: #4CAF50; font-weight: bold;',
            {
              hasData: !!queryResult.data,
              hasError: !!queryResult.error,
              status: queryResult.status || 'unknown',
              dataKeys: queryResult.data ? Object.keys(queryResult.data) : [],
            }
          );
        })
        .catch(err => {
          console.error(
            '%c[NetworkStatsPanel] ❌ Refetch failed',
            'color: #F44336; font-weight: bold;',
            err
          );
        });
    }
  }, [isAuthenticated, token, isEnabled, refetch]);

  // Log stats changes and validate structure
  useEffect(() => {
    console.log('%c[NetworkStatsPanel] Stats/Error Changed', 'color: #9C27B0; font-weight: bold;', {
      hasStats: !!stats,
      hasError: !!error,
      isLoading,
      timestamp: new Date().toISOString(),
    });

    if (stats) {
      console.log('%c[NetworkStatsPanel] ✅ Stats Received:', 'color: #4CAF50; font-weight: bold;');
      console.log('Full stats object:', stats);
      console.log('networkBreakdown:', stats.networkBreakdown);
      console.log('connectivityAnalysis:', stats.connectivityAnalysis);
      console.log('relationshipStrength:', stats.relationshipStrength);
      console.log('businessValue:', stats.businessValue);
      
      // Validate the expected structure
      const hasNetworkBreakdown = stats.networkBreakdown && typeof stats.networkBreakdown === 'object';
      const hasConnectivity = stats.connectivityAnalysis && typeof stats.connectivityAnalysis === 'object';
      const hasRelationship = stats.relationshipStrength && typeof stats.relationshipStrength === 'object';
      const hasBusinessValue = stats.businessValue && typeof stats.businessValue === 'object';
      
      console.log('%c[NetworkStatsPanel] Data Structure Validation:', 'color: #2196F3;', {
        hasNetworkBreakdown,
        hasConnectivity,
        hasRelationship,
        hasBusinessValue,
        statKeys: Object.keys(stats || {}),
        networkBreakdownKeys: Object.keys(stats?.networkBreakdown || {}),
        connectivityKeys: Object.keys(stats?.connectivityAnalysis || {}),
      });
      
      if (!hasNetworkBreakdown || !hasConnectivity) {
        console.error('%c[NetworkStatsPanel] ❌ INVALID DATA STRUCTURE', 'color: #F44336; font-weight: bold;', {
          expected: 'networkBreakdown && connectivityAnalysis properties',
          received: stats,
        });
      } else {
        console.log('%c[NetworkStatsPanel] ✅ DATA STRUCTURE VALID', 'color: #4CAF50; font-weight: bold;', {
          members: stats.connectivityAnalysis?.memberCount,
          meetings: stats.networkBreakdown?.meetings,
          referrals: stats.networkBreakdown?.referrals,
          density: stats.connectivityAnalysis?.networkDensity,
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

  if (!isAuthenticated || !token) {
    console.log('%c[NetworkStatsPanel] 🔐 EARLY RETURN: Not authenticated', 'color: #FFA500;');
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

  const handleManualLoad = () => {
    console.log('[NetworkStatsPanel] 🔄 Manual load triggered');
    console.log('[NetworkStatsPanel] Current state:', {
      isLoading,
      hasError: !!error,
      hasData: !!stats,
    });
    refetch().then(result => {
      console.log('[NetworkStatsPanel] Manual refetch completed:', {
        hasData: !!result.data,
        hasError: !!result.error,
        dataKeys: result.data ? Object.keys(result.data) : [],
      });
    });
  };

  if (isLoading) {
    console.log('%c[NetworkStatsPanel] ⏳ EARLY RETURN: isLoading=true', 'color: #2196F3;');
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
    console.log('%c[NetworkStatsPanel] ❌ EARLY RETURN: error=%s', 'color: #F44336;', error instanceof Error ? error.message : String(error));
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
                  console.log('[NetworkStatsPanel] Debug info:', {
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
    console.log('%c🚫 EARLY RETURN: !stats (data object is null/undefined)', 'color: #FF0000; font-weight: bold; font-size: 12px;');
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3 text-center">
            <div className="text-slate-600 font-semibold">No network data available</div>
            <p className="text-xs text-slate-500">
              The API returned no data. This could mean the query wasn't executed or returned empty results.
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
                  console.group('[NetworkStatsPanel] Full Debug State');
                  console.log('Auth:', { isAuthenticated, hasToken: !!token });
                  console.log('Query:', { isLoading, hasError: !!error, hasData: !!stats });
                  console.log('Token:', token?.substring(0, 50), '...');
                  console.groupEnd();
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

  // DEBUG: Log full stats object structure to understand why values are 0
  console.log('%c[NetworkStatsPanel] 🔍 FULL STATS OBJECT:', 'color: #FF6600; font-weight: bold;', stats);
  console.log('%c[NetworkStatsPanel] networkBreakdown:', 'color: #FF6600;', networkBreakdown);
  console.log('%c[NetworkStatsPanel] connectivityAnalysis:', 'color: #FF6600;', connectivityAnalysis);
  console.log('%c[NetworkStatsPanel] relationshipStrength:', 'color: #FF6600;', relationshipStrength);
  console.log('%c[NetworkStatsPanel] businessValue:', 'color: #FF6600;', businessValue);

  // Log the exact values being rendered
  console.log(
    '%c[NetworkStatsPanel] 🎨 RENDERING WITH VALUES:',
    'color: #FF1493; font-weight: bold; font-size: 14px;',
    {
      memberCount: connectivityAnalysis?.memberCount,
      totalInteractions: networkBreakdown?.meetings,
      referrals: networkBreakdown?.referrals,
      networkDensity: connectivityAnalysis?.networkDensity,
      avgConnections: connectivityAnalysis?.avgConnectionsPerMember,
      avgStrength: relationshipStrength?.avgStrengthScore,
      totalBusinessValue: businessValue?.totalBusinessValue,
    }
  );

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
