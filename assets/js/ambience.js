(() => {
    const canvas = document.getElementById("ambienceCanvas");
    const ctx = canvas.getContext("2d");
    const optimizedMode = false;
    const frameInterval = 0;
    const optimizedParticleLimit = 3;
    const particleLayer = null;
    const modeButtons = [...document.querySelectorAll("[data-weather-mode]")];
    const daypartButtons = [...document.querySelectorAll("[data-daypart]")];
    const daypartAutoButton = document.getElementById("daypartAuto");
    const themeAutoButton = document.getElementById("themeAuto");
    const themeColorInput = document.getElementById("themeColor");
    const wallpaper = document.querySelector(".wallpaper");
    const wallpaperVideo = document.getElementById("wallpaperVideo");
    const wallpaperAutoButton = document.querySelector(".wallpaper-auto");
    const wallpaperGrid = document.getElementById("wallpaperGrid");
    const panel = document.getElementById("ambiencePanel");
    const launcher = document.getElementById("ambienceToggle");
    const daytimeIcon = document.getElementById("daytimeIcon");
    const densityInput = document.getElementById("ambienceDensity");
    const windInput = document.getElementById("ambienceWind");
    const densityValue = document.getElementById("ambienceDensityValue");
    const windValue = document.getElementById("ambienceWindValue");
    const caption = document.getElementById("ambienceCaption");
    const captionTitle = document.getElementById("ambienceTitle");
    const captionSubtitle = document.getElementById("ambienceSubtitle");
    const textToggle = document.getElementById("ambienceTextToggle");
    const savedSettings = window.ejaSettings.get("ambience");
    const modes = {
        rain: ["HUJAN TENANG", "Rintik hujan jatuh lembut di malam hari."],
        autumn: [
            "SENJA GUGUR",
            "Daun berguguran menari pelan mengikuti angin.",
        ],
        snow: ["SALJU PERTAMA", "Butiran salju melayang dalam udara dingin."],
        mix: ["HARMONI MUSIM", "Hujan, daun, dan salju dalam satu suasana."],
    };
    const dayparts = {
        morning: { start: 5, end: 10 },
        day: { start: 11, end: 14 },
        afternoon: { start: 15, end: 18 },
        night: { start: 19, end: 4 },
    };
    const daypartThemes = {
        morning: "#ffd18a",
        day: "#fff08a",
        afternoon: "#ff9a6b",
        night: "#b7c8ff",
    };
    // Browsers cannot enumerate local folders, so add new filenames here; labels use each filename.
    const wallpaperFiles = [
        "castle.png",
        "dawn.jpg",
        "dusk.jpg",
        "home.jpg",
        "house.png",
        "mount.png",
        "nite.jpg",
        "noon.jpeg",
        "train.png",
        "village.png",
    ];
    const wallpaperAliases = {
        morning: ["dawn", "morning", "pagi", "sunrise"],
        day: ["noon", "day", "siang"],
        afternoon: ["dusk", "afternoon", "sore", "sunset"],
        night: ["nite", "night", "malam"],
    };
    const wallpaperImages = Object.fromEntries(
        wallpaperFiles.map((filename) => {
            const name = filename.replace(/\.[^.]+$/, "").toLowerCase();
            return [name, `assets/images/${filename}`];
        }),
    );
    const wallpaperButtons = wallpaperFiles.map((filename) => {
        const name = filename.replace(/\.[^.]+$/, "").toLowerCase();
        const label = name.replace(/[-_]+/g, " ").toUpperCase();
        const button = document.createElement("button");
        const image = document.createElement("img");
        const caption = document.createElement("span");

        button.className = "wallpaper-option";
        button.type = "button";
        button.dataset.wallpaper = name;
        button.setAttribute("aria-label", `Wallpaper ${label}`);
        button.setAttribute("aria-pressed", "false");
        if (/\.mp4$/i.test(wallpaperImages[name])) {
            caption.dataset.mediaType = "video";
            caption.textContent = `▶ ${label}`;
        } else {
            image.dataset.src = wallpaperImages[name];
            image.alt = "";
            image.loading = "lazy";
            image.decoding = "async";
            image.setAttribute("aria-hidden", "true");
            button.append(image);
        }
        if (!caption.dataset.mediaType) caption.textContent = label;
        button.append(caption);
        wallpaperGrid.append(button);
        return button;
    });
    const isValidColor = (color) =>
        typeof color === "string" && /^#[\da-f]{6}$/i.test(color);
    const savedMode = Object.prototype.hasOwnProperty.call(
        modes,
        savedSettings.mode,
    )
        ? savedSettings.mode
        : "autumn";
    const savedDaypart = Object.prototype.hasOwnProperty.call(
        dayparts,
        savedSettings.daypart,
    )
        ? savedSettings.daypart
        : getDaypartForHour(new Date().getHours());
    const savedWallpaper =
        savedSettings.wallpaper === "auto" ||
        Object.prototype.hasOwnProperty.call(
            wallpaperImages,
            savedSettings.wallpaper,
        )
            ? savedSettings.wallpaper
            : "auto";
    const savedDensity = Number.isFinite(savedSettings.density)
        ? Math.max(
              Number(densityInput.min),
              Math.min(Number(densityInput.max), savedSettings.density),
          )
        : Number(densityInput.value);
    const savedWind = Number.isFinite(savedSettings.wind)
        ? Math.max(
              Number(windInput.min),
              Math.min(Number(windInput.max), savedSettings.wind),
          )
        : Number(windInput.value);
    densityInput.value = String(savedDensity);
    windInput.value = String(savedWind);
    const leafColors = ["#e07862", "#e3a65a", "#c79570", "#bf705e", "#e5c46a"];
    const particles = [];
    const ripples = [];
    let width = window.innerWidth;
    let height = window.innerHeight;
    let pixelRatio = 1;
    let mode = savedMode;
    let daypart =
        savedSettings.automaticDaypart === false
            ? savedDaypart
            : getDaypartForHour(new Date().getHours());
    let automaticDaypart = savedSettings.automaticDaypart !== false;
    let automaticWallpaper = savedWallpaper === "auto";
    let selectedWallpaper = savedWallpaper;
    let automaticTheme =
        savedSettings.automaticTheme !== false ||
        !isValidColor(savedSettings.themeColor);
    let customThemeColor = isValidColor(savedSettings.themeColor)
        ? savedSettings.themeColor
        : "#ffd18a";
    let density = Number(densityInput.value);
    let baseWind = Number(windInput.value) / 10;
    let wind = baseWind;
    let pointerWind = 0;
    let time = 0;
    let lastFrameTime = 0;
    let panelCloseTimer;

    function loadWallpaperThumbnails() {
        for (const image of wallpaperGrid.querySelectorAll("img[data-src]")) {
            image.src = image.dataset.src;
            delete image.dataset.src;
        }
    }

    function saveSettings() {
        window.ejaSettings.update("ambience", {
            mode,
            daypart,
            automaticDaypart,
            wallpaper: selectedWallpaper,
            automaticTheme,
            themeColor: themeColorInput.value,
            density: Number(densityInput.value),
            wind: Number(windInput.value),
            captionVisible: !caption.hidden,
        });
    }

    function getDaypartForHour(hour) {
        if (hour >= dayparts.morning.start && hour <= dayparts.morning.end)
            return "morning";
        if (hour >= dayparts.day.start && hour <= dayparts.day.end)
            return "day";
        if (hour >= dayparts.afternoon.start && hour <= dayparts.afternoon.end)
            return "afternoon";
        return "night";
    }

    function resizeCanvas() {
        pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = Math.round(width * pixelRatio);
        canvas.height = Math.round(height * pixelRatio);
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingEnabled = true;
    }

    function randomType() {
        if (mode !== "mix") return mode;
        const value = Math.random();
        return value < 0.38 ? "rain" : value < 0.68 ? "autumn" : "snow";
    }

    function createParticle(type = randomType(), anywhere = false) {
        const depth = 0.4 + Math.random() * 0.6;
        const particle = {
            type,
            x: Math.random() * (width + 100) - 50,
            y: anywhere ? Math.random() * height : -20 - Math.random() * 60,
            depth,
            alpha: anywhere ? 0.65 + Math.random() * 0.35 : 0,
            fading: false,
            phase: Math.random() * Math.PI * 2,
            speed:
                type === "rain"
                    ? (10 + Math.random() * 8) * depth
                    : type === "snow"
                      ? (0.5 + Math.random() * 0.8) * depth
                      : (0.7 + Math.random() * 0.9) * depth,
            size:
                type === "rain"
                    ? (8 + Math.floor(Math.random() * 10)) * depth
                    : type === "snow"
                      ? (1.5 + Math.random() * 2.5) * depth
                      : (4 + Math.random() * 4) * depth,
            color: leafColors[Math.floor(Math.random() * leafColors.length)],
            rotation: Math.random() * Math.PI * 2,
        };
        if (particleLayer) {
            const element = document.createElement("span");
            element.className = `ambience-particle ambience-particle-${type}`;
            element.style.opacity = "0";
            if (type === "rain") {
                element.style.width = `${Math.max(2, Math.round(particle.size * 0.14))}px`;
                element.style.height = `${particle.size}px`;
            } else if (type === "snow") {
                element.style.width = `${particle.size}px`;
                element.style.height = `${particle.size}px`;
            } else {
                element.style.width = `${particle.size}px`;
                element.style.height = `${Math.max(5, Math.round(particle.size * 0.58))}px`;
                element.style.setProperty("--particle-color", particle.color);
            }
            particle.element = element;
            particleLayer.append(element);
        }
        return particle;
    }

    function updateParticle(particle, motionScale) {
        particle.alpha = particle.fading
            ? Math.max(0, particle.alpha - 0.012 * motionScale)
            : Math.min(1, particle.alpha + 0.018 * motionScale);
        particle.phase += (0.025 + particle.depth * 0.02) * motionScale;
        const drift = wind * particle.depth;

        if (particle.type === "rain") {
            particle.x += drift * 1.2 * motionScale;
            particle.y += particle.speed * motionScale;
            if (particle.y > height - 4) {
                if (ripples.length < 35 && Math.random() < 0.1 * motionScale) {
                    ripples.push({
                        x: particle.x,
                        y: height - 4,
                        size: 2,
                        alpha: 0.32,
                    });
                }
                if (!particle.fading) {
                    particle.y = -10;
                    particle.x = Math.random() * width;
                }
            }
        } else {
            particle.x +=
                (Math.sin(particle.phase) *
                    (particle.type === "snow" ? 0.75 : 1.2) +
                    drift * 0.65) *
                motionScale;
            particle.y += particle.speed * motionScale;
            if (particle.type === "autumn") {
                particle.rotation += (drift * 0.015 + 0.012) * motionScale;
            }
            if (particle.y > height + 12 && !particle.fading) {
                particle.y = -12;
                particle.x = Math.random() * width;
            }
        }

        if (particle.x > width + 10) particle.x = -10;
        if (particle.x < -10) particle.x = width + 10;
    }

    function drawParticle(particle) {
        const alpha = particle.alpha * (0.35 + particle.depth * 0.55);
        if (alpha <= 0.01) return;

        if (particle.type === "rain") {
            const angle =
                Math.atan2(particle.speed, wind * particle.depth * 1.2) ||
                Math.PI / 2;
            const len = particle.size;
            const dropWidth = 0.8 + particle.depth * 0.5;
            const rainAlpha = alpha * (0.55 + particle.depth * 0.35);
            ctx.globalAlpha = rainAlpha;
            ctx.lineCap = "round";
            // Main drop line
            ctx.strokeStyle = `rgba(200, 230, 255, 0.85)`;
            ctx.lineWidth = dropWidth;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(
                particle.x - Math.cos(angle) * len,
                particle.y - Math.sin(angle) * len,
            );
            ctx.stroke();
            // Soft glow layer (slightly wider, more transparent)
            if (particle.depth > 0.65) {
                ctx.globalAlpha = rainAlpha * 0.25;
                ctx.strokeStyle = `rgba(185, 215, 255, 0.5)`;
                ctx.lineWidth = dropWidth * 2.5;
                ctx.beginPath();
                ctx.moveTo(particle.x, particle.y);
                ctx.lineTo(
                    particle.x - Math.cos(angle) * len * 0.7,
                    particle.y - Math.sin(angle) * len * 0.7,
                );
                ctx.stroke();
            }
        } else if (particle.type === "snow") {
            const radius = Math.max(1, particle.size);
            ctx.globalAlpha = alpha * (0.6 + particle.depth * 0.35);
            ctx.fillStyle = "#ffffff";
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
            ctx.fill();
            if (radius > 1.8) {
                ctx.globalAlpha = alpha * 0.22;
                ctx.fillStyle = "#bce2ff";
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, radius * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            ctx.save();
            ctx.globalAlpha = alpha * 0.85;
            const size = particle.size;
            ctx.translate(particle.x, particle.y);
            ctx.rotate(particle.rotation);
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, size * 1.4, size * 0.65, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "rgba(255, 230, 180, 0.4)";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(-size * 1.1, 0);
            ctx.lineTo(size * 1.1, 0);
            ctx.stroke();
            ctx.restore();
        }
    }

    function updateAndDrawRipples() {
        for (let index = ripples.length - 1; index >= 0; index--) {
            const ripple = ripples[index];
            ripple.size += 0.55;
            ripple.alpha -= 0.018;
            if (ripple.alpha <= 0) {
                ripples.splice(index, 1);
                continue;
            }
            ctx.strokeStyle = `rgba(185, 219, 255, ${Math.max(0, ripple.alpha * 0.7)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.ellipse(
                ripple.x,
                ripple.y,
                ripple.size * 2,
                ripple.size * 0.5,
                0,
                0,
                Math.PI * 2,
            );
            ctx.stroke();
        }
    }

    function updateModeButtons() {
        modeButtons.forEach((button) => {
            const isActive = button.dataset.weatherMode === mode;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function applyDaypart(nextDaypart) {
        if (!Object.prototype.hasOwnProperty.call(dayparts, nextDaypart))
            return;
        daypart = nextDaypart;
        document.body.dataset.timeOfDay = daypart;
        const labels = {
            morning: "Pagi, ikon matahari",
            day: "Siang, ikon matahari",
            afternoon: "Sore, ikon matahari",
            night: "Malam, ikon bulan",
        };
        daytimeIcon.dataset.daypart = daypart;
        daytimeIcon.setAttribute("aria-label", labels[daypart]);
        if (automaticTheme) applyTheme(daypartThemes[daypart]);
        if (automaticWallpaper) updateWallpaperForDaypart();
        daypartButtons.forEach((button) => {
            const isActive = button.dataset.daypart === daypart;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function applyTheme(color) {
        const red = Number.parseInt(color.slice(1, 3), 16);
        const green = Number.parseInt(color.slice(3, 5), 16);
        const blue = Number.parseInt(color.slice(5, 7), 16);
        document.documentElement.style.setProperty("--accent", color);
        document.documentElement.style.setProperty(
            "--accent-soft",
            `rgba(${red}, ${green}, ${blue}, .15)`,
        );
        themeColorInput.value = color;
    }

    function setAutomaticTheme() {
        automaticTheme = true;
        themeAutoButton.classList.add("is-active");
        themeAutoButton.setAttribute("aria-pressed", "true");
        applyTheme(daypartThemes[daypart]);
    }

    function applyWallpaper(nextWallpaper) {
        const image = wallpaperImages[nextWallpaper];
        if (!image) return;

        if (/\.mp4$/i.test(image)) {
            wallpaper.style.backgroundImage = "none";
            wallpaperVideo.hidden = false;
            if (wallpaperVideo.getAttribute("src") !== image) {
                wallpaperVideo.pause();
                wallpaperVideo.src = image;
                wallpaperVideo.load();
            }
            wallpaperVideo.play().catch((error) => {
                console.error(
                    `Unable to play wallpaper video "${image}".`,
                    error,
                );
            });
            return;
        }

        wallpaperVideo.pause();
        wallpaperVideo.removeAttribute("src");
        wallpaperVideo.load();
        wallpaperVideo.hidden = true;
        wallpaper.style.backgroundImage = `url("${image}")`;
    }

    function updateWallpaperButtons(selected) {
        [...wallpaperButtons, wallpaperAutoButton].forEach((button) => {
            const isActive = button.dataset.wallpaper === selected;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", String(isActive));
        });
    }

    function updateWallpaperForDaypart() {
        const aliases = wallpaperAliases[daypart];
        const wallpaperName =
            aliases.find((name) =>
                Object.prototype.hasOwnProperty.call(wallpaperImages, name),
            ) ||
            (Object.prototype.hasOwnProperty.call(wallpaperImages, "home")
                ? "home"
                : wallpaperFiles[0].replace(/\.[^.]+$/, "").toLowerCase());
        applyWallpaper(wallpaperName);
    }

    function setWallpaperSelection(selection) {
        if (selection === "auto") {
            automaticWallpaper = true;
            selectedWallpaper = "auto";
            updateWallpaperForDaypart();
        } else if (
            Object.prototype.hasOwnProperty.call(wallpaperImages, selection)
        ) {
            automaticWallpaper = false;
            selectedWallpaper = selection;
            applyWallpaper(selection);
        } else {
            return;
        }

        updateWallpaperButtons(selection);
    }

    function setDaypart(nextDaypart) {
        if (!Object.prototype.hasOwnProperty.call(dayparts, nextDaypart))
            return;
        automaticDaypart = false;
        daypartAutoButton.classList.remove("is-active");
        daypartAutoButton.setAttribute("aria-pressed", "false");
        applyDaypart(nextDaypart);
    }

    function useAutomaticDaypart() {
        automaticDaypart = true;
        daypartAutoButton.classList.add("is-active");
        daypartAutoButton.setAttribute("aria-pressed", "true");
        applyDaypart(getDaypartForHour(new Date().getHours()));
    }

    function updateAutomaticDaypart() {
        if (automaticDaypart) {
            applyDaypart(getDaypartForHour(new Date().getHours()));
        }
    }

    function updateClockSettings() {
        updateAutomaticDaypart();
    }

    function setMode(nextMode) {
        if (!Object.prototype.hasOwnProperty.call(modes, nextMode)) return;
        mode = nextMode;
        document.body.dataset.weatherMode = mode;
        updateModeButtons();
        captionTitle.textContent = modes[mode][0];
        captionSubtitle.textContent = modes[mode][1];
        particles.forEach((particle) => {
            if (mode !== "mix" && particle.type !== mode)
                particle.fading = true;
            else particle.fading = false;
        });
    }

    function updateLabels() {
        density = Number(densityInput.value);
        densityValue.value = String(density);
        densityValue.textContent = String(density);
        baseWind = Number(windInput.value) / 10;
        const windAmount = Number(windInput.value);
        windValue.value =
            windAmount === 0
                ? "TENANG"
                : windAmount < 0
                  ? `KIRI ${Math.abs(windAmount)}`
                  : `KANAN ${windAmount}`;
        windValue.textContent = windValue.value;
    }

    function setPanelOpen(isOpen) {
        if (isOpen) {
            window.clearTimeout(panelCloseTimer);
            panel.hidden = false;
            panel.classList.remove("is-closing");
            panel.classList.add("is-opening");
            loadWallpaperThumbnails();
        } else if (!panel.hidden && !panel.classList.contains("is-closing")) {
            panel.classList.remove("is-opening");
            panel.classList.add("is-closing");
            window.clearTimeout(panelCloseTimer);
            panelCloseTimer = window.setTimeout(() => {
                panel.hidden = true;
                panel.classList.remove("is-closing");
            }, 200);
        }

        launcher.setAttribute("aria-expanded", String(isOpen));
        launcher.setAttribute(
            "aria-label",
            isOpen ? "Tutup pengaturan suasana" : "Buka pengaturan suasana",
        );
        if (isOpen) {
            window.dispatchEvent(
                new CustomEvent("eja:control-opened", {
                    detail: { owner: "ambience" },
                }),
            );
        }
    }

    panel.addEventListener("animationend", (event) => {
        if (event.target !== panel) return;
        panel.classList.remove("is-opening");
        if (panel.classList.contains("is-closing")) {
            window.clearTimeout(panelCloseTimer);
            panel.hidden = true;
            panel.classList.remove("is-closing");
        }
    });

    window.addEventListener("eja:control-opened", (event) => {
        if (event.detail.owner !== "ambience") setPanelOpen(false);
    });

    document.addEventListener("click", (event) => {
        if (
            panel.hidden ||
            panel.contains(event.target) ||
            launcher.contains(event.target)
        )
            return;
        setPanelOpen(false);
    });

    function setCaptionVisible(isVisible) {
        caption.hidden = !isVisible;
        textToggle.setAttribute("aria-pressed", String(isVisible));
        textToggle.setAttribute(
            "aria-label",
            isVisible ? "Sembunyikan teks suasana" : "Tampilkan teks suasana",
        );
    }

    function animate(now = performance.now()) {
        if (document.hidden) return;
        if (
            frameInterval &&
            lastFrameTime &&
            now - lastFrameTime < frameInterval
        )
            return;
        const elapsed = lastFrameTime
            ? Math.min((now - lastFrameTime) / 1000, 0.1)
            : 1 / 60;
        lastFrameTime = now;
        const motionScale = elapsed * 60;
        ctx.clearRect(0, 0, width, height);
        flushPointerWind();
        time += 0.005 * motionScale;
        const breeze = Math.sin(time) * 0.16;
        const targetWind = baseWind + breeze + pointerWind;
        wind += (targetWind - wind) * (1 - Math.pow(1 - 0.025, motionScale));

        particles.forEach((particle) => updateParticle(particle, motionScale));
        for (let index = particles.length - 1; index >= 0; index--) {
            if (particles[index].alpha <= 0.01) {
                particles[index].element?.remove();
                particles.splice(index, 1);
            }
        }

        const particleLimit = 200;
        const desiredCount = Math.min(
            particleLimit,
            Math.round(
                density * (mode === "rain" ? 3.5 : mode === "snow" ? 1.2 : 1.0),
            ),
        );
        let activeCount = 0;
        for (const particle of particles) {
            if (!particle.fading) activeCount++;
        }
        if (activeCount < desiredCount) {
            const spawnBurst =
                mode === "rain" ? Math.min(3, desiredCount - activeCount) : 1;
            for (let s = 0; s < spawnBurst; s++)
                particles.push(createParticle());
        }
        if (activeCount > desiredCount) {
            const particleToFade = particles.find(
                (particle) => !particle.fading,
            );
            if (particleToFade) particleToFade.fading = true;
        }

        updateAndDrawRipples();
        particles.forEach(drawParticle);
        ctx.globalAlpha = 1;
    }

    launcher.addEventListener("click", () => setPanelOpen(panel.hidden));
    document
        .getElementById("ambienceClose")
        .addEventListener("click", () => setPanelOpen(false));
    modeButtons.forEach((button) => {
        button.addEventListener("click", () =>
            setMode(button.dataset.weatherMode),
        );
        button.addEventListener("click", saveSettings);
    });
    daypartButtons.forEach((button) => {
        button.addEventListener("click", () =>
            setDaypart(button.dataset.daypart),
        );
        button.addEventListener("click", saveSettings);
    });
    daypartAutoButton.addEventListener("click", () => {
        useAutomaticDaypart();
        saveSettings();
    });
    themeAutoButton.addEventListener("click", () => {
        setAutomaticTheme();
        saveSettings();
    });
    themeColorInput.addEventListener("input", () => {
        automaticTheme = false;
        themeAutoButton.classList.remove("is-active");
        themeAutoButton.setAttribute("aria-pressed", "false");
        applyTheme(themeColorInput.value);
        saveSettings();
    });
    wallpaperButtons.forEach((button) => {
        button.addEventListener("click", () =>
            setWallpaperSelection(button.dataset.wallpaper),
        );
        button.addEventListener("click", saveSettings);
    });
    wallpaperAutoButton.addEventListener("click", () => {
        setWallpaperSelection("auto");
        saveSettings();
    });
    densityInput.addEventListener("input", updateLabels);
    windInput.addEventListener("input", updateLabels);
    densityInput.addEventListener("change", saveSettings);
    windInput.addEventListener("change", saveSettings);
    textToggle.addEventListener("click", () => {
        setCaptionVisible(caption.hidden);
        saveSettings();
    });
    document.addEventListener("click", (event) => {
        if (
            !panel.hidden &&
            !panel.contains(event.target) &&
            !launcher.contains(event.target)
        ) {
            setPanelOpen(false);
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) {
            setPanelOpen(false);
            launcher.focus();
        }
    });
    let pendingPointerX = null;
    window.addEventListener("mousemove", (event) => {
        pendingPointerX = event.clientX;
    });

    function flushPointerWind() {
        if (pendingPointerX !== null) {
            pointerWind = (pendingPointerX / width - 0.5) * 0.28;
            pendingPointerX = null;
        }
    }
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("focus", updateClockSettings);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            lastFrameTime = 0;
            updateClockSettings();
        }
    });

    resizeCanvas();
    updateLabels();
    setMode(mode);
    daypartAutoButton.classList.toggle("is-active", automaticDaypart);
    daypartAutoButton.setAttribute("aria-pressed", String(automaticDaypart));
    applyDaypart(daypart);
    if (automaticTheme) {
        setAutomaticTheme();
    } else {
        themeAutoButton.classList.remove("is-active");
        themeAutoButton.setAttribute("aria-pressed", "false");
        applyTheme(customThemeColor);
    }
    setWallpaperSelection(selectedWallpaper);
    setCaptionVisible(savedSettings.captionVisible === true);
    const initialParticleCount = Math.round(
        density * (mode === "rain" ? 2.5 : mode === "snow" ? 1.0 : 0.8),
    );
    for (let index = 0; index < initialParticleCount; index++) {
        particles.push(
            createParticle(mode === "mix" ? randomType() : mode, true),
        );
    }
    EJALoop.register(animate, "ambience");
    window.setInterval(updateClockSettings, 60_000);
})();
