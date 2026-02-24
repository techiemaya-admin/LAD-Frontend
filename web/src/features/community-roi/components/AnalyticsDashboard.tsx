'use client';

import React from 'react';
import { useNetworkStats } from '@lad/frontend-features/community-roi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Users, MessageSquare, GitBranch, Network } from 'lucide-react';

export default function AnalyticsDashboard() {
  // Get data from the hook
  const { data, isLoading, error } = useNetworkStats(true);

  console.log('🔵 [AnalyticsDashboard] RENDERING', { 
    hasData: !!data, 
    isLoading, 
    hasError: !!error 
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-lg">Loading analytics...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <h3 className="text-red-800 font-bold text-lg">Error Loading Data</h3>
        <p className="text-red-600 mt-2">{String(error)}</p>
      </div>
    );
  }

  // Show no data state
  if (!data) {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded">
        <h3 className="text-yellow-800 font-bold text-lg">No Data Available</h3>
        <p className="text-yellow-600 mt-2">The API returned no analytics data.</p>
      </div>
    );
  }

  // Log the actual data structure we received
  console.log('🟢 [AnalyticsDashboard] DATA RECEIVED:', data);
  console.log('🟢 [AnalyticsDashboard] Data keys:', Object.keys(data));
  
  if (data.networkBreakdown) {
    console.log('🟢 [AnalyticsDashboard] networkBreakdown:', data.networkBreakdown);
    console.log('🟢 [AnalyticsDashboard] networkBreakdown keys:', Object.keys(data.networkBreakdown));
  }
  
  if (data.connectivityAnalysis) {
    console.log('🟢 [AnalyticsDashboard] connectivityAnalysis:', data.connectivityAnalysis);
    console.log('🟢 [AnalyticsDashboard] connectivityAnalysis keys:', Object.keys(data.connectivityAnalysis));
  }

  // Extract values with multiple fallback attempts
  const members = data.connectivityAnalysis?.memberCount 
    || data.connectivityAnalysis?.members 
    || data.connectivityAnalysis?.totalMembers
    || data.members
    || 0;

  const meetings = data.networkBreakdown?.meetings 
    || data.networkBreakdown?.totalMeetings
    || data.meetings
    || 0;

  const referrals = data.networkBreakdown?.referrals 
    || data.networkBreakdown?.totalReferrals
    || data.referrals
    || 0;

  const density = data.connectivityAnalysis?.networkDensity 
    || data.connectivityAnalysis?.density
    || data.density
    || 0;

  console.log('🟡 [AnalyticsDashboard] EXTRACTED VALUES:', {
    members,
    meetings,
    referrals,
    density
  });

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Community Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">Real-time insights into your community network</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Members Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Total Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-900">{members}</div>
            <p className="text-xs text-blue-600 mt-2">Active community members</p>
          </CardContent>
        </Card>

        {/* Meetings Card */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Meetings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-900">{meetings.toLocaleString()}</div>
            <p className="text-xs text-green-600 mt-2">One-to-one interactions</p>
          </CardContent>
        </Card>

        {/* Referrals Card */}
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-purple-900">{referrals.toLocaleString()}</div>
            <p className="text-xs text-purple-600 mt-2">Business referrals exchanged</p>
          </CardContent>
        </Card>

        {/* Network Density Card */}
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
              <Network className="h-5 w-5" />
              Network Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-900">{density.toFixed(1)}%</div>
            <p className="text-xs text-orange-600 mt-2">Connection strength</p>
          </CardContent>
        </Card>
      </div>

      {/* Debug Info Card - Remove this once working */}
      <Card className="bg-gray-50 border-gray-300">
        <CardHeader>
          <CardTitle className="text-sm">🔍 Debug Information (Check Console for Full Details)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-600">Has Data:</span>
              <span className="font-bold">{data ? '✅ YES' : '❌ NO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Has networkBreakdown:</span>
              <span className="font-bold">{data?.networkBreakdown ? '✅ YES' : '❌ NO'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Has connectivityAnalysis:</span>
              <span className="font-bold">{data?.connectivityAnalysis ? '✅ YES' : '❌ NO'}</span>
            </div>
            <div className="mt-4 p-3 bg-white rounded border border-gray-200">
              <p className="text-gray-700 font-semibold mb-2">Raw Data Structure:</p>
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
