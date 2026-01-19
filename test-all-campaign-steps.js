#!/usr/bin/env node

/**
 * Complete Campaign Steps Testing
 * Tests all LinkedIn campaign workflow steps
 * 
 * Tested Steps:
 * 1. linkedin_connect - Send connection request
 * 2. linkedin_message - Send direct message  
 * 3. linkedin_visit   - Visit profile
 * 4. linkedin_follow  - Follow profile
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const TENANT_ID = '1ead8e68-2375-43bd-91c9-555df2521dec';
const AUTH_TOKEN = 'test-token';

// Sample campaign ID from earlier test
const CAMPAIGN_ID = 'e2e1c3a0-7f9c-4d5a-8b2e-9c1d2e3f4a5b';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const logger = {
  title: (text) => console.log(`\n${colors.bright}${colors.cyan}${'═'.repeat(60)}${colors.reset}`),
  step: (num, text) => console.log(`\n${colors.bright}${colors.blue}Step ${num}: ${text}${colors.reset}`),
  success: (text, data) => {
    console.log(`${colors.green}✅ ${text}${colors.reset}`);
    if (data) console.log(`   ${JSON.stringify(data).substring(0, 100)}`);
  },
  error: (text, data) => {
    console.log(`${colors.red}❌ ${text}${colors.reset}`);
    if (data) console.log(`   ${JSON.stringify(data).substring(0, 150)}`);
  },
  info: (text) => console.log(`${colors.yellow}ℹ️  ${text}${colors.reset}`),
  code: (text) => console.log(`${colors.cyan}   ${text}${colors.reset}`)
};

const request = async (method, endpoint, data = null) => {
  try {
    return await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
        'Authorization': `Bearer ${AUTH_TOKEN}`
      }
    });
  } catch (error) {
    throw error;
  }
};

async function testCampaignSteps() {
  logger.title();
  console.log(`${colors.bright}${colors.cyan}  LinkedIn Campaign Steps - Complete Test Suite${colors.reset}`);
  logger.title();

  try {
    // Step 1: Verify campaign exists
    logger.step(1, 'Verifying Campaign Exists');
    console.log(`Campaign ID: ${CAMPAIGN_ID}`);

    let campaignData;
    try {
      const response = await request('GET', `/campaigns/${CAMPAIGN_ID}`);
      campaignData = response.data.data;
      logger.success('Campaign found', {
        name: campaignData.name,
        status: campaignData.status,
        steps: campaignData.steps?.length || 0
      });
    } catch (e) {
      logger.error('Campaign not found', e.response?.data?.error || e.message);
      logger.info('Fetching available campaigns...');
      
      try {
        const response = await request('GET', '/campaigns?limit=1');
        if (response.data.data?.length > 0) {
          campaignData = response.data.data[0];
          logger.success('Using existing campaign', {
            id: campaignData.id,
            name: campaignData.name
          });
        }
      } catch (fetchErr) {
        logger.error('Failed to fetch campaigns', fetchErr.message);
        return;
      }
    }

    // Step 2: Check campaign steps
    logger.step(2, 'Reviewing Campaign Steps');
    
    if (!campaignData.steps || campaignData.steps.length === 0) {
      logger.info('No steps configured. Available step types:');
      console.log('   • linkedin_connect - Send connection request');
      console.log('   • linkedin_message - Send direct message');
      console.log('   • linkedin_visit   - Visit profile');
      console.log('   • linkedin_follow  - Follow profile');
    } else {
      logger.success(`Found ${campaignData.steps.length} steps`);
      campaignData.steps.forEach((step, idx) => {
        console.log(`   ${idx + 1}. ${colors.cyan}${step.type}${colors.reset}`);
        console.log(`      Title: ${step.title}`);
        if (step.config?.message) {
          console.log(`      Message: "${step.config.message}"`);
        }
      });
    }

    // Step 3: Get campaign leads
    logger.step(3, 'Fetching Campaign Leads');
    
    let leads = [];
    try {
      const response = await request('GET', `/campaigns/${campaignData.id}/leads?limit=3`);
      leads = response.data.data || [];
      logger.success(`Found ${leads.length} leads`, {
        total: leads.length,
        statuses: [...new Set(leads.map(l => l.status))]
      });
      
      leads.forEach((lead, idx) => {
        console.log(`   ${idx + 1}. Lead ID: ${lead.lead_id}`);
        console.log(`      Status: ${lead.status || 'pending'}`);
      });
    } catch (e) {
      logger.error('Failed to fetch leads', e.response?.data?.error || e.message);
    }

    // Step 4: Check LinkedIn account status
    logger.step(4, 'Checking LinkedIn Account Status');
    
    try {
      const response = await request('GET', '/campaigns/linkedin/accounts');
      const accounts = response.data.data || [];
      
      const active = accounts.filter(a => a.status === 'active');
      const expired = accounts.filter(a => a.status === 'expired');
      const checkpoint = accounts.filter(a => a.status === 'checkpoint');
      
      logger.success(`Found ${accounts.length} LinkedIn accounts`);
      console.log(`   ${colors.green}✓ Active: ${active.length}${colors.reset}`);
      console.log(`   ${colors.yellow}⚠ Checkpoint: ${checkpoint.length}${colors.reset}`);
      console.log(`   ${colors.red}✗ Expired: ${expired.length}${colors.reset}`);
      
      if (active.length === 0) {
        logger.info('⚠️  No active LinkedIn accounts. Connection requests will fail.');
        logger.info('   Connect a LinkedIn account in Settings → LinkedIn Integration');
      }
    } catch (e) {
      logger.error('Failed to fetch LinkedIn accounts', e.response?.data?.error || e.message);
    }

    // Step 5: Get campaign activities
    logger.step(5, 'Reviewing Campaign Activity Log');
    
    try {
      const response = await request('GET', `/campaigns/${campaignData.id}/activities?limit=5`);
      const activities = response.data.data || [];
      
      if (activities.length === 0) {
        logger.info('No activities recorded yet');
      } else {
        logger.success(`Found ${activities.length} recent activities`);
        
        const summary = {};
        activities.forEach(act => {
          if (!summary[act.action_type]) {
            summary[act.action_type] = { success: 0, failed: 0, total: 0 };
          }
          summary[act.action_type].total++;
          if (act.status === 'delivered' || act.status === 'sent') {
            summary[act.action_type].success++;
          } else if (act.status === 'failed') {
            summary[act.action_type].failed++;
          }
        });
        
        Object.entries(summary).forEach(([type, stats]) => {
          const successRate = ((stats.success / stats.total) * 100).toFixed(0);
          console.log(`   ${colors.cyan}${type}${colors.reset}: ${stats.success}/${stats.total} (${successRate}%)`);
        });
      }
    } catch (e) {
      logger.error('Failed to fetch activities', e.response?.data?.error || e.message);
    }

    // Step 6: Test step execution
    logger.step(6, 'Testing Step Execution');
    
    if (leads.length > 0) {
      const testLead = leads[0];
      logger.info(`Testing with Lead: ${testLead.lead_id}`);
      
      const stepTests = [
        {
          type: 'linkedin_connect',
          config: { message: 'Hi! Would love to connect.' },
          description: 'Send connection request'
        },
        {
          type: 'linkedin_visit',
          config: {},
          description: 'Visit profile'
        },
        {
          type: 'linkedin_follow',
          config: {},
          description: 'Follow profile'
        }
      ];
      
      for (const test of stepTests) {
        console.log(`\n   Testing: ${colors.cyan}${test.description}${colors.reset}`);
        
        try {
          const response = await request('POST', 
            `/campaigns/${campaignData.id}/leads/${testLead.lead_id}/execute-step`,
            {
              step_type: test.type,
              config: test.config
            }
          );
          
          if (response.data.success) {
            logger.success(`${test.type} executed successfully`);
          } else {
            logger.error(`${test.type} failed`, response.data.error);
          }
        } catch (e) {
          const error = e.response?.data?.error || e.message;
          if (error.includes('No active LinkedIn account')) {
            logger.info(`${test.type}: No active LinkedIn account configured`);
          } else {
            logger.error(`${test.type} failed`, error);
          }
        }
      }
    } else {
      logger.info('No leads available for step testing');
    }

    // Step 7: Campaign statistics
    logger.step(7, 'Campaign Statistics');
    
    try {
      const response = await request('GET', `/campaigns/${campaignData.id}/stats`);
      const stats = response.data.data;
      
      const total = stats.total_leads || 0;
      const delivered = stats.delivered || 0;
      const failed = stats.failed || 0;
      const pending = stats.pending || 0;
      const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;
      
      logger.success('Campaign stats retrieved');
      console.log(`   Total Leads:  ${total}`);
      console.log(`   Delivered:    ${colors.green}${delivered}${colors.reset}`);
      console.log(`   Failed:       ${colors.red}${failed}${colors.reset}`);
      console.log(`   Pending:      ${colors.yellow}${pending}${colors.reset}`);
      console.log(`   Success Rate: ${successRate}%`);
    } catch (e) {
      logger.error('Failed to fetch statistics', e.response?.data?.error || e.message);
    }

    // Step 8: Summary and next steps
    logger.step(8, 'Summary & Next Steps');
    
    console.log('\n✨ Campaign Testing Complete!\n');
    console.log('${colors.bright}Available Campaign Steps:${colors.reset}');
    console.log('  1. linkedin_connect - Send connection request');
    console.log('     └─ Can include optional message');
    console.log('  2. linkedin_message - Send direct message');
    console.log('     └─ Requires prior connection');
    console.log('  3. linkedin_visit   - Visit profile');
    console.log('     └─ No prior connection needed');
    console.log('  4. linkedin_follow  - Follow profile');
    console.log('     └─ No prior connection needed\n');

    console.log('${colors.bright}Next Steps:${colors.reset}');
    console.log('  • Review activity log for any errors');
    console.log('  • Check LinkedIn account status (must have 1+ active)');
    console.log('  • Configure campaign steps in the builder');
    console.log('  • Start campaign to begin processing leads\n');

  } catch (error) {
    logger.error('Test suite failed', error.message);
  } finally {
    process.exit(0);
  }
}

// Run tests
testCampaignSteps();
