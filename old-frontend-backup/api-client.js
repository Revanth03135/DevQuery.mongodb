// DevQuery Frontend API Integration
class DevQueryAPI {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('devquery_token');
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    async login(email, password) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: { email, password }
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('devquery_token', response.token);
            localStorage.setItem('devquery_user', JSON.stringify(response.user));
        }
        
        return response;
    }

    async register(username, email, password, fullName) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: { username, email, password, fullName }
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('devquery_token', response.token);
            localStorage.setItem('devquery_user', JSON.stringify(response.user));
        }
        
        return response;
    }

    async logout() {
        await this.request('/auth/logout', { method: 'POST' });
        this.token = null;
        localStorage.removeItem('devquery_token');
        localStorage.removeItem('devquery_user');
    }
}

// Initialize global API instance
window.devQueryAPI = new DevQueryAPI();

// Login Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    // Handle Login
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            if (!email || !password) {
                showMessage('Please enter both email and password', 'error');
                return;
            }

            try {
                // Show loading state
                submitBtn.textContent = 'Logging in...';
                submitBtn.disabled = true;

                // Call backend API
                const response = await window.devQueryAPI.login(email, password);
                
                if (response.success) {
                    showMessage('Login successful! Redirecting...', 'success');
                    
                    // Redirect after short delay
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage(response.message || 'Login failed', 'error');
                }
            } catch (error) {
                showMessage('Login failed: ' + error.message, 'error');
            } finally {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Handle Registration
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(registerForm);
            const userData = Object.fromEntries(formData);
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            // Validate passwords match
            if (userData.password !== userData.confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            try {
                // Show loading state
                submitBtn.textContent = 'Creating Account...';
                submitBtn.disabled = true;

                // Call backend API
                const response = await api.register(userData);
                
                if (response.success) {
                    showMessage('Account created successfully! Please login.', 'success');
                    
                    // Switch to login tab
                    setTimeout(() => {
                        document.querySelector('[data-tab="login"]').click();
                    }, 1500);
                } else {
                    showMessage(response.message || 'Registration failed', 'error');
                }
            } catch (error) {
                showMessage('Registration failed: ' + error.message, 'error');
            } finally {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});

// Show message function
function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    
    // Style the message
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        color: white;
        font-weight: bold;
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
        ${type === 'success' ? 'background: #4CAF50;' : 'background: #f44336;'}
    `;
    
    // Add animation keyframes if not exists
    if (!document.querySelector('#messageStyles')) {
        const style = document.createElement('style');
        style.id = 'messageStyles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(messageDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Tab switching functionality (if exists)
document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
        const targetTab = this.getAttribute('data-tab');
        
        // Remove active class from all tabs and contents
        document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        this.classList.add('active');
        document.getElementById(targetTab).classList.add('active');
    });
});

// Check if user is already logged in
function checkLoginStatus() {
    const token = localStorage.getItem('devquery_token');
    const currentPage = window.location.pathname;
    
    if (token && (currentPage === '/login' || currentPage === '/signup')) {
        // User is logged in but on login/signup page, redirect to dashboard
        window.location.href = '/dashboard';
    } else if (!token && currentPage === '/dashboard') {
        // User is not logged in but trying to access dashboard, redirect to login
        window.location.href = '/login';
    }
}

// Run login check on page load
document.addEventListener('DOMContentLoaded', checkLoginStatus);