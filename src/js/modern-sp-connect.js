// Modern SP Connect Module
const ModernSPConnect = {
  
  // Show the SP Connect page
  show: async function() {
    console.log('🔗 Showing Modern SP Connect page');
    
    if (!ModernApp.isWalletConnected) {
      ModernCore.showError('Please connect your wallet first to manage service provider connections.');
      return;
    }
    
    try {
      // Check if user is registered
      const userStatus = await ModernCore.checkUserStatus();
      if (!userStatus.registered || !userStatus.email_verified) {
        ModernCore.showError('Please complete registration and email verification first.');
        return;
      }
      this.showSPConnectInterface();
    } catch (error) {
      ModernCore.showError('Please complete registration first.');
    }
  },

  // Show SP Connect interface
  showSPConnectInterface: function() {
    const content = `
      <div class="container">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h3><i class="fas fa-link me-2"></i>Service Provider Connections</h3>
              </div>
              <div class="card-body">
                <div class="alert alert-info">
                  <h5><i class="fas fa-info-circle me-2"></i>Manage Your Connections</h5>
                  <p class="mb-0">Grant permissions to service providers to access your data and manage your existing connections.</p>
                </div>
                
                <div class="row">
                  <div class="col-md-6 mb-4">
                    <div class="card h-100">
                      <div class="card-header">
                        <h5><i class="fas fa-plus-circle me-2"></i>Grant New Permissions</h5>
                      </div>
                      <div class="card-body d-flex flex-column">
                        <p>Connect to service providers to enable ride searching and booking.</p>
                        <div class="mt-auto">
                          <button class="btn btn-success w-100" onclick="ModernSPConnect.grantPermissionToSP()">
                            <i class="fas fa-link me-2"></i>Connect Service Providers
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-6 mb-4">
                    <div class="card h-100">
                      <div class="card-header">
                        <h5><i class="fas fa-cog me-2"></i>Manage Permissions</h5>
                      </div>
                      <div class="card-body d-flex flex-column">
                        <p>View and manage your existing service provider permissions.</p>
                        <div class="mt-auto">
                          <button class="btn btn-warning w-100" onclick="ModernSPConnect.showPermissionManagement()">
                            <i class="fas fa-cog me-2"></i>Manage Permissions
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="row">
                  <div class="col-md-12">
                    <div class="card">
                      <div class="card-header">
                        <h5><i class="fas fa-history me-2"></i>Booking History</h5>
                      </div>
                      <div class="card-body">
                        <p>View your past bookings and ride history.</p>
                        <button class="btn btn-info" onclick="ModernSPConnect.showBookingHistory()">
                          <i class="fas fa-history me-2"></i>View Booking History
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
    `;
    
    document.getElementById('pageContent').innerHTML = content;
    ModernCore.hideLoading();
  },

  // Grant permission to SP
  grantPermissionToSP: function() {
    console.log('Granting permission to SP...');
    ModernApp.grantPermissionToSP();
  },

  // Show permission management modal
  showPermissionManagement: function() {
    const modalContent = `
      <div class="row">
        <div class="col-md-8">
          <h6>Current Permissions</h6>
          <div id="permissionsList" class="mb-3">
            <div class="text-center">
              <div class="spinner mx-auto mb-3"></div>
              <p>Loading permissions...</p>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <h6>Quick Actions</h6>
          <button id="revokeAllBtn" class="btn btn-danger btn-sm w-100 mb-2">
            <i class="fas fa-ban me-2"></i>Revoke All Permissions
          </button>
          <div class="alert alert-info">
            <small>
              <strong>Note:</strong> Revoking permissions will:
              <ul class="mb-0 mt-2">
                <li>Remove access tokens from our database</li>
                <li>Notify service providers to invalidate tokens</li>
                <li>Update blockchain permission state</li>
                <li>Require re-authorization for future access</li>
              </ul>
            </small>
          </div>
        </div>
      </div>
    `;

    ModernCore.showModal('Manage Your Permissions', modalContent, [
      { text: 'Close', class: 'btn-secondary' }
    ]);

    this.loadPermissions();
    this.setupModalHandlers();
  },

  // Setup modal event handlers
  setupModalHandlers: function() {
    // Revoke all permissions button
    document.getElementById('revokeAllBtn').addEventListener('click', () => {
      this.confirmRevokeAll();
    });
  },

  // Load permissions
  loadPermissions: function() {
    const permissionsList = document.getElementById('permissionsList');
    if (!permissionsList) return;

    permissionsList.innerHTML = `
      <div class="text-center">
        <div class="spinner mx-auto mb-3"></div>
        <p>Loading permissions...</p>
      </div>
    `;

    fetch(`${ModernApp.backendUrl}/permissions/${ModernApp.account}`)
      .then(response => response.json())
      .then(data => {
        this.displayPermissions(data.permissions);
      })
      .catch(error => {
        permissionsList.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>Error loading permissions: ${error}
          </div>
        `;
      });
  },

  // Display permissions
  displayPermissions: function(permissions) {
    const permissionsList = document.getElementById('permissionsList');
    if (!permissionsList) return;

    if (!permissions || permissions.length === 0) {
      permissionsList.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>No permissions granted yet. Use "Connect Service Providers" to connect to service providers.
        </div>
      `;
      return;
    }

    let permissionsHtml = '<div class="list-group">';
    permissions.forEach(permission => {
      // Fix date formatting
      let dateString = 'Unknown';
      if (permission.createdAt) {
        try {
          const date = new Date(permission.createdAt);
          if (!isNaN(date.getTime())) {
            dateString = date.toLocaleDateString();
          }
        } catch (e) {
          console.log('Date parsing error:', e);
        }
      }
      
      permissionsHtml += `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${permission.serviceProvider}</h6>
            <small class="text-muted">Granted: ${dateString}</small>
          </div>
          <button class="btn btn-danger btn-sm" onclick="ModernSPConnect.confirmRevokePermission('${permission.serviceProvider}')">
            <i class="fas fa-ban me-1"></i>Revoke
          </button>
        </div>
      `;
    });
    permissionsHtml += '</div>';

    permissionsList.innerHTML = permissionsHtml;
  },

  // Confirm revoke permission
  confirmRevokePermission: function(spName) {
    const modalContent = `
      <p>Are you sure you want to revoke permission from <strong>${spName}</strong>?</p>
      <p class="text-muted">This action cannot be undone. You will need to re-authorize this service provider to access your data again.</p>
    `;

    ModernCore.showModal('Confirm Permission Revocation', modalContent, [
      { text: 'Cancel', class: 'btn-secondary' },
      { 
        text: 'Revoke Permission', 
        class: 'btn-danger',
        onclick: `ModernSPConnect.revokePermission('${spName}')`
      }
    ]);
  },

  // Revoke permission
  revokePermission: function(spName) {
    fetch(`${ModernApp.backendUrl}/revoke-permission`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: ModernApp.account,
        serviceProvider: spName
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Reload permissions
        this.loadPermissions();
        
        // Show success message
        ModernCore.showNotification(`Permission revoked successfully from ${spName}`, 'success');
      } else {
        ModernCore.showNotification(`Error revoking permission: ${data.error || 'Unknown error'}`, 'error');
      }
    })
    .catch(error => {
      ModernCore.showNotification(`Error revoking permission: ${error}`, 'error');
    });
  },

  // Confirm revoke all permissions
  confirmRevokeAll: function() {
    const modalContent = `
      <div class="alert alert-warning">
        <h6><i class="fas fa-exclamation-triangle me-2"></i>Warning</h6>
        <p>Are you sure you want to revoke <strong>ALL</strong> permissions?</p>
        <p>This will:</p>
        <ul>
          <li>Remove all access tokens from our database</li>
          <li>Notify all service providers to invalidate tokens</li>
          <li>Update blockchain permission state for all providers</li>
          <li>Require re-authorization for all service providers</li>
        </ul>
      </div>
    `;

    ModernCore.showModal('Confirm All Permissions Revocation', modalContent, [
      { text: 'Cancel', class: 'btn-secondary' },
      { 
        text: 'Revoke All Permissions', 
        class: 'btn-danger',
        onclick: 'ModernSPConnect.revokeAllPermissions()'
      }
    ]);
  },

  // Revoke all permissions
  revokeAllPermissions: function() {
    fetch(`${ModernApp.backendUrl}/revoke-all-permissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        walletAddress: ModernApp.account
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        // Reload permissions
        this.loadPermissions();
        
        // Show success message
        ModernCore.showNotification('All permissions revoked successfully', 'success');
      } else {
        ModernCore.showNotification(`Error revoking all permissions: ${data.error || 'Unknown error'}`, 'error');
      }
    })
    .catch(error => {
      ModernCore.showNotification(`Error revoking all permissions: ${error}`, 'error');
    });
  },

  // Show booking history
  showBookingHistory: function() {
    showPage('search-book');
  }
}; 