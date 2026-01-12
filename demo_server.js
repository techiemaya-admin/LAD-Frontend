#!/usr/bin/env node

/**
 * Production-Grade SaaS Platform Demo
 * Option A: Gradual Migration - New structure alongside existing
 */

require('dotenv').config();
const CoreApplication = require('./backend/core/app');

async function startDemo() {
  console.log('🚀 Starting Production-Grade SaaS Platform Demo');
  console.log('=' * 60);
  
  try {
    // Initialize core application
    const app = new CoreApplication();
    
    // Start server
    const PORT = process.env.DEMO_PORT || 3001;
    await app.start(PORT);
    
    console.log('\n🎯 Demo Endpoints:');
    console.log(`   Core Platform: http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/health`);
    console.log(`   Features List: http://localhost:${PORT}/api/features`);
    console.log(`   Apollo Health: http://localhost:${PORT}/api/apollo-leads/health`);
    
    console.log('\n📋 Test Commands:');
    console.log(`   curl http://localhost:${PORT}/api/features`);
    console.log(`   curl -H "x-client-id: demo_client" http://localhost:${PORT}/api/apollo-leads/health`);
    
  } catch (error) {
    console.error('❌ Failed to start demo server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down demo server...');
  process.exit(0);
});

// Start the demo
if (require.main === module) {
  startDemo();
}

module.exports = { startDemo };