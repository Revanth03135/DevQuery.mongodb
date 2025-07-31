document.addEventListener("DOMContentLoaded", function () {
  const user = JSON.parse(localStorage.getItem("devquery_user"));

  // Display user's name if logged in
  if (user && user.name) {
    const nav = document.querySelector(".navbar");
    
    const profileWrapper = document.createElement("div");
    profileWrapper.classList.add("user-profile");

    const profileImage = document.createElement("img");
    profileImage.src = user.profilePic || "default-profile.png"; // fallback
    profileImage.alt = "Profile";
    profileImage.classList.add("profile-pic");

    const nameSpan = document.createElement("span");
    nameSpan.textContent = user.name;

    const logoutBtn = document.createElement("button");
    logoutBtn.textContent = "Logout";
    logoutBtn.classList.add("logout-btn");

    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("devquery_user");
      window.location.href = "index.html"; // redirect to login
    });

    profileWrapper.appendChild(profileImage);
    profileWrapper.appendChild(nameSpan);
    profileWrapper.appendChild(logoutBtn);
    nav.appendChild(profileWrapper);
  }

  // Scroll to sections (optional smooth scroll)
  document.querySelectorAll(".nav-links a[href^='#']").forEach(anchor => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    });
  });
});
