function initializeSystem() {
    const lightdm = window.lightdm;
    const hostname = lightdm?.hostname;

    document.getElementById("hostname").textContent = hostname || "EJA DEVICE";
    const loginUser = document.getElementById("login-user");
    loginUser.value = lightdm?.username || "";
    loginUser.readOnly = true;
    document.getElementById("username").textContent = lightdm?.display_name
        ? `WELCOME, ${lightdm.display_name}`
        : "WELCOME BACK";

    const sessions = lightdm?.sessions || [];

    const cinnamon = sessions.find((session) =>
        session.name?.toLowerCase().includes("cinnamon"),
    );

    document.getElementById("session").textContent =
        cinnamon?.name || "DEFAULT SESSION";
}

const systemActions = {
    suspend: { method: "suspend", label: "Suspend" },
    reboot: { method: "restart", label: "Reboot" },
    shutdown: { method: "shutdown", label: "Shutdown" },
};

document.querySelectorAll("[data-system-action]").forEach((button) => {
    button.addEventListener("click", () => {
        const action = systemActions[button.dataset.systemAction];
        const method = window.lightdm?.[action.method];

        if (typeof method !== "function") {
            window.setAuthMessage(`${action.label} is unavailable.`, "error");
            return;
        }

        try {
            method.call(window.lightdm);
        } catch (error) {
            console.error(
                `Failed to request ${action.label.toLowerCase()}.`,
                error,
            );
            window.setAuthMessage(`${action.label} request failed.`, "error");
        }
    });
});

initializeSystem();
