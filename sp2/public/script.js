// Global variables
let currentUser = null;
let authToken = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedToken = localStorage.getItem('sp2_auth_token');
    const savedUser = localStorage.getItem('sp2_user');
    
    if (savedToken && savedUser) {
        authToken = savedToken;
        currentUser = JSON.parse(savedUser);
        showDashboard();
        loadRides();
    }
    
    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('addRideForm').addEventListener('submit', handleAddRide);
});

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            
            // Save to localStorage
            localStorage.setItem('sp2_auth_token', authToken);
            localStorage.setItem('sp2_user', JSON.stringify(currentUser));
            
            showDashboard();
            loadRides();
            showAlert('Premium login successful!', 'success');
        } else {
            showAlert(data.error || 'Login failed', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'danger');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showAlert('Premium registration successful! Please login.', 'success');
            // Switch to login tab
            document.getElementById('login-tab').click();
            // Clear register form
            document.getElementById('registerForm').reset();
        } else {
            showAlert(data.error || 'Registration failed', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'danger');
    }
}

// Handle add ride
async function handleAddRide(e) {
    e.preventDefault();
    
    const formData = {
        driverId: 'SP2_DR' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        driverName: document.getElementById('driverName').value,
        vehicleType: document.getElementById('vehicleType').value,
        vehicleNumber: document.getElementById('vehicleNumber').value,
        currentLocation: {
            lat: 23.7937 + (Math.random() - 0.5) * 0.1,
            lng: 90.4066 + (Math.random() - 0.5) * 0.1,
            address: document.getElementById('currentLocation').value
        },
        destination: {
            lat: 23.7500 + (Math.random() - 0.5) * 0.1,
            lng: 90.3700 + (Math.random() - 0.5) * 0.1,
            address: document.getElementById('destination').value
        },
        price: parseInt(document.getElementById('price').value),
        estimatedTime: parseInt(document.getElementById('estimatedTime').value)
    };
    
    try {
        const response = await fetch('/api/rides', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            showAlert('Premium ride added successfully!', 'success');
            document.getElementById('addRideForm').reset();
            loadRides();
        } else {
            const data = await response.json();
            showAlert(data.error || 'Failed to add premium ride', 'danger');
        }
    } catch (error) {
        showAlert('Network error. Please try again.', 'danger');
    }
}

// Load rides
async function loadRides() {
    const ridesList = document.getElementById('ridesList');
    ridesList.innerHTML = '<div class="col-12"><div class="loading"><i class="fas fa-spinner"></i><br>Loading premium rides...</div></div>';
    
    try {
        const response = await fetch('/api/rides', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const rides = await response.json();
            displayRides(rides);
        } else {
            ridesList.innerHTML = '<div class="col-12"><div class="alert alert-danger">Failed to load premium rides</div></div>';
        }
    } catch (error) {
        ridesList.innerHTML = '<div class="col-12"><div class="alert alert-danger">Network error</div></div>';
    }
}

// Display rides
function displayRides(rides) {
    const ridesList = document.getElementById('ridesList');
    
    if (rides.length === 0) {
        ridesList.innerHTML = '<div class="col-12"><div class="alert alert-info">No premium rides available</div></div>';
        return;
    }
    
    ridesList.innerHTML = rides.map(ride => `
        <div class="col-md-6 col-lg-4">
            <div class="ride-card" onclick="showRideDetails('${ride._id}')">
                <div class="driver-info">
                    <div class="driver-avatar">
                        ${ride.driverName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h6 class="mb-0">${ride.driverName}</h6>
                        <small class="text-muted">Driver ID: ${ride.driverId}</small>
                        <div class="premium-badge">Premium</div>
                    </div>
                </div>
                
                <div class="vehicle-info">
                    <i class="fas fa-car vehicle-icon"></i>
                    <strong>${ride.vehicleType}</strong> - ${ride.vehicleNumber}
                </div>
                
                <div class="location-info">
                    <div><i class="fas fa-map-marker-alt"></i> <strong>From:</strong> ${ride.currentLocation.address}</div>
                    <div><i class="fas fa-flag-checkered"></i> <strong>To:</strong> ${ride.destination.address}</div>
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                    <div class="price">৳${ride.price}</div>
                    <div class="time">${ride.estimatedTime} min</div>
                </div>
                
                <div class="text-center mt-2">
                    <span class="status ${ride.status}">${ride.status.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Show ride details
async function showRideDetails(rideId) {
    try {
        const response = await fetch(`/api/rides/${rideId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const ride = await response.json();
            const modalBody = document.getElementById('rideModalBody');
            
            modalBody.innerHTML = `
                <div class="driver-info">
                    <div class="driver-avatar">
                        ${ride.driverName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h5>${ride.driverName}</h5>
                        <p class="text-muted">Driver ID: ${ride.driverId}</p>
                        <div class="premium-badge">Premium Driver</div>
                    </div>
                </div>
                
                <div class="vehicle-info">
                    <h6><i class="fas fa-car"></i> Premium Vehicle Details</h6>
                    <p><strong>Type:</strong> ${ride.vehicleType}</p>
                    <p><strong>Number:</strong> ${ride.vehicleNumber}</p>
                </div>
                
                <div class="location-info">
                    <h6><i class="fas fa-route"></i> Route Details</h6>
                    <p><strong>From:</strong> ${ride.currentLocation.address}</p>
                    <p><strong>To:</strong> ${ride.destination.address}</p>
                </div>
                
                <div class="row">
                    <div class="col-6">
                        <div class="price-badge">৳${ride.price}</div>
                    </div>
                    <div class="col-6">
                        <div class="time-badge">${ride.estimatedTime} min</div>
                    </div>
                </div>
                
                <div class="mt-3">
                    <span class="status ${ride.status}">${ride.status.toUpperCase()}</span>
                </div>
            `;
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('rideModal'));
            modal.show();
            
            // Handle booking
            document.getElementById('bookRideBtn').onclick = () => bookRide(rideId);
        }
    } catch (error) {
        showAlert('Failed to load premium ride details', 'danger');
    }
}

// Book ride
async function bookRide(rideId) {
    try {
        const response = await fetch(`/api/rides/${rideId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: 'booked' })
        });
        
        if (response.ok) {
            showAlert('Premium ride booked successfully!', 'success');
            bootstrap.Modal.getInstance(document.getElementById('rideModal')).hide();
            loadRides();
        } else {
            showAlert('Failed to book premium ride', 'danger');
        }
    } catch (error) {
        showAlert('Network error', 'danger');
    }
}

// Show dashboard
function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'block';
    document.getElementById('userName').textContent = currentUser.name;
}

// Logout
function logout() {
    localStorage.removeItem('sp2_auth_token');
    localStorage.removeItem('sp2_user');
    authToken = null;
    currentUser = null;
    
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
    
    // Clear forms
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
}

// Show alert
function showAlert(message, type) {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.querySelector('.container');
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
} 