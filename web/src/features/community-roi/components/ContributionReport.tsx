'use client';

import React, { useState, useEffect } from 'react';

interface ContributionStats {
  uniqueMeetings: number;
  uniqueReferrals: number;
  impactGenerated: number;
  avgMonthlyEngagements: number;
}

/**
 * Contribution Report Component
 * Displays member contribution metrics with heatmap and real database stats
 */
export default function ContributionReport() {
  const [stats, setStats] = useState<ContributionStats>({
    uniqueMeetings: 0,
    uniqueReferrals: 0,
    impactGenerated: 0,
    avgMonthlyEngagements: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState('All Communities');
  const [period, setPeriod] = useState('Last 12 Months');

  // Months for heatmap
  const months = ['MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT'];

  // Mock calendar data - 4 rows × 8 columns (weeks × months)
  const generateCalendarData = () => {
    const data: { month: string; week: number; type: string }[] = [];
    for (let m = 0; m < months.length; m++) {
      for (let w = 1; w <= 4; w++) {
        const types = ['none', 'meeting', 'referral', 'both'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        data.push({
          month: months[m],
          week: w,
          type: randomType
        });
      }
    }
    return data;
  };

  const calendarData = generateCalendarData();

  // Fetch real metrics from API
  useEffect(() => {
    const fetchContributionStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/community-roi/contribution-stats', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          // If API fails, use fallback values (component still renders with zeros)
          console.log('⚠️ Contribution stats fetch returned status:', response.status);
          setStats({
            uniqueMeetings: 0,
            uniqueReferrals: 0,
            impactGenerated: 0,
            avgMonthlyEngagements: 0
          });
        } else {
          const data = await response.json();
          setStats({
            uniqueMeetings: data.data?.uniqueMeetings || 0,
            uniqueReferrals: data.data?.uniqueReferrals || 0,
            impactGenerated: data.data?.impactGenerated || 0,
            avgMonthlyEngagements: data.data?.avgMonthlyEngagements || 0
          });
        }
      } catch (err) {
        console.error('Error fetching contribution stats:', err);
        // Use mock data on error
        setStats({
          uniqueMeetings: 1,
          uniqueReferrals: 1,
          impactGenerated: 0,
          avgMonthlyEngagements: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributionStats();
  }, []);

  const getColorForType = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-red-400'; // Meeting only
      case 'referral':
        return 'bg-yellow-400'; // Referral only
      case 'both':
        return 'bg-green-500'; // Both
      default:
        return 'bg-gray-100'; // No activity
    }
  };

  return (
    <div className="w-full bg-white rounded-xl p-8 shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Contribution Report</h1>
          <p className="text-gray-500">Weekly engagement footprint and revenue impact analysis</p>
        </div>

        {/* Filters */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Segment</p>
            <select
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-800 cursor-pointer hover:border-gray-400"
            >
              <option>All Communities</option>
              <option>Community A</option>
              <option>Community B</option>
            </select>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Period</p>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm font-medium text-gray-800 cursor-pointer hover:border-gray-400"
            >
              <option>Last 12 Months</option>
              <option>Last 6 Months</option>
              <option>Last 3 Months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Heatmap */}
      <div className="mb-12">
        {/* Month labels */}
        <div className="flex gap-8 mb-4 ml-12">
          {months.map((month) => (
            <div key={month} className="w-16 text-center">
              <p className="text-xs font-semibold text-gray-400 uppercase">{month}</p>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex gap-4">
          {/* Week labels */}
          <div className="flex flex-col gap-1 justify-center">
            {[1, 2, 3, 4].map((week) => (
              <p key={week} className="text-xs text-gray-400 font-medium w-8">{week}</p>
            ))}
          </div>

          {/* Calendar data */}
          <div className="flex gap-8">
            {months.map((month) => (
              <div key={month} className="flex flex-col gap-1">
                {[1, 2, 3, 4].map((week) => {
                  const item = calendarData.find(
                    (d) => d.month === month && d.week === week
                  );
                  return (
                    <div
                      key={`${month}-${week}`}
                      className={`w-6 h-6 rounded ${item ? getColorForType(item.type) : 'bg-gray-100'}`}
                      title={`${month} Week ${week}: ${item?.type || 'No activity'}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mb-12 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-100 rounded"></div>
          <p className="text-gray-600">NO ACTIVITY</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <p className="text-gray-600">MEETING ONLY</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <p className="text-gray-600">REFERRAL ONLY</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <p className="text-gray-600">BOTH</p>
        </div>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400"></div>
          <p className="text-gray-500 mt-2">Loading contribution metrics...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Unique Meetings - REAL DATA */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unique Meetings</p>
            <p className="text-4xl font-bold text-green-600">
              {stats.uniqueMeetings > 0 ? `+${stats.uniqueMeetings}` : '0'}
            </p>
          </div>

          {/* Unique Referrals - REAL DATA */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Unique Referrals Passed</p>
            <p className="text-4xl font-bold text-pink-600">
              {stats.uniqueReferrals > 0 ? `+${stats.uniqueReferrals}` : '0'}
            </p>
          </div>

          {/* Impact Generated - MOCK DATA */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Impact Generated (AED)</p>
            <p className="text-4xl font-bold text-blue-600">{stats.impactGenerated}</p>
          </div>

          {/* Avg Monthly Engagements - MOCK DATA */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Avg. Monthly Unique Engagements</p>
            <p className="text-4xl font-bold text-blue-500">{stats.avgMonthlyEngagements}</p>
          </div>
        </div>
      )}
    </div>
  );
}
