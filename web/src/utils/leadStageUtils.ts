// Utility to extract and count leads per pipeline stage from mockData.js
// Usage: import { getLeadStageCounts } from './leadStageUtils';

interface Lead {
  stage?: string;
  [key: string]: unknown;
}

interface LeadStageCounts {
  total: number;
  [stage: string]: number;
}

export function getLeadStageCounts(leads: Lead[]): LeadStageCounts {
  const stageOrder = [
    'New',
    'Contacted',
    'Qualified',
    'Demo Scheduled',
    'Pending Commitment',
    'In Negotiation',
    'Won'
  ];
  const counts: Record<string, number> = {};
  stageOrder.forEach(stage => {
    counts[stage] = 0;
  });
  for (const lead of leads) {
    if (lead.stage && counts.hasOwnProperty(lead.stage)) {
      counts[lead.stage]++;
    }
  }
  return {
    total: leads.length,
    ...counts
  } as LeadStageCounts;
}

