document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // Basic validation
  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  // Simple authentication simulation
  if (email && password.length >= 6) {
    // Store user session (in real app, this would be handled by backend)
    localStorage.setItem('devquery_user', JSON.stringify({
      email: email,
      name: email.split('@')[0],
      loginTime: new Date().toISOString()
    }));
    
    // Redirect to dashboard
    window.location.href = 'dashboard.html';
  } else {
    alert("Invalid credentials. Password must be at least 6 characters.");
  }
});
