const fs = require('fs');
const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

console.log(`${colors.bright}${colors.blue}
╔═══════════════════════════════════════════╗
║     MonadHub-MCP Installation Setup       ║
╚═══════════════════════════════════════════╝${colors.reset}
`);

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function setup() {
  try {
    // Check if .env exists
    if (!fs.existsSync('.env')) {
      console.log(`${colors.yellow}Creating .env file...${colors.reset}`);
      
      const privateKey = await askQuestion('Enter your private key (or press enter to skip): ');
      const blockvisionKey = await askQuestion('Enter your BlockVision API key (or press enter to skip): ');
      const pinataKey = await askQuestion('Enter your Pinata API key (or press enter to skip): ');
      const pinataSecret = await askQuestion('Enter your Pinata secret key (or press enter to skip): ');

      const envContent = `
# Wallet Configuration
PRIVATE_KEY=${privateKey}

# API Keys
BLOCKVISION_API_KEY=${blockvisionKey}
PINATA_API_KEY=${pinataKey}
PINATA_API_SECRET=${pinataSecret}

# Network Configuration
MONAD_RPC_URL=https://testnet-rpc.monad.xyz
MONAD_CHAIN_ID=10143

# Cache Configuration
CACHE_DURATION=300000
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_INTERVAL=60000
`;

      fs.writeFileSync('.env', envContent.trim());
      console.log(`${colors.green}✓ .env file created successfully${colors.reset}`);
    }

    // Install dependencies
    console.log(`\n${colors.yellow}Installing dependencies...${colors.reset}`);
    execSync('npm install', { stdio: 'inherit' });
    console.log(`${colors.green}✓ Dependencies installed successfully${colors.reset}`);

    // Create necessary directories
    const dirs = ['cache', 'logs'];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
        console.log(`${colors.green}✓ Created ${dir} directory${colors.reset}`);
      }
    });

    console.log(`\n${colors.bright}${colors.green}✨ Installation completed successfully!${colors.reset}\n`);
    console.log(`To start using MonadHub-MCP:
1. Review your .env file and update any missing credentials
2. Run 'npm start' to launch the application
3. Visit the documentation at https://github.com/zaki9501/MonadHub-MCP\n`);

  } catch (error) {
    console.error(`${colors.red}Error during setup: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setup(); 