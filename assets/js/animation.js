/**
 * EJA Animation coordinator
 * Satu rAF loop master — semua canvas render terdaftar di sini.
 * Mencegah dua GPU submit terpisah per vsync dari ambience + pixel-mates.
 */
window.EJALoop = (() => {
    const callbacks = [];
    let running = false;
    let callbacksEnabled = true;
    let lastFrameTime = 0;
    let frameIntervalTotal = 0;
    let frameWorkTotal = 0;
    let measuredFrames = 0;

    function resetPerformanceMetrics() {
        lastFrameTime = 0;
        frameIntervalTotal = 0;
        frameWorkTotal = 0;
        measuredFrames = 0;
    }

    function tick(now) {
        if (document.hidden) {
            running = false;
            return;
        }
        const workStart = performance.now();
        if (lastFrameTime) frameIntervalTotal += now - lastFrameTime;
        lastFrameTime = now;
        if (callbacksEnabled) {
            for (const callback of callbacks) {
                if (callback.enabled) callback.fn(now);
            }
        }
        frameWorkTotal += performance.now() - workStart;
        measuredFrames++;
        requestAnimationFrame(tick);
    }

    return {
        register(fn, name) {
            callbacks.push({ fn, name, enabled: true });
            if (!running) {
                running = true;
                requestAnimationFrame(tick);
            }
        },
        setCallbackEnabled(name, enabled) {
            const callback = callbacks.find((item) => item.name === name);
            if (!callback) return;
            callback.enabled = enabled;
            resetPerformanceMetrics();
        },
        setCallbacksEnabled(enabled) {
            callbacksEnabled = enabled;
            resetPerformanceMetrics();
        },
        resume() {
            if (!running) {
                running = true;
                requestAnimationFrame(tick);
            }
        },
        getPerformance() {
            return {
                frames: measuredFrames,
                averageFrameIntervalMs:
                    measuredFrames > 1
                        ? frameIntervalTotal / (measuredFrames - 1)
                        : 0,
                averageCallbackWorkMs: measuredFrames
                    ? frameWorkTotal / measuredFrames
                    : 0,
            };
        },
    };
})();

// Button click animation — tanpa force layout
document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add("loaded");
});

document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button");
    if (!button || button.disabled) return;

    button.classList.remove("is-clicked");
    requestAnimationFrame(() => button.classList.add("is-clicked"));
});

document.addEventListener("animationend", (event) => {
    if (
        event.target instanceof Element &&
        event.animationName === "button-click"
    ) {
        event.target.classList.remove("is-clicked");
    }
});

// Restart semua canvas saat kembali dari visibility hidden
document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        EJALoop.resume();
    }
});
