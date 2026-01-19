#!/usr/bin/env node

/**
 * Campaign Testing Menu
 * Provides an interactive menu to run different test scenarios
 */

const readline = require('readline');
const { execSync } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function printMenu() {
  console.clear();
  console.log(`
${colors.bright}${colors.cyan}════════════════════════════════════════════════════════${colors.reset}
${colors.bright}  Campaign Steps Testing Menu${colors.reset}
${colors.bright}${colors.cyan}════════════════════════════════════════════════════════${colors.reset}

${colors.bright}Testing Options:${colors.reset}

  1️⃣  ${colors.green}Detailed Sequential Test${colors.reset}
      Test each campaign step type individually with detailed output
      ${colors.yellow}Recommended for comprehensive testing${colors.reset}

  2️⃣  ${colors.green}Full Campaign Analysis${colors.reset}
      Complete campaign review including stats, leads, and activity log
      ${colors.yellow}Good for understanding overall campaign state${colors.reset}

  3️⃣  ${colors.green}Quick API Check${colors.reset}
      Fast validation of campaign endpoints and configuration
      ${colors.yellow}Good for quick health check${colors.reset}

  4️⃣  ${colors.green}View Test Documentation${colors.reset}
      Display the campaign testing guide
      ${colors.yellow}Learn about test setup and troubleshooting${colors.reset}

  5️⃣  ${colors.green}Run All Tests${colors.reset}
      Execute all three test scripts sequentially
      ${colors.yellow}Comprehensive full suite${colors.reset}

  6️⃣  ${colors.red}Exit${colors.reset}

${colors.bright}${colors.cyan}════════════════════════════════════════════════════════${colors.reset}
`);
}

function runTest(scriptPath, name) {
  console.log(`\n${colors.bright}${colors.blue}Running: ${name}${colors.reset}\n`);
  
  try {
    execSync(`node "${scriptPath}"`, {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
  } catch (error) {
    console.log(`\n${colors.red}Test failed: ${error.message}${colors.reset}`);
  }
}

function viewGuide() {
  try {
    const fs = require('fs');
    const guide = fs.readFileSync(path.join(process.cwd(), 'CAMPAIGN_TESTING_GUIDE.md'), 'utf8');
    console.clear();
    console.log(guide);
    console.log(`\n${colors.cyan}Press Enter to return to menu...${colors.reset}`);
    rl.question('', () => {
      printMenu();
      promptUser();
    });
  } catch (error) {
    console.log(`${colors.red}Could not read guide: ${error.message}${colors.reset}`);
    setTimeout(() => {
      printMenu();
      promptUser();
    }, 2000);
  }
}

function promptUser() {
  rl.question(`${colors.bright}Select option (1-6):${colors.reset} `, (answer) => {
    switch (answer.trim()) {
      case '1':
        runTest('./test-campaign-steps-detailed.js', 'Detailed Sequential Test');
        setTimeout(() => {
          console.log(`\n${colors.cyan}Press Enter to continue...${colors.reset}`);
          rl.question('', () => {
            printMenu();
            promptUser();
          });
        }, 1000);
        break;

      case '2':
        runTest('./test-all-campaign-steps.js', 'Full Campaign Analysis');
        setTimeout(() => {
          console.log(`\n${colors.cyan}Press Enter to continue...${colors.reset}`);
          rl.question('', () => {
            printMenu();
            promptUser();
          });
        }, 1000);
        break;

      case '3':
        runTest('./test-campaign-api.js', 'Quick API Check');
        setTimeout(() => {
          console.log(`\n${colors.cyan}Press Enter to continue...${colors.reset}`);
          rl.question('', () => {
            printMenu();
            promptUser();
          });
        }, 1000);
        break;

      case '4':
        viewGuide();
        break;

      case '5':
        console.log(`\n${colors.bright}Running all tests...${colors.reset}`);
        console.log(`\n${colors.bright}1/3: Detailed Sequential Test${colors.reset}`);
        runTest('./test-campaign-steps-detailed.js', 'Detailed Sequential Test');
        
        setTimeout(() => {
          console.log(`\n${colors.bright}2/3: Full Campaign Analysis${colors.reset}`);
          runTest('./test-all-campaign-steps.js', 'Full Campaign Analysis');
          
          setTimeout(() => {
            console.log(`\n${colors.bright}3/3: Quick API Check${colors.reset}`);
            runTest('./test-campaign-api.js', 'Quick API Check');
            
            setTimeout(() => {
              console.log(`\n${colors.green}✅ All tests complete${colors.reset}`);
              console.log(`${colors.cyan}Press Enter to return to menu...${colors.reset}`);
              rl.question('', () => {
                printMenu();
                promptUser();
              });
            }, 1000);
          }, 1000);
        }, 1000);
        break;

      case '6':
        console.log(`\n${colors.green}Goodbye!${colors.reset}\n`);
        rl.close();
        process.exit(0);
        break;

      default:
        console.log(`${colors.red}Invalid option. Please enter 1-6.${colors.reset}`);
        setTimeout(() => {
          printMenu();
          promptUser();
        }, 1000);
    }
  });
}

// Start
console.log(`${colors.bright}${colors.yellow}Initializing Campaign Testing Menu...${colors.reset}`);

// Check if backend is running
const axios = require('axios');
const checkBackend = async () => {
  try {
    await axios.get('http://localhost:3001/health', { timeout: 2000 });
    console.log(`${colors.green}✅ Backend is running${colors.reset}`);
    setTimeout(() => {
      printMenu();
      promptUser();
    }, 500);
  } catch (error) {
    console.log(`${colors.red}⚠️  Backend not responding${colors.reset}`);
    console.log(`${colors.yellow}Make sure backend is running: cd backend && npm start${colors.reset}\n`);
    rl.question('Continue anyway? (y/n): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        setTimeout(() => {
          printMenu();
          promptUser();
        }, 500);
      } else {
        console.log(`${colors.green}Exiting...${colors.reset}`);
        rl.close();
        process.exit(0);
      }
    });
  }
};

checkBackend();
