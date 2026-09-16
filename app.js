const API = "http://localhost:5000/api";

function getToken() {
    return localStorage.getItem("nurserycare_token") || "";
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}

function requireLogin() {
    if (!getToken()) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

function logout() {
    localStorage.removeItem("nurserycare_token");
    localStorage.removeItem("nurserycare_user");
    localStorage.removeItem("nurserycare_current_user");
    localStorage.removeItem("nurserycare_current_analysis");

    window.location.href = "index.html";
}

document.addEventListener("DOMContentLoaded", function () {

    const authLink = document.getElementById("authLink");

    if (!authLink) {
        return;
    }

    if (getToken()) {

        authLink.textContent = "Logout";
        authLink.href = "#";

        authLink.addEventListener("click", function (event) {
            event.preventDefault();
            logout();
        });

    } else {

        authLink.textContent = "Login";
        authLink.href = "login.html";
    }
});