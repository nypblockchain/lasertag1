(async () => {
    sessionStorage.setItem("adminChecked", "true")

    const styles = "cl4raB0W";

    const parts = [
        navigator.userAgent || "",
        navigator.language || "",
        String(navigator.hardwareConcurrency || ""),
        String(navigator.deviceMemory || ""),
        `${screen.width}x${screen.height}`,
        Intl.DateTimeFormat().resolvedOptions().timeZone || "",
        styles
    ];

    const identifier = parts.join("|");

    function toHex(buffer) {
        const bytes = new Uint8Array(buffer);
        return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    const encoded = new TextEncoder().encode(identifier);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const fingerprintHash = toHex(digest);

    const savedKey = localStorage.getItem("deviceKey");
    const ADMIN_KEY = "carolina";
    const silk_fingerprint = "0072a5469327ca3868540b8243881e48881644a2acbe8ee85313199f6811900d";

    if ((fingerprintHash === silk_fingerprint) && savedKey === ADMIN_KEY) {
        sessionStorage.setItem("adminAccess", "true");
        window.location.href = "/admin";
        return;
    } else {
        console.log("Device fingerprint: ", fingerprintHash);
    }
})();


let assignedPlayerId = null;

function getImageUrlForPlayer(playerId) {
    return `/styles/images/sprites/PlayerIcons/${playerId}.png`
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
            window.location.href = "/controller";
        } else {
            document.getElementById("errorText").textContent = result.error || "Failed to set nickname.";
        }
    } catch (err) {
        console.error("Nickname error:", err)
        document.getElementById("errorText").textContent = "Server Error.";
    }
}

async function goToLanding() {
    window.location.href = "/landing";
}

window.addEventListener("load", fetchAvailablePlayers);
document.getElementById("nicknameForm").addEventListener("submit", submitNickname);

document.getElementById("nicknameInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        document.getElementById("submitBtn").click();
    }
});

window.addEventListener("load", () => {
    fetchAvailablePlayers();
    document.getElementById("nicknameInput").focus();
})

document.getElementById("shuffleBtn").addEventListener("click", shuffleAssignedPlayer);

document.getElementById("playerImg").addEventListener("error", () => {
    document.getElementById("playerImg").src = "/images/players/placeholder.png";
});