// Modern Registration Module
const ModernRegister = {
  
  // Show the registration page
  show: async function() {
    console.log('📝 Showing Modern Registration page');
    
    if (!ModernApp.isWalletConnected) {
      ModernCore.showError('Please connect your wallet first to access registration.');
      return;
    }
    
    try {
      // Check user status and show appropriate content
      const userStatus = await ModernCore.checkUserStatus();
      if (userStatus.registered && userStatus.email_verified) {
        this.showAlreadyRegistered(userStatus);
      } else if (userStatus.registered && !userStatus.email_verified) {
        this.showVerificationPending();
      } else {
        this.showRegistrationForm();
      }
    } catch (error) {
      console.log('User not registered, showing registration form');
      this.showRegistrationForm();
    }
  },

  // Show registration form
  showRegistrationForm: function() {
    const content = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h3><i class="fas fa-user-plus me-2"></i>Create Your Account</h3>
              </div>
              <div class="card-body">
                <div class="alert alert-info">
                  <h5><i class="fas fa-wallet me-2"></i>Wallet Connected</h5>
                  <p class="mb-0">Your wallet address: <code>${ModernApp.account}</code></p>
                </div>
                
                <form id="registrationForm" onsubmit="ModernRegister.submitRegistration(event)">
                  <div class="row">
                    <div class="col-md-6 mb-3">
                      <label for="user_name" class="form-label">Full Name</label>
                      <input type="text" class="form-control" id="user_name" placeholder="Enter your full name" required />
                    </div>
                    
                    <div class="col-md-6 mb-3">
                      <label for="user_phone" class="form-label">Phone Number</label>
                      <input type="tel" class="form-control" id="user_phone" placeholder="Enter phone number" pattern="[0-9]{10,15}" title="Enter valid phone number" required />
                    </div>
                  </div>
                  
                  <div class="mb-3">
                    <label for="user_email" class="form-label">Email Address</label>
                    <input type="email" class="form-control" id="user_email" placeholder="Enter email address" required />
                    <div class="form-text">We'll send a verification code to this email</div>
                  </div>
                  
                  <div class="d-grid">
                    <button type="submit" class="btn btn-primary btn-lg">
                      <i class="fas fa-paper-plane me-2"></i>Create Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  },

  // Submit registration
  submitRegistration: async function(event) {
    event.preventDefault();
    
    const name = document.getElementById('user_name').value;
    const phone = document.getElementById('user_phone').value;
    const email = document.getElementById('user_email').value;
    
    if (!name || !phone || !email) {
      ModernCore.showNotification('Please fill in all fields', 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner me-2"></div>Creating Account...';
    submitBtn.disabled = true;
    
    try {
      // Call the original App.registerUser function
      await ModernApp.registerUser();
      
      // Show success message
      ModernCore.showNotification('Registration submitted successfully! Check your email for verification.', 'success');
      
      // Show verification pending view
      setTimeout(() => {
        this.showVerificationPending();
      }, 2000);
      
    } catch (error) {
      console.error('Registration failed:', error);
      ModernCore.showNotification('Registration failed: ' + error.message, 'error');
      
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },

  // Show verification pending message
  showVerificationPending: function() {
    const content = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h3><i class="fas fa-clock me-2"></i>Email Verification Required</h3>
              </div>
              <div class="card-body text-center">
                <div class="alert alert-warning">
                  <h5><i class="fas fa-envelope me-2"></i>Check Your Email</h5>
                  <p>Your registration has been submitted successfully. Please check your email for a verification code.</p>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <button class="btn btn-primary btn-lg w-100" onclick="ModernRegister.openVerificationPage()">
                      <i class="fas fa-envelope-open me-2"></i>Go to Verification
                    </button>
                  </div>
                  <div class="col-md-6">
                    <button class="btn btn-outline btn-lg w-100" onclick="ModernRegister.show()">
                      <i class="fas fa-refresh me-2"></i>Refresh Status
                    </button>
                  </div>
                </div>
                
                <div class="mt-4">
                  <div class="card">
                    <div class="card-body">
                      <h6><i class="fas fa-info-circle me-2"></i>What happens next?</h6>
                      <ol class="text-start">
                        <li>Check your email for the verification code</li>
                        <li>Click "Go to Verification" to enter the code</li>
                        <li>Once verified, you can connect service providers</li>
                        <li>Start searching and booking rides!</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  },

  // Open verification page
  openVerificationPage: function() {
    window.open('verify.html', '_blank');
  },

  // Show already registered user
  showAlreadyRegistered: function(userStatus) {
    const content = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h3><i class="fas fa-check-circle text-success me-2"></i>Welcome Back!</h3>
              </div>
              <div class="card-body">
                <div class="alert alert-success">
                  <h5><i class="fas fa-user-check me-2"></i>Account Verified</h5>
                  <p>You are already registered and verified. Welcome back!</p>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-header">
                        <h6><i class="fas fa-user me-2"></i>Account Information</h6>
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
                  
                  <div class="col-md-6">
                    <div class="card">
                      <div class="card-header">
                        <h6><i class="fas fa-bolt me-2"></i>Quick Actions</h6>
                      </div>
                      <div class="card-body">
                        <div class="d-grid gap-2">
                          <button class="btn btn-success" onclick="showPage('sp-connect')">
                            <i class="fas fa-link me-2"></i>Connect Service Providers
                          </button>
                          <button class="btn btn-primary" onclick="showPage('search-book')">
                            <i class="fas fa-search me-2"></i>Search for Rides
                          </button>
                          <button class="btn btn-info" onclick="showPage('dashboard')">
                            <i class="fas fa-home me-2"></i>Go to Dashboard
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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