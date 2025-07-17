document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  // For now, just show in console
  console.log("Email:", email);
  console.log("Password:", password);

  // You can now connect to backend using fetch() or show an alert
  alert("Login submitted!");
});
