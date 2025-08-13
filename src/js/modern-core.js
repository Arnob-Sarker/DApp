// Modern Core Module for RideShare Pro
const ModernCore = {
  currentPage: 'dashboard',
  isLoading: false,
  
  // Initialize the application
  init: async function() {
    console.log('🚀 Modern Core initialization started');
    
    // Show loading screen
    this.showLoadingScreen();
    
    try {
      // Initialize components
      await this.initializeComponents();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Hide loading screen and show main app
      this.hideLoadingScreen();
      
      // Show default page
      showPage('dashboard');
      
      console.log('✅ Modern Core initialized successfully');
    } catch (error) {
      console.error('❌ Core initialization failed:', error);
      // Hide loading screen even on error
      this.hideLoadingScreen();
      
      // Show a simple error message instead of full error page
      ModernCore.showNotification('Some features may not work properly. Please refresh the page.', 'warning');
      
      // Still show the dashboard
      showPage('dashboard');
    }
  },

  // Initialize all components
  initializeComponents: async function() {
    // Add timeout to prevent infinite loading
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Initialization timeout')), 10000)
    );
    
    try {
      // Initialize Web3 and contracts
      await Promise.race([
        ModernApp.initWeb3(),
        timeoutPromise
      ]);
      
      // Check for existing wallet connection
      await this.checkExistingWallet();
      
      // Update wallet status
      this.updateWalletStatus();
    } catch (error) {
      console.error('Component initialization error:', error);
      // Continue anyway to show the interface
    }
  },

  // Setup event listeners
  setupEventListeners: function() {
    // Wallet indicator click
    document.getElementById('walletIndicator').addEventListener('click', () => {
      if (!ModernApp.isWalletConnected) {
        ModernApp.connectWallet();
      }
    });

    // Navigation active state
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', function() {
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');
      });
    });
  },

  // Check for existing wallet connection
  checkExistingWallet: async function() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          ModernApp.account = accounts[0];
          ModernApp.isWalletConnected = true;
          await ModernApp.onWalletConnected();
        }
      } catch (error) {
        console.log('No existing wallet connection:', error);
      }
    }
  },

  // Show loading screen
  showLoadingScreen: function() {
    document.getElementById('loadingScreen').style.display = 'flex';
    document.getElementById('mainApp').style.display = 'none';
  },

  // Hide loading screen
  hideLoadingScreen: function() {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'flex';
  },

  // Update wallet status in navigation
  updateWalletStatus: function() {
    const indicator = document.getElementById('walletIndicator');
    const statusText = document.getElementById('walletStatusText');
    const logoutNavItem = document.getElementById('logoutNavItem');
    
    if (ModernApp.isWalletConnected && ModernApp.account !== '0x0') {
      const shortAddress = ModernApp.account.substring(0, 6) + '...' + ModernApp.account.substring(38);
      statusText.textContent = shortAddress;
      indicator.className = 'wallet-indicator connected';
      
      // Show logout button if user is registered and verified
      if (ModernApp.userStatus && ModernApp.userStatus.registered && ModernApp.userStatus.email_verified) {
        logoutNavItem.style.display = 'block';
      } else {
        logoutNavItem.style.display = 'none';
      }
    } else {
      statusText.textContent = 'Connect Wallet';
      indicator.className = 'wallet-indicator disconnected';
      logoutNavItem.style.display = 'none';
    }
  },

  // Show loading state
  showLoading: function(message = 'Loading...') {
    this.isLoading = true;
    const content = `
      <div class="text-center py-5">
        <div class="spinner mx-auto mb-3"></div>
        <h4 class="text-muted">${message}</h4>
      </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
  },

  // Hide loading state
  hideLoading: function() {
    this.isLoading = false;
  },

  // Show error message
  showError: function(message, title = 'Error') {
    const content = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header bg-danger text-white">
                <h5 class="mb-0"><i class="fas fa-exclamation-triangle me-2"></i>${title}</h5>
              </div>
              <div class="card-body text-center">
                <div class="error-icon mb-3">
                  <i class="fas fa-times-circle fa-3x"></i>
                </div>
                <h4 class="text-danger mb-3">${message}</h4>
                <button class="btn btn-primary" onclick="ModernCore.showPage('dashboard')">
                  <i class="fas fa-home me-2"></i>Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
  },

  // Show success message
  showSuccess: function(message, title = 'Success') {
    const content = `
      <div class="container">
        <div class="row justify-content-center">
          <div class="col-md-8">
            <div class="card">
              <div class="card-header bg-success text-white">
                <h5 class="mb-0"><i class="fas fa-check-circle me-2"></i>${title}</h5>
              </div>
              <div class="card-body text-center">
                <div class="success-checkmark mb-3">
                  <i class="fas fa-check-circle fa-3x"></i>
                </div>
                <h4 class="text-success mb-3">${message}</h4>
                <button class="btn btn-primary" onclick="ModernCore.showPage('dashboard')">
                  <i class="fas fa-home me-2"></i>Go to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.getElementById('pageContent').innerHTML = content;
  },

  // Check if user is registered and verified
  checkUserStatus: function() {
    return new Promise((resolve, reject) => {
      if (!ModernApp.isWalletConnected || ModernApp.account === '0x0') {
        reject('Wallet not connected');
        return;
      }

      fetch(`${ModernApp.backendUrl}/user-status/${ModernApp.account}`)
        .then(response => response.json())
        .then(data => resolve(data))
        .catch(error => reject(error));
    });
  },

  // Create and show modal
  showModal: function(title, content, buttons = []) {
    const modalId = 'dynamicModal';
    const modalHtml = `
      <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="${modalId}Label">${title}</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              ${content}
            </div>
            <div class="modal-footer">
              ${buttons.map(btn => `
                <button type="button" class="btn ${btn.class || 'btn-secondary'}" ${btn.onclick ? `onclick="${btn.onclick}"` : ''} data-bs-dismiss="${btn.dismiss !== false ? 'modal' : ''}">
                  ${btn.icon ? `<i class="${btn.icon} me-2"></i>` : ''}${btn.text}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
      existingModal.remove();
    }

    // Add new modal
    document.getElementById('modalsContainer').innerHTML = modalHtml;
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();

    // Clean up on hide
    document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
      this.remove();
    });
  },

  // Show notification
  showNotification: function(message, type = 'info', duration = 5000) {
    const notificationId = 'notification-' + Date.now();
    const iconMap = {
      'success': 'check-circle',
      'error': 'exclamation-triangle',
      'warning': 'exclamation-triangle',
      'info': 'info-circle'
    };
    
    const notificationHtml = `
      <div id="${notificationId}" class="notification ${type}">
        <i class="fas fa-${iconMap[type] || 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" onclick="document.getElementById('${notificationId}').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    const container = document.getElementById('notificationContainer');
    if (container) {
      container.insertAdjacentHTML('beforeend', notificationHtml);
    }

    // Auto remove after duration
    setTimeout(() => {
      const notification = document.getElementById(notificationId);
      if (notification) {
        notification.remove();
      }
    }, duration);
  }
};

// Global function to show different pages
window.showPage = function(pageName) {
  console.log(`📄 Showing page: ${pageName}`);
  ModernCore.currentPage = pageName;
  
  // Update navigation active state
  document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
  const activeLink = document.querySelector(`[onclick*="${pageName}"]`);
  if (activeLink) activeLink.classList.add('active');
  
  // Show loading
  ModernCore.showLoading('Loading page...');
  
  // Load page content based on page name
  switch(pageName) {
    case 'dashboard':
      ModernDashboard.show();
      break;
    case 'register':
      ModernRegister.show();
      break;
    case 'sp-connect':
      ModernSPConnect.show();
      break;
    case 'search-book':
      ModernSearchBook.show();
      break;
    default:
      ModernDashboard.show();
  }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
  ModernCore.init();
});

// Fallback initialization in case DOMContentLoaded doesn't fire
setTimeout(function() {
  if (document.getElementById('loadingScreen').style.display !== 'none') {
    console.log('Fallback initialization triggered');
    ModernCore.init();
  }
}, 2000); 