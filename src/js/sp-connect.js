// SP Connect Page Module
const SPConnectPage = {
  
  // Show the SP Connect page
  show: function() {
    console.log('🔗 Showing SP Connect page');
    
    if (!App.isWalletConnected) {
      Core.showError('Please connect your wallet first to manage service provider connections.');
      return;
    }
    
    // Check if user is registered
    Core.checkUserStatus()
      .then(userStatus => {
        if (!userStatus.isRegistered || !userStatus.isVerified) {
          Core.showError('Please complete registration and email verification first.');
          return;
        }
        this.showSPConnectInterface();
      })
      .catch(error => {
        Core.showError('Please complete registration first.');
      });
  },

  // Show SP Connect interface
  showSPConnectInterface: function() {
    $('#pageContent').html(`
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-link"></i> Service Provider Connections</h3>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h5><i class="fas fa-info-circle"></i> Manage Your Connections</h5>
                <p>Grant permissions to service providers to access your data and manage your existing connections.</p>
              </div>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h5><i class="fas fa-plus-circle"></i> Grant New Permissions</h5>
                    </div>
                    <div class="card-body">
                      <p>Connect to service providers to enable ride searching and booking.</p>
                      <button class="btn btn-success w-100" onclick="SPConnectPage.grantPermissionToSP()">
                        <i class="fas fa-link"></i> Grant Permission to Service Provider
                      </button>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <h5><i class="fas fa-cog"></i> Manage Permissions</h5>
                    </div>
                    <div class="card-body">
                      <p>View and manage your existing service provider permissions.</p>
                      <button class="btn btn-warning w-100" onclick="SPConnectPage.showPermissionManagement()">
                        <i class="fas fa-cog"></i> Manage Permissions
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="row mt-4">
                <div class="col-md-12">
                  <div class="card">
                    <div class="card-header">
                      <h5><i class="fas fa-history"></i> Booking History</h5>
                    </div>
                    <div class="card-body">
                      <p>View your past bookings and ride history.</p>
                      <button class="btn btn-info w-100" onclick="SPConnectPage.showBookingHistory()">
                        <i class="fas fa-history"></i> View Booking History
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Permission Management Modal -->
      <div class="modal fade" id="permissionManagementModal" tabindex="-1" aria-labelledby="permissionManagementModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="permissionManagementModalLabel">Manage Your Permissions</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="row">
                <div class="col-md-8">
                  <h6>Current Permissions</h6>
                  <div id="permissionsList" class="mb-3">
                    <div class="text-center">
                      <div class="spinner-border" role="status">
                        <span class="visually-hidden">Loading...</span>
                      </div>
                      <p>Loading permissions...</p>
                    </div>
                  </div>
                </div>
                <div class="col-md-4">
                  <h6>Quick Actions</h6>
                  <button id="revokeAllBtn" class="btn btn-danger btn-sm w-100 mb-2">
                    <i class="fas fa-ban"></i> Revoke All Permissions
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
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Permission Revocation Confirmation Modal -->
      <div class="modal fade" id="revokeConfirmationModal" tabindex="-1" aria-labelledby="revokeConfirmationModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="revokeConfirmationModalLabel">Confirm Permission Revocation</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <p>Are you sure you want to revoke permission from <strong id="revokeSpName"></strong>?</p>
              <p class="text-muted">This action cannot be undone. You will need to re-authorize this service provider to access your data again.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmRevokeBtn">Revoke Permission</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Revoke All Confirmation Modal -->
      <div class="modal fade" id="revokeAllConfirmationModal" tabindex="-1" aria-labelledby="revokeAllConfirmationModalLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="revokeAllConfirmationModalLabel">Confirm All Permissions Revocation</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <div class="alert alert-warning">
                <h6><i class="fas fa-exclamation-triangle"></i> Warning</h6>
                <p>Are you sure you want to revoke <strong>ALL</strong> permissions?</p>
                <p>This will:</p>
                <ul>
                  <li>Remove all access tokens from our database</li>
                  <li>Notify all service providers to invalidate tokens</li>
                  <li>Update blockchain permission state for all providers</li>
                  <li>Require re-authorization for all service providers</li>
                </ul>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-danger" id="confirmRevokeAllBtn">Revoke All Permissions</button>
            </div>
          </div>
        </div>
      </div>
    `);
    
    // Setup modal event handlers
    this.setupModalHandlers();
  },

  // Setup modal event handlers
  setupModalHandlers: function() {
    // Revoke all permissions button
    $('#revokeAllBtn').on('click', function() {
      $('#revokeAllConfirmationModal').modal('show');
    });

    // Confirm revoke all
    $('#confirmRevokeAllBtn').on('click', function() {
      SPConnectPage.revokeAllPermissions();
    });

    // Confirm revoke single
    $('#confirmRevokeBtn').on('click', function() {
      const spName = $('#revokeSpName').text();
      SPConnectPage.revokePermission(spName);
    });
  },

  // Grant permission to SP (calls original App function)
  grantPermissionToSP: function() {
    console.log('Granting permission to SP...');
    App.grantPermissionToSP();
  },

  // Show permission management modal
  showPermissionManagement: function() {
    $('#permissionManagementModal').modal('show');
    this.loadPermissions();
  },

  // Load permissions
  loadPermissions: function() {
    $('#permissionsList').html(`
      <div class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p>Loading permissions...</p>
      </div>
    `);

    $.ajax({
      url: `${App.backendUrl}/api/permissions/${App.account}`,
      method: 'GET',
      success: function(response) {
        SPConnectPage.displayPermissions(response.permissions);
      },
      error: function(xhr, status, error) {
        $('#permissionsList').html(`
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> Error loading permissions: ${error}
          </div>
        `);
      }
    });
  },

  // Display permissions
  displayPermissions: function(permissions) {
    if (!permissions || permissions.length === 0) {
      $('#permissionsList').html(`
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No permissions granted yet. Use "Grant Permission to Service Provider" to connect to service providers.
        </div>
      `);
      return;
    }

    let permissionsHtml = '<div class="list-group">';
    permissions.forEach(permission => {
      permissionsHtml += `
        <div class="list-group-item d-flex justify-content-between align-items-center">
          <div>
            <h6 class="mb-1">${permission.serviceProvider}</h6>
            <small class="text-muted">Granted: ${new Date(permission.createdAt).toLocaleDateString()}</small>
          </div>
          <button class="btn btn-danger btn-sm" onclick="SPConnectPage.confirmRevokePermission('${permission.serviceProvider}')">
            <i class="fas fa-ban"></i> Revoke
          </button>
        </div>
      `;
    });
    permissionsHtml += '</div>';

    $('#permissionsList').html(permissionsHtml);
  },

  // Confirm revoke permission
  confirmRevokePermission: function(spName) {
    $('#revokeSpName').text(spName);
    $('#revokeConfirmationModal').modal('show');
  },

  // Revoke permission
  revokePermission: function(spName) {
    $('#revokeConfirmationModal').modal('hide');
    
    $.ajax({
      url: `${App.backendUrl}/api/permissions/${App.account}/${spName}`,
      method: 'DELETE',
      success: function(response) {
        // Reload permissions
        SPConnectPage.loadPermissions();
        
        // Show success message
        const alert = $(`
          <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle"></i> Permission revoked successfully from ${spName}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
        `);
        $('#pageContent .card-body').prepend(alert);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          alert.alert('close');
        }, 3000);
      },
      error: function(xhr, status, error) {
        const alert = $(`
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle"></i> Error revoking permission: ${error}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
        `);
        $('#pageContent .card-body').prepend(alert);
      }
    });
  },

  // Revoke all permissions
  revokeAllPermissions: function() {
    $('#revokeAllConfirmationModal').modal('hide');
    
    $.ajax({
      url: `${App.backendUrl}/api/permissions/${App.account}`,
      method: 'DELETE',
      success: function(response) {
        // Reload permissions
        SPConnectPage.loadPermissions();
        
        // Show success message
        const alert = $(`
          <div class="alert alert-success alert-dismissible fade show" role="alert">
            <i class="fas fa-check-circle"></i> All permissions revoked successfully
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
        `);
        $('#pageContent .card-body').prepend(alert);
        
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
          alert.alert('close');
        }, 3000);
      },
      error: function(xhr, status, error) {
        const alert = $(`
          <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <i class="fas fa-exclamation-triangle"></i> Error revoking all permissions: ${error}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
          </div>
        `);
        $('#pageContent .card-body').prepend(alert);
      }
    });
  },

  // Show booking history
  showBookingHistory: function() {
    // This will be implemented in the search-book module
    showPage('search-book');
  }
}; 