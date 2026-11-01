const form = document.getElementById("login-form");
const usernameInput = document.getElementById("login-user");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("login-button");
const loadingIndicator = document.querySelector(".password-loading");
const message = document.getElementById("auth-message");

let authenticating = false;
let authenticationStarted = false;
let waitingForResponse = false;
let pendingPassword = null;
let originalPasswordPlaceholder = passwordInput.placeholder;
let messageTimer;
let messageExitTimer;

function hideMessage() {
    clearTimeout(messageTimer);
    messageTimer = undefined;

    if (!message.classList.contains("is-visible")) return;

    message.classList.remove("is-visible");
    message.classList.add("is-hiding");
    clearTimeout(messageExitTimer);
    messageExitTimer = setTimeout(() => {
        message.textContent = "";
        message.classList.remove("is-hiding", "is-error", "is-info");
        messageExitTimer = undefined;
    }, 240);
}

function setMessage(text, type = "info", { persistent = false } = {}) {
    clearTimeout(messageTimer);
    clearTimeout(messageExitTimer);
    messageTimer = undefined;
    messageExitTimer = undefined;
    message.classList.remove("is-visible", "is-hiding", "is-error", "is-info");
    message.textContent = text;

    if (!text) return;

    message.classList.add(type === "error" ? "is-error" : "is-info");
    void message.offsetWidth;
    message.classList.add("is-visible");

    if (!persistent) {
        messageTimer = setTimeout(hideMessage, 4000);
    }
}

function setAuthenticating(value) {
    authenticating = value;
    submitButton.disabled = value;
    form.classList.toggle("is-authenticating", value);
    loadingIndicator.hidden = !value;
}

window.setAuthMessage = setMessage;

window.addEventListener("eja:settings-error", () => {
    setMessage(
        "Pengaturan tidak dapat disimpan di profil browser ini.",
        "error",
        { persistent: true },
    );
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!window.lightdm) {
        setMessage("Greeter API unavailable.", "error");
        return;
    }

    const response = passwordInput.value;
    if (!response) {
        setMessage(
            authenticationStarted
                ? "A response is required."
                : "Password is required.",
            "error",
        );
        passwordInput.focus();
        return;
    }

    if (waitingForResponse) {
        waitingForResponse = false;
        setAuthenticating(true);
        setMessage("Authenticating...", "info", { persistent: true });
        try {
            window.lightdm.respond(response);
            passwordInput.value = "";
        } catch (error) {
            console.error("Failed to submit authentication response.", error);
            resetAuthentication();
            setMessage("Authentication response failed.", "error");
        }
        return;
    }

    if (authenticating || authenticationStarted) return;

    const username = window.lightdm.username;
    if (!username) {
        setMessage("Username is required.", "error");
        usernameInput.focus();
        return;
    }

    authenticationStarted = true;
    pendingPassword = response;
    setAuthenticating(true);
    setMessage("Authenticating...", "info", { persistent: true });

    try {
        window.lightdm.authenticate(username);
        passwordInput.value = "";
    } catch (error) {
        console.error("Failed to start authentication.", error);
        resetAuthentication();
        setMessage("Authentication request failed.", "error");
        usernameInput.focus();
    }
});

window.show_prompt = (text, type) => {
    setMessage(text, type === "error" ? "error" : "info");

    if (type === "password" && pendingPassword !== null) {
        const password = pendingPassword;
        pendingPassword = null;
        try {
            window.lightdm.respond(password);
            passwordInput.value = "";
        } catch (error) {
            console.error("Failed to submit the password response.", error);
            resetAuthentication();
            setMessage("Authentication response failed.", "error");
        }
        return;
    }

    pendingPassword = null;
    waitingForResponse = true;
    passwordInput.type = type === "password" ? "password" : "text";
    passwordInput.placeholder = text || originalPasswordPlaceholder;
    setAuthenticating(false);
    passwordInput.focus();
};

window.show_message = (text, type) => {
    const isError = type === "error";
    if (isError && authenticationStarted) {
        resetAuthentication();
        passwordInput.focus();
    }
    setMessage(text, isError ? "error" : "info");
};

function resetAuthentication() {
    authenticating = false;
    authenticationStarted = false;
    waitingForResponse = false;
    pendingPassword = null;
    passwordInput.value = "";
    passwordInput.type = "password";
    passwordInput.placeholder = originalPasswordPlaceholder;
    setAuthenticating(false);
}

window.authentication_complete = () => {
    if (window.lightdm?.is_authenticated) {
        const session = window.lightdm.sessions?.find((item) =>
            item.name?.toLowerCase().includes("cinnamon"),
        );

        if (session) {
            try {
                window.lightdm.start_session(session.key);
            } catch (error) {
                console.error("Failed to start the selected session.", error);
                resetAuthentication();
                setMessage("Unable to start the selected session.", "error");
                passwordInput.focus();
            }
        } else {
            resetAuthentication();
            setMessage("No valid Cinnamon session found.", "error");
            passwordInput.focus();
        }
    } else {
        resetAuthentication();
        setMessage("Authentication failed.", "error");
        usernameInput.focus();
    }
};
