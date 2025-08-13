// Register/Login Page Module
const RegisterPage = {
  
  // Show the register/login page
  show: function() {
    console.log('📝 Showing Register/Login page');
    
    if (!App.isWalletConnected) {
      Core.showError('Please connect your wallet first to access registration.');
      return;
    }
    
    // Check user status and show appropriate content
    Core.checkUserStatus()
      .then(userStatus => {
        if (userStatus.isRegistered && userStatus.isVerified) {
          this.showAlreadyRegistered(userStatus);
        } else if (userStatus.isRegistered && !userStatus.isVerified) {
          this.showVerificationPending();
        } else {
          this.showRegistrationForm();
        }
      })
      .catch(error => {
        console.log('User not registered, showing registration form');
        this.showRegistrationForm();
      });
  },

  // Show registration form
  showRegistrationForm: function() {
    $('#pageContent').html(`
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-user-plus"></i> User Registration</h3>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h5><i class="fas fa-wallet"></i> Wallet Connected</h5>
                <p>Your wallet address: <code>${App.account}</code></p>
              </div>
              
              <form id="registrationForm" onsubmit="RegisterPage.submitRegistration(); return false;">
                <div class="mb-3">
                  <label for="user_name" class="form-label">Full Name</label>
                  <input type="text" class="form-control" id="user_name" placeholder="Enter your full name" required />
                </div>
                
                <div class="mb-3">
                  <label for="user_phone" class="form-label">Phone Number</label>
                  <input type="tel" class="form-control" id="user_phone" placeholder="Enter phone number" pattern="[0-9]{10,15}" title="Enter valid phone number" required />
                </div>
                
                <div class="mb-3">
                  <label for="user_email" class="form-label">Email Address</label>
                  <input type="email" class="form-control" id="user_email" placeholder="Enter email address" required />
                </div>
                
                <button type="submit" class="btn btn-primary btn-lg w-100">
                  <i class="fas fa-paper-plane"></i> Submit Registration
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    `);
  },

  // Submit registration
  submitRegistration: function() {
    const name = $('#user_name').val();
    const phone = $('#user_phone').val();
    const email = $('#user_email').val();
    
    if (!name || !phone || !email) {
      alert('Please fill in all fields');
      return;
    }
    
    // Show loading
    $('#registrationForm button').prop('disabled', true).html('<i class="fas fa-spinner fa-spin"></i> Submitting...');
    
    // Call the original App.registerUser function
    App.registerUser();
  },

  // Show verification pending message
  showVerificationPending: function() {
    $('#pageContent').html(`
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-clock"></i> Email Verification Pending</h3>
            </div>
            <div class="card-body text-center">
              <div class="alert alert-warning">
                <h5><i class="fas fa-envelope"></i> Check Your Email</h5>
                <p>Your registration has been submitted successfully. Please check your email for a verification code.</p>
              </div>
              
              <button class="btn btn-primary btn-lg" onclick="window.location.href='verify.html'">
                <i class="fas fa-envelope-open"></i> Go to Email Verification
              </button>
              
              <div class="mt-3">
                <button class="btn btn-secondary" onclick="RegisterPage.show()">
                  <i class="fas fa-refresh"></i> Refresh Status
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  },

  // Show already registered user
  showAlreadyRegistered: function(userStatus) {
    $('#pageContent').html(`
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-check-circle text-success"></i> Welcome Back!</h3>
            </div>
            <div class="card-body">
              <div class="alert alert-success">
                <h5><i class="fas fa-user-check"></i> Already Registered and Verified</h5>
                <p>You are already registered and verified. Welcome back!</p>
              </div>
              
              <div class="user-info bg-light p-3 rounded mb-4">
                <h6><i class="fas fa-info-circle"></i> User Information</h6>
                <div class="row">
                  <div class="col-md-6">
                    <p><strong>Name:</strong> ${userStatus.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${userStatus.email || 'N/A'}</p>
                  </div>
                  <div class="col-md-6">
                    <p><strong>Wallet:</strong> <code>${App.account}</code></p>
                    <p><strong>Status:</strong> <span class="badge bg-success">Registered and Verified ✓</span></p>
                  </div>
                </div>
              </div>
              
              <div class="text-center">
                <button class="btn btn-success me-2" onclick="showPage('sp-connect')">
                  <i class="fas fa-link"></i> Manage SP Connections
                </button>
                <button class="btn btn-info" onclick="showPage('search-book')">
                  <i class="fas fa-search"></i> Search for Rides
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
  }
}; 