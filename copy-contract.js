const fs = require('fs');
const path = require('path');

// Paths
const sourcePath = path.join(__dirname, 'build/contracts/Registration.json');
const targetPath = path.join(__dirname, 'src/Registration.json');

try {
    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
        console.error('❌ Contract JSON not found. Please run:');
        console.log('1. truffle compile');
        console.log('2. truffle migrate --reset');
        console.log('3. Then run this script again');
        process.exit(1);
    }

    // Read the compiled contract
    const contractData = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    
    // Copy to frontend directory
    fs.copyFileSync(sourcePath, targetPath);
    
    console.log('✅ Contract JSON copied successfully!');
    console.log(`📁 From: ${sourcePath}`);
    console.log(`📁 To: ${targetPath}`);
    console.log(`📊 Contract address: ${contractData.networks ? Object.keys(contractData.networks)[0] : 'Not deployed'}`);
    
} catch (error) {
    console.error('❌ Error copying contract JSON:', error.message);
    console.log('\n📋 Make sure to:');
    console.log('1. Run \"truffle compile\" first');
    console.log('2. Run \"truffle migrate --reset\" to deploy');
    console.log('3. Then run this script again');
}


