(() => {
    const storageKey = "eja.login.settings.v1";
    let settings = {};

    try {
        const storedSettings = window.localStorage.getItem(storageKey);
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            if (
                parsedSettings &&
                typeof parsedSettings === "object" &&
                !Array.isArray(parsedSettings)
            ) {
                settings = parsedSettings;
            } else {
                console.error(
                    "EJA settings storage does not contain a valid settings object.",
                );
            }
        }
    } catch (error) {
        console.error("Unable to read persistent EJA settings.", error);
    }

    window.ejaSettings = {
        get(section) {
            const value = settings[section];
            return value && typeof value === "object" && !Array.isArray(value)
                ? { ...value }
                : {};
        },
        update(section, values) {
            settings[section] = { ...this.get(section), ...values };
            try {
                window.localStorage.setItem(
                    storageKey,
                    JSON.stringify(settings),
                );
                return true;
            } catch (error) {
                console.error("Unable to save persistent EJA settings.", error);
                window.dispatchEvent(new CustomEvent("eja:settings-error"));
                return false;
            }
        },
    };
})();
