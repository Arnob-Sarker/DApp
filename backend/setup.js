const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function setupEnvironment() {
    console.log('🚀 Registration System Setup\n');
    console.log('This script will help you configure your environment.\n');

    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('Setup cancelled.');
            rl.close();
            return;
        }
    }

    console.log('\n📊 MongoDB Configuration:');
    console.log('1. Local MongoDB (localhost)');
    console.log('2. MongoDB Atlas (cloud)');
    
    const mongoChoice = await question('Choose MongoDB setup (1 or 2): ');
    
    let mongoUri;
    if (mongoChoice === '2') {
        console.log('\n🌐 MongoDB Atlas Setup:');
        console.log('1. Go to https://mongodb.com/atlas');
        console.log('2. Create a free account and cluster');
        console.log('3. Get your connection string from the cluster');
        console.log('4. Replace <username>, <password>, and <cluster> with your values\n');
        
        mongoUri = await question('Enter your Atlas connection string: ');
        
        // Validate Atlas connection string
        if (!mongoUri.includes('mongodb+srv://')) {
            console.log('❌ Invalid Atlas connection string. Should start with mongodb+srv://');
            rl.close();
            return;
        }
    } else {
        mongoUri = 'mongodb://localhost:27017/registration_system';
        console.log('✅ Using local MongoDB');
    }

    console.log('\n📧 Email Configuration (Gmail):');
    console.log('To send verification emails, you need Gmail credentials.');
    console.log('1. Enable 2-factor authentication on your Gmail account');
    console.log('2. Generate an App Password:');
    console.log('   - Go to Google Account settings');
    console.log('   - Security > 2-Step Verification > App passwords');
    console.log('   - Generate password for "Mail"\n');
    
    const emailUser = await question('Enter your Gmail address: ');
    const emailPassword = await question('Enter your Gmail app password: ');

    console.log('\n🔗 Web3 Configuration:');
    console.log('This should point to your local Ganache or Ethereum node.');
    const web3Provider = await question('Web3 provider URL (default: http://localhost:8545): ') || 'http://localhost:8545';

    console.log('\n📝 Smart Contract:');
    console.log('You need to deploy the Registration.sol contract and get its address.');
    const contractAddress = await question('Contract address (default: 0x1EbA07058F001b31937d60359F5453Bb7F7b6Ce1): ') || '0x1EbA07058F001b31937d60359F5453Bb7F7b6Ce1';

    // Generate .env content
    const envContent = `# MongoDB Configuration
MONGODB_URI=${mongoUri}

# Web3 Configuration
WEB3_PROVIDER=${web3Provider}
CONTRACT_ADDRESS=${contractAddress}

# Email Configuration (Gmail)
EMAIL_USER=${emailUser}
EMAIL_PASSWORD=${emailPassword}

# Server Configuration
PORT=3001
FRONTEND_URL=http://localhost:3000
`;

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    console.log('\n📋 Next Steps:');
    if (mongoChoice === '1') {
        console.log('1. Install and start MongoDB locally:');
        console.log('   Ubuntu/Debian: sudo apt install mongodb && sudo systemctl start mongodb');
        console.log('   macOS: brew install mongodb-community && brew services start mongodb-community');
        console.log('   Windows: Download from mongodb.com and start the service');
    } else {
        console.log('1. Make sure your Atlas cluster is running and accessible');
    }
    
    console.log('2. Deploy the smart contract to your blockchain network');
    console.log('3. Start Ganache or your local Ethereum node');
    console.log('4. Run: npm test (to verify everything works)');
    console.log('5. Run: npm start (to start the server)');
    console.log('6. Open src/index.html in your browser');

    console.log('\n🎉 Setup complete!');

    rl.close();
}

setupEnvironment().catch(console.error); 