let assignedPlayerId = null;

function getImageUrlForPlayer(playerId) {
    return `/styles/images/sprites/${playerId}.png`
}

function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function updateAssignedPlayerUI(playerId) {
    assignedPlayerId = playerId;
    const img = document.getElementById("playerImg");
    const label = document.getElementById("playerIdLabel");
    const hiddenInput = document.getElementById("playerIdInput");

    img.src = getImageUrlForPlayer(playerId);
    img.alt = `Assigned player ${playerId}`;
    label.textContent = `Assigned Player: ${playerId}`;
    hiddenInput.value = playerId;
}

async function fetchAvailablePlayers() {
    try {
        const res = await fetch("/api/get-available-players");
        const data = await res.json();

        if (!data.success || !data.available?.length) {
            document.getElementById("errorText").textContent = "No Available Players.";
            return;
        }

        updateAssignedPlayerUI(pickRandom(data.available));
    } catch (err) {
        console.error("Error fetching players: ", err);
        document.getElementById("errorText").textContent = "Failed to load players.";
    }
}

async function shuffleAssignedPlayer() {
    try {
        const res = await fetch("/api/get-available-players");
        const data = await res.json();
        if (!data.success || !data.available?.length) return;

        const pool = data.available.filter(p => p !== assignedPlayerId);
        updateAssignedPlayerUI(pickRandom(pool.length ? pool : data.available));
    } catch (err) {
        console.error("Shuffle error:", err);
    }
}

async function submitNickname(e) {
    e.preventDefault();
    const nickname = document.getElementById("nicknameInput").value.trim();
    const playerId = assignedPlayerId;

    if (!/^[a-zA-Z0-9_-]{3,15}$/.test(nickname)) {
        document.getElementById("errorText").textContent =
            "Nickname must be 3�15 characters and contain only letters, numbers, dashes or underscores.";
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
            window.location.href = "/controller";
        } else {
            document.getElementById("errorText").textContent = result.error || "Failed to set nickname.";
        }
    } catch (err) {
        console.error("Nickname error:", err)
        document.getElementById("errorText").textContent = "Server Error.";
    }
}

window.addEventListener("load", fetchAvailablePlayers);
document.getElementById("nicknameForm").addEventListener("submit", submitNickname);
document.getElementById("shuffleBtn").addEventListener("click", shuffleAssignedPlayer);

document.getElementById("playerImg").addEventListener("error", () => {
    document.getElementById("playerImg").src = "/images/players/placeholder.png";
});