// Modern Dashboard Module
const ModernDashboard = {
  
  // Show the dashboard
  show: async function() {
    console.log('🏠 Showing Modern Dashboard');
    
    try {
      // Check wallet connection
      if (!ModernApp.isWalletConnected) {
        this.showConnectWalletView();
        return;
      }

      // Check user status
      const userStatus = await ModernCore.checkUserStatus();
      if (userStatus.registered && userStatus.email_verified) {
        this.showUserDashboard(userStatus);
      } else {
        this.showRegistrationPrompt();
      }
    } catch (error) {
      console.log('User not registered, showing registration prompt');
      this.showRegistrationPrompt();
    }
  },

  // Show connect wallet view
  showConnectWalletView: function() {
    const content = `
      <div class="container">
        <div class="dashboard-hero">
          <h1>Welcome to DApp</h1>
          <p>Connect your wallet to start your privacy-preserving ride-sharing journey</p>
          <button class="btn btn-light btn-lg" onclick="ModernApp.connectWallet()">
            <i class="fas fa-wallet me-2"></i>Connect Wallet
          </button>
        </div>
        
        <div class="row mt-5">
          <div class="col-md-4 mb-4">
            <div class="card feature-card">
              <div class="icon">
                <i class="fas fa-shield-alt"></i>
              </div>
              <h5>Privacy First</h5>
              <p>Your data is protected with differential privacy and blockchain security</p>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="card feature-card">
              <div class="icon">
                <i class="fas fa-car-side"></i>
              </div>
              <h5>Multiple Providers</h5>
              <p>Compare rides from multiple service providers in one place</p>
            </div>
          </div>
          <div class="col-md-4 mb-4">
            <div class="card feature-card">
              <div class="icon">
                <i class="fas fa-link"></i>
              </div>
              <h5>Easy Integration</h5>
              <p>Seamless OAuth integration with popular ride-sharing services</p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  },

  // Show registration prompt
  showRegistrationPrompt: function() {
    const content = `
      <div class="container">
        <div class="dashboard-hero">
          <h1>Complete Your Registration</h1>
          <p>You're almost ready! Complete your registration to access all features</p>
          <button class="btn btn-light btn-lg" onclick="showPage('register')">
            <i class="fas fa-user-plus me-2"></i>Complete Registration
          </button>
        </div>
        
        <div class="row mt-5">
          <div class="col-md-6 mb-4">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-info-circle me-2"></i>What's Next?</h5>
              </div>
              <div class="card-body">
                <ul class="list-unstyled">
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Complete registration form</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Verify your email address</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Connect service providers</li>
                  <li class="mb-2"><i class="fas fa-check text-success me-2"></i>Start searching for rides</li>
                </ul>
              </div>
            </div>
          </div>
          <div class="col-md-6 mb-4">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-shield-alt me-2"></i>Privacy Features</h5>
              </div>
              <div class="card-body">
                <ul class="list-unstyled">
                  <li class="mb-2"><i class="fas fa-lock text-primary me-2"></i>Differential privacy protection</li>
                  <li class="mb-2"><i class="fas fa-link text-primary me-2"></i>Blockchain-based permissions</li>
                  <li class="mb-2"><i class="fas fa-eye-slash text-primary me-2"></i>Data anonymization</li>
                  <li class="mb-2"><i class="fas fa-user-shield text-primary me-2"></i>User consent management</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  },

  // Show user dashboard
  showUserDashboard: function(userStatus) {
    const content = `
      <div class="container">
        <div class="dashboard-hero">
          <h1>Welcome back, ${userStatus.name || 'User'}!</h1>
          <p>Your privacy-preserving ride-sharing dashboard</p>
          <div class="row mt-4">
            <div class="col-md-3">
              <div class="stats-card">
                <div class="number">3</div>
                <div class="label">Service Providers</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stats-card">
                <div class="number">12</div>
                <div class="label">Total Rides</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stats-card">
                <div class="number">৳2,450</div>
                <div class="label">Total Spent</div>
              </div>
            </div>
            <div class="col-md-3">
              <div class="stats-card">
                <div class="number">4.8</div>
                <div class="label">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row mt-5">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-bolt me-2"></i>Quick Actions</h5>
              </div>
              <div class="card-body">
                <div class="row">
                  <div class="col-md-6 mb-3">
                    <button class="btn btn-primary w-100" onclick="showPage('search-book')">
                      <i class="fas fa-search me-2"></i>Search for Rides
                    </button>
                  </div>
                  <div class="col-md-6 mb-3">
                    <button class="btn btn-success w-100" onclick="showPage('sp-connect')">
                      <i class="fas fa-link me-2"></i>Manage SP Connections
                    </button>
                  </div>
                  <div class="col-md-6 mb-3">
                    <button class="btn btn-info w-100" onclick="ModernSearchBook.showBookingHistory()">
                      <i class="fas fa-history me-2"></i>View Booking History
                    </button>
                  </div>
                  <div class="col-md-6 mb-3">
                    <button class="btn btn-warning w-100" onclick="ModernSPConnect.showPermissionManagement()">
                      <i class="fas fa-cog me-2"></i>Manage Permissions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="col-md-4">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-user me-2"></i>Account Info</h5>
              </div>
              <div class="card-body">
                <div class="mb-3">
                  <strong>Name:</strong><br>
                  <span class="text-muted">${userStatus.name || 'N/A'}</span>
                </div>
                <div class="mb-3">
                  <strong>Email:</strong><br>
                  <span class="text-muted">${userStatus.email || 'N/A'}</span>
                </div>
                <div class="mb-3">
                  <strong>Wallet:</strong><br>
                  <code class="text-muted">${ModernApp.account}</code>
                </div>
                <div class="mb-3">
                  <strong>Status:</strong><br>
                  <span class="badge bg-success">Verified ✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="row mt-4">
          <div class="col-md-12">
            <div class="card">
              <div class="card-header">
                <h5><i class="fas fa-chart-line me-2"></i>Recent Activity</h5>
              </div>
              <div class="card-body">
                <div class="table-responsive">
                  <table class="table table-hover">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Service Provider</th>
                        <th>Destination</th>
                        <th>Fare</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Today</td>
                        <td>SP1 RideShare</td>
                        <td>Gulshan</td>
                        <td>৳150</td>
                        <td><span class="badge bg-success">Completed</span></td>
                      </tr>
                      <tr>
                        <td>Yesterday</td>
                        <td>SP2 Premium</td>
                        <td>Banani</td>
                        <td>৳200</td>
                        <td><span class="badge bg-success">Completed</span></td>
                      </tr>
                      <tr>
                        <td>2 days ago</td>
                        <td>SP3 Budget</td>
                        <td>Dhanmondi</td>
                        <td>৳120</td>
                        <td><span class="badge bg-success">Completed</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  }
}; 