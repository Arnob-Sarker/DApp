const fs = require('fs');
const path = require('path');

// Path to the compiled contract JSON file
const contractPath = path.join(__dirname, '../build/contracts/Registration.json');

try {
    // Read the compiled contract
    const contractData = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    
    // Extract the ABI
    const abi = contractData.abi;
    
    // Write the ABI to a separate file
    fs.writeFileSync(path.join(__dirname, 'contractABI.json'), JSON.stringify(abi, null, 2));
    
    console.log('✅ Contract ABI generated successfully!');
    console.log('📁 File: backend/contractABI.json');
    console.log('📊 ABI contains ${abi.length} functions/events');
    
} catch (error) {
    console.error('❌ Error generating ABI:', error.message);
    console.log('\n📋 Make sure to:');
    console.log('1. Run "truffle compile" first');
    console.log('2. Run "truffle migrate --reset" to deploy');
    console.log('3. Then run this script again');
}