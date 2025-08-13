App = {
  webProvider: null,
  contracts: {},
  account: '0x0',
  backendUrl: 'http://localhost:3002', // Backend server URL
  isWalletConnected: false,
  userStatus: null,

  initWeb: function () {
    console.log('Initializing web3...');
    console.log('window.ethereum available:', typeof window.ethereum !== 'undefined');
    
    // Check if MetaMask is installed
    if (typeof window.ethereum !== 'undefined') {
      App.webProvider = new Web3(window.ethereum);
      console.log('MetaMask is installed!');
      console.log('MetaMask provider:', window.ethereum);
      
      // Set up MetaMask event listeners
      window.ethereum.on('accountsChanged', function (accounts) {
        console.log('Account changed:', accounts);
        if (accounts.length > 0) {
          App.account = accounts[0];
          App.isWalletConnected = true;
          Core.updateWalletStatus();
          App.onWalletConnected();
        } else {
          App.account = '0x0';
          App.isWalletConnected = false;
          Core.updateWalletStatus();
          App.onWalletDisconnected();
        }
      });

      window.ethereum.on('chainChanged', function (chainId) {
        console.log('Network changed:', chainId);
        // Update the contract network instead of reloading
        const networkId = parseInt(chainId, 16);
        if (App.contracts.Registration) {
          App.contracts.Registration.setNetwork(networkId);
          console.log('Contract network updated to:', networkId);
        }
        // Re-render to update the UI
        App.render();
      });

      window.ethereum.on('disconnect', function (error) {
        console.log('MetaMask disconnected:', error);
        App.account = '0x0';
        App.isWalletConnected = false;
        Core.updateWalletStatus();
        App.onWalletDisconnected();
      });
      
    } else {
      // Fallback to local provider
      App.webProvider = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
      console.log('No web3 instance detected, falling back to local provider');
    }
    return App.initContract();
  },

  initContract: function () {
    $.getJSON("Registration.json", function (registration) {
      App.contracts.Registration = TruffleContract(registration);
      // Use modern Web3.js API to avoid deprecation warnings
      if (window.ethereum) {
        App.contracts.Registration.setProvider(window.ethereum);
      } else if (App.webProvider) {
        App.contracts.Registration.setProvider(App.webProvider.provider);
      }
      
      // Set the network ID to match MetaMask's current network
      if (window.ethereum && window.ethereum.chainId) {
        const networkId = parseInt(window.ethereum.chainId, 16);
        App.contracts.Registration.setNetwork(networkId);
        console.log('Contract initialized with network ID:', networkId);
      } else {
        console.log('Contract initialized without specific network ID');
      }
      
      console.log('Contract initialized successfully');
    });
  },

  connectWallet: async function () {
    console.log('connectWallet called');
    
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Update UI to show connecting state
        $("#accountAddress").html("Connecting to MetaMask...");
        $("#connectWalletBtn").prop('disabled', true).text('Connecting...').addClass('connecting');
        
        console.log('Requesting MetaMask accounts...');
        
        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MetaMask request timeout - check if MetaMask is unlocked and try again')), 10000)
        );
        
        // Request account access with timeout
        const accounts = await Promise.race([
          window.ethereum.request({ 
            method: 'eth_requestAccounts',
            params: []
          }),
          timeoutPromise
        ]);
        
        console.log('MetaMask response:', accounts);
        
        if (accounts && accounts.length > 0) {
          App.account = accounts[0];
          App.isWalletConnected = true;
          Core.updateWalletStatus();
          await App.onWalletConnected();
          console.log('Wallet connected successfully:', App.account);
        } else {
          throw new Error('No accounts returned from MetaMask');
        }
      } catch (error) {
        console.error("MetaMask connection failed", error);
        
        // Reset UI state
        Core.updateWalletStatus();
        
        // Handle specific error cases
        if (error.code === 4001) {
          alert("MetaMask connection was rejected. Please click 'Connect Wallet' again and approve the connection.");
        } else if (error.code === -32002) {
          alert("A MetaMask connection request is already pending. Please check your MetaMask extension and approve the connection.");
        } else if (error.message.includes('timeout')) {
          alert("MetaMask connection timed out. Please check:\n1. MetaMask is unlocked\n2. You have accounts available\n3. MetaMask is not blocked by browser");
        } else {
          alert("Failed to connect to MetaMask: " + (error.message || 'Unknown error'));
        }
      }
    } else {
      alert("MetaMask is not installed. Please install MetaMask and try again.");
    }
  },

  onWalletConnected: async function () {
    console.log('Wallet connected, checking user status...');
    console.log('Current App.account:', App.account);
    
    try {
      // Step 1: Create user entry in MongoDB (if doesn't exist)
      const response = await fetch(`${App.backendUrl}/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect wallet to backend');
      }

      // Step 2: Always fetch fresh user status from database
      await App.fetchUserStatus();
    } catch (error) {
      console.error('Error in onWalletConnected:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  },

  fetchUserStatus: async function () {
    console.log('fetchUserStatus called with App.account:', App.account);
    if (!App.account) {
      console.log('No account available for fetchUserStatus');
      return;
    }

    console.log('Fetching user status for account:', App.account);
    try {
      const response = await fetch(`${App.backendUrl}/user-status/${App.account}`);
      console.log('User status response:', response.status, response.ok);
      
      if (response.ok) {
        const userStatus = await response.json();
        console.log('Fetched user status:', userStatus);
        App.userStatus = userStatus;
        
        // Refresh page state after fetching user status
        console.log('Refreshing page state...');
        App.refreshPageState();
      } else {
        console.log('Failed to fetch user status:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
    }
  },

  refreshPageState: function () {
    // Render based on current page
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
      App.renderMainPage();
    } else if (window.location.pathname.includes('verify.html')) {
      App.renderVerificationPage();
    } else if (window.location.pathname.includes('login.html')) {
      App.renderLoginPage();
    }
  },

  onWalletDisconnected: function () {
    console.log('Wallet disconnected');
    App.userStatus = null;
    
    // Hide all forms and show wallet connection
    $("#registrationForm").hide();
    $("#registrationSubmitted").hide();
    $("#alreadyRegistered").hide();
    $("#verificationForm").hide();
    $("#emailVerifiedSuccess").hide();
    $("#errorMessage").hide();
    $("#loginForm").hide();
    $("#successMessage").hide();
    
    $("#walletConnection").show();
    $("#connectionStatus").html("Status: Not connected");
  },

  renderMainPage: function () {
    console.log('renderMainPage called with:', {
      isWalletConnected: App.isWalletConnected,
      userStatus: App.userStatus,
      account: App.account
    });

    if (!App.isWalletConnected || !App.userStatus) {
      console.log('Not connected or no user status, hiding forms');
      $("#connectionStatus").html("Status: Not connected");
      $("#registrationForm").hide();
      $("#registrationSubmitted").hide();
      $("#alreadyRegistered").hide();
      return;
    }

    $("#connectionStatus").html("Status: Connected ✓");

    // Check if user has completed final login (database status)
    if (App.userStatus.registered && App.userStatus.email_verified) {
      console.log('User is registered and verified (final login completed), showing already registered');
      // User is already registered and verified (final login completed)
      $("#registrationForm").hide();
      $("#registrationSubmitted").hide();
      $("#alreadyRegistered").show();
      $("#grantPermissionBtn").show(); // Always show the Grant Permission button
      $("#viewBookingsBtn").show(); // Show the Booking History button
      // Get personal data from session storage for display (since it's hashed in DB)
      const sessionData = sessionStorage.getItem('userSessionData');
      const parsedSessionData = sessionData ? JSON.parse(sessionData) : {};
      // Display user info using session data for personal info, DB data for status
      $("#userInfo").html(`
        <p><strong>Name:</strong> ${parsedSessionData.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${parsedSessionData.email || 'N/A'}</p>
        <p><strong>Wallet:</strong> ${App.userStatus.walletAddress}</p>
        <p><strong>Status:</strong> Registered and Verified ✓</p>
      `);
      return;
    }
    // Check if user has verified email but not completed final login, showing go to login
    if (App.userStatus.in_progress && App.userStatus.email_verified) {
      console.log('User has verified email but not completed final login, showing go to login');
      // User has verified email but not completed final login
      $("#registrationForm").hide();
      $("#registrationSubmitted").hide();
      $("#alreadyRegistered").hide();
      
      // Show message to go to login page
      $("#registrationSubmitted").show();
      $("#registrationSubmitted h3").text("✓ Email Verified");
      $("#registrationSubmitted p").text("Your email has been verified and blockchain transaction completed. Please proceed to final login.");
      $("#registrationSubmitted .button-group").html(`
        <button onclick="window.location.href='login.html'" style="background-color: #28a745;">
          Go to Final Login
        </button>
      `);
    } else if (App.userStatus.in_progress && !App.userStatus.email_verified) {
      console.log('User has submitted registration but not verified email, showing submitted message');
      // User has submitted registration but not verified email
      $("#registrationForm").hide();
      $("#registrationSubmitted").show();
      $("#alreadyRegistered").hide();
    } else {
      console.log('User needs to register, showing registration form');
      // User needs to register
      $("#registrationForm").show();
      $("#registrationSubmitted").hide();
      $("#alreadyRegistered").hide();
    }
  },

  renderVerificationPage: function () {
    if (!App.isWalletConnected || !App.userStatus) {
      $("#verificationStatus").html("Status: Not connected");
      $("#verificationForm").hide();
      return;
    }

    $("#verificationStatus").html("Status: Connected ✓");

    if (App.userStatus.in_progress && !App.userStatus.email_verified) {
      // User can verify email
      $("#verificationForm").show();
      $("#emailVerifiedSuccess").hide();
      $("#errorMessage").hide();
    } else if (App.userStatus.email_verified) {
      // Email already verified
      $("#verificationForm").hide();
      $("#emailVerifiedSuccess").show();
      $("#errorMessage").hide();
    } else {
      // No registration in progress
      $("#verificationForm").hide();
      $("#emailVerifiedSuccess").hide();
      $("#errorMessage").show();
      $("#errorText").html("No registration in progress. Please go back to registration page.");
    }
  },

  renderLoginPage: function () {
    if (!App.isWalletConnected || !App.userStatus) {
      $("#loginStatus").html("Status: Not connected");
      $("#loginForm").hide();
      return;
    }

    $("#loginStatus").html("Status: Connected ✓");

    // Check if user has verified email (session status) and can complete final login
    if (App.userStatus.in_progress && App.userStatus.email_verified && !App.userStatus.registered) {
      // User can complete final login
      $("#loginForm").show();
      $("#successMessage").hide();
      $("#errorMessage").hide();
    } else if (App.userStatus.registered) {
      // User is already registered (final login completed)
      $("#loginForm").hide();
      $("#successMessage").show();
      $("#errorMessage").hide();
      
      // Get personal data from session storage for display (since it's hashed in DB)
      const sessionData = sessionStorage.getItem('userSessionData');
      const parsedSessionData = sessionData ? JSON.parse(sessionData) : {};
      
      // Display user info using session data for personal info, DB data for status
      $("#userInfo").html(`
        <p><strong>Name:</strong> ${parsedSessionData.name || 'N/A'}</p>
        <p><strong>Email:</strong> ${parsedSessionData.email || 'N/A'}</p>
        <p><strong>Wallet:</strong> ${App.userStatus.walletAddress}</p>
        <p><strong>Status:</strong> Registered and Verified ✓</p>
      `);
    } else {
      // User needs to complete previous steps
      $("#loginForm").hide();
      $("#successMessage").hide();
      $("#errorMessage").show();
      $("#errorText").html("Please complete email verification first.");
    }
  },

  registerUser: async function () {
    if (!App.isWalletConnected || !App.account) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      const name = $("#user_name").val();
      const phone = $("#user_phone").val();
      const email = $("#user_email").val();

      // Validate inputs
      if (!name || !phone || !email) {
        alert("Please fill in all fields.");
        return;
      }

      // Submit registration to backend
      console.log("Submitting registration...");
      const response = await fetch(`${App.backendUrl}/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account,
          name: name,
          phone: phone,
          email: email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const result = await response.json();
      console.log("Registration submitted successfully:", result);

      // Store session data for current session
      if (result.sessionData) {
        sessionStorage.setItem('userSessionData', JSON.stringify(result.sessionData));
        console.log("Session data stored:", result.sessionData);
      }

      // Update user status
      App.userStatus.in_progress = true;
      App.userStatus.email_verified = false;
      App.userStatus.registered = false;

      // Show success message
      $("#registrationForm").hide();
      $("#registrationSubmitted").show();
      
      alert("Registration submitted successfully! Please check your email for verification code.");
    } catch (err) {
      console.error("Registration failed", err);
      alert("Registration failed: " + err.message);
    }
  },

  verifyEmail: async function () {
    if (!App.isWalletConnected || !App.account) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      const verificationCode = $("#verification_code").val();
      if (!verificationCode) {
        alert("Please enter the verification code.");
        return;
      }

      // Step 1: Verify code with backend (no blockchain transaction yet)
      console.log("Verifying email code...");
      const response = await fetch(`${App.backendUrl}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account,
          verificationCode: verificationCode
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Verification failed');
      }

      const result = await response.json();
      console.log("Email code verified successfully:", result);

      // Step 2: Call smart contract to store data on blockchain (this will trigger MetaMask)
      console.log("Calling smart contract to store data on blockchain...");
      
      if (!App.contracts.Registration) {
        throw new Error('Smart contract not initialized');
      }

      // Get contract instance
      const contractInstance = await App.contracts.Registration.deployed();
      console.log("Contract instance:", contractInstance);

      // Call the completeRegistration function (this will trigger MetaMask popup)
      const blockchainResult = await contractInstance.completeRegistration({
        from: App.account,
        gas: 3000000
      });

      console.log("Blockchain transaction successful:", blockchainResult);

      // Step 3: Update user status in database after successful blockchain transaction
      console.log("Updating user status in database...");
      const updateResponse = await fetch(`${App.backendUrl}/update-user-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account,
          blockchainData: {
            transactionHash: blockchainResult.tx,
            blockNumber: blockchainResult.receipt.blockNumber,
            gasUsed: blockchainResult.receipt.gasUsed,
            timestamp: Date.now(),
            blockchainReference: {
              walletAddress: App.account,
              registrationTimestamp: Date.now(),
              transactionHash: blockchainResult.tx
            }
          }
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update user status after blockchain transaction');
      }

      // Store blockchain data locally
      sessionStorage.setItem('blockchainData', JSON.stringify({
        transactionHash: blockchainResult.tx,
        blockNumber: blockchainResult.receipt.blockNumber,
        gasUsed: blockchainResult.receipt.gasUsed,
        timestamp: Date.now(),
        blockchainReference: {
          walletAddress: App.account,
          registrationTimestamp: Date.now(),
          transactionHash: blockchainResult.tx
        }
      }));

      // Update user status
      App.userStatus.email_verified = true;
      App.userStatus.registered = true;
      App.userStatus.in_progress = false;

      // Show success message
      $("#verificationForm").hide();
      $("#emailVerifiedSuccess").show();
      
      alert("Email verified successfully! Your data has been stored on the blockchain.");
    } catch (err) {
      console.error("Email verification failed", err);
      alert("Email verification failed: " + err.message);
    }
  },

  login: async function () {
    if (!App.isWalletConnected || !App.account) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      // Get session data
      const sessionData = JSON.parse(sessionStorage.getItem('userSessionData') || '{}');
      const blockchainData = JSON.parse(sessionStorage.getItem('blockchainData') || '{}');

      console.log("Logging in...");
      const response = await fetch(`${App.backendUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account,
          blockchainData: blockchainData,
          sessionData: sessionData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const result = await response.json();
      console.log("Login successful:", result);

      // Update user status
      App.userStatus = result.user;
      
      // Store session data for future use
      if (result.sessionData) {
        sessionStorage.setItem('userSessionData', JSON.stringify(result.sessionData));
      }

      // Show success message
      $("#loginForm").hide();
      $("#loginSuccess").show();
      alert("Login successful! Welcome to the platform.");
      window.location.href = "index.html";
    } catch (err) {
      console.error("Login failed", err);
      alert("Login failed: " + err.message);
    }
  },

  resendVerificationCode: async function () {
    if (!App.isWalletConnected || !App.account) {
      alert("Please connect your wallet first.");
      return;
    }

    try {
      // Get email from session data
      const sessionData = sessionStorage.getItem('userSessionData');
      const parsedSessionData = sessionData ? JSON.parse(sessionData) : null;
      
      if (!parsedSessionData || !parsedSessionData.email) {
        throw new Error('Email not found in session data. Please restart the registration process.');
      }

      console.log("Resending verification code...");
      const response = await fetch(`${App.backendUrl}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: App.account,
          email: parsedSessionData.email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend verification code');
      }

      const result = await response.json();
      console.log("Verification code resent:", result);
      
      alert("New verification code sent! Please check your email.");
    } catch (err) {
      console.error("Failed to resend verification code", err);
      alert("Failed to resend verification code: " + err.message);
    }
  },

  // Debug function to help troubleshoot MetaMask issues
  debugMetaMask: function() {
    const debugInfo = $("#debugInfo");
    let info = [];
    
    info.push("=== MetaMask Debug Info ===");
    info.push(`window.ethereum: ${typeof window.ethereum !== 'undefined' ? 'Available' : 'Not available'}`);
    
    if (typeof window.ethereum !== 'undefined') {
      info.push(`ethereum.isMetaMask: ${window.ethereum.isMetaMask}`);
      info.push(`ethereum.chainId: ${window.ethereum.chainId || 'Not set'}`);
      info.push(`ethereum.networkVersion: ${window.ethereum.networkVersion || 'Not set'}`);
      
      // Test eth_accounts without requesting - with better error handling
      info.push("Checking current accounts...");
      window.ethereum.request({ method: 'eth_accounts' })
        .then(accounts => {
          info.push(`Current accounts: ${accounts.length > 0 ? accounts.join(', ') : 'None'}`);
          info.push(`App.account: ${App.account}`);
          info.push(`App.isWalletConnected: ${App.isWalletConnected}`);
          info.push(`App.webProvider: ${App.webProvider ? 'Initialized' : 'Not initialized'}`);
          info.push(`User Status: ${App.userStatus ? JSON.stringify(App.userStatus) : 'Not loaded'}`);
          debugInfo.html(info.join('<br>'));
        })
        .catch(error => {
          info.push(`eth_accounts error: ${error.message}`);
          info.push(`App.account: ${App.account}`);
          info.push(`App.isWalletConnected: ${App.isWalletConnected}`);
          info.push(`App.webProvider: ${App.webProvider ? 'Initialized' : 'Not initialized'}`);
          info.push(`User Status: ${App.userStatus ? JSON.stringify(App.userStatus) : 'Not loaded'}`);
          debugInfo.html(info.join('<br>'));
        });
    } else {
      info.push(`App.account: ${App.account}`);
      info.push(`App.isWalletConnected: ${App.isWalletConnected}`);
      info.push(`App.webProvider: ${App.webProvider ? 'Initialized' : 'Not initialized'}`);
      info.push(`User Status: ${App.userStatus ? JSON.stringify(App.userStatus) : 'Not loaded'}`);
      debugInfo.html(info.join('<br>'));
    }
  },

  // Helper function to check if contract is deployed on current network
  checkContractDeployment: async function() {
    try {
      if (!App.contracts.Registration) {
        console.log('Contract not initialized yet');
        return false;
      }
      
      const networkId = App.contracts.Registration.network_id;
      const networks = App.contracts.Registration.networks;
      
      console.log('Current network ID:', networkId);
      console.log('Available networks:', Object.keys(networks));
      
      if (!networks[networkId]) {
        console.error(`Contract not deployed on network ${networkId}`);
        return false;
      }
      
      console.log('Contract deployed on current network');
      return true;
    } catch (error) {
      console.error('Error checking contract deployment:', error);
      return false;
    }
  },
};

// Add Grant Permission to SP logic
App.grantPermissionToSP = function() {
  console.log('Grant Permission button clicked');
  
  // Show SP selection modal
  const spModal = `
    <div class="modal fade" id="spSelectionModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Select Service Provider to Grant Permission</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-md-4">
                <div class="card sp-card" onclick="App.selectSP('sp1', 'SP1 RideShare', 'http://localhost:5001')">
                  <div class="card-body text-center">
                    <i class="fas fa-car fa-3x text-primary mb-3"></i>
                    <h5>SP1 RideShare</h5>
                    <p class="text-muted">Standard Ride Sharing</p>
                    <small>Port: 5001</small>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card sp-card" onclick="App.selectSP('sp2', 'SP2 Premium Rides', 'http://localhost:5002')">
                  <div class="card-body text-center">
                    <i class="fas fa-crown fa-3x text-success mb-3"></i>
                    <h5>SP2 Premium Rides</h5>
                    <p class="text-muted">Premium Ride Sharing</p>
                    <small>Port: 5002</small>
                  </div>
                </div>
              </div>
              <div class="col-md-4">
                <div class="card sp-card" onclick="App.selectSP('sp3', 'SP3 Budget Rides', 'http://localhost:5003')">
                  <div class="card-body text-center">
                    <i class="fas fa-motorcycle fa-3x text-warning mb-3"></i>
                    <h5>SP3 Budget Rides</h5>
                    <p class="text-muted">Budget Ride Sharing</p>
                    <small>Port: 5003</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  console.log('Creating SP selection modal');
  
  // Remove existing modal if any
  $('#spSelectionModal').remove();
  
  // Add modal to body
  $('body').append(spModal);
  
  console.log('Showing SP selection modal');
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('spSelectionModal'));
  modal.show();
};

// Select SP and redirect to OAuth
App.selectSP = function(spId, spName, spUrl) {
  const clientId = `${spId}_client_123`;
  const redirectUri = encodeURIComponent('http://localhost:8080/index.html');
  const oauthUrl = `${spUrl}/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${App.account}`;
  
  // Store selected SP info
  localStorage.setItem('selected_sp', JSON.stringify({
    id: spId,
    name: spName,
    url: spUrl
  }));
  
  // Close modal and redirect to SP's login page
  bootstrap.Modal.getInstance(document.getElementById('spSelectionModal')).hide();
  
  // Show loading message
  const loadingModal = `
    <div class="modal fade" id="loadingModal" tabindex="-1" data-bs-backdrop="static">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-body text-center">
            <div class="spinner-border text-primary mb-3" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
            <h5>Redirecting to ${spName}</h5>
            <p class="text-muted">You will be redirected to ${spName}'s login page to authenticate.</p>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  $('#loadingModal').remove();
  
  // Add modal to body
  $('body').append(loadingModal);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('loadingModal'));
  modal.show();
  
  // Redirect after a short delay
  setTimeout(() => {
    window.location.href = oauthUrl;
  }, 2000);
};

// Show aggregated booking interface with all SP results
App.showAggregatedBookingInterface = function(data) {
  const modalId = 'aggregatedBookingModal';
  
  // Prepare all rides from all SPs
  const allRides = [];
  data.bookingInfo.forEach(spInfo => {
    if (spInfo.rides && spInfo.rides.length > 0) {
      spInfo.rides.forEach(ride => {
        allRides.push({
          ...ride,
          serviceProvider: spInfo.serviceProvider,
          providerSessionId: spInfo.providerSessionId,
          lockedFare: spInfo.lockedFare,
          accessToken: spInfo.accessToken,
          privacyApplied: spInfo.privacyApplied,
          epsilon: spInfo.epsilon
        });
      });
    }
  });
  
  // Generate sample rides if none available
  if (allRides.length === 0) {
    data.bookingInfo.forEach(spInfo => {
      allRides.push({
        driverName: `${spInfo.serviceProvider} Driver`,
        vehicleType: 'Sedan',
        vehicleNumber: `${spInfo.serviceProvider.toUpperCase()}-1234`,
        price: spInfo.lockedFare || 150.00,
        estimatedTime: Math.floor(Math.random() * 15) + 5,
        currentLocation: { address: 'Gulshan-1, Dhaka' },
        destination: { address: 'Banani, Dhaka' },
        serviceProvider: spInfo.serviceProvider,
        providerSessionId: spInfo.providerSessionId,
        lockedFare: spInfo.lockedFare,
        accessToken: spInfo.accessToken,
        privacyApplied: spInfo.privacyApplied,
        epsilon: spInfo.epsilon
      });
    });
  }

  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">🚗 Available Rides from All Service Providers</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-info">
              <strong>Session ID:</strong> ${data.aggregatorSessionId}<br>
              <strong>Permitted SPs:</strong> ${data.permittedSPs}<br>
              <strong>Expires:</strong> ${new Date(data.sessionExpiresAt).toLocaleString()}<br>
              <strong>Total Rides Found:</strong> ${allRides.length}
            </div>
            
            <div class="row">
              ${allRides.map((ride, index) => `
                <div class="col-md-6 mb-3">
                  <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                      <span class="badge bg-primary">${ride.serviceProvider.toUpperCase()}</span>
                      ${ride.privacyApplied ? `<span class="badge bg-success">DP Applied (ε=${ride.epsilon})</span>` : ''}
                    </div>
                    <div class="card-body">
                      <h6 class="card-title">${ride.driverName}</h6>
                      <p class="card-text">
                        <strong>Vehicle:</strong> ${ride.vehicleType} (${ride.vehicleNumber})<br>
                        <strong>Price:</strong> ৳${ride.price.toFixed(2)}<br>
                        <strong>Locked Fare:</strong> ৳${ride.lockedFare.toFixed(2)}<br>
                        <strong>ETA:</strong> ${ride.estimatedTime} minutes<br>
                        <strong>From:</strong> ${ride.currentLocation.address}<br>
                        <strong>To:</strong> ${ride.destination.address}
                      </p>
                      <div class="alert alert-warning">
                        <small><strong>Note:</strong> Booking will redirect you to ${ride.serviceProvider.toUpperCase()}'s landing page with the locked fare.</small>
                      </div>
                    </div>
                    <div class="card-footer">
                      <button class="btn btn-primary btn-sm w-100" onclick="App.bookRideWithSession('${ride.serviceProvider}', '${ride.providerSessionId}', ${ride.lockedFare}, '${ride.accessToken}', '${data.aggregatorSessionId}')">
                        <i class="fas fa-car"></i> Book Now - ৳${ride.lockedFare.toFixed(2)}
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
};

// Book ride with proper session management
App.bookRideWithSession = async function(serviceProvider, providerSessionId, lockedFare, accessToken, aggregatorSessionId) {
  try {
    const walletAddress = App.account;
    
    console.log(`[BOOKING] Booking with ${serviceProvider}:`, {
      providerSessionId,
      lockedFare,
      aggregatorSessionId
    });
    
    // Book the ride with session management
    const bookingResponse = await fetch('http://localhost:3002/book-ride', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        aggregatorSessionId,
        provider: serviceProvider,
        walletAddress, 
        providerSessionId,
        accessToken
      })
    });
    
    const bookingData = await bookingResponse.json();
    
    // Close booking modal
    bootstrap.Modal.getInstance(document.getElementById('aggregatedBookingModal')).hide();
    
    if (bookingData.success) {
      console.log('Booking successful:', bookingData);
      
      // Show booking confirmation with redirect to SP landing page
      App.showBookingConfirmationWithRedirect(bookingData, serviceProvider);
    } else {
      alert(`Booking failed: ${bookingData.error}`);
    }
    
  } catch (error) {
    console.error('Booking error:', error);
    alert(`Booking failed: ${error.message}`);
  }
};

// Show booking confirmation with redirect to SP landing page
App.showBookingConfirmationWithRedirect = function(bookingData, serviceProvider) {
  const modalId = 'bookingConfirmationModal';
  
  // Map service provider to their landing page URL
  const spUrls = {
    'sp1': 'http://localhost:5001',
    'sp2': 'http://localhost:5002', 
    'sp3': 'http://localhost:5003'
  };
  
  const spUrl = spUrls[serviceProvider] || 'http://localhost:5001';
  
  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">🎉 Booking Confirmed!</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-success">
              <h6>Booking Details:</h6>
              <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
              <p><strong>Driver:</strong> ${bookingData.driverInfo?.name || bookingData.driverName || 'Driver Name'}</p>
              <p><strong>Vehicle:</strong> ${bookingData.driverInfo?.vehicleType || bookingData.vehicleType || 'Vehicle Type'}</p>
              <p><strong>Vehicle Number:</strong> ${bookingData.driverInfo?.vehicleNumber || 'N/A'}</p>
              <p><strong>Fare:</strong> ৳${bookingData.fare.toFixed(2)}</p>
              <p><strong>ETA:</strong> ${bookingData.driverInfo?.estimatedTime || bookingData.estimatedTime || 'N/A'} minutes</p>
              <p><strong>Service Provider:</strong> ${serviceProvider.toUpperCase()}</p>
            </div>
            <div class="text-center">
              <p class="text-muted">You will be redirected to ${serviceProvider.toUpperCase()}'s landing page to complete your booking details.</p>
              <div class="d-grid gap-2">
                <a href="${bookingData.bookingUrl}" target="_blank" class="btn btn-primary">
                  <i class="fas fa-external-link-alt"></i> View Booking Details
                </a>
                <button class="btn btn-success" onclick="window.open('${spUrl}', '_blank')">
                  <i class="fas fa-car"></i> Go to ${serviceProvider.toUpperCase()} Landing Page
                </button>
                <button class="btn btn-secondary" data-bs-dismiss="modal">
                  Stay on DApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
  
  // Auto-redirect to SP landing page after 3 seconds
  setTimeout(() => {
    window.open(spUrl, '_blank');
  }, 3000);
};

// Show booking interface with ride results and session data
App.showBookingInterface = function(spId, spName, rides, sessionId, providerSessionId) {
  const modalId = 'bookingModal';
  
  // Generate sample rides if none provided (for demo purposes)
  const sampleRides = rides && rides.length > 0 ? rides : [
    {
      driverName: 'Ahmed Khan',
      vehicleType: 'Sedan',
      vehicleNumber: 'DHK-1234',
      price: 150.00,
      estimatedTime: 8,
      currentLocation: { address: 'Gulshan-1, Dhaka' },
      destination: { address: 'Banani, Dhaka' }
    },
    {
      driverName: 'Rahim Ali',
      vehicleType: 'SUV',
      vehicleNumber: 'DHK-5678',
      price: 180.00,
      estimatedTime: 12,
      currentLocation: { address: 'Dhanmondi, Dhaka' },
      destination: { address: 'Mohakhali, Dhaka' }
    }
  ];

  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">${spName} - Available Rides</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${sessionId ? `<div class="alert alert-info">Session ID: ${sessionId}</div>` : ''}
            <div class="row">
              ${sampleRides.map((ride, index) => `
                <div class="col-md-6 mb-3">
                  <div class="card">
                    <div class="card-body">
                      <h6 class="card-title">${ride.driverName}</h6>
                      <p class="card-text">
                        <strong>Vehicle:</strong> ${ride.vehicleType} (${ride.vehicleNumber})<br>
                        <strong>Price:</strong> ৳${ride.price.toFixed(2)}<br>
                        <strong>ETA:</strong> ${ride.estimatedTime} minutes<br>
                        <strong>From:</strong> ${ride.currentLocation.address}<br>
                        <strong>To:</strong> ${ride.destination.address}
                      </p>
                      <button class="btn btn-primary btn-sm" onclick="App.bookRide('${spId}', '${spName}', '${ride._id || 'ride_' + index}', ${ride.price}, '${sessionId}', '${providerSessionId}')">
                        Book Now
                      </button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
};

// Book a specific ride with Advanced Fare Locking
App.bookRide = async function(spId, spName, rideId, fare, sessionId, providerSessionId) {
  try {
    const walletAddress = App.account;
    
    // Get access token for the service provider
    const tokenResponse = await fetch(`http://localhost:3002/get-token?walletAddress=${walletAddress}&serviceProvider=${spId}`);
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.success) {
      throw new Error('No access token found for this service provider');
    }
    
    const accessToken = tokenData.token.accessToken;
    
    console.log(`[BOOKING] Booking ride with session: ${sessionId}, provider session: ${providerSessionId}, fare: ${fare}`);
    
    // Book the ride with advanced fare locking
    const bookingResponse = await fetch('http://localhost:3002/book-ride', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        aggregatorSessionId: sessionId,
        provider: spId,
        walletAddress,
        providerSessionId,
        accessToken
      })
    });
    
    const bookingData = await bookingResponse.json();
    
    // Close booking modal
    bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
    
    if (bookingData.success) {
      // Show booking confirmation
      App.showBookingConfirmation(bookingData);
    } else {
      alert(`Booking failed: ${bookingData.error}`);
    }
    
  } catch (error) {
    console.error('Booking error:', error);
    alert(`Booking failed: ${error.message}`);
  }
};

// Show booking confirmation
App.showBookingConfirmation = function(bookingData) {
  const modalId = 'bookingConfirmationModal';
  const modalHtml = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="${modalId}Label">🎉 Booking Confirmed!</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="alert alert-success">
              <h6>Booking Details:</h6>
              <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
              <p><strong>Driver:</strong> ${bookingData.driverInfo?.name || bookingData.driverName || 'Driver Name'}</p>
              <p><strong>Vehicle:</strong> ${bookingData.driverInfo?.vehicleType || bookingData.vehicleType || 'Vehicle Type'}</p>
              <p><strong>Vehicle Number:</strong> ${bookingData.driverInfo?.vehicleNumber || 'N/A'}</p>
              <p><strong>Fare:</strong> ৳${bookingData.fare.toFixed(2)}</p>
              <p><strong>ETA:</strong> ${bookingData.driverInfo?.estimatedTime || bookingData.estimatedTime || 'N/A'} minutes</p>
            </div>
            <div class="text-center">
              <a href="${bookingData.bookingUrl}" target="_blank" class="btn btn-primary">
                View Booking Details
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
};

// Show booking history
App.showBookingHistory = async function() {
  try {
    const walletAddress = App.account;
    
    const response = await fetch(`http://localhost:3002/bookings/${walletAddress}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch booking history');
    }
    
    const modalId = 'bookingHistoryModal';
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${modalId}Label">📋 Booking History</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${data.bookings.length === 0 ? 
                '<div class="alert alert-info">No booking history found.</div>' :
                data.bookings.map(booking => `
                  <div class="card mb-3">
                    <div class="card-body">
                      <div class="row">
                        <div class="col-md-8">
                          <h6 class="card-title">Booking ID: ${booking.bookingId}</h6>
                          <p class="card-text">
                            <strong>Service Provider:</strong> ${booking.serviceProvider}<br>
                            <strong>Status:</strong> <span class="badge bg-${booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'secondary'}">${booking.status}</span><br>
                            <strong>Fare:</strong> ৳${booking.fare.toFixed(2)}<br>
                            <strong>Driver:</strong> ${booking.driverInfo.name}<br>
                            <strong>Vehicle:</strong> ${booking.driverInfo.vehicleType}<br>
                            <strong>Booked:</strong> ${new Date(booking.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div class="col-md-4 text-end">
                          <a href="${booking.bookingUrl}" target="_blank" class="btn btn-primary btn-sm">
                            View Details
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
    
  } catch (error) {
    console.error('Error fetching booking history:', error);
    alert(`Failed to load booking history: ${error.message}`);
  }
};

// Show permission management interface
App.showPermissionManagement = async function() {
  try {
    const walletAddress = App.account;
    const response = await fetch(`http://localhost:3002/permissions/${walletAddress}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch permissions');
    }
    
    let permissionsHtml = '';
    
    if (data.permissions.length === 0) {
      permissionsHtml = '<div class="alert alert-info">No permissions granted yet.</div>';
    } else {
      permissionsHtml = data.permissions.map(permission => `
        <div class="card mb-3">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-6">
                <h6 class="card-title">${permission.serviceProvider.toUpperCase()}</h6>
                <p class="card-text text-muted">
                  <small>
                    <strong>Granted:</strong> ${new Date(permission.grantedAt).toLocaleDateString()}<br>
                    <strong>Expires:</strong> ${new Date(permission.expiresAt).toLocaleDateString()}
                  </small>
                </p>
              </div>
              <div class="col-md-6 text-end">
                <span class="badge bg-success me-2">Active</span>
                <button class="btn btn-danger btn-sm" onclick="App.revokePermission('${permission.serviceProvider}')">
                  <i class="fas fa-ban"></i> Revoke
                </button>
              </div>
            </div>
          </div>
        </div>
      `).join('');
    }
    
    $('#permissionsList').html(permissionsHtml);
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('permissionManagementModal'));
    modal.show();
    
  } catch (error) {
    console.error('Error loading permissions:', error);
    $('#permissionsList').html('<div class="alert alert-danger">Error loading permissions</div>');
  }
};

// Revoke individual permission
App.revokePermission = function(serviceProvider) {
  try {
    // Store the service provider for confirmation
    App.pendingRevokeProvider = serviceProvider;
    
    // Show confirmation dialog
    if (confirm(`Are you sure you want to revoke permission from ${serviceProvider.toUpperCase()}?`)) {
      App.executeRevokePermission();
    }
  } catch (error) {
    console.error('Error in revokePermission:', error);
    alert('Error revoking permission');
  }
};

// Execute permission revocation
App.executeRevokePermission = async function() {
  try {
    const walletAddress = App.account;
    const serviceProvider = App.pendingRevokeProvider;
    
    const response = await fetch('http://localhost:3002/revoke-permission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress,
        serviceProvider
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Show success message
      alert(`Permission revoked from ${serviceProvider.toUpperCase()}`);
      
      // Refresh permissions list
      App.showManagePermissions();
    } else {
      alert('Failed to revoke permission: ' + data.error);
    }
  } catch (error) {
    console.error('Error revoking permission:', error);
    alert('Error revoking permission');
  }
};

// Show revoke all confirmation
App.showRevokeAllConfirmation = function() {
  // Hide permission management modal
  const permissionModal = bootstrap.Modal.getInstance(document.getElementById('permissionManagementModal'));
  permissionModal.hide();
  
  // Show revoke all confirmation modal
  const confirmModal = new bootstrap.Modal(document.getElementById('revokeAllConfirmationModal'));
  confirmModal.show();
};

// Revoke all permissions
App.revokeAllPermissions = async function() {
  try {
    const walletAddress = App.account;
    
    const response = await fetch('http://localhost:3002/revoke-all-permissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      // Hide confirmation modal
      const confirmModal = bootstrap.Modal.getInstance(document.getElementById('revokeAllConfirmationModal'));
      confirmModal.hide();
      
      // Show success message
      alert(`All permissions revoked successfully. Revoked: ${data.revokedProviders.join(', ')}`);
      
      // Refresh permissions list
      App.showPermissionManagement();
    } else {
      alert('Failed to revoke all permissions: ' + data.error);
    }
  } catch (error) {
    console.error('Error revoking all permissions:', error);
    alert('Error revoking all permissions');
  }
};

// Show booking history
App.showBookingHistory = function() {
  if (!App.account) {
    alert('Please connect your wallet first');
    return;
  }
  
  const modal = `
    <div class="modal fade" id="bookingHistoryModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Booking History</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div id="bookingHistoryContent">
              <div class="text-center">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p>Loading booking history...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  $('body').append(modal);
  $('#bookingHistoryModal').modal('show');
  
  // Fetch booking history
  fetch(`http://localhost:3002/bookings/${App.account}`)
    .then(response => response.json())
    .then(data => {
      let content = '';
      if (data.success && data.bookings && data.bookings.length > 0) {
        content = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Booking ID</th><th>Service Provider</th><th>Fare</th><th>Status</th><th>Date</th></tr></thead><tbody>';
        data.bookings.forEach(booking => {
          content += `<tr><td>${booking.bookingId}</td><td>${booking.serviceProvider}</td><td>$${booking.fare}</td><td><span class="badge bg-${booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'secondary'}">${booking.status}</span></td><td>${new Date(booking.createdAt).toLocaleDateString()}</td></tr>`;
        });
        content += '</tbody></table></div>';
      } else {
        content = '<div class="alert alert-info">No booking history found.</div>';
      }
      $('#bookingHistoryContent').html(content);
    })
    .catch(error => {
      console.error('Error fetching booking history:', error);
      $('#bookingHistoryContent').html('<div class="alert alert-danger">Failed to load booking history.</div>');
    });
  
  $('#bookingHistoryModal').on('hidden.bs.modal', function() {
    $(this).remove();
  });
};

// Show manage permissions
App.showManagePermissions = function() {
  if (!App.account) {
    alert('Please connect your wallet first');
    return;
  }
  
  const modal = `
    <div class="modal fade" id="managePermissionsModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Manage Permissions</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div id="permissionsContent">
              <div class="text-center">
                <div class="spinner-border" role="status">
                  <span class="visually-hidden">Loading...</span>
                </div>
                <p>Loading permissions...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  $('body').append(modal);
  $('#managePermissionsModal').modal('show');
  
  // Fetch current permissions
  fetch(`http://localhost:3002/permissions/${App.account}`)
    .then(response => response.json())
    .then(data => {
      let content = '';
      if (data.success && data.permissions && data.permissions.length > 0) {
        content = '<div class="table-responsive"><table class="table table-striped"><thead><tr><th>Service Provider</th><th>Status</th><th>Action</th></tr></thead><tbody>';
        data.permissions.forEach(permission => {
          content += `<tr><td>${permission.serviceProvider}</td><td><span class="badge bg-success">Active</span></td><td><button class="btn btn-sm btn-danger" onclick="App.revokePermission('${permission.serviceProvider}')">Revoke</button></td></tr>`;
        });
        content += '</tbody></table></div>';
      } else {
        content = '<div class="alert alert-info">No permissions found. Grant permissions to service providers to see them here.</div>';
      }
      $('#permissionsContent').html(content);
    })
    .catch(error => {
      console.error('Error fetching permissions:', error);
      $('#permissionsContent').html('<div class="alert alert-danger">Failed to load permissions.</div>');
    });
  
  $('#managePermissionsModal').on('hidden.bs.modal', function() {
    $(this).remove();
  });
};

// Helper: Parse query parameters from URL
function getQueryParams() {
  const params = {};
  window.location.search.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m, key, value) {
    params[key] = decodeURIComponent(value);
  });
  return params;
}

// Handle OAuth code on page load
async function handleOAuthCode() {
  const params = getQueryParams();
  if (params.code) {
    try {
      // Get selected SP info
      const selectedSP = JSON.parse(localStorage.getItem('selected_sp') || '{}');
      const spUrl = selectedSP.url || 'http://localhost:5001';
      const spId = selectedSP.id || 'sp1';
      const spName = selectedSP.name || 'SP1 RideShare';
      
      console.log('OAuth callback received for:', selectedSP);
      
      const clientId = `${spId}_client_123`;
      const clientSecret = `${spId}_secret_456`;
      
      console.log('Exchanging code for tokens with:', { spUrl, clientId, code: params.code });
      
      const response = await fetch(`${spUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&code=${encodeURIComponent(params.code)}&redirect_uri=${encodeURIComponent('http://localhost:8080/index.html')}&grant_type=authorization_code`
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Token exchange failed:', response.status, errorText);
        throw new Error(`Token exchange failed: ${response.status} - ${errorText}`);
      }
      
      const tokens = await response.json();
      console.log('Tokens received:', tokens);
      localStorage.setItem('oauth_tokens', JSON.stringify(tokens));
      
      // Always fetch wallet address from MetaMask after OAuth
      let walletAddress = App.account;
      if (!walletAddress || walletAddress === '0x0') {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          walletAddress = accounts && accounts[0] ? accounts[0] : '0x0';
        }
      }
      
      console.log('Storing token for wallet:', walletAddress, 'service provider:', spId);
      
      const tokenResponse = await fetch('http://localhost:3002/store-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          serviceProvider: spId,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiry: new Date(Date.now() + (tokens.expires_in || 3600) * 1000),
          metadata: tokens
        })
      });
      
      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Token storage failed:', tokenResponse.status, errorText);
        throw new Error(`Token storage failed: ${tokenResponse.status} - ${errorText}`);
      }
      
      const tokenResult = await tokenResponse.json();
      console.log('Token stored successfully:', tokenResult);
      
      alert(`OAuth tokens received from ${spName} and stored successfully!`);
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh user status to show updated permissions
      if (App.fetchUserStatus) {
        await App.fetchUserStatus();
      }
    } catch (err) {
      console.error('OAuth token exchange failed:', err);
      alert('OAuth token exchange failed: ' + err.message);
    }
  }
}

// When rendering user info:
function renderUserInfo(user) {
  const name = user.name || 'N/A';
  const email = user.email || 'N/A';
  const wallet = user.walletAddress || 'N/A';
  $("#userInfo").html(
    `<b>Name:</b> ${name}<br>` +
    `<b>Email:</b> ${email}<br>` +
    `<b>Wallet:</b> ${wallet}`
  );
}

// Initialize the application
$(document).ready(function() {
  console.log('🚀 App initialization started');
  
  // Test function to verify JavaScript is working
  window.testSearch = function() {
    console.log('🧪 Test function called!');
    alert('JavaScript is working! Search function should be available.');
    if (typeof App.searchRides === 'function') {
      console.log('✅ App.searchRides function exists');
    } else {
      console.log('❌ App.searchRides function not found');
    }
  };
  
  // Initialize Web3
  App.initWeb();
    
  // Initialize contract
  App.initContract();
  
  // Check if MetaMask is already connected
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts && accounts.length > 0) {
          App.account = accounts[0];
          App.isWalletConnected = true;
          App.onWalletConnected();
          // Update wallet status in navigation
          Core.updateWalletStatus();
        }
      })
      .catch(error => {
        console.log('No existing MetaMask connection:', error);
      });
  }
  
  // Handle OAuth callback on page load
  handleOAuthCode();
});

// Search for rides with aggregated session management
App.searchRides = async function() {
  console.log('🔍 searchRides function called!');
  console.log('📍 Current page URL:', window.location.href);
  console.log('🔧 App object:', App);
  
  const destination = document.getElementById('destination').value;
  const radius = document.getElementById('radius').value;
  
  console.log('Destination:', destination);
  console.log('Radius:', radius);
  console.log('App.account:', App.account);
  
  if (!destination) {
    alert('Please select a destination');
    return;
  }
  
  if (!App.account) {
    alert('Please connect your wallet first');
    return;
  }
  
  console.log('Searching for rides to:', destination, 'with radius:', radius);
  console.log('Current wallet address:', App.account);
  
  // Show loading state
  const searchBtn = document.querySelector('#searchForm button[type="submit"]');
  const originalText = searchBtn.innerHTML;
  searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Searching...';
  searchBtn.disabled = true;
  
  try {
    // Get coordinates for the destination
    const coordinates = App.getDestinationCoordinates(destination);
    console.log('Destination coordinates:', coordinates);
    
    const requestBody = { 
      walletAddress: App.account,
      query: {
        location: destination,
        lat: coordinates.lat,
        lon: coordinates.lng,
        radius: parseInt(radius),
        type: 'nearby'
      }
    };
    
    console.log('📤 Sending request to backend:', requestBody);
    
    // Query all permitted SPs with aggregated session
    const response = await fetch('http://localhost:3002/sp-query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', response.headers);
    
    const data = await response.json();
    console.log('Search response:', data);
    
    if (data.success) {
      console.log('✅ Search successful:', data);
      
      if (data.permittedSPs === 0) {
        alert('No permitted service providers found. Please grant permissions to SPs first using the "Grant Permission to Service Provider" button.');
        return;
      }
      
      // Show results in the SearchBookPage module
      if (typeof SearchBookPage !== 'undefined' && SearchBookPage.displaySearchResults) {
        SearchBookPage.displaySearchResults(data.bookingInfo);
      } else {
        // Fallback to original method
        App.showAggregatedBookingInterface(data);
      }
    } else {
      alert(`Search failed: ` + (data.error || 'Unknown error'));
    }
    
  } catch (err) {
    console.error('❌ Search error:', err);
    alert(`Search failed: ` + err.message);
  } finally {
    // Restore button state
    searchBtn.innerHTML = originalText;
    searchBtn.disabled = false;
  }
};

// Get coordinates for destinations
App.getDestinationCoordinates = function(destination) {
  const coordinates = {
    'Dhaka': { lat: 23.8103, lng: 90.4125 },
    'Gulshan': { lat: 23.7937, lng: 90.4066 },
    'Banani': { lat: 23.7937, lng: 90.4066 },
    'Dhanmondi': { lat: 23.7465, lng: 90.3706 },
    'Mohakhali': { lat: 23.7937, lng: 90.4066 },
    'Mirpur': { lat: 23.8069, lng: 90.3683 },
    'Uttara': { lat: 23.8709, lng: 90.3833 }
  };
  
  return coordinates[destination] || coordinates['Dhaka'];
};





