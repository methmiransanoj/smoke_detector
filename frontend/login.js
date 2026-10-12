// Handle the login form

document.getElementById("loginform").addEventListener("submit", async e => {
    e.preventDefault(); // Stop page refresh
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const message = document.getElementById("loginMessage");
    message.textContent = "Checking login...";
    try {
        // Send login details to Node.js server
        const response = await fetch("/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json(); // Get server response
        if (result.success) {
            // Save operator details
            localStorage.setItem("operatorName", result.name);
            localStorage.setItem("operatorEmail", result.email);
            localStorage.setItem("operatorRole", result.role);
            localStorage.setItem("lastLogin", new Date().toLocaleString());
            window.location.href = "index.html"; // Open dashboard
        } else {
            message.textContent = result.message; // Login failed
        }
    } catch (error) {
        console.error(error);
        message.textContent = "Unable to connect to server."; // Server error
    }
});
