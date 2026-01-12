#!/usr/bin/env node

/**
 * Simplified Apollo Feature Test Server
 * 
 * PURPOSE:
 * Test the new production-grade SaaS architecture with Apollo feature
 * using mock data to demonstrate feature flags, access control, and billing.
 */

const express = require('express');
const cors = require('cors');

// Mock feature flag service for demo
class MockFeatureFlagService {
  async isEnabled(clientId, featureKey) {
    // Demo clients with different access levels
    const clientAccess = {
      'demo_free': ['dashboard'],
      'demo_basic': ['dashboard', 'basic_reports'],
      'demo_premium': ['dashboard', 'basic_reports', 'apollo-leads', 'voice-agent'],
      'demo_enterprise': ['dashboard', 'basic_reports', 'apollo-leads', 'voice-agent', 'linkedin-integration']
    };
    
    const features = clientAccess[clientId] || [];
    const enabled = features.includes(featureKey);
    
    console.log(`🔍 Feature check: ${clientId} -> ${featureKey} = ${enabled}`);
    return enabled;
  }

  async getClientFeatures(clientId) {
    const clientAccess = {
      'demo_free': [{ key: 'dashboard', name: 'Dashboard' }],
      'demo_basic': [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'basic_reports', name: 'Basic Reports' }
      ],
      'demo_premium': [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'basic_reports', name: 'Basic Reports' },
        { key: 'apollo-leads', name: 'Apollo Leads' },
        { key: 'voice-agent', name: 'Voice Agent' }
      ],
      'demo_enterprise': [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'basic_reports', name: 'Basic Reports' },
        { key: 'apollo-leads', name: 'Apollo Leads' },
        { key: 'voice-agent', name: 'Voice Agent' },
        { key: 'linkedin-integration', name: 'LinkedIn Integration' }
      ]
    };
    
    return clientAccess[clientId] || [];
  }
}

// Mock credit service for demo
class MockCreditService {
  constructor() {
    this.balances = {
      'demo_free': 0,
      'demo_basic': 100,
      'demo_premium': 1000,
      'demo_enterprise': 10000
    };
  }

  async checkCredits(clientId, required) {
    const balance = this.balances[clientId] || 0;
    const sufficient = balance >= required;
    
    console.log(`💰 Credit check: ${clientId} has ${balance}, needs ${required} = ${sufficient ? 'OK' : 'INSUFFICIENT'}`);
    
    if (sufficient) {
      this.balances[clientId] -= required;
      console.log(`💳 Deducted ${required} credits. New balance: ${this.balances[clientId]}`);
    }
    
    return { sufficient, balance: this.balances[clientId], used: sufficient ? required : 0 };
  }
}

// Initialize services
const featureFlagService = new MockFeatureFlagService();
const creditService = new MockCreditService();

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Mock auth middleware
app.use((req, res, next) => {
  // Skip auth for public endpoints
  if (['/health', '/api/demo', '/'].includes(req.path)) {
    return next();
  }

  const clientId = req.headers['x-client-id'] || 'demo_premium';
  req.user = {
    id: 'user_123',
    email: 'demo@example.com',
    clientId
  };
  
  console.log(`🔑 Auth: Request from client ${clientId}`);
  next();
});

// Feature guard middleware
const requireFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const clientId = req.user?.clientId;
      if (!clientId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Client ID required' 
        });
      }

      const isEnabled = await featureFlagService.isEnabled(clientId, featureKey);
      if (!isEnabled) {
        return res.status(403).json({
          success: false,
          error: 'Feature not available',
          feature: featureKey,
          message: `The ${featureKey} feature is not enabled for your account`,
          upgrade_required: true
        });
      }

      req.feature = { key: featureKey, clientId };
      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Feature check failed' 
      });
    }
  };
};

// Credit guard middleware
const requireCredits = (usageType, amount) => {
  return async (req, res, next) => {
    try {
      const clientId = req.user?.clientId;
      const result = await creditService.checkCredits(clientId, amount);
      
      if (!result.sufficient) {
        return res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          credits_required: amount,
          credits_available: result.balance,
          upgrade_required: true
        });
      }

      req.credits = {
        used: result.used,
        remaining: result.balance,
        usage_type: usageType
      };
      
      next();
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: 'Credit check failed' 
      });
    }
  };
};

// Core platform routes (always available)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'apollo-demo-server',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/features', async (req, res) => {
  try {
    const clientId = req.user?.clientId || req.headers['x-client-id'] || 'demo_premium';
    const features = await featureFlagService.getClientFeatures(clientId);
    
    res.json({
      success: true,
      client_id: clientId,
      features
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Apollo Leads feature routes (protected)
app.post('/api/apollo-leads/search', 
  requireFeature('apollo-leads'),
  requireCredits('apollo_search', 1),
  (req, res) => {
    const { query, location = 'dubai' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Mock search results
    const companies = [
      {
        id: 'comp_001',
        name: 'HealthTech Solutions',
        website: 'https://healthtech.com',
        industry: 'Healthcare',
        location: { city: 'Dubai', country: 'UAE' },
        size: 150,
        description: 'Leading healthcare technology company'
      }
    ];

    res.json({
      success: true,
      data: companies,
      count: companies.length,
      search_params: { query, location },
      credits_used: req.credits.used,
      credits_remaining: req.credits.remaining,
      feature: req.feature.key,
      client_id: req.user.clientId
    });
  }
);

app.get('/api/apollo-leads/leads/:id/email',
  requireFeature('apollo-leads'),
  requireCredits('apollo_email', 1),
  (req, res) => {
    res.json({
      success: true,
      email: 'john.smith@healthtech.com',
      person_id: req.params.id,
      credits_used: req.credits.used,
      credits_remaining: req.credits.remaining,
      feature: req.feature.key
    });
  }
);

app.get('/api/apollo-leads/leads/:id/phone',
  requireFeature('apollo-leads'),
  requireCredits('apollo_phone', 8),
  (req, res) => {
    res.json({
      success: true,
      phone: '+971-50-123-4567',
      person_id: req.params.id,
      credits_used: req.credits.used,
      credits_remaining: req.credits.remaining,
      feature: req.feature.key
    });
  }
);

app.get('/api/apollo-leads/health', 
  requireFeature('apollo-leads'),
  (req, res) => {
    res.json({
      status: 'healthy',
      feature: 'apollo-leads',
      version: '1.0.0',
      client_id: req.user.clientId
    });
  }
);

// Demo endpoint
app.get('/api/demo', (req, res) => {
  res.json({
    message: 'Apollo Feature Demo Server',
    demo_clients: {
      'demo_free': 'No Apollo access',
      'demo_basic': 'No Apollo access', 
      'demo_premium': 'Apollo access with 1000 credits',
      'demo_enterprise': 'Apollo access with 10000 credits'
    },
    test_commands: [
      'curl -H "x-client-id: demo_free" http://localhost:3001/api/features',
      'curl -H "x-client-id: demo_premium" http://localhost:3001/api/features',
      'curl -H "x-client-id: demo_premium" http://localhost:3001/api/apollo-leads/health',
      'curl -H "x-client-id: demo_premium" -H "Content-Type: application/json" -d \'{"query":"healthcare"}\' http://localhost:3001/api/apollo-leads/search'
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Route ${req.path} not found`,
    available_routes: [
      'GET /health',
      'GET /api/demo', 
      'GET /api/features',
      'POST /api/apollo-leads/search',
      'GET /api/apollo-leads/leads/:id/email',
      'GET /api/apollo-leads/leads/:id/phone',
      'GET /api/apollo-leads/health'
    ]
  });
});

// Start server
const PORT = process.env.DEMO_PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Apollo Demo Server running on port ${PORT}`);
  console.log(`📋 Demo: http://localhost:${PORT}/api/demo`);
  console.log(`💡 Features: http://localhost:${PORT}/api/features`);
  console.log(`🔍 Apollo Health: http://localhost:${PORT}/api/apollo-leads/health`);
  console.log('');
  console.log('🧪 Test different client tiers:');
  console.log(`   Free:       curl -H "x-client-id: demo_free" http://localhost:${PORT}/api/features`);
  console.log(`   Premium:    curl -H "x-client-id: demo_premium" http://localhost:${PORT}/api/features`);
  console.log(`   Enterprise: curl -H "x-client-id: demo_enterprise" http://localhost:${PORT}/api/features`);
});