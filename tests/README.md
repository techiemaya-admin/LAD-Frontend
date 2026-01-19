# Test Scripts

Comprehensive test suite for LAD backend features. All tests use curl and bash for easy CI/CD integration.

## 📁 Structure

```
tests/
├── README.md                      # This file
├── run-all-tests.sh              # Master test runner
├── auth-test.sh                  # Authentication tests
├── keyword-expansion-test.sh     # Keyword expansion feature
├── ai-icp-assistant-test.sh      # AI ICP Assistant chat
├── apollo-leads-test.sh          # Apollo.io integration
└── lead-enrichment-test.sh       # Lead enrichment feature
```

## 🚀 Quick Start

### Run All Tests
```bash
cd tests
chmod +x *.sh
./run-all-tests.sh
```

### Run Individual Tests
```bash
# Test authentication
./auth-test.sh

# Test keyword expansion
./keyword-expansion-test.sh

# Test AI ICP Assistant
./ai-icp-assistant-test.sh

# Test Apollo leads
./apollo-leads-test.sh

# Test lead enrichment
./lead-enrichment-test.sh
```

## 📋 Prerequisites

### 1. Backend Running
```bash
cd ../backend
node server.js
# Should be running on http://localhost:3004
```

### 2. Test User
- Email: `admin@demo.com`
- Password: `password123`

### 3. Required Tools
- `curl` - HTTP requests
- `jq` - JSON parsing
- `bash` - Shell scripting

Install on macOS:
```bash
brew install jq
```

## 🔧 Configuration

### Environment Variables

```bash
# Set custom backend URL (default: http://localhost:3004)
export BASE_URL="http://localhost:3004"

# Run tests
./run-all-tests.sh
```

### Test User Setup

If the test user doesn't exist, create it:

```bash
# Generate password hash
cd ../backend
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('password123', 10));"

# Update user in database
PGPASSWORD=TechieMaya psql -h 165.22.221.77 -U dbadmin -d salesmaya_agent << EOF
UPDATE lad_LAD.users 
SET password_hash = '<generated_hash>'
WHERE email = 'admin@demo.com';
EOF
```

## 📊 Test Coverage

### 1. Authentication Test (`auth-test.sh`)
- ✅ Login with credentials
- ✅ JWT token generation
- ✅ Token verification
- ✅ Feature list access

### 2. Keyword Expansion Test (`keyword-expansion-test.sh`)
- ✅ Healthcare SaaS expansion
- ✅ Fintech startups expansion
- ✅ E-commerce platforms expansion
- ✅ AI/ML consulting expansion
- ✅ Cybersecurity services expansion
- ✅ Validates keyword count (10+ expected)

### 3. AI ICP Assistant Test (`ai-icp-assistant-test.sh`)
- ✅ Start conversation
- ✅ Extract ICP parameters
- ✅ Build search parameters
- ✅ Reset conversation
- ✅ Keyword expansion integration

### 4. Apollo Leads Test (`apollo-leads-test.sh`)
- ✅ Company search
- ✅ Search with keywords
- ✅ Location filtering
- ✅ Company details retrieval
- ✅ Pagination

### 5. Lead Enrichment Test (`lead-enrichment-test.sh`)
- ✅ Website analysis
- ✅ Relevance scoring (0-10)
- ✅ Batch enrichment
- ✅ AI reasoning generation
- ✅ ICP matching

## 📈 Expected Results

### Success Criteria

**Authentication:**
- Returns valid JWT token
- Token format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Keyword Expansion:**
- Generates 15-30 keywords per topic
- Response time: 500ms - 1.5s
- Includes synonyms and related terms

**AI ICP Assistant:**
- Extracts industry, location, company size
- Builds Apollo search parameters
- Supports multi-turn conversations

**Apollo Leads:**
- Returns company results
- Valid company data structure
- Website URLs included

**Lead Enrichment:**
- Relevance score: 0-10
- AI reasoning provided
- Website content scraped

### Performance Benchmarks

| Test | Expected Duration | Success Rate |
|------|------------------|--------------|
| Authentication | < 500ms | 100% |
| Keyword Expansion | 500ms - 2s | 100% |
| AI ICP Assistant | 1s - 3s | 100% |
| Apollo Leads | 1s - 5s | 95%+ |
| Lead Enrichment | 2s - 10s | 90%+ |

## 🐛 Troubleshooting

### Backend Not Running
```
Error: Connection refused
```
**Solution:** Start backend: `cd ../backend && node server.js`

### Authentication Failed
```
❌ Authentication failed
```
**Solution:** Update admin password using script above

### No OpenAI Key
```
No AI API key configured
```
**Solution:** Add `OPENAI_API_KEY` to `backend/.env` and restart

### Apollo API Error
```
401 Unauthorized
```
**Solution:** Check `APOLLO_API_KEY` in `backend/.env`

### jq Not Found
```
command not found: jq
```
**Solution:** Install jq: `brew install jq`

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install dependencies
        run: sudo apt-get install -y jq
      
      - name: Start backend
        run: |
          cd backend
          npm install
          node server.js &
          sleep 5
      
      - name: Run tests
        run: |
          cd tests
          chmod +x *.sh
          ./run-all-tests.sh
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Setup') {
            steps {
                sh 'cd backend && npm install'
            }
        }
        stage('Start Backend') {
            steps {
                sh 'cd backend && node server.js &'
                sh 'sleep 5'
            }
        }
        stage('Test') {
            steps {
                sh 'cd tests && chmod +x *.sh && ./run-all-tests.sh'
            }
        }
    }
}
```

## 📝 Adding New Tests

### Template for New Test Script

```bash
#!/bin/bash

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           🧪 YOUR FEATURE TEST                                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

BASE_URL=${BASE_URL:-"http://localhost:3004"}

# Get token
if [ -f /tmp/test_token.txt ]; then
  TOKEN=$(cat /tmp/test_token.txt)
else
  TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "admin@demo.com", "password": "password123"}' | jq -r '.token')
fi

# Your test logic here
RESPONSE=$(curl -s -X POST ${BASE_URL}/api/your-feature/endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}')

SUCCESS=$(echo $RESPONSE | jq -r '.success')

if [ "$SUCCESS" == "true" ]; then
  echo "✅ Test passed"
else
  echo "❌ Test failed"
  exit 1
fi
```

Then add it to `run-all-tests.sh`:
```bash
run_test "Your Feature" "${SCRIPT_DIR}/your-feature-test.sh"
```

## 📄 License

These test scripts are part of the LAD project.

## 🤝 Contributing

When adding new features, please:
1. Create corresponding test script
2. Add to `run-all-tests.sh`
3. Update this README
4. Ensure all tests pass before committing
