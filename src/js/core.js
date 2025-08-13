// Core functionality for the modular application
const Core = {
  currentPage: 'welcome',
  
  // Initialize the application
  init: function() {
    console.log('🚀 Core initialization started');
    this.setupNavigation();
    this.updateWalletStatus();
  },

  // Setup navigation functionality
  setupNavigation: function() {
    // Add active class to current nav item
    $('.nav-link').on('click', function() {
      $('.nav-link').removeClass('active');
      $(this).addClass('active');
    });
  },

  // Update wallet status in navigation
  updateWalletStatus: function() {
    if (App.isWalletConnected && App.account !== '0x0') {
      $('#walletStatusText').text(App.account.substring(0, 6) + '...' + App.account.substring(38));
      $('#walletStatus').removeClass('text-warning').addClass('text-success');
    } else {
      $('#walletStatusText').text('Not Connected');
      $('#walletStatus').removeClass('text-success').addClass('text-warning');
    }
  },

  // Show loading spinner
  showLoading: function(message = 'Loading...') {
    $('#pageContent').html(`
      <div class="text-center">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-3">${message}</p>
      </div>
    `);
  },

  // Show error message
  showError: function(message) {
    $('#pageContent').html(`
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Error!</h4>
        <p>${message}</p>
        <hr>
        <button class="btn btn-primary" onclick="showPage('welcome')">Go Back</button>
      </div>
    `);
  },

  // Check if user is registered and verified
  checkUserStatus: function() {
    return new Promise((resolve, reject) => {
      if (!App.isWalletConnected || App.account === '0x0') {
        reject('Wallet not connected');
        return;
      }

      $.ajax({
        url: `${App.backendUrl}/api/user/status/${App.account}`,
        method: 'GET',
        success: function(response) {
          resolve(response);
        },
        error: function(xhr, status, error) {
          reject(error);
        }
      });
    });
  }
};

// Global function to show different pages
function showPage(pageName) {
  console.log(`📄 Showing page: ${pageName}`);
  Core.currentPage = pageName;
  
  // Update navigation active state
  $('.nav-link').removeClass('active');
  $(`.nav-link[onclick*="${pageName}"]`).addClass('active');
  
  // Show loading
  Core.showLoading('Loading page...');
  
  // Load page content based on page name
  switch(pageName) {
    case 'welcome':
      showWelcomePage();
      break;
    case 'register':
      RegisterPage.show();
      break;
    case 'sp-connect':
      SPConnectPage.show();
      break;
    case 'search-book':
      SearchBookPage.show();
      break;
    default:
      showWelcomePage();
  }
}

// Welcome page
function showWelcomePage() {
  $('#pageContent').html(`
    <div class="text-center">
      <h1>Welcome to Privacy-Preserving Ride-Sharing Platform</h1>
      <p class="lead">Connect your wallet and start exploring ride options from multiple service providers</p>
      
      ${!App.isWalletConnected ? `
        <div class="mt-4">
          <button class="btn btn-primary btn-lg" onclick="App.connectWallet()">
            <i class="fas fa-wallet"></i> Connect Wallet
          </button>
        </div>
      ` : `
        <div class="mt-4">
          <div class="row">
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title"><i class="fas fa-user-plus"></i> Register/Login</h5>
                  <p class="card-text">Create your account or sign in to access the platform.</p>
                  <button class="btn btn-primary" onclick="showPage('register')">Go to Register/Login</button>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title"><i class="fas fa-link"></i> SP Connect</h5>
                  <p class="card-text">Grant permissions to service providers and manage your connections.</p>
                  <button class="btn btn-success" onclick="showPage('sp-connect')">Manage SP Connections</button>
                </div>
              </div>
            </div>
            <div class="col-md-4">
              <div class="card">
                <div class="card-body">
                  <h5 class="card-title"><i class="fas fa-search"></i> Search & Book</h5>
                  <p class="card-text">Search for rides and book from multiple service providers.</p>
                  <button class="btn btn-info" onclick="showPage('search-book')">Search for Rides</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `}
    </div>
  `);
}

// Initialize core when document is ready
$(document).ready(function() {
  Core.init();
}); 