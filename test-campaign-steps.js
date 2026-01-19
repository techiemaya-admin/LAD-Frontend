#!/usr/bin/env node

/**
 * Comprehensive Campaign Steps Testing
 * Tests all LinkedIn campaign steps with an existing campaign
 * 
 * Campaign Steps to Test:
 * 1. linkedin_connect - Send connection request
 * 2. linkedin_message - Send direct message
 * 3. linkedin_visit - Visit profile
 * 4. linkedin_follow - Follow profile
 */

const path = require('path');
const fs = require('fs');
const { pool } = require('./backend/shared/database/connection');

const logger = {
  info: (msg, data) => console.log('ℹ️ ', msg, data ? JSON.stringify(data, null, 2) : ''),
  warn: (msg, data) => console.log('⚠️ ', msg, data ? JSON.stringify(data, null, 2) : ''),
  error: (msg, data) => console.log('❌', msg, data ? JSON.stringify(data, null, 2) : ''),
  success: (msg, data) => console.log('✅', msg, data ? JSON.stringify(data, null, 2) : ''),
};

async function testCampaignSteps() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║   LinkedIn Campaign Steps - Comprehensive Test        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    // Get first running campaign
    console.log('📋 Step 1: Finding an existing campaign...\n');
    
    const campaignsResult = await pool.query(
      `SELECT * FROM lad_dev.campaigns 
       WHERE status = 'running' 
       LIMIT 1`
    );

    if (campaignsResult.rows.length === 0) {
      logger.error('No running campaigns found. Please create a campaign first.');
      return;
    }

    const campaign = campaignsResult.rows[0];
    logger.success('Found campaign:', {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
      tenant_id: campaign.tenant_id,
      created_at: campaign.created_at
    });

    const campaignId = campaign.id;
    const tenantId = campaign.tenant_id;

    // Get campaign steps
    console.log('\n📋 Step 2: Checking campaign steps...\n');
    
    const stepsResult = await pool.query(
      `SELECT * FROM lad_dev.campaign_steps 
       WHERE campaign_id = $1 AND tenant_id = $2
       ORDER BY step_order ASC`,
      [campaignId, tenantId]
    );

    if (stepsResult.rows.length === 0) {
      logger.warn('No steps configured for this campaign');
    } else {
      logger.success(`Found ${stepsResult.rows.length} campaign steps:`);
      stepsResult.rows.forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step.step_type || step.type} - "${step.title}"`);
      });
    }

    // Get campaign leads
    console.log('\n📋 Step 3: Getting campaign leads...\n');
    
    const leadsResult = await pool.query(
      `SELECT * FROM lad_dev.campaign_leads 
       WHERE campaign_id = $1 AND tenant_id = $2
       LIMIT 5`,
      [campaignId, tenantId]
    );

    if (leadsResult.rows.length === 0) {
      logger.warn('No leads added to this campaign yet');
      return;
    }

    logger.success(`Found ${leadsResult.rows.length} leads in campaign`);
    leadsResult.rows.forEach((lead, idx) => {
      console.log(`  ${idx + 1}. Lead ID: ${lead.lead_id}`);
    });

    // Get activities for this campaign
    console.log('\n📋 Step 4: Checking campaign activity log...\n');
    
    const activitiesResult = await pool.query(
      `SELECT 
        action_type, 
        status, 
        error_message,
        COUNT(*) as count
       FROM lad_dev.campaign_lead_activities 
       WHERE campaign_id = $1 AND tenant_id = $2
       GROUP BY action_type, status, error_message
       ORDER BY count DESC`,
      [campaignId, tenantId]
    );

    if (activitiesResult.rows.length === 0) {
      logger.info('No activity recorded yet for this campaign');
    } else {
      logger.success('Activity Summary:');
      activitiesResult.rows.forEach(row => {
        const status = row.status === 'pending' ? '⏳' : 
                       row.status === 'delivered' ? '✅' : 
                       row.status === 'failed' ? '❌' : 
                       row.status === 'sent' ? '📤' : '❓';
        console.log(`  ${status} ${row.action_type}: ${row.count} (${row.status})${row.error_message ? ` - ${row.error_message}` : ''}`);
      });
    }

    // Get LinkedIn account status
    console.log('\n📋 Step 5: Checking LinkedIn account status...\n');
    
    const accountsResult = await pool.query(
      `SELECT 
        id,
        provider_account_id,
        account_name,
        status,
        metadata,
        created_at
       FROM lad_dev.social_linkedin_accounts 
       WHERE tenant_id = $1
       ORDER BY status DESC, created_at DESC`,
      [tenantId]
    );

    logger.success(`Found ${accountsResult.rows.length} LinkedIn accounts:`);
    accountsResult.rows.forEach((account, idx) => {
      const statusIcon = account.status === 'active' ? '✅' : 
                        account.status === 'expired' ? '❌' : 
                        account.status === 'checkpoint' ? '⚠️' : '❓';
      console.log(`  ${statusIcon} ${account.account_name} (${account.status})`);
      console.log(`     ID: ${account.provider_account_id}`);
      console.log(`     Created: ${new Date(account.created_at).toLocaleDateString()}`);
    });

    // Summary statistics
    console.log('\n📊 Campaign Execution Summary\n');
    
    const statsResult = await pool.query(
      `SELECT 
        COUNT(DISTINCT lead_id) as total_leads,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
       FROM lad_dev.campaign_lead_activities 
       WHERE campaign_id = $1 AND tenant_id = $2`,
      [campaignId, tenantId]
    );

    if (statsResult.rows.length > 0) {
      const stats = statsResult.rows[0];
      console.log('📈 Execution Statistics:');
      console.log(`   Total Leads Targeted: ${stats.total_leads}`);
      console.log(`   Delivered: ${stats.delivered}`);
      console.log(`   Sent: ${stats.sent}`);
      console.log(`   Failed: ${stats.failed}`);
      console.log(`   Pending: ${stats.pending}`);
      
      const successRate = stats.total_leads > 0 ? 
        (((stats.delivered + stats.sent) / stats.total_leads) * 100).toFixed(1) : 0;
      console.log(`   Success Rate: ${successRate}%`);
    }

    // Test scenario: What are the next steps?
    console.log('\n\n🎯 Campaign Steps Available for Testing:\n');
    console.log('Step Types:');
    console.log('  1. linkedin_connect - Send connection request');
    console.log('  2. linkedin_message - Send direct message (requires prior connection)');
    console.log('  3. linkedin_visit   - Visit profile');
    console.log('  4. linkedin_follow  - Follow profile');
    console.log('\nStatus of Campaign:');
    console.log(`  Campaign ID: ${campaignId}`);
    console.log(`  Campaign Status: ${campaign.status}`);
    console.log(`  Execution State: ${campaign.execution_state || 'unknown'}`);
    console.log(`  Total Leads: ${leadsResult.rows.length}`);
    console.log(`  Total Steps: ${stepsResult.rows.length}`);
    console.log(`  LinkedIn Accounts Active: ${accountsResult.rows.filter(a => a.status === 'active').length}/${accountsResult.rows.length}`);

    console.log('\n\n💡 Next Steps:');
    console.log('1. Review activity log above for any errors');
    console.log('2. Check LinkedIn account status - ensure at least 1 account is "active"');
    console.log('3. For testing connection requests, run: node test-campaign-connection.js');
    console.log('4. For testing messages, ensure leads are already connected first');
    console.log('5. Monitor campaign_lead_activities table for real-time progress');

    console.log('\n\n📌 Monitoring Commands:');
    console.log('Watch activity in real-time:');
    console.log(`  SELECT * FROM campaign_lead_activities WHERE campaign_id = '${campaignId}' ORDER BY created_at DESC LIMIT 20;`);
    console.log('\nCheck campaign status:');
    console.log(`  SELECT id, status, execution_state, next_run_at FROM campaigns WHERE id = '${campaignId}';`);
    console.log('\n');

  } catch (error) {
    logger.error('Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testCampaignSteps();
