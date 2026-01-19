#!/usr/bin/env node

/**
 * Campaign Steps Sequential Testing
 * Tests each LinkedIn campaign step type independently with detailed output
 * 
 * This script:
 * 1. Finds the first available campaign
 * 2. Gets campaign leads
 * 3. Tests each step type with a sample lead
 * 4. Reports results with error analysis
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';
const TENANT_ID = '1ead8e68-2375-43bd-91c9-555df2521dec';

const request = async (method, endpoint, data = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'X-Tenant-Id': TENANT_ID,
      'Authorization': 'Bearer test-token',
      'Content-Type': 'application/json'
    }
  };
  if (data) config.data = data;
  return axios(config);
};

async function testSequentialSteps() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Campaign Steps - Sequential Testing with Analytics    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Step 1: Find campaign
    console.log('🔍 Finding existing campaign...');
    let campaign;
    
    try {
      const res = await request('GET', '/api/campaigns?limit=1&status=running');
      if (res.data.data?.length > 0) {
        campaign = res.data.data[0];
      } else {
        console.log('⚠️  No running campaigns. Getting any campaign...');
        const res2 = await request('GET', '/api/campaigns?limit=1');
        if (res2.data.data?.length > 0) {
          campaign = res2.data.data[0];
        }
      }
    } catch (e) {
      console.error('Failed to fetch campaigns:', e.message);
      return;
    }

    if (!campaign) {
      console.error('❌ No campaigns found. Please create a campaign first.');
      return;
    }

    console.log(`✅ Found campaign: ${campaign.name} (${campaign.id})`);
    console.log(`   Status: ${campaign.status}`);
    console.log(`   Steps: ${campaign.steps?.length || 0}`);

    // Step 2: Get leads
    console.log('\n🔍 Fetching campaign leads...');
    let leads = [];
    try {
      const res = await request('GET', `/api/campaigns/${campaign.id}/leads?limit=3`);
      leads = res.data.data || [];
    } catch (e) {
      console.error('❌ Failed to fetch leads:', e.message);
      return;
    }

    if (leads.length === 0) {
      console.error('❌ No leads in campaign. Please add leads first.');
      return;
    }

    console.log(`✅ Found ${leads.length} leads`);
    const testLead = leads[0];
    console.log(`   Testing with: ${testLead.lead_id}`);

    // Step 3: Check LinkedIn account
    console.log('\n🔍 Checking LinkedIn account configuration...');
    let hasActiveAccount = false;
    
    try {
      const res = await request('GET', '/api/campaigns/linkedin/accounts');
      const accounts = res.data.data || [];
      const active = accounts.filter(a => a.status === 'active');
      
      hasActiveAccount = active.length > 0;
      console.log(`✅ Found ${accounts.length} accounts (${active.length} active)`);
      
      if (!hasActiveAccount) {
        console.log('⚠️  WARNING: No active LinkedIn accounts. Steps will fail.');
        console.log('   Action: Connect a LinkedIn account in Settings → LinkedIn Integration');
      }
    } catch (e) {
      console.log('⚠️  Could not verify LinkedIn accounts:', e.message);
    }

    // Step 4: Test each step type
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Testing Individual Step Types');
    console.log('════════════════════════════════════════════════════════\n');

    const stepTests = [
      {
        name: 'linkedin_connect',
        title: 'Send Connection Request',
        config: { message: 'Hi! Would love to connect with you.' },
        description: 'Sends a LinkedIn connection request (optional message)'
      },
      {
        name: 'linkedin_visit',
        title: 'Visit Profile',
        config: {},
        description: 'Visits the target profile on LinkedIn'
      },
      {
        name: 'linkedin_follow',
        title: 'Follow Profile',
        config: {},
        description: 'Follows the target profile on LinkedIn'
      },
      {
        name: 'linkedin_message',
        title: 'Send Message',
        config: { message: 'Hi! Great to connect.' },
        description: 'Sends a direct message (requires prior connection)'
      }
    ];

    const results = [];

    for (const test of stepTests) {
      console.log(`\n📋 Test: ${test.title}`);
      console.log(`   Type: ${test.name}`);
      console.log(`   Description: ${test.description}`);
      
      if (test.config.message) {
        console.log(`   Message: "${test.config.message}"`);
      }

      const startTime = Date.now();
      let result = { test: test.name, success: false, error: null, duration: 0 };

      try {
        console.log('   Status: Testing...');
        
        const response = await request('POST',
          `/api/campaigns/${campaign.id}/leads/${testLead.lead_id}/execute-step`,
          {
            step_type: test.name,
            config: test.config
          }
        );

        const duration = Date.now() - startTime;
        result.duration = duration;

        if (response.data.success) {
          console.log(`   ✅ SUCCESS (${duration}ms)`);
          result.success = true;
        } else {
          console.log(`   ⚠️  FAILED (${duration}ms)`);
          console.log(`   Error: ${response.data.error}`);
          result.error = response.data.error;
        }
      } catch (e) {
        const duration = Date.now() - startTime;
        result.duration = duration;
        
        const error = e.response?.data?.error || e.message;
        console.log(`   ❌ ERROR (${duration}ms)`);
        console.log(`   Error: ${error}`);
        result.error = error;

        // Analyze error
        if (error.includes('No active LinkedIn account')) {
          console.log(`   Root Cause: No active LinkedIn accounts configured`);
        } else if (error.includes('LinkedIn URL not found')) {
          console.log(`   Root Cause: Lead missing LinkedIn URL`);
        } else if (error.includes('rate limit') || error.includes('429')) {
          console.log(`   Root Cause: Rate limit reached`);
        } else if (error.includes('checkpoint')) {
          console.log(`   Root Cause: Account needs OTP/validation`);
        } else if (error.includes('expired')) {
          console.log(`   Root Cause: Account credentials expired`);
        }
      }

      results.push(result);
    }

    // Step 5: Summary
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Test Results Summary');
    console.log('════════════════════════════════════════════════════════\n');

    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Results: ${passed}/${results.length} passed`);
    console.log(`Status: ${passed === results.length ? '✅ ALL PASSED' : '⚠️  SOME FAILURES'}\n`);

    console.log('Detailed Results:');
    results.forEach((r, idx) => {
      const status = r.success ? '✅' : '❌';
      console.log(`  ${idx + 1}. ${status} ${r.test} (${r.duration}ms)`);
      if (r.error) {
        console.log(`     Error: ${r.error.substring(0, 80)}`);
      }
    });

    // Step 6: Recommendations
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Recommendations');
    console.log('════════════════════════════════════════════════════════\n');

    const failedTests = results.filter(r => !r.success);
    
    if (failedTests.length === 0) {
      console.log('✅ All tests passed! Campaign steps are working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Troubleshooting steps:\n');
      
      const noAccountError = failedTests.some(r => r.error?.includes('No active LinkedIn account'));
      const urlError = failedTests.some(r => r.error?.includes('LinkedIn URL'));
      const rateLimit = failedTests.some(r => r.error?.includes('rate limit'));
      
      if (noAccountError) {
        console.log('1. LinkedIn Account Issue:');
        console.log('   • Go to Settings → LinkedIn Integration');
        console.log('   • Connect your LinkedIn account via Unipile');
        console.log('   • Verify account status shows as "active"\n');
      }
      
      if (urlError) {
        console.log('2. Lead Data Issue:');
        console.log('   • Ensure leads have LinkedIn URLs');
        console.log('   • Check that lead data is properly imported\n');
      }
      
      if (rateLimit) {
        console.log('3. Rate Limiting:');
        console.log('   • LinkedIn rate limits reached');
        console.log('   • Wait before retrying (varies by action type)\n');
      }

      console.log('4. General Troubleshooting:');
      console.log('   • Review campaign activity log');
      console.log('   • Check backend logs for detailed errors');
      console.log('   • Verify Unipile integration is configured\n');
    }

    console.log('════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Test suite error:', error.message);
  } finally {
    process.exit(0);
  }
}

testSequentialSteps();
