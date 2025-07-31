// Home page functionality for DevQuery
document.addEventListener('DOMContentLoaded', function() {
    const tryDevQueryBtn = document.getElementById('tryDevQueryBtn');
    
    if (tryDevQueryBtn) {
        tryDevQueryBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Check if user is logged in
            const token = localStorage.getItem('devquery_token');
            
            if (token) {
                // User is logged in, redirect to dashboard
                window.location.href = '/dashboard';
            } else {
                // User not logged in, show login prompt
                showLoginPrompt();
            }
        });
    }
});

function showLoginPrompt() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;

    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    `;

    modalContent.innerHTML = `
        <h2 style="margin-bottom: 15px; color: #333;">Login Required</h2>
        <p style="margin-bottom: 25px; color: #666;">Please log in to access DevQuery dashboard and start generating SQL queries.</p>
        <div style="display: flex; gap: 15px; justify-content: center;">
            <button id="loginBtn" style="
                padding: 12px 24px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Login</button>
            <button id="signupBtn" style="
                padding: 12px 24px;
                background: #28a745;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Sign Up</button>
            <button id="cancelBtn" style="
                padding: 12px 24px;
                background: #6c757d;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 16px;
            ">Cancel</button>
        </div>
    `;

    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);

    // Add event listeners
    document.getElementById('loginBtn').addEventListener('click', () => {
        window.location.href = '/login';
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
        window.location.href = '/signup';
    });

    document.getElementById('cancelBtn').addEventListener('click', () => {
        document.body.removeChild(modalOverlay);
    });

    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.body.removeChild(modalOverlay);
        }
    });
}
