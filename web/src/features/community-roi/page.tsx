'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MembersTestPanel from './components/MembersTestPanel';
import InteractionsTestPanel from './components/InteractionsTestPanel';
import RelationshipsTestPanel from './components/RelationshipsTestPanel';
import SimpleAnalyticsCards from './components/SimpleAnalyticsCards';
import ContributionReport from './components/ContributionReport';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Community ROI Page - UPDATED VERSION WITH NEW ANALYTICS
 * 
 * Shows Community Performance KPIs first, then detailed management tools
 * LAST MODIFIED: 2026-02-17 17:05 - Added SimpleAnalyticsCards component
 */
export default function CommunityROIPage() {
  const [activeTab, setActiveTab] = useState('members');
  const { isAuthenticated, token, user } = useAuth();
  const [showDebug, setShowDebug] = useState(true);

  console.log('🔵🔵🔵 [CommunityROIPage] PAGE IS RENDERING NOW! 🔵🔵🔵');
  console.log('[CommunityROIPage] Auth state:', { isAuthenticated, hasToken: !!token });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      {/* Debug Panel */}
      {showDebug && (
        <div className="fixed top-4 right-4 bg-white border-2 border-blue-500 shadow-lg p-3 rounded max-w-sm z-50 text-xs font-mono">
          <button 
            onClick={() => setShowDebug(false)}
            className="absolute top-1 right-1 text-gray-600 hover:text-black text-lg"
          >
            ✕
          </button>
          <div className="mb-2 font-bold text-blue-600">Debug Info</div>
          <div className="space-y-1 text-gray-700">
            <div>Authenticated: <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
              {isAuthenticated ? '✓ YES' : '✗ NO'}
            </span></div>
            <div>Token: <span className={token ? 'text-green-600' : 'text-red-600'}>
              {token ? `${token.substring(0, 20)}...` : 'NONE'}
            </span></div>
            <div>User: {user?.email || 'Not loaded'}</div>
            <div className="text-xs text-gray-500 mt-2">
              Open DevTools Console (F12) and look for colored [ApiClient] and [NetworkStatsPanel] logs
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* VISIBLE PROOF THIS IS THE NEW VERSION */}
        <div className="mb-4 bg-yellow-400 border-4 border-yellow-600 p-4 text-center">
          <h2 className="text-3xl font-black text-yellow-900">
            ⚡ NEW UPDATED PAGE - VERSION 2.0 ⚡
          </h2>
          <p className="text-yellow-800 font-bold mt-2">
            If you see this yellow banner, the page HAS updated! Look below for analytics cards.
          </p>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Community ROI
          </h1>
          <p className="text-lg text-slate-600">
            Network performance analytics and member management
          </p>
        </div>

        {/* Community Performance Section - MAIN DISPLAY */}
        <div className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">📊 Community Performance Metrics</h2>
            <SimpleAnalyticsCards />
          </div>
        </div>

        {/* Contribution Report Section */}
        <div className="mb-12">
          <ContributionReport />
        </div>

        {/* Management Tools Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="bg-white rounded-lg shadow-lg p-6">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="members" className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <span>Members</span>
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2">
              <span className="text-lg">🤝</span>
              <span>Interactions</span>
            </TabsTrigger>
            <TabsTrigger value="relationships" className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <span>Relationships</span>
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="space-y-6">
            <div className="border-l-4 border-blue-500 pl-4 py-2">
              <h2 className="text-xl font-bold text-slate-900">Members Management</h2>
              <p className="text-sm text-slate-600 mt-1">
                Create, list, search, and manage community members
              </p>
            </div>
            <MembersTestPanel />
          </TabsContent>

          {/* Interactions Tab */}
          <TabsContent value="interactions" className="space-y-6">
            <div className="border-l-4 border-purple-500 pl-4 py-2">
              <h2 className="text-xl font-bold text-slate-900">Interactions & Referrals</h2>
              <p className="text-sm text-slate-600 mt-1">
                Log meetings, referrals, and view interaction history
              </p>
            </div>
            <InteractionsTestPanel />
          </TabsContent>

          {/* Relationships Tab */}
          <TabsContent value="relationships" className="space-y-6">
            <div className="border-l-4 border-orange-500 pl-4 py-2">
              <h2 className="text-xl font-bold text-slate-900">Relationship Analysis</h2>
              <p className="text-sm text-slate-600 mt-1">
                View relationship scores, recommendations, and engagement metrics
              </p>
            </div>
            <RelationshipsTestPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
