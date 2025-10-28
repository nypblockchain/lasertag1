async function loadLeaderboard() {
    const container = document.getElementById("leaderboard");
    const loadingContainer = document.getElementById("loadingContainer");

    // Show loading GIF and hide leaderboard initially
    loadingContainer.style.display = "flex";
    container.style.display = "none";

    try {
        const res = await fetch("/api/log-winner");
        const data = await res.json();

        // Hide loader, show leaderboard container
        loadingContainer.style.display = "none";
        container.style.display = "block";

        if (!data.success || !data.entries || data.entries.length === 0) {
            container.innerHTML = "<p>No leaderboard entries yet.</p>";
            return;
        }

        // Sort by elapsed time (ascending)
        const sorted = data.entries.sort((a, b) => a.elapsed - b.elapsed);

        const list = document.createElement("ol");
        sorted.forEach(entry => {
            const item = document.createElement("li");
            item.textContent = `${entry.nickname}: ${entry.elapsed}s`;
            list.appendChild(item);
        });

        container.innerHTML = "";
        container.appendChild(list);
    } catch (err) {
        console.error("Failed to load leaderboard", err);
        loadingContainer.style.display = "none";
        container.style.display = "block";
        container.innerHTML = "<p>Failed to load leaderboard.</p>";
    }
}

async function loadRightLeaderboard() {
    const under1Container = document.getElementById("leaderboardUnder1");
    const after1Container = document.getElementById("leaderboardAfter1");

    if (!under1Container || !after1Container) {
        console.warn("Right panel containers not found.");
        return;
    }

    try {
        const res = await fetch("/api/log-winner");
        const data = await res.json();

        if (!data.success || !data.entries || data.entries.length === 0) {
            under1Container.innerHTML = "<p>No entries yet.</p>";
            after1Container.innerHTML = "<p>No entries yet.</p>";
            return;
        }

        const sorted = data.entries.sort((a, b) => a.elapsed - b.elapsed);

        const under1 = sorted.filter(entry => entry.elapsed < 60);
        const after1 = sorted.filter(entry => entry.elapsed >= 60 && entry.elapsed < 120);

        const renderList = (arr) => {
            if (!arr.length) return "<p>No entries.</p>";
            return `<ol>${arr.map((e, i) =>
                `<li>${i + 1}. ${e.nickname}: ${e.elapsed}s</li>`
            ).join("")}</ol>`;
        }

        under1Container.innerHTML = renderList(under1);
        after1Container.innerHTML = renderList(after1);
    } catch (err) {
        console.error("Failed to load right leaderboard:", err);
        under1Container.innerHTML = "<p>Failed to load entries.</p>";
        after1Container.innerHTML = "<p>Failed to load entries.</p>";
    }
}

window.addEventListener("load", () => {
    loadLeaderboard();
    loadRightLeaderboard();
})
