// Modern App Module - Integration with existing backend
const ModernApp = {
  webProvider: null,
  contracts: {},
  account: '0x0',
  backendUrl: 'http://localhost:3002',
  isWalletConnected: false,
  userStatus: null,

  // Initialize Web3
  initWeb3: async function() {
    console.log('Initializing Web3...');
    console.log('window.ethereum available:', typeof window.ethereum !== 'undefined');
    
    if (typeof window.ethereum !== 'undefined') {
      // Use window.ethereum directly to avoid deprecation warnings
      this.webProvider = new Web3(window.ethereum);
      console.log('MetaMask is installed!');
      console.log('MetaMask provider:', window.ethereum);
      
      // Set up MetaMask event listeners
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('Account changed:', accounts);
        if (accounts.length > 0) {
          this.account = accounts[0];
          this.isWalletConnected = true;
          ModernCore.updateWalletStatus();
          this.onWalletConnected();
        } else {
          this.account = '0x0';
          this.isWalletConnected = false;
          ModernCore.updateWalletStatus();
          this.onWalletDisconnected();
        }
      });

      window.ethereum.on('chainChanged', (chainId) => {
        console.log('Network changed:', chainId);
        const networkId = parseInt(chainId, 16);
        if (this.contracts.Registration) {
          this.contracts.Registration.setNetwork(networkId);
          console.log('Contract network updated to:', networkId);
        }
      });

      window.ethereum.on('disconnect', (error) => {
        console.log('MetaMask disconnected:', error);
        this.account = '0x0';
        this.isWalletConnected = false;
        ModernCore.updateWalletStatus();
        this.onWalletDisconnected();
      });
      
    } else {
      this.webProvider = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
      console.log('No web3 instance detected, falling back to local provider');
    }
    
    return this.initContract();
  },

  // Initialize contract
  initContract: function() {
    return new Promise((resolve, reject) => {
      fetch("Registration.json")
        .then(response => response.json())
        .then(registration => {
          this.contracts.Registration = TruffleContract(registration);
          
          if (window.ethereum) {
            this.contracts.Registration.setProvider(window.ethereum);
          } else if (this.webProvider) {
            this.contracts.Registration.setProvider(this.webProvider.provider);
          }
          
          // Get network ID safely
          try {
            if (window.ethereum && window.ethereum.chainId) {
              const networkId = parseInt(window.ethereum.chainId, 16);
              this.contracts.Registration.setNetwork(networkId);
              console.log('Contract initialized with network ID:', networkId);
            } else {
              // Fallback: try to get network ID from provider
              this.webProvider.eth.net.getId().then(networkId => {
                this.contracts.Registration.setNetwork(networkId);
                console.log('Contract initialized with network ID:', networkId);
              }).catch(error => {
                console.log('Could not get network ID from provider:', error);
              });
            }
          } catch (error) {
            console.log('Could not determine network ID, using default');
          }
          
          console.log('Contract initialized successfully');
          resolve();
        })
        .catch(error => {
          console.error('Contract initialization failed:', error);
          reject(error);
        });
    });
  },

  // Connect wallet
  connectWallet: async function() {
    console.log('connectWallet called');
    
    if (typeof window.ethereum !== 'undefined') {
      try {
        console.log('Requesting MetaMask accounts...');
        
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MetaMask request timeout - check if MetaMask is unlocked and try again')), 10000)
        );
        
        const accounts = await Promise.race([
          window.ethereum.request({ 
            method: 'eth_requestAccounts',
            params: []
          }),
          timeoutPromise
        ]);
        
        console.log('MetaMask response:', accounts);
        
        if (accounts && accounts.length > 0) {
          this.account = accounts[0];
          this.isWalletConnected = true;
          ModernCore.updateWalletStatus();
          await this.onWalletConnected();
          console.log('Wallet connected successfully:', this.account);
        } else {
          throw new Error('No accounts returned from MetaMask');
        }
      } catch (error) {
        console.error("MetaMask connection failed", error);
        
        ModernCore.updateWalletStatus();
        
        if (error.code === 4001) {
          ModernCore.showNotification("MetaMask connection was rejected. Please click 'Connect Wallet' again and approve the connection.", 'error');
        } else if (error.code === -32002) {
          ModernCore.showNotification("A MetaMask connection request is already pending. Please check your MetaMask extension and approve the connection.", 'error');
        } else if (error.message.includes('timeout')) {
          ModernCore.showNotification("MetaMask connection timed out. Please check:\n1. MetaMask is unlocked\n2. You have accounts available\n3. MetaMask is not blocked by browser", 'error');
        } else {
          ModernCore.showNotification("Failed to connect to MetaMask: " + (error.message || 'Unknown error'), 'error');
        }
      }
    } else {
      ModernCore.showNotification("MetaMask is not installed. Please install MetaMask and try again.", 'error');
    }
  },

  // On wallet connected
  onWalletConnected: async function() {
    console.log('Wallet connected, checking user status...');
    console.log('Current App.account:', this.account);
    
    try {
      // Step 1: Create user entry in MongoDB (if doesn't exist)
      const response = await fetch(`${this.backendUrl}/connect-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: this.account
        })
      });

      if (!response.ok) {
        throw new Error('Failed to connect wallet to backend');
      }

              // Step 2: Always fetch fresh user status from database
        await this.fetchUserStatus();
        
        // Step 3: Update wallet status after user status is fetched
        ModernCore.updateWalletStatus();
    } catch (error) {
      console.error('Error in onWalletConnected:', error);
      ModernCore.showNotification('Failed to connect wallet: ' + error.message, 'error');
    }
  },

  // Fetch user status
  fetchUserStatus: async function() {
    console.log('fetchUserStatus called with App.account:', this.account);
    
    try {
      const response = await fetch(`${this.backendUrl}/user-status/${this.account}`);
      console.log('User status response:', response.status, response.ok);
      
      if (response.ok) {
        const userStatus = await response.json();
        console.log('Fetched user status:', userStatus);
        this.userStatus = userStatus;
        
        // Refresh page state if needed
        if (ModernCore.currentPage === 'dashboard') {
          ModernDashboard.show();
        }
      } else {
        console.log('User not found or not registered');
        this.userStatus = null;
      }
    } catch (error) {
      console.error('Error fetching user status:', error);
      this.userStatus = null;
    }
  },

  // On wallet disconnected
  onWalletDisconnected: function() {
    console.log('Wallet disconnected');
    this.userStatus = null;
    
    // Hide logout button
    document.getElementById('logoutNavItem').style.display = 'none';
    
    // Refresh current page
    if (ModernCore.currentPage === 'dashboard') {
      ModernDashboard.show();
    }
  },

  // Logout function
  logout: function() {
    console.log('Logging out...');
    
    // Clear user status
    this.userStatus = null;
    
    // Clear any stored tokens
    localStorage.removeItem('oauth_tokens');
    localStorage.removeItem('selected_sp');
    
    // Hide logout button
    document.getElementById('logoutNavItem').style.display = 'none';
    
    // Update wallet status
    ModernCore.updateWalletStatus();
    
    // Show success message
    ModernCore.showNotification('Logged out successfully!', 'success');
    
    // Redirect to dashboard
    showPage('dashboard');
  },

  // Register user (calls original App function)
  registerUser: async function() {
    const name = document.getElementById('user_name').value;
    const phone = document.getElementById('user_phone').value;
    const email = document.getElementById('user_email').value;
    
    if (!name || !phone || !email) {
      throw new Error('Please fill in all fields');
    }
    
    // Call the original registration logic
    const response = await fetch(`${this.backendUrl}/register-user`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: this.account,
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
    console.log('Registration result:', result);
    
    // Refresh user status
    await this.fetchUserStatus();
    
    return result;
  },

  // Grant permission to SP (calls original App function)
  grantPermissionToSP: function() {
    console.log('Granting permission to SP...');
    
    // Show SP selection modal
    const modalContent = `
      <div class="row">
        <div class="col-md-4 mb-3">
          <div class="card sp-card" onclick="ModernApp.selectSP('sp1', 'SP1 RideShare', 'http://localhost:5001')">
            <div class="card-body text-center">
              <i class="fas fa-car fa-3x text-primary mb-3"></i>
              <h5>SP1 RideShare</h5>
              <p class="text-muted">Standard ride-sharing service</p>
              <small class="text-primary">Click to connect</small>
            </div>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card sp-card" onclick="ModernApp.selectSP('sp2', 'SP2 Premium', 'http://localhost:5002')">
            <div class="card-body text-center">
              <i class="fas fa-crown fa-3x text-warning mb-3"></i>
              <h5>SP2 Premium</h5>
              <p class="text-muted">Premium ride-sharing service</p>
              <small class="text-primary">Click to connect</small>
            </div>
          </div>
        </div>
        <div class="col-md-4 mb-3">
          <div class="card sp-card" onclick="ModernApp.selectSP('sp3', 'SP3 Budget', 'http://localhost:5003')">
            <div class="card-body text-center">
              <i class="fas fa-piggy-bank fa-3x text-success mb-3"></i>
              <h5>SP3 Budget</h5>
              <p class="text-muted">Budget-friendly ride-sharing</p>
              <small class="text-primary">Click to connect</small>
            </div>
          </div>
        </div>
      </div>
    `;

    ModernCore.showModal('Select Service Provider', modalContent, [
      { text: 'Cancel', class: 'btn-secondary' }
    ]);
  },

  // Select SP
  selectSP: function(spId, spName, spUrl) {
    console.log(`Selected SP: ${spId} - ${spName}`);
    
    // Store selected SP info
    localStorage.setItem('selected_sp', JSON.stringify({
      id: spId,
      name: spName,
      url: spUrl
    }));
    
    // Redirect to OAuth
    const oauthUrl = `${spUrl}/oauth/authorize?client_id=${spId}_client_123&redirect_uri=${encodeURIComponent('http://localhost:8080/index.html')}&response_type=code&scope=read&state=${this.account}`;
    window.location.href = oauthUrl;
  },

  // Search rides (calls original App function)
  searchRides: async function() {
    console.log('🔍 searchRides function called!');
    
    const destination = document.getElementById('destination').value;
    const radius = document.getElementById('radius').value;
    
    console.log('Destination:', destination);
    console.log('Radius:', radius);
    console.log('App.account:', this.account);
    
    if (!destination) {
      throw new Error('Please select a destination');
    }
    
    if (!this.account) {
      throw new Error('Please connect your wallet first');
    }
    
    console.log('Searching for rides to:', destination, 'with radius:', radius);
    console.log('Current wallet address:', this.account);
    
    // Get coordinates for the destination
    const coordinates = this.getDestinationCoordinates(destination);
    console.log('Destination coordinates:', coordinates);
    
    const requestBody = { 
      walletAddress: this.account,
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
    const response = await fetch(`${this.backendUrl}/sp-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('Search response:', data);
    
    if (data.success) {
      console.log('✅ Search successful:', data);
      
      if (data.permittedSPs === 0) {
        throw new Error('No permitted service providers found. Please grant permissions to SPs first using the "Connect Service Providers" button.');
      }
      
      // Show results in the SearchBookPage module
      if (typeof ModernSearchBook !== 'undefined' && ModernSearchBook.displaySearchResults) {
        ModernSearchBook.displaySearchResults(data.bookingInfo);
      } else {
        // Fallback to original method
        this.showAggregatedBookingInterface(data);
      }
    } else {
      throw new Error(data.error || 'Search failed');
    }
  },

  // Get coordinates for destinations
  getDestinationCoordinates: function(destination) {
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
  },

  // Show aggregated booking interface (fallback)
  showAggregatedBookingInterface: function(data) {
    console.log('Showing aggregated booking interface:', data);
    ModernCore.showNotification('Search completed! Check the results below.', 'success');
  }
};

// Handle OAuth callback on page load
async function handleOAuthCode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('code')) {
    try {
      // Get selected SP info
      const selectedSP = JSON.parse(localStorage.getItem('selected_sp') || '{}');
      const spUrl = selectedSP.url || 'http://localhost:5001';
      const spId = selectedSP.id || 'sp1';
      const spName = selectedSP.name || 'SP1 RideShare';
      
      console.log('OAuth callback received for:', selectedSP);
      
      const clientId = `${spId}_client_123`;
      const clientSecret = `${spId}_secret_456`;
      
      console.log('Exchanging code for tokens with:', { spUrl, clientId, code: params.get('code') });
      
      const response = await fetch(`${spUrl}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `client_id=${clientId}&client_secret=${clientSecret}&code=${encodeURIComponent(params.get('code'))}&redirect_uri=${encodeURIComponent('http://localhost:8080/index.html')}&grant_type=authorization_code`
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
      let walletAddress = ModernApp.account;
      if (!walletAddress || walletAddress === '0x0') {
        if (window.ethereum) {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          walletAddress = accounts && accounts[0] ? accounts[0] : '0x0';
        }
      }
      
      console.log('Storing token for wallet:', walletAddress, 'service provider:', spId);
      
      const tokenResponse = await fetch(`${ModernApp.backendUrl}/store-token`, {
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
      
      ModernCore.showNotification(`OAuth tokens received from ${spName} and stored successfully!`, 'success');
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh user status to show updated permissions
      if (ModernApp.fetchUserStatus) {
        await ModernApp.fetchUserStatus();
      }
    } catch (err) {
      console.error('OAuth token exchange failed:', err);
      ModernCore.showNotification('OAuth token exchange failed: ' + err.message, 'error');
    }
  }
}

// Handle OAuth callback on page load
handleOAuthCode(); 