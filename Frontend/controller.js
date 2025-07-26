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

    const rows = maze.length;
    const cols = maze[0].length;

    mazeDiv.style.display = "grid";
    mazeDiv.style.gridTemplateColumns = `repeat(${cols}, 32px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${rows}, 32px)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            // Check for player at (j, i)
            let playerClass = null;
            for (const [playerId, pos] of Object.entries(players)) {
                if (pos.lives !== undefined && pos.lives <= 0) continue;
                if (pos.x === j && pos.y === i) {
                    playerClass = playerId;
                    break;
                }
            }

            // Apply appropriate class
            if (playerClass) {
                cell.classList.add(playerClass);
                cell.textContent = ""; // Or: cell.textContent = playerClass.replace("player", "P");
            } else if (maze[i][j] === 1) {
                cell.classList.add("wall");
                cell.textContent = "";
            } else {
                cell.classList.add("path");
                cell.textContent = "";
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
