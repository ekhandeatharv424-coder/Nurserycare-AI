const API = "https://nurserycare-ai-1.onrender.com/api";

// ======================================================
// COMMON API REQUEST
// ======================================================

async function postData(url, body) {
    const response = await fetch(API + url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    });

    let data = {};

    try {
        data = await response.json();
    } catch (error) {
        data = {};
    }

    if (!response.ok) {
        throw new Error(
            data.message || "Request failed. Please try again."
        );
    }

    return data;
}

// ======================================================
// MESSAGE HELPER
// ======================================================

function showMessage(element, message, type = "error") {
    if (!element) {
        return;
    }

    element.textContent = message;
    element.style.display = "block";

    if (type === "success") {
        element.style.color = "#2e7d32";
    } else {
        element.style.color = "#c62828";
    }
}

// ======================================================
// BUTTON LOADING
// ======================================================

function setButtonLoading(button, loading, normalText) {
    if (!button) {
        return;
    }

    if (loading) {
        button.disabled = true;

        button.dataset.originalText =
            button.textContent;

        button.textContent = "Please wait...";
        button.style.opacity = "0.7";
        button.style.cursor = "not-allowed";
    } else {
        button.disabled = false;

        button.textContent =
            normalText ||
            button.dataset.originalText ||
            "Submit";

        button.style.opacity = "1";
        button.style.cursor = "pointer";
    }
}

// ======================================================
// EMAIL VALIDATION
// ======================================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ======================================================
// SAVE USER SESSION
// ======================================================

function saveUserSession(data) {
    if (data.token) {
        localStorage.setItem(
            "nurserycare_token",
            data.token
        );
    }

    const user = data.user || {};

    localStorage.setItem(
        "nurserycare_user",
        JSON.stringify(user)
    );

    localStorage.setItem(
        "nurserycare_current_user",
        JSON.stringify(user)
    );
}

// ======================================================
// LOGIN
// ======================================================

const loginForm =
    document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const message =
                document.getElementById("msg");

            const submitButton =
                loginForm.querySelector(
                    'button[type="submit"]'
                );

            const emailInput =
                document.getElementById("email");

            const passwordInput =
                document.getElementById("password");

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";

            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!email) {
                showMessage(
                    message,
                    "Please enter your email address."
                );
                return;
            }

            if (!isValidEmail(email)) {
                showMessage(
                    message,
                    "Please enter a valid email address."
                );
                return;
            }

            if (!password) {
                showMessage(
                    message,
                    "Please enter your password."
                );
                return;
            }

            try {

                setButtonLoading(
                    submitButton,
                    true,
                    "Login"
                );

                const data =
                    await postData(
                        "/auth/login",
                        {
                            email: email,
                            password: password
                        }
                    );

                saveUserSession(data);

                showMessage(
                    message,
                    "Login successful. Redirecting...",
                    "success"
                );

                setTimeout(function () {

                    window.location.href =
                        "dashboard.html";

                }, 500);

            } catch (error) {

                console.error(
                    "Login Error:",
                    error
                );

                showMessage(
                    message,
                    error.message ||
                    "Login failed. Please check your details."
                );

                setButtonLoading(
                    submitButton,
                    false,
                    "Login"
                );
            }
        }
    );
}

// ======================================================
// REGISTER
// ======================================================

const registerForm =
    document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const message =
                document.getElementById("msg");

            const submitButton =
                registerForm.querySelector(
                    'button[type="submit"]'
                );

            const nameInput =
                document.getElementById("name");

            const emailInput =
                document.getElementById("email");

            const passwordInput =
                document.getElementById("password");

            const confirmPasswordInput =
                document.getElementById(
                    "confirmPassword"
                );

            const name =
                nameInput
                    ? nameInput.value.trim()
                    : "";

            const email =
                emailInput
                    ? emailInput.value.trim()
                    : "";

            const password =
                passwordInput
                    ? passwordInput.value
                    : "";

            const confirmPassword =
                confirmPasswordInput
                    ? confirmPasswordInput.value
                    : password;

            // ------------------------------
            // VALIDATION
            // ------------------------------

            if (!name) {
                showMessage(
                    message,
                    "Please enter your name."
                );
                return;
            }

            if (name.length < 2) {
                showMessage(
                    message,
                    "Name must contain at least 2 characters."
                );
                return;
            }

            if (!email) {
                showMessage(
                    message,
                    "Please enter your email address."
                );
                return;
            }

            if (!isValidEmail(email)) {
                showMessage(
                    message,
                    "Please enter a valid email address."
                );
                return;
            }

            if (!password) {
                showMessage(
                    message,
                    "Please create a password."
                );
                return;
            }

            if (password.length < 6) {
                showMessage(
                    message,
                    "Password must contain at least 6 characters."
                );
                return;
            }

            if (confirmPassword !== password) {
                showMessage(
                    message,
                    "Passwords do not match."
                );
                return;
            }

            try {

                setButtonLoading(
                    submitButton,
                    true,
                    "Create Account"
                );

                const data =
                    await postData(
                        "/auth/register",
                        {
                            name: name,
                            email: email,
                            password: password
                        }
                    );

                saveUserSession(data);

                showMessage(
                    message,
                    "Account created successfully. Redirecting...",
                    "success"
                );

                setTimeout(function () {

                    window.location.href =
                        "dashboard.html";

                }, 500);

            } catch (error) {

                console.error(
                    "Registration Error:",
                    error
                );

                showMessage(
                    message,
                    error.message ||
                    "Registration failed. Please try again."
                );

                setButtonLoading(
                    submitButton,
                    false,
                    "Create Account"
                );
            }
        }
    );
}

// ======================================================
// PASSWORD SHOW / HIDE
// ======================================================

document.addEventListener(
    "click",
    function (event) {

        const target = event.target;

        if (!target) {
            return;
        }

        const toggle =
            target.closest
                ? target.closest(
                    "[data-password-toggle]"
                )
                : null;

        if (!toggle) {
            return;
        }

        const targetId =
            toggle.getAttribute(
                "data-password-toggle"
            );

        if (!targetId) {
            return;
        }

        const passwordInput =
            document.getElementById(targetId);

        if (!passwordInput) {
            return;
        }

        if (passwordInput.type === "password") {

            passwordInput.type = "text";

            toggle.textContent = "🙈";

        } else {

            passwordInput.type = "password";

            toggle.textContent = "👁";
        }
    }
);