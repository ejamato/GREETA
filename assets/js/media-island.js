(() => {
    const island = document.getElementById("mediaIsland");
    const title = document.getElementById("mediaTitle");
    const artist = document.getElementById("mediaArtist");
    const playPauseButton = document.getElementById("mediaPlayPause");
    const previousButton = document.getElementById("mediaPrevious");
    const nextButton = document.getElementById("mediaNext");
    const mediaSession = navigator.mediaSession;
    const trackedMedia = new WeakSet();
    let activeMedia = null;

    function getPageMedia() {
        return [...document.querySelectorAll("audio, video")].filter(
            (media) =>
                !media.closest(".wallpaper") &&
                !media.muted &&
                (media.currentSrc || media.src),
        );
    }

    function getMediaTitle(media) {
        const sessionTitle = mediaSession?.metadata?.title;
        if (sessionTitle) return sessionTitle;

        const label =
            media.dataset.title ||
            media.getAttribute("aria-label") ||
            media.getAttribute("title");
        if (label) return label;

        const source = media.currentSrc || media.src;
        const filename = source.split(/[/?#]/).filter(Boolean).pop();
        return filename ? filename.replace(/\.[^.]+$/, "") : "Media";
    }

    function updatePlaybackState() {
        if (
            !activeMedia ||
            !activeMedia.isConnected ||
            activeMedia.muted ||
            !(activeMedia.currentSrc || activeMedia.src)
        ) {
            island.hidden = true;
            island.classList.remove("is-playing");
            if (mediaSession) {
                mediaSession.playbackState = "none";
                mediaSession.metadata = null;
            }
            activeMedia = null;
            return;
        }

        const isPlaying = !activeMedia.paused && !activeMedia.ended;
        island.hidden = false;
        island.classList.toggle("is-playing", isPlaying);
        playPauseButton.setAttribute(
            "aria-label",
            isPlaying ? "Jeda media" : "Putar media",
        );
        playPauseButton.title = isPlaying ? "Jeda" : "Putar";
        title.textContent = getMediaTitle(activeMedia);
        artist.textContent =
            activeMedia.dataset.artist ||
            mediaSession?.metadata?.artist ||
            "EJA PLAYER";

        const mediaList = getPageMedia();
        const currentIndex = mediaList.indexOf(activeMedia);
        previousButton.hidden = mediaList.length < 2;
        nextButton.hidden = mediaList.length < 2;
        previousButton.disabled = currentIndex <= 0;
        nextButton.disabled =
            currentIndex < 0 || currentIndex >= mediaList.length - 1;

        if (mediaSession) {
            mediaSession.playbackState = isPlaying ? "playing" : "paused";
            if (typeof MediaMetadata === "function") {
                const currentMetadata = mediaSession.metadata;
                mediaSession.metadata = new MediaMetadata({
                    title: getMediaTitle(activeMedia),
                    artist: artist.textContent,
                    album: currentMetadata?.album || "",
                    artwork: currentMetadata?.artwork || [],
                });
            }
        }
    }

    function playMedia(media) {
        const result = media.play();
        if (result && typeof result.catch === "function") {
            result.catch((error) => {
                console.error("Unable to play the selected media.", error);
                updatePlaybackState();
            });
        }
    }

    function selectMedia(media) {
        if (!media || media.muted) return;
        if (activeMedia && activeMedia !== media && !activeMedia.paused)
            activeMedia.pause();
        activeMedia = media;
        updatePlaybackState();
        playMedia(media);
    }

    function trackMedia(media) {
        if (trackedMedia.has(media) || media.closest(".wallpaper")) return;
        trackedMedia.add(media);
        [
            "play",
            "pause",
            "ended",
            "volumechange",
            "loadedmetadata",
            "emptied",
        ].forEach((eventName) => {
            media.addEventListener(eventName, () => {
                if (eventName === "play" && !media.muted) {
                    if (
                        activeMedia &&
                        activeMedia !== media &&
                        !activeMedia.paused
                    )
                        activeMedia.pause();
                    activeMedia = media;
                }
                if (
                    eventName === "volumechange" &&
                    activeMedia === media &&
                    media.muted
                ) {
                    activeMedia = null;
                }
                updatePlaybackState();
            });
        });
    }

    function syncMediaElements() {
        document.querySelectorAll("audio, video").forEach(trackMedia);
        if (activeMedia && !activeMedia.isConnected) updatePlaybackState();
    }

    playPauseButton.addEventListener("click", () => {
        if (!activeMedia) return;
        if (activeMedia.paused || activeMedia.ended) {
            playMedia(activeMedia);
        } else {
            activeMedia.pause();
        }
    });

    previousButton.addEventListener("click", () => {
        const mediaList = getPageMedia();
        const index = mediaList.indexOf(activeMedia);
        if (index > 0) selectMedia(mediaList[index - 1]);
    });

    nextButton.addEventListener("click", () => {
        const mediaList = getPageMedia();
        const index = mediaList.indexOf(activeMedia);
        if (index >= 0 && index < mediaList.length - 1)
            selectMedia(mediaList[index + 1]);
    });

    if (mediaSession) {
        const actions = {
            play: () => activeMedia && playMedia(activeMedia),
            pause: () => activeMedia?.pause(),
            previoustrack: () => previousButton.click(),
            nexttrack: () => nextButton.click(),
            seekbackward: (event) => {
                if (activeMedia && Number.isFinite(activeMedia.duration)) {
                    activeMedia.currentTime = Math.max(
                        0,
                        activeMedia.currentTime - (event.seekOffset || 10),
                    );
                }
            },
            seekforward: (event) => {
                if (activeMedia && Number.isFinite(activeMedia.duration)) {
                    activeMedia.currentTime = Math.min(
                        activeMedia.duration,
                        activeMedia.currentTime + (event.seekOffset || 10),
                    );
                }
            },
            seekto: (event) => {
                if (
                    activeMedia &&
                    Number.isFinite(activeMedia.duration) &&
                    Number.isFinite(event.seekTime)
                ) {
                    activeMedia.currentTime = Math.min(
                        activeMedia.duration,
                        Math.max(0, event.seekTime),
                    );
                }
            },
        };
        const supportedActions =
            typeof mediaSession.setActionHandler !== "function"
                ? []
                : typeof mediaSession.getSupportedActions === "function"
                  ? Object.keys(actions).filter((action) =>
                        mediaSession.getSupportedActions().includes(action),
                    )
                  : Object.keys(actions);

        supportedActions.forEach((action) => {
            try {
                mediaSession.setActionHandler(action, actions[action]);
            } catch (error) {
                if (error.name !== "NotSupportedError") throw error;
            }
        });
    }

    syncMediaElements();
    new MutationObserver(syncMediaElements).observe(document.body, {
        childList: true,
        subtree: true,
    });
})();
