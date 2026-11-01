(() => {
    const clock = document.getElementById("clock");
    const date = document.getElementById("date");
    const icon = document.getElementById("daypartIcon");
    const wallpaper = document.getElementById("wallpaper");
    const video = document.getElementById("wallpaperVideo");
    const wallpaperFiles = window.EJA_WALLPAPER_FILES || ["home.jpg"];
    const periods = [
        {
            name: "morning",
            start: 5,
            end: 10,
            accent: "#ffd18a",
            aliases: ["dawn", "morning", "pagi", "sunrise"],
        },
        {
            name: "day",
            start: 11,
            end: 14,
            accent: "#fff08a",
            aliases: ["noon", "day", "siang"],
        },
        {
            name: "afternoon",
            start: 15,
            end: 18,
            accent: "#ff9a6b",
            aliases: ["dusk", "afternoon", "sore", "sunset"],
        },
        {
            name: "night",
            start: 19,
            end: 4,
            accent: "#b7c8ff",
            aliases: ["nite", "night", "malam"],
        },
    ];
    let currentPeriod = "";

    function getPeriod(hour) {
        return (
            periods.find((period) =>
                period.start <= period.end
                    ? hour >= period.start && hour <= period.end
                    : hour >= period.start || hour <= period.end,
            ) || periods[3]
        );
    }

    function filenameTokens(filename) {
        return filename
            .split("/")
            .pop()
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .split(/[-_\s]+/);
    }

    function matchingWallpaper(period) {
        return (
            wallpaperFiles.find((filename) =>
                period.aliases.some((alias) =>
                    filenameTokens(filename).includes(alias),
                ),
            ) ||
            wallpaperFiles.find((filename) =>
                filenameTokens(filename).includes("home"),
            ) ||
            wallpaperFiles[0]
        );
    }

    function setWallpaper(period) {
        const filename = matchingWallpaper(period);
        if (!filename) return;

        const source = `assets/images/${encodeURIComponent(filename)}`;
        if (/\.(mp4|webm)$/i.test(filename)) {
            const stem = filename.replace(/\.[^.]+$/, "").toLowerCase();
            const stillImage =
                wallpaperFiles.find(
                    (candidate) =>
                        candidate.replace(/\.[^.]+$/, "").toLowerCase() ===
                            stem &&
                        /\.(avif|gif|jpe?g|png|webp)$/i.test(candidate),
                ) ||
                wallpaperFiles.find((candidate) =>
                    /\.(avif|gif|jpe?g|png|webp)$/i.test(candidate),
                );
            if (stillImage)
                wallpaper.style.backgroundImage = `url("assets/images/${encodeURIComponent(stillImage)}")`;
            video.onerror = () => {
                video.hidden = true;
            };
            video.src = source;
            video.hidden = false;
            video.play().catch(() => {
                video.hidden = true;
            });
            return;
        }

        video.pause();
        video.removeAttribute("src");
        video.load();
        video.hidden = true;
        wallpaper.style.backgroundImage = `url("${source}")`;
    }

    function update() {
        const now = new Date();
        const period = getPeriod(now.getHours());
        const timeText = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

        clock.textContent = timeText;
        clock.dateTime = now.toISOString();
        date.textContent = new Intl.DateTimeFormat("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
        }).format(now);
        document.documentElement.style.setProperty("--accent", period.accent);
        if (currentPeriod !== period.name) {
            icon.dataset.period = period.name;
            icon.innerHTML =
                period.name === "night"
                    ? '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9 1h3v2h2v3h1v5h-2v2h-3v2H5v-2H3v-3H2V6h2V4h2V2h3z" fill="currentColor"/><path d="M8 3H6v2H4v4h2v2h4V9h2V6h-2V4H8z" fill="#101528"/></svg>'
                    : '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 1h4v2h2v2h2v2h1v2h-2v2h-2v2H5v-2H3v-2H1V7h2V5h2V3h1z" fill="currentColor"/><path d="M6 6h4v1h1v3H5V7h1z" fill="#101528"/><path d="M1 13h14v2H1z" fill="currentColor"/></svg>';
            setWallpaper(period);
            currentPeriod = period.name;
        }
    }

    update();
    window.setInterval(update, 15_000);
})();
