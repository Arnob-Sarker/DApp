// Test file to verify modular structure
console.log('🧪 Testing modular structure...');

// Test if all modules are loaded
function testModules() {
  console.log('Testing module availability:');
  
  // Test Core module
  if (typeof Core !== 'undefined') {
    console.log('✅ Core module loaded');
    console.log('  - Core.init:', typeof Core.init);
    console.log('  - Core.updateWalletStatus:', typeof Core.updateWalletStatus);
  } else {
    console.log('❌ Core module not loaded');
  }
  
  // Test RegisterPage module
  if (typeof RegisterPage !== 'undefined') {
    console.log('✅ RegisterPage module loaded');
    console.log('  - RegisterPage.show:', typeof RegisterPage.show);
  } else {
    console.log('❌ RegisterPage module not loaded');
  }
  
  // Test SPConnectPage module
  if (typeof SPConnectPage !== 'undefined') {
    console.log('✅ SPConnectPage module loaded');
    console.log('  - SPConnectPage.show:', typeof SPConnectPage.show);
  } else {
    console.log('❌ SPConnectPage module not loaded');
  }
  
  // Test SearchBookPage module
  if (typeof SearchBookPage !== 'undefined') {
    console.log('✅ SearchBookPage module loaded');
    console.log('  - SearchBookPage.show:', typeof SearchBookPage.show);
  } else {
    console.log('❌ SearchBookPage module not loaded');
  }
  
  // Test App module
  if (typeof App !== 'undefined') {
    console.log('✅ App module loaded');
    console.log('  - App.connectWallet:', typeof App.connectWallet);
    console.log('  - App.searchRides:', typeof App.searchRides);
  } else {
    console.log('❌ App module not loaded');
  }
  
  // Test global functions
  if (typeof showPage !== 'undefined') {
    console.log('✅ showPage function available');
  } else {
    console.log('❌ showPage function not available');
  }
}

// Run test when document is ready
$(document).ready(function() {
  console.log('🧪 Document ready, testing modules...');
  setTimeout(testModules, 1000); // Wait a bit for all scripts to load
});

// Make test function globally available
window.testModularStructure = testModules; 