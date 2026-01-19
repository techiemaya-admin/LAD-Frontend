#!/usr/bin/env node

/**
 * Campaign Steps Test - Direct Backend Testing
 * Tests all LinkedIn campaign steps without external dependencies
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

const { pool } = require('./backend/shared/database/connection');
const logger = {
  info: (msg, data) => console.log('ℹ️ ', msg, data ? JSON.stringify(data).substring(0, 80) : ''),
  success: (msg, data) => console.log('✅', msg, data ? JSON.stringify(data).substring(0, 80) : ''),
  error: (msg, data) => console.log('❌', msg, data ? JSON.stringify(data).substring(0, 100) : ''),
  warn: (msg, data) => console.log('⚠️ ', msg, data ? JSON.stringify(data).substring(0, 80) : ''),
};

async function testCampaignSteps() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║  Campaign Steps Testing - Direct Backend               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Test 1: Get running campaigns
    console.log('📋 Test 1: Finding running campaigns...\n');
    const campaignsRes = await pool.query(
      `SELECT id, name, status, created_at FROM lad_dev.campaigns 
       WHERE status = 'running' LIMIT 1`
    );

    if (campaignsRes.rows.length === 0) {
      logger.warn('No running campaigns found');
      return;
    }

    const campaign = campaignsRes.rows[0];
    logger.success('Found campaign', {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status
    });

    const campaignId = campaign.id;

    // Test 2: Get campaign steps
    console.log('\n📋 Test 2: Checking campaign steps...\n');
    const stepsRes = await pool.query(
      `SELECT id, step_type, title, step_order FROM lad_dev.campaign_steps 
       WHERE campaign_id = $1 ORDER BY step_order ASC`,
      [campaignId]
    );

    logger.success(`Found ${stepsRes.rows.length} campaign steps`);
    stepsRes.rows.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step.step_type}: "${step.title}"`);
    });

    // Test 3: Get campaign leads
    console.log('\n📋 Test 3: Getting campaign leads...\n');
    const leadsRes = await pool.query(
      `SELECT cl.id, cl.lead_id, cl.status 
       FROM lad_dev.campaign_leads cl
       WHERE cl.campaign_id = $1 LIMIT 5`,
      [campaignId]
    );

    if (leadsRes.rows.length === 0) {
      logger.warn('No leads in campaign');
    } else {
      logger.success(`Found ${leadsRes.rows.length} leads`);
      leadsRes.rows.forEach((lead, idx) => {
        console.log(`  ${idx + 1}. Lead ${lead.lead_id}: ${lead.status || 'pending'}`);
      });
    }

    // Test 4: LinkedIn accounts
    console.log('\n📋 Test 4: Checking LinkedIn accounts...\n');
    const accountsRes = await pool.query(
      `SELECT id, account_name, status, created_at 
       FROM lad_dev.social_linkedin_accounts 
       ORDER BY status DESC, created_at DESC`
    );

    const active = accountsRes.rows.filter(a => a.status === 'active');
    const expired = accountsRes.rows.filter(a => a.status === 'expired');
    const checkpoint = accountsRes.rows.filter(a => a.status === 'checkpoint');

    logger.success(`Found ${accountsRes.rows.length} LinkedIn accounts`);
    console.log(`  ✅ Active: ${active.length}`);
    console.log(`  ⚠️  Checkpoint: ${checkpoint.length}`);
    console.log(`  ❌ Expired: ${expired.length}`);

    if (active.length > 0) {
      console.log('\n  Active accounts:');
      active.forEach(acc => {
        console.log(`    • ${acc.account_name}`);
      });
    }

    // Test 5: Recent activities
    console.log('\n📋 Test 5: Checking recent campaign activities...\n');
    const activitiesRes = await pool.query(
      `SELECT action_type, status, COUNT(*) as count 
       FROM lad_dev.campaign_lead_activities 
       WHERE campaign_id = $1
       GROUP BY action_type, status
       ORDER BY count DESC
       LIMIT 10`,
      [campaignId]
    );

    if (activitiesRes.rows.length === 0) {
      logger.info('No activities yet');
    } else {
      logger.success('Activity summary:');
      activitiesRes.rows.forEach((row) => {
        const icon = row.status === 'delivered' ? '✅' : 
                     row.status === 'sent' ? '📤' :
                     row.status === 'failed' ? '❌' :
                     row.status === 'pending' ? '⏳' : '❓';
        console.log(`  ${icon} ${row.action_type}: ${row.count} (${row.status})`);
      });
    }

    // Test 6: Overall stats
    console.log('\n📋 Test 6: Campaign statistics...\n');
    const statsRes = await pool.query(
      `SELECT 
        COUNT(DISTINCT lead_id) as total_leads,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
       FROM lad_dev.campaign_lead_activities 
       WHERE campaign_id = $1`,
      [campaignId]
    );

    if (statsRes.rows.length > 0) {
      const stats = statsRes.rows[0];
      const total = stats.total_leads || 0;
      const success = (stats.delivered || 0) + (stats.sent || 0);
      const successRate = total > 0 ? ((success / total) * 100).toFixed(1) : 0;

      logger.success('Campaign stats');
      console.log(`  Total Activities: ${stats.total_leads || 0}`);
      console.log(`  Delivered: ${stats.delivered || 0}`);
      console.log(`  Sent: ${stats.sent || 0}`);
      console.log(`  Failed: ${stats.failed || 0}`);
      console.log(`  Pending: ${stats.pending || 0}`);
      console.log(`  Success Rate: ${successRate}%`);
    }

    // Summary
    console.log('\n════════════════════════════════════════════════════════');
    console.log('Summary\n');

    let issues = [];
    
    if (stepsRes.rows.length === 0) {
      issues.push('❌ No campaign steps configured');
    } else {
      console.log(`✅ Campaign has ${stepsRes.rows.length} steps configured`);
    }

    if (leadsRes.rows.length === 0) {
      issues.push('❌ Campaign has no leads');
    } else {
      console.log(`✅ Campaign has ${leadsRes.rows.length} leads`);
    }

    if (active.length === 0) {
      issues.push('❌ No active LinkedIn accounts - connection requests will fail');
    } else {
      console.log(`✅ ${active.length} active LinkedIn account(s) available`);
    }

    if (issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    } else {
      console.log('\n✅ All checks passed - campaign ready for execution');
    }

    console.log('\n════════════════════════════════════════════════════════\n');

  } catch (error) {
    logger.error('Test failed', error.message);
    if (error.code === 'ECONNREFUSED') {
      logger.error('Database connection failed - make sure PostgreSQL is running');
    }
  } finally {
    process.exit(0);
  }
}

testCampaignSteps();
