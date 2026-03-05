// Example usage of CallLogsStatsCards component

'use client';
import React from 'react';
import { useCallLogsStats } from '@lad/frontend-features/call-logs';
import CallLogsStatsCards from '@/components/call-logs/CallLogsStatsCards';

export default function CallLogsPage() {
  // Fetch call logs stats
  const { data: stats, isLoading } = useCallLogsStats();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Call Logs Dashboard</h1>
      
      {/* Stats Cards */}
      <CallLogsStatsCards 
        stats={stats || {
          total_calls: 0,
          ended_calls: 0,
          failed_calls: 0,
          ongoing_calls: 0,
          queued_calls: 0,
          hot_leads: 0,
          cold_leads: 0,
          warm_leads: 0
        }} 
        loading={isLoading} 
      />
      
      {/* Add your call logs table or other components here */}
    </div>
  );
}
