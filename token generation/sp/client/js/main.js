// Helper: Parse query string from URL
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Set up the login form for OAuth flow, if present
window.addEventListener('DOMContentLoaded', () => {
    const next = getQueryParam('next');
    const nextInput = document.getElementById('next');
    if (next && nextInput) {
        nextInput.value = next;
    }
    // Set walletAddress hidden input if present in query param (OAuth state)
    const walletAddress = getQueryParam('state') || getQueryParam('walletAddress');
    if (walletAddress) {
        const walletInput = document.getElementById('signup-walletAddress');
        if (walletInput) {
            walletInput.value = walletAddress;
            console.log('[DEBUG] Set walletAddress in signup form:', walletAddress);
        }
    } else {
        console.warn('[DEBUG] No walletAddress found in query params!');
    }
    if (localStorage.getItem('token')) {
        showProfile();
    } else {
        showLogin();
    }
});

// Registration form submission (SPA only)
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    let walletAddress = document.getElementById('signup-walletAddress')?.value || getQueryParam('walletAddress') || '';
    console.log('[DEBUG] Submitting registration with walletAddress:', walletAddress);
    // REMOVE wallet address requirement for SP signup
    // if (!walletAddress) {
    //     alert('Wallet address is required for registration. Please connect your wallet through the DApp.');
    //     return;
    // }
    try {
        const response = await fetch('/api/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password }), // REMOVE walletAddress from payload
        });
        const data = await response.json();
        if (response.ok) {
            alert('Signup successful!');
            showLogin();
        } else {
            alert(`Signup failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Error during signup:', error);
    }
});

// Login form submission (handles both SPA and OAuth)
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    const nextUrl = getQueryParam('next');
    if (nextUrl) {
        // --- OAuth flow: allow regular form submission! ---
        // Set hidden input so /oauth/spa-login receives "next"
        document.getElementById('next').value = nextUrl;
        // Don't call e.preventDefault(): let the form submit normally!
        return;
    }
    // --- SPA login flow (fetch) ---
    e.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.token);
            alert('Login successful!');
            showProfile();
        } else {
            alert(`Login failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Error during login:', error);
    }
});

// Profile update
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('profile-name').value;
    const email = document.getElementById('profile-email').value;
    const description = document.getElementById('profile-description').value;
    const password = document.getElementById('profile-password').value;

    try {
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ name, email, description, password }),
        });
        const data = await response.json();
        if (response.ok) {
            alert('Profile updated successfully.');
        } else {
            alert(`Profile update failed: ${data.message}`);
        }
    } catch (error) {
        console.error('Error during profile update:', error);
    }
});

// Logout button
document.getElementById('logoutButton').addEventListener('click', () => {
    localStorage.removeItem('token');
    showLogin();
});

// Schedule Meeting (fetch profile, then show meeting modal)
document.getElementById('scheduleMeetingButton').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('host-name').value = data.name;
            document.getElementById('host-email').value = data.email;
            document.getElementById('profile-section').style.display = 'none';
            document.getElementById('meeting-section').style.display = 'block';
        } else {
            alert(`Failed to fetch user data: ${data.message}`);
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
});

document.getElementById('cancelMeeting').addEventListener('click', () => {
    document.getElementById('meeting-section').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
});

document.getElementById('meetingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const date = document.getElementById('meeting-date').value;
    const time = document.getElementById('meeting-time').value;
    const meetLink = document.getElementById('meeting-link').value;
    const hostName = document.getElementById('host-name').value;
    const hostEmail = document.getElementById('host-email').value;
    const inviteeEmail = document.getElementById('invitee-email').value;

    try {
        const response = await fetch('/api/meeting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ date, time, meetLink, hostName, hostEmail, email: inviteeEmail }),
        });
        const data = await response.json();
        if (response.ok) {
            alert('Meeting invitation sent successfully.');
            document.getElementById('meeting-section').style.display = 'none';
            document.getElementById('profile-section').style.display = 'block';
        } else {
            alert(`Failed to send meeting invitation: ${data.message}`);
        }
    } catch (error) {
        console.error('Error sending meeting invitation:', error);
    }
});

// Show profile section
async function showProfile() {
    try {
        const response = await fetch('/api/auth/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json();
        if (response.ok) {
            document.getElementById('profile-name').value = data.name;
            document.getElementById('profile-email').value = data.email;
            document.getElementById('profile-description').value = data.description;
            document.getElementById('auth-forms').style.display = 'none';
            document.getElementById('profile-section').style.display = 'block';
        } else {
            alert(`Failed to fetch profile: ${data.message}`);
            showLogin();
        }
    } catch (error) {
        console.error('Error fetching profile:', error);
        showLogin();
    }
}

// Show login form
function showLogin() {
    document.getElementById('auth-forms').style.display = 'block';
    document.getElementById('profile-section').style.display = 'none';
}
