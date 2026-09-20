const API = "https://nurserycare-ai-1.onrender.com/api";


/* ================================
   GET LOGIN TOKEN
================================ */

function getToken() {
    return localStorage.getItem("nurserycare_token") || "";
}


/* ================================
   AUTH HEADERS
================================ */

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + getToken()
    };
}


/* ================================
   CHECK LOGIN
================================ */

function requireLogin() {

    const token = getToken();

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}


/* ================================
   LOGOUT
================================ */

function logout() {

    localStorage.removeItem("nurserycare_token");
    localStorage.removeItem("nurserycare_user");
    localStorage.removeItem("nurserycare_current_user");
    localStorage.removeItem("nurserycare_current_analysis");

    window.location.href = "index.html";
}


/* ================================
   UPDATE LOGIN / LOGOUT LINK
================================ */

document.addEventListener("DOMContentLoaded", function () {

    const authLink = document.getElementById("authLink");

    if (!authLink) {
        return;
    }


    if (getToken()) {

        authLink.textContent = "Logout";
        authLink.href = "#";

        authLink.onclick = function (event) {

            event.preventDefault();

            logout();

        };

    } else {

        authLink.textContent = "Login";
        authLink.href = "login.html";

        authLink.onclick = null;

    }

});