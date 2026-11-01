function updateClock() {
    const now = new Date();

    document.getElementById("time").textContent = now.toLocaleTimeString(
        "id-ID",
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
        },
    );

    document.getElementById("date").textContent = now
        .toLocaleDateString("id-ID", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
        })
        .toUpperCase();
}

updateClock();
setInterval(updateClock, 1000);
