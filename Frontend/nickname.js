async function fetchAvailablePlayers() {
    try {
        const res = await fetch("/api/get-available-players");
        const data = await res.json();

        if (data.success) {
            const select = document.getElementById("playerIdInput");
            data.available.forEach(playerId => {
                const option = document.createElement("option");
                option.value = playerId;
                option.textContent = playerId;
                select.appendChild(option);
            });
        } else {
            document.getElementById("errorText").textContent = "Could not load available players.";
        }
    } catch (err) {
        console.error("Error loading available players:", err);
        document.getElementById("errorText").textContent = "Failed to fetch players.";
    }
}

async function submitNickname(e) {
    e.preventDefault();
    const nickname = document.getElementById("nicknameInput").value.trim();
    const playerId = document.getElementById("playerIdInput").value;

    // nickname validation
    if (!/^[a-zA-Z0-9_-]{3,15}$/.test(nickname)) {
        document.getElementById("errorText").textContent =
            "Nickname must be 3–15 characters and contain only letters, numbers, dashes or underscores.";
        return;
    }

    try {
        const res = await fetch("/api/set-nickname", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId, nickname })
        });

        const result = await res.json();
        if (result.success) {
            localStorage.setItem("playerId", playerId);
            localStorage.setItem("nickname", nickname);
            window.location.href = "/controller"; // ? go to controller
        } else {
            document.getElementById("errorText").textContent = result.error || "Failed to set nickname.";
        }
    } catch (err) {
        console.error("Nickname error:", err);
        document.getElementById("errorText").textContent = "Server error.";
    }
}

document.getElementById("nicknameForm").addEventListener("submit", submitNickname);
window.onload = fetchAvailablePlayers;
