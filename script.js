document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault(); // Stop form from submitting normally

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    localStorage.setItem("userEmail", email);

    window.location.href = "dash.html";
  });
