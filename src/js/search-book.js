// Search & Book Page Module
const SearchBookPage = {
  
  // Show the Search & Book page
  show: function() {
    console.log('🔍 Showing Search & Book page');
    
    if (!App.isWalletConnected) {
      Core.showError('Please connect your wallet first to search for rides.');
      return;
    }
    
    // Check if user is registered
    Core.checkUserStatus()
      .then(userStatus => {
        if (!userStatus.isRegistered || !userStatus.isVerified) {
          Core.showError('Please complete registration and email verification first.');
          return;
        }
        this.showSearchInterface();
      })
      .catch(error => {
        Core.showError('Please complete registration first.');
      });
  },

  // Show search interface
  showSearchInterface: function() {
    $('#pageContent').html(`
      <div class="row">
        <div class="col-md-12">
          <div class="card">
            <div class="card-header">
              <h3><i class="fas fa-search"></i> Search & Book Rides</h3>
            </div>
            <div class="card-body">
              <div class="alert alert-info">
                <h5><i class="fas fa-info-circle"></i> Find Your Perfect Ride</h5>
                <p>Search for available rides from all your permitted service providers. Compare fares and book your preferred option.</p>
              </div>
              
              <!-- Search Form -->
              <div class="card mb-4">
                <div class="card-header">
                  <h5><i class="fas fa-search"></i> Search for Rides</h5>
                </div>
                <div class="card-body">
                  <form id="searchForm" onsubmit="event.preventDefault(); SearchBookPage.searchRides();">
                    <div class="row">
                      <div class="col-md-6">
                        <label for="destination" class="form-label">Destination</label>
                        <select id="destination" class="form-select" required>
                          <option value="">Select destination...</option>
                          <option value="Dhaka">Dhaka</option>
                          <option value="Gulshan">Gulshan</option>
                          <option value="Banani">Banani</option>
                          <option value="Dhanmondi">Dhanmondi</option>
                          <option value="Mohakhali">Mohakhali</option>
                          <option value="Mirpur">Mirpur</option>
                          <option value="Uttara">Uttara</option>
                        </select>
                      </div>
                      <div class="col-md-6">
                        <label for="radius" class="form-label">Search Radius (km)</label>
                        <select id="radius" class="form-select">
                          <option value="1">1 km</option>
                          <option value="2" selected>2 km</option>
                          <option value="5">5 km</option>
                          <option value="10">10 km</option>
                        </select>
                      </div>
                    </div>
                    <div class="row mt-3">
                      <div class="col-12">
                        <button type="submit" class="btn btn-primary w-100">
                          <i class="fas fa-search"></i> Search for Rides
                        </button>
                      </div>
                    </div>
                  </form>
                  
                  <!-- Test buttons for debugging -->
                  <div class="mt-3">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="SearchBookPage.testSearch('Dhaka', 2)">
                      🧪 Test Search (Dhaka, 2km)
                    </button>
                    <button type="button" class="btn btn-info btn-sm ms-2" onclick="SearchBookPage.testJavaScript()">
                      🧪 Test JavaScript
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Search Results -->
              <div id="searchResults" style="display: none;">
                <div class="card">
                  <div class="card-header">
                    <h5><i class="fas fa-list"></i> Search Results</h5>
                  </div>
                  <div class="card-body">
                    <div id="resultsContent"></div>
                  </div>
                </div>
              </div>
              
              <!-- Booking History -->
              <div class="card mt-4">
                <div class="card-header">
                  <h5><i class="fas fa-history"></i> Booking History</h5>
                </div>
                <div class="card-body">
                  <p>View your past bookings and ride history.</p>
                  <button class="btn btn-info" onclick="SearchBookPage.showBookingHistory()">
                    <i class="fas fa-history"></i> View Booking History
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Booking History Modal -->
      <div class="modal fade" id="bookingHistoryModal" tabindex="-1" aria-labelledby="bookingHistoryModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title" id="bookingHistoryModalLabel">Booking History</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
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
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    `);
  },

  // Search rides (calls original App function)
  searchRides: function() {
    console.log('Searching rides...');
    App.searchRides();
  },

  // Test search with predefined values
  testSearch: function(destination, radius) {
    console.log(`Test search clicked! Destination: ${destination}, Radius: ${radius}km`);
    $('#destination').val(destination);
    $('#radius').val(radius);
    this.searchRides();
  },

  // Test JavaScript function
  testJavaScript: function() {
    console.log('Test JavaScript function called!');
    alert('JavaScript is working correctly!');
  },

  // Show booking history modal
  showBookingHistory: function() {
    $('#bookingHistoryModal').modal('show');
    this.loadBookingHistory();
  },

  // Load booking history
  loadBookingHistory: function() {
    $('#bookingHistoryContent').html(`
      <div class="text-center">
        <div class="spinner-border" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p>Loading booking history...</p>
      </div>
    `);

    $.ajax({
      url: `${App.backendUrl}/api/bookings/${App.account}`,
      method: 'GET',
      success: function(response) {
        SearchBookPage.displayBookingHistory(response.bookings);
      },
      error: function(xhr, status, error) {
        $('#bookingHistoryContent').html(`
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle"></i> Error loading booking history: ${error}
          </div>
        `);
      }
    });
  },

  // Display booking history
  displayBookingHistory: function(bookings) {
    if (!bookings || bookings.length === 0) {
      $('#bookingHistoryContent').html(`
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No booking history found. Start by searching for rides!
        </div>
      `);
      return;
    }

    let historyHtml = '<div class="list-group">';
    bookings.forEach(booking => {
      const statusClass = booking.status === 'confirmed' ? 'success' : 
                         booking.status === 'pending' ? 'warning' : 'danger';
      
      historyHtml += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${booking.serviceProvider}</h6>
            <small class="text-muted">${new Date(booking.createdAt).toLocaleDateString()}</small>
          </div>
          <p class="mb-1">
            <strong>Booking ID:</strong> ${booking.bookingId}<br>
            <strong>Fare:</strong> $${booking.fare}<br>
            <strong>Status:</strong> <span class="badge bg-${statusClass}">${booking.status}</span>
          </p>
          ${booking.driverInfo ? `
            <small class="text-muted">
              <strong>Driver:</strong> ${booking.driverInfo.name}<br>
              <strong>Vehicle:</strong> ${booking.driverInfo.vehicleType} - ${booking.driverInfo.vehicleNumber}<br>
              <strong>ETA:</strong> ${booking.driverInfo.estimatedTime} minutes
            </small>
          ` : ''}
          ${booking.bookingUrl ? `
            <div class="mt-2">
              <a href="${booking.bookingUrl}" target="_blank" class="btn btn-sm btn-primary">
                <i class="fas fa-external-link-alt"></i> View Booking
              </a>
            </div>
          ` : ''}
        </div>
      `;
    });
    historyHtml += '</div>';

    $('#bookingHistoryContent').html(historyHtml);
  },

  // Display search results (called by App.searchRides)
  displaySearchResults: function(results) {
    $('#searchResults').show();
    
    if (!results || results.length === 0) {
      $('#resultsContent').html(`
        <div class="alert alert-info">
          <i class="fas fa-info-circle"></i> No rides found for the selected destination. Try a different location or increase the search radius.
        </div>
      `);
      return;
    }

    let resultsHtml = '<div class="row">';
    results.forEach(result => {
      resultsHtml += `
        <div class="col-md-6 mb-3">
          <div class="card">
            <div class="card-body">
              <h6 class="card-title">
                <i class="fas fa-car"></i> ${result.serviceProvider}
              </h6>
              <p class="card-text">
                <strong>Fare:</strong> $${result.fare}<br>
                <strong>Location:</strong> ${result.location_data ? `Privacy-preserved (ε=${result.location_data.epsilon})` : 'N/A'}<br>
                <strong>Session ID:</strong> ${result.provider_session_id}
              </p>
              <button class="btn btn-success btn-sm" onclick="SearchBookPage.bookRide('${result.serviceProvider}', '${result.provider_session_id}', ${result.fare})">
                <i class="fas fa-bookmark"></i> Book This Ride
              </button>
            </div>
          </div>
        </div>
      `;
    });
    resultsHtml += '</div>';

    $('#resultsContent').html(resultsHtml);
  },

  // Book a ride
  bookRide: function(serviceProvider, providerSessionId, fare) {
    console.log(`Booking ride with ${serviceProvider}, session: ${providerSessionId}, fare: ${fare}`);
    
    // This would call the original App booking function
    // For now, show a success message
    const alert = $(`
      <div class="alert alert-success alert-dismissible fade show" role="alert">
        <i class="fas fa-check-circle"></i> Booking initiated with ${serviceProvider} for $${fare}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `);
    $('#pageContent .card-body').prepend(alert);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      alert.alert('close');
    }, 3000);
  }
}; 