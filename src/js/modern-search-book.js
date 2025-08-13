// Modern Search & Book Module
const ModernSearchBook = {
  
  // Show the Search & Book page
  show: async function() {
    console.log('🔍 Showing Modern Search & Book page');
    
    if (!ModernApp.isWalletConnected) {
      ModernCore.showError('Please connect your wallet first to search for rides.');
      return;
    }
    
    try {
      // Check if user is registered
      const userStatus = await ModernCore.checkUserStatus();
      if (!userStatus.registered || !userStatus.email_verified) {
        ModernCore.showError('Please complete registration and email verification first.');
        return;
      }
      this.showSearchInterface();
    } catch (error) {
      ModernCore.showError('Please complete registration first.');
    }
  },

  // Show search interface
  showSearchInterface: function() {
    const content = `
      <div class="container">
        <div class="row">
          <div class="col-12">
            <div class="card">
              <div class="card-header">
                <h3><i class="fas fa-search me-2"></i>Search & Book Rides</h3>
              </div>
              <div class="card-body">
                <div class="alert alert-info">
                  <h5><i class="fas fa-info-circle me-2"></i>Find Your Perfect Ride</h5>
                  <p class="mb-0">Search for available rides from all your permitted service providers. Compare fares and book your preferred option.</p>
                </div>
                
                <!-- Search Form -->
                <div class="card mb-4">
                  <div class="card-header">
                    <h5><i class="fas fa-search me-2"></i>Search for Rides</h5>
                  </div>
                  <div class="card-body">
                    <form id="searchForm" onsubmit="ModernSearchBook.searchRides(event)">
                      <div class="row">
                        <div class="col-md-6 mb-3">
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
                        <div class="col-md-6 mb-3">
                          <label for="radius" class="form-label">Search Radius (km)</label>
                          <select id="radius" class="form-select">
                            <option value="1">1 km</option>
                            <option value="2" selected>2 km</option>
                            <option value="5">5 km</option>
                            <option value="10">10 km</option>
                          </select>
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-12">
                          <button type="submit" class="btn btn-primary btn-lg w-100">
                            <i class="fas fa-search me-2"></i>Search for Rides
                          </button>
                        </div>
                      </div>
                    </form>
                    
                    <!-- Test buttons for debugging -->
                    <div class="mt-3 text-center">
                      <button type="button" class="btn btn-secondary btn-sm" onclick="ModernSearchBook.testSearch('Dhaka', 2)">
                        <i class="fas fa-flask me-1"></i>Test Search (Dhaka, 2km)
                      </button>
                      <button type="button" class="btn btn-info btn-sm ms-2" onclick="ModernSearchBook.testJavaScript()">
                        <i class="fas fa-code me-1"></i>Test JavaScript
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- Search Results -->
                <div id="searchResults" style="display: none;">
                  <div class="card">
                    <div class="card-header">
                      <h5><i class="fas fa-list me-2"></i>Search Results</h5>
                    </div>
                    <div class="card-body">
                      <div id="resultsContent"></div>
                    </div>
                  </div>
                </div>
                
                <!-- Booking History -->
                <div class="card mt-4">
                  <div class="card-header">
                    <h5><i class="fas fa-history me-2"></i>Booking History</h5>
                  </div>
                  <div class="card-body">
                    <p>View your past bookings and ride history.</p>
                    <button class="btn btn-info" onclick="ModernSearchBook.showBookingHistory()">
                      <i class="fas fa-history me-2"></i>View Booking History
                    </button>
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

  // Search rides
  searchRides: async function(event) {
    event.preventDefault();
    console.log('Searching rides...');
    
    const destination = document.getElementById('destination').value;
    const radius = document.getElementById('radius').value;
    
    if (!destination) {
      ModernCore.showNotification('Please select a destination', 'error');
      return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<div class="spinner me-2"></div>Searching...';
    submitBtn.disabled = true;
    
    try {
      // Call the original App.searchRides function
      await ModernApp.searchRides();
      
      // Show success message
      ModernCore.showNotification('Search completed successfully!', 'success');
      
    } catch (error) {
      console.error('Search failed:', error);
      ModernCore.showNotification('Search failed: ' + error.message, 'error');
    } finally {
      // Restore button state
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  },

  // Test search with predefined values
  testSearch: function(destination, radius) {
    console.log(`Test search clicked! Destination: ${destination}, Radius: ${radius}km`);
    document.getElementById('destination').value = destination;
    document.getElementById('radius').value = radius;
    this.searchRides({ preventDefault: () => {} });
  },

  // Test JavaScript function
  testJavaScript: function() {
    console.log('Test JavaScript function called!');
    ModernCore.showNotification('JavaScript is working correctly!', 'success');
  },

  // Show booking history modal
  showBookingHistory: function() {
    const modalContent = `
      <div id="bookingHistoryContent">
        <div class="text-center">
          <div class="spinner mx-auto mb-3"></div>
          <p>Loading booking history...</p>
        </div>
      </div>
    `;

    ModernCore.showModal('Booking History', modalContent, [
      { text: 'Close', class: 'btn-secondary' }
    ]);

    this.loadBookingHistory();
  },

  // Load booking history
  loadBookingHistory: function() {
    const bookingHistoryContent = document.getElementById('bookingHistoryContent');
    if (!bookingHistoryContent) return;

    bookingHistoryContent.innerHTML = `
      <div class="text-center">
        <div class="spinner mx-auto mb-3"></div>
        <p>Loading booking history...</p>
      </div>
    `;

    fetch(`${ModernApp.backendUrl}/bookings/${ModernApp.account}`)
      .then(response => response.json())
      .then(data => {
        this.displayBookingHistory(data.bookings);
      })
      .catch(error => {
        bookingHistoryContent.innerHTML = `
          <div class="alert alert-danger">
            <i class="fas fa-exclamation-triangle me-2"></i>Error loading booking history: ${error}
          </div>
        `;
      });
  },

  // Display booking history
  displayBookingHistory: function(bookings) {
    const bookingHistoryContent = document.getElementById('bookingHistoryContent');
    if (!bookingHistoryContent) return;

    if (!bookings || bookings.length === 0) {
      bookingHistoryContent.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>No booking history found. Start by searching for rides!
        </div>
      `;
      return;
    }

    let historyHtml = '<div class="list-group">';
    bookings.forEach(booking => {
      const statusClass = booking.status === 'confirmed' ? 'success' : 
                         booking.status === 'pending' ? 'warning' : 'danger';
      
      // Fix date formatting
      let dateString = 'Unknown';
      if (booking.createdAt) {
        try {
          const date = new Date(booking.createdAt);
          if (!isNaN(date.getTime())) {
            dateString = date.toLocaleDateString();
          }
        } catch (e) {
          console.log('Date parsing error:', e);
        }
      }
      
      historyHtml += `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">${booking.serviceProvider}</h6>
            <small class="text-muted">${dateString}</small>
          </div>
          <p class="mb-1">
            <strong>Booking ID:</strong> ${booking.bookingId}<br>
            <strong>Fare:</strong> ৳${booking.fare}<br>
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
                <i class="fas fa-external-link-alt me-1"></i>View Booking
              </a>
            </div>
          ` : ''}
        </div>
      `;
    });
    historyHtml += '</div>';

    bookingHistoryContent.innerHTML = historyHtml;
  },

  // Display search results (called by App.searchRides)
  displaySearchResults: function(results) {
    document.getElementById('searchResults').style.display = 'block';
    
    if (!results || results.length === 0) {
      document.getElementById('resultsContent').innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>No rides found for the selected destination. Try a different location or increase the search radius.
        </div>
      `;
      return;
    }

    let resultsHtml = '<div class="row">';
    results.forEach(result => {
      resultsHtml += `
        <div class="col-md-6 mb-3">
          <div class="card search-result-card">
            <div class="card-body">
              <h6 class="card-title">
                <i class="fas fa-car me-2"></i>${result.serviceProvider}
              </h6>
              <p class="card-text">
                <strong>Fare:</strong> ৳${result.fare}<br>
                <strong>Location:</strong> ${result.location_data ? `Privacy-preserved (ε=${result.location_data.epsilon})` : 'N/A'}<br>
                <strong>Session ID:</strong> ${result.provider_session_id}
              </p>
              <button class="btn btn-success btn-sm" onclick="ModernSearchBook.bookRide('${result.serviceProvider}', '${result.provider_session_id}', ${result.fare})">
                <i class="fas fa-bookmark me-1"></i>Book This Ride
              </button>
            </div>
          </div>
        </div>
      `;
    });
    resultsHtml += '</div>';

    document.getElementById('resultsContent').innerHTML = resultsHtml;
  },

  // Book a ride
  bookRide: function(serviceProvider, providerSessionId, fare) {
    console.log(`Booking ride with ${serviceProvider}, session: ${providerSessionId}, fare: ${fare}`);
    
    // Show success message
    ModernCore.showNotification(`Booking initiated with ${serviceProvider} for ৳${fare}`, 'success');
  }
}; 