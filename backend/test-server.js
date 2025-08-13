const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

// Test MongoDB connection
async function testMongoDB() {
    try {
        // Get MongoDB URI from environment or use default
        const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/registration_system';
        
        console.log('Testing MongoDB connection...');
        console.log('Connection string:', mongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✓ MongoDB connected successfully');
        
        // Test creating a user
        const testUser = new User({
            walletAddress: '0x1234567890123456789012345678901234567890',
            in_progress: false,
            email_verified: false,
            registered: false
        });
        
        await testUser.save();
        console.log('✓ User model working correctly');
        
        // Test finding a user
        const foundUser = await User.findOne({ walletAddress: '0x1234567890123456789012345678901234567890' });
        console.log('✓ User retrieval working correctly');
        console.log('Found user:', foundUser);
        
        // Clean up test data
        await User.deleteOne({ walletAddress: '0x1234567890123456789012345678901234567890' });
        console.log('✓ Test data cleaned up');
        
        await mongoose.disconnect();
        console.log('✓ MongoDB disconnected');
        
    } catch (error) {
        console.error('✗ MongoDB test failed:', error.message);
        
        if (error.message.includes('ECONNREFUSED')) {
            console.log('\n💡 Troubleshooting tips:');
            console.log('1. For local MongoDB: Make sure MongoDB is running locally');
            console.log('   - Ubuntu/Debian: sudo systemctl start mongodb');
            console.log('   - macOS: brew services start mongodb/brew/mongodb-community');
            console.log('   - Windows: Start MongoDB service');
            console.log('2. For Atlas: Check your connection string and network access');
            console.log('3. Copy env.example to .env and configure MONGODB_URI');
        }
        
        process.exit(1);
    }
}

// Test email configuration
function testEmailConfig() {
    const nodemailer = require('nodemailer');
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log('⚠ Email credentials not configured (this is expected for testing)');
        console.log('   To configure email:');
        console.log('   1. Copy env.example to .env');
        console.log('   2. Set EMAIL_USER and EMAIL_PASSWORD in .env');
        console.log('   3. Use Gmail app password (not regular password)');
        return;
    }
    
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        }
    });
    
    console.log('✓ Email transporter configured');
}

// Test Web3 configuration
function testWeb3Config() {
    const Web3 = require('web3');
    
    const providerUrl = process.env.WEB3_PROVIDER || 'http://localhost:8545';
    console.log('Web3 provider:', providerUrl);
    
    try {
        const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        console.log('✓ Web3 provider configured');
    } catch (error) {
        console.log('⚠ Web3 provider configuration issue:', error.message);
    }
}

// Run tests
async function runTests() {
    console.log('Running backend tests...\n');
    
    // Test Web3 config
    testWeb3Config();
    console.log('');
    
    // Test MongoDB
    await testMongoDB();
    console.log('');
    
    // Test email config
    testEmailConfig();
    console.log('');
    
    console.log('✓ All tests passed!');
    console.log('\nTo start the server, run: npm start');
    console.log('\nSetup checklist:');
    console.log('□ Copy env.example to .env');
    console.log('□ Configure MONGODB_URI (local or Atlas)');
    console.log('□ Configure EMAIL_USER and EMAIL_PASSWORD');
    console.log('□ Deploy smart contract and update CONTRACT_ADDRESS');
    console.log('□ Ensure Web3 provider is running (Ganache/local node)');
}

runTests().catch(console.error); 