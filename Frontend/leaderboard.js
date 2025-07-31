async function loadLeaderboard() {
    const container = document.getElementById("leaderboard");
    container.innerHTML = "<p>Loading...</p>";

    try {
        const res = await fetch("/api/log-winner");
        const data = await res.json();

        if (!data.success || !data.entries || data.entries.length === 0) {
            container.innerHTML = "<p>No leaderboard entries yet.</p>";
            return;
        }

        // Sort by elapsed time (ascending)
        const sorted = data.entries.sort((a, b) => a.elapsed - b.elapsed);

        const list = document.createElement("ol");
        sorted.forEach(entry => {
            const item = document.createElement("li");
            item.textContent = `${entry.nickname} — ${entry.elapsed}s`;
            list.appendChild(item);
        });

        container.innerHTML = "";
        container.appendChild(list);
    } catch (err) {
        console.error("Failed to load leaderboard", err);
        container.innerHTML = "<p>Failed to load leaderboard.</p>";
    }
}

window.onload = loadLeaderboard;
