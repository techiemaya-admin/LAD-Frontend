#!/usr/bin/env node

/**
 * Campaign Steps Testing Script
 * Tests LinkedIn campaign steps via HTTP API
 * 
 * Usage: node test-campaign-steps-api.js
 * 
 * Requirements:
 * 1. Backend server running on http://localhost:3001
 * 2. Existing campaign created
 * 3. Campaign has LinkedIn leads
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TENANT_ID = '1ead8e68-2375-43bd-91c9-555df2521dec';
const AUTH_TOKEN = 'test-token';

const logger = {
  section: (title) => {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log(`║  ${title.padEnd(57)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  },
  info: (msg, data) => {
    console.log(`ℹ️  ${msg}`);
    if (data) console.log(`    ${JSON.stringify(data).substring(0, 100)}`);
  },
  success: (msg, data) => {
    console.log(`✅ ${msg}`);
    if (data) console.log(`    ${JSON.stringify(data).substring(0, 100)}`);
  },
  error: (msg, data) => {
    console.log(`❌ ${msg}`);
    if (data) console.log(`    ${JSON.stringify(data).substring(0, 200)}`);
  },
  warn: (msg) => console.log(`⚠️  ${msg}`)
};

const request = (method, endpoint, data = null) => {
  return axios({
    method,
    url: `${API_BASE}${endpoint}`,
    data,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
      'Authorization': `Bearer ${AUTH_TOKEN}`
    }
  });
};

async function testCampaignSteps() {
  try {
    logger.section('Campaign Steps - Integration Test');

    // Step 1: Get campaigns
    console.log('📋 Fetching existing campaigns...\n');
    let campaignId, campaignData;
    
    try {
      const response = await request('GET', '/campaigns?limit=5&status=running');
      if (response.data.data && response.data.data.length > 0) {
        const campaign = response.data.data[0];
        campaignId = campaign.id;
        campaignData = campaign;
        logger.success('Found campaign', {
          id: campaign.id,
          name: campaign.name,
          status: campaign.status
        });
      } else {
        logger.warn('No running campaigns found. Using default test campaign ID.');
        // For testing, we'll use a known campaign from the conversation summary
        campaignId = 'test-campaign-id';
      }
    } catch (e) {
      logger.error('Failed to fetch campaigns', e.response?.data || e.message);
      return;
    }

    // Step 2: Get campaign details
    console.log('\n📋 Fetching campaign details and steps...\n');
    try {
      const response = await request('GET', `/campaigns/${campaignId}`);
      campaignData = response.data.data;
      
      logger.success('Campaign Details:', {
        id: campaignData.id,
        name: campaignData.name,
        status: campaignData.status,
        steps: campaignData.steps ? campaignData.steps.length : 0
      });

      if (campaignData.steps && campaignData.steps.length > 0) {
        console.log('\n   Campaign Steps:');
        campaignData.steps.forEach((step, idx) => {
          console.log(`   ${idx + 1}. ${step.type}: "${step.title}"`);
          if (step.config) {
            console.log(`      Config: ${JSON.stringify(step.config).substring(0, 80)}`);
          }
        });
      }
    } catch (e) {
      logger.error('Failed to fetch campaign details', e.response?.data?.error || e.message);
    }

    // Step 3: Get campaign leads
    console.log('\n📋 Fetching campaign leads...\n');
    let campaignLeads = [];
    try {
      const response = await request('GET', `/campaigns/${campaignId}/leads?limit=5`);
      campaignLeads = response.data.data || [];
      
      logger.success(`Found ${campaignLeads.length} leads in campaign`);
      campaignLeads.forEach((lead, idx) => {
        console.log(`   ${idx + 1}. Lead: ${lead.lead_id}`);
        console.log(`      Status: ${lead.status || 'pending'}`);
      });
    } catch (e) {
      logger.error('Failed to fetch campaign leads', e.response?.data?.error || e.message);
    }

    // Step 4: Get campaign activities
    console.log('\n📊 Fetching campaign activity log...\n');
    try {
      const response = await request('GET', `/campaigns/${campaignId}/activities?limit=10`);
      const activities = response.data.data || [];
      
      if (activities.length === 0) {
        logger.info('No activities recorded yet for this campaign');
      } else {
        logger.success(`Found ${activities.length} recent activities`);
        
        // Group by action type
        const byType = {};
        activities.forEach(act => {
          if (!byType[act.action_type]) {
            byType[act.action_type] = { total: 0, success: 0, failed: 0 };
          }
          byType[act.action_type].total++;
          if (act.status === 'delivered' || act.status === 'sent') {
            byType[act.action_type].success++;
          } else if (act.status === 'failed') {
            byType[act.action_type].failed++;
          }
        });

        console.log('\n   Activity Summary:');
        Object.entries(byType).forEach(([type, stats]) => {
          console.log(`   ${type}:`);
          console.log(`      Total: ${stats.total}, Success: ${stats.success}, Failed: ${stats.failed}`);
        });
      }
    } catch (e) {
      logger.error('Failed to fetch campaign activities', e.response?.data?.error || e.message);
    }

    // Step 5: Test individual step execution (if we have leads)
    if (campaignLeads.length > 0) {
      console.log('\n🧪 Testing step execution...\n');
      const testLead = campaignLeads[0];
      
      // Try executing a linkedin_connect step
      logger.info('Simulating linkedin_connect step execution for lead: ' + testLead.lead_id);
      
      try {
        const response = await request('POST', `/campaigns/${campaignId}/leads/${testLead.lead_id}/execute-step`, {
          step_type: 'linkedin_connect',
          config: {
            message: 'Hi, would love to connect!'
          }
        });
        
        if (response.data.success) {
          logger.success('Step executed successfully', response.data.data);
        } else {
          logger.warn('Step execution did not complete: ' + (response.data.error || 'Unknown error'));
        }
      } catch (e) {
        const errorMsg = e.response?.data?.error || e.message;
        logger.error('Step execution failed', errorMsg);
      }
    }

    // Step 6: Campaign stats
    console.log('\n📈 Campaign Statistics...\n');
    try {
      const response = await request('GET', `/campaigns/${campaignId}/stats`);
      const stats = response.data.data;
      
      console.log(`   Total Leads: ${stats.total_leads || 0}`);
      console.log(`   Delivered: ${stats.delivered || 0}`);
      console.log(`   Failed: ${stats.failed || 0}`);
      console.log(`   Pending: ${stats.pending || 0}`);
      console.log(`   Success Rate: ${((stats.delivered / (stats.total_leads || 1)) * 100).toFixed(1)}%`);
    } catch (e) {
      logger.error('Failed to fetch campaign stats', e.response?.data?.error || e.message);
    }

    // Summary
    console.log('\n\n🎯 Available Campaign Step Types:\n');
    console.log('   1. linkedin_connect - Send connection request');
    console.log('   2. linkedin_message - Send direct message');
    console.log('   3. linkedin_visit   - Visit profile');
    console.log('   4. linkedin_follow  - Follow profile\n');

    console.log('✨ Campaign testing complete!\n');

  } catch (error) {
    logger.error('Test failed', error.message);
  } finally {
    process.exit(0);
  }
}

// Run tests
testCampaignSteps();
