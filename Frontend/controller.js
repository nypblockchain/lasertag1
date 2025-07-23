let mazeCache = [];
let timeLeft = 120;
let countdownInterval = null;
let pollingInterval = null;
let isPolling = false;

function startPolling() {
    if (!pollingInterval) {
        pollingInterval = setInterval(fetchMazeAndPlayers, 2000);
        document.getElementById("pollingStatusLabel").textContent = "Polling: ON";
        isPolling = true;
        console.log("Polling started");
    }
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        document.getElementById("pollingStatusLabel").textContent = "Polling: OFF";
        isPolling = false;
        console.log("Polling paused");
    }
}

async function fetchMazeAndPlayers() {
    try {
        const res = await fetch("/api/maze");
        const data = await res.json();
        mazeCache = data.maze;
        renderMaze(data.maze, data.players);
    } catch (err) {
        console.error("Failed to fetch maze:", err);
    }
}

function renderMaze(maze, players = {}) {
    const mazeDiv = document.getElementById("maze");
    mazeDiv.innerHTML = "";

    const playerId = getCurrentPlayer();
    const player = players[playerId];
    if (!player) return;

    const size = 7;
    const half = Math.floor(size / 2);

    mazeDiv.style.display = "grid";
    mazeDiv.style.gridTemplateColumns = `repeat(${size}, 32px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${size}, 32px)`;

    for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
            const y = player.y + dy;
            const x = player.x + dx;

            const cell = document.createElement("div");
            cell.classList.add("cell");

            if (y >= 0 && y < maze.length && x >= 0 && x < maze[0].length) {
                cell.classList.add(maze[y][x] === 1 ? "wall" : "path");

                for (const [id, pos] of Object.entries(players)) {
                    if (pos.lives !== undefined && pos.lives <= 0) continue; // skip dead players
                    if (pos.x === x && pos.y === y) {
                        cell.classList.add(id);
                    }
                }
            } else {
                cell.classList.add("wall");
            }

            mazeDiv.appendChild(cell);
        }
    }
}

function getCurrentPlayer() {
    return document.getElementById("playerSelect").value || "player1";
}

function appendLog(text) {
    const logDiv = document.getElementById("log");
    const line = document.createElement("div");
    line.textContent = `[${new Date().toLocaleTimeString()}] ${text}`;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
}

async function submitCommand() {
    const input = document.getElementById("commandInput");
    const command = input.value.trim();
    const playerId = getCurrentPlayer();

    if (!command) return;

    appendLog(`🎮 ${playerId}: ${command}`);
    input.value = "";

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, playerId })
        });

        const data = await res.json();

        if (data.success && data.actions) {
            startCountdownTimer();

            // 💬 Replace .moved with .actions and format output
            appendLog(`🤖 Gemini ? ${data.actions.map(a =>
                a.type === "move" ? `🧭 ${a.dir}` : `🔫 ${a.dir}`
            ).join(", ")}`);

            // 🧠 Enhanced feedback: show who got hit
            data.results.forEach(result => {
                if (result.action.type === "fire" && result.hits && result.hits.length > 0) {
                    result.hits.forEach(hit => {
                        const emoji = hit.livesLeft > 0 ? `❤️ (${hit.livesLeft})` : "💀";
                        const resetInfo = hit.resetTo ? ` → reset to (${hit.resetTo.x},${hit.resetTo.y})` : "";
                        appendLog(`🔫 ${playerId} hit ${hit.player} ${emoji}${resetInfo}`);
                    });
                }
            });

        } else {
            appendLog(`⚠️ Gemini error: ${data.error || "Unknown error"}`);
        }


        await fetchMazeAndPlayers();
    } catch (err) {
        appendLog("❌ Network or Server Error");
        console.error(err);
    }
}

function triggerTimeUpOverlay() {
    document.getElementById("timeUpOverlay").classList.remove("hidden");
}

document.getElementById("overlayResetBtn").addEventListener("click", async () => {
    try {
        await fetch("/api/reset", { method: "POST" });
        window.location.reload();
    } catch (err) {
        console.error("Overlay reset failed:", err);
    }
});

function startCountdownTimer() {
    const display = document.getElementById("countdownDisplay");

    clearInterval(countdownInterval);
    timeLeft = 120;

    countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60).toString();
        const seconds = (timeLeft % 60).toString().padStart(2, "0");
        display.textContent = `${minutes}:${seconds}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(countdownInterval);
            triggerTimeUpOverlay();
        }
    }, 1000);
}
async function fireAttack(direction = "up") {
    const playerId = getCurrentPlayer();
    if (!playerId) return;

    try {
        const res = await fetch("/api/attack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId, direction })
        });

        const data = await res.json();

        if (data.success && data.hits && data.hits.length > 0) {
            // log each victim
            data.hits.forEach(hit => {
                const emoji = hit.livesLeft > 0 ? `❤️ (${hit.livesLeft})` : "💀";
                const resetInfo = hit.resetTo ? ` → reset to (${hit.resetTo.x},${hit.resetTo.y})` : "";
                appendLog(`🔫 ${playerId} hit ${hit.player} ${emoji}${resetInfo}`);
            });
        } else {
            appendLog(`🔫 ${playerId} fired ${direction}… missed`);
        }

        await fetchMazeAndPlayers(); // refresh maze & lives
    } catch (err) {
        appendLog("❌ Attack failed");
        console.error("Attack error:", err);
    }
}

document.getElementById("fireButton").addEventListener("click", () => {
    const dir = document.getElementById("attackDirection").value; // "up"|"down"|"left"|"right"
    fireAttack(dir);
});

document.getElementById("pollingToggle").addEventListener("change", (e) => {
    if (e.target.checked) {
        startPolling();
    }
    else {
        stopPolling();
    }
});

document.getElementById("playerSelect").addEventListener("change", fetchMazeAndPlayers);
window.onload = fetchMazeAndPlayers;

stopPolling();
