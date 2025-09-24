let mazeCache = [];
let timeLeft = 120;
let countdownInterval = null;
let pollingInterval = null;
let isPolling = false;
let nicknamesMap = {};
let mazeStartTime = null;
let mazeTimerInterval = null;

function startMazeTimer() {
    mazeStartTime = Date.now();

    const timerDisplay = document.getElementById("mazeTimerDisplay");
    clearInterval(mazeTimerInterval);

    mazeTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - mazeStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString();
        const seconds = (elapsed % 60).toString().padStart(2, "0");
        timerDisplay.textContent = `⏱️ Time: ${minutes}:${seconds}`;
    }, 1000);
}

async function stopMazeTimer(playerId) {
    if (!mazeTimerInterval) return;

    clearInterval(mazeTimerInterval);
    mazeTimerInterval = null;

    const elapsed = Math.floor((Date.now() - mazeStartTime) / 1000);
    const nickname = nicknamesMap[playerId] || playerId;

    appendLog(`🏁 ${nickname} (${playerId}) reached the center in ${elapsed}s`, playerId);

    try {
        await fetch("/api/log-winner", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId, nickname, elapsed })
        });
    } catch (err) {
        console.error("Failed to log winner:", err);
    }
}

async function fetchNicknames() {
    try {
        const res = await fetch("/api/get-nicknames");
        const data = await res.json();
        if (data.success) {
            nicknamesMap = data.nicknames;
        }
    }
    catch (err) {
        console.error("Failed to fetch nicknames", err);
    }
}

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

let isInitialLoad = true;

async function fetchMazeAndPlayers() {
    const loading = document.getElementById("loading");

    if (isInitialLoad && loading) {
        loading.classList.remove("hidden");
    }

    try {
        const res = await fetch("/api/maze");
        const data = await res.json();
        mazeCache = data.maze;
        renderMaze(data.maze, data.players);
    }
    catch (err) {
        console.error("Failed to fetch the maze:", err);
    }
    finally {
        if (isInitialLoad && loading) {
            loading.classList.add("hidden");
            isInitialLoad = false;
        }
    }
}

async function renderMaze(maze, players = {})  {
    const mazeDiv = document.getElementById("maze");
    mazeDiv.innerHTML = "";

    const playerId = getCurrentPlayer();
    const player = players[playerId];

    const mid = Math.floor(maze.length / 2);
    const entrancePositions = [
        { x: mid, y: mid - 2 }, // top
        { x: mid, y: mid + 2 }, // bottom
        { x: mid - 2, y: mid }, // left
        { x: mid + 2, y: mid }  // right
    ];

    const inCenterBox = (
        player.x >= mid - 1 && player.x <= mid + 1 &&
        player.y >= mid - 1 && player.y <= mid + 1
    );

    if (inCenterBox && window.hasStartedMaze && mazeTimerInterval) {
        await stopMazeTimer(playerId);
        triggerTimeUpOverlay();
        window.hasStartedMaze = false;
    }

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
                // Check if a player is at (x, y)
                let playerClass = null;
                for (const [id, pos] of Object.entries(players)) {
                    if (pos.lives !== undefined && pos.lives <= 0) continue;
                    if (pos.x === x && pos.y === y) {
                        if (id === playerId) {
                            playerClass = id;
                        }
                        break;
                    }
                }

                if (playerClass) {
                    cell.classList.add(playerClass);
                    cell.textContent = ""; // Or playerClass.replace("player", "P")
                } else if (maze[y][x] === 1) {
                    cell.classList.add("wall");
                    cell.textContent = "";
                } else {
                    cell.classList.add("path");
                    cell.textContent = "";
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

function appendLog(text, playerId = null) {
    const logDiv = document.getElementById("log");
    const line = document.createElement("div");

    const name = playerId ? (nicknamesMap[playerId] || playerId) : "";
    const label = name ? `${name}: ` : "";

    line.textContent = `[${new Date().toLocaleTimeString()}] ${label}${text}`;
    logDiv.appendChild(line);
    logDiv.scrollTop = logDiv.scrollHeight;
}

async function leave() {
    localStorage.clear();
    console.log("Local Storage Cleared");
    window.location.href = "/landing";
}

async function submitCommand() {
    const input = document.getElementById("commandInput");
    const command = input.value.trim();
    const playerId = getCurrentPlayer();

    if (!command) return;

    if (!window.hasStartedMaze) {
        startMazeTimer();
        window.hasStartedMaze = true;
    }

    appendLog(`🎮 ${command}`, playerId);
    input.value = "";

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, playerId })
        });

        const data = await res.json();

        if (data.success && data.actions) {

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

                        const victim = nicknamesMap[hit.player] || hit.player;
                        appendLog(`🔫 hit ${victim} ${emoji}${resetInfo}`, playerId);
                    });
                }
            });

        } else {
            appendLog(`⚠️ Gemini error: ${data.error || "Unknown error"}`, playerId);
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
                const victim = nicknamesMap[hit.player] || hit.player;
                appendLog(`🔫 hit ${victim} ${emoji}${resetInfo}`, playerId);

            });
        } else {
            appendLog(`🔫 fired ${direction}… missed`, playerId);
        }

        await fetchMazeAndPlayers(); // refresh maze & lives
    } catch (err) {
        appendLog("❌ Attack failed");
        console.error("Attack error:", err);
    }
}

async function sendGeminiFromButton(command) {
    const input = document.getElementById("commandInput");
    const playerId = getCurrentPlayer();

    if (!window.hasStartedMaze) {
        startMazeTimer();
        window.hasStartedMaze = true;
    }

    appendLog(`🎮 ${command}`, playerId);

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, playerId })
        });

        const data = await res.json();

        if (data.success && data.actions) {
            appendLog(`🤖 Gemini ? ${data.actions.map(a =>
                a.type === "move" ? `🧭 ${a.dir}` : `🔫 ${a.dir}`
            ).join(", ")}`);

            data.results.forEach(result => {
                if (result.action.type === "fire" && result.hits && result.hits.length > 0) {
                    result.hits.forEach(hit => {
                        const emoji = hit.livesLeft > 0 ? `❤️ (${hit.livesLeft})` : "💀";
                        const resetInfo = hit.resetTo ? ` → reset to (${hit.resetTo.x},${hit.resetTo.y})` : "";

                        const victim = nicknamesMap[hit.player] || hit.player;
                        appendLog(`🔫 hit ${victim} ${emoji}${resetInfo}`, playerId);

                    })
                }
            });
        } else {
            appendLog(`⚠️ Gemini error: ${data.error || "Unknown error"}`, playerId);
        }

        await fetchMazeAndPlayers();

    } catch (err) {
        appendLog("❌ Network or Server Error");
        console.error(err);
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

let usingGeminiInput = true;
document.getElementById("toggleModeBtn").addEventListener("click", () => {
    usingGeminiInput = !usingGeminiInput;

    document.getElementById("geminiInputControls").style.display = usingGeminiInput ? "block" : "none";
    document.getElementById("dpadControls").style.display = usingGeminiInput ? "none" : "block";

    document.getElementById("toggleModeBtn").innerText = usingGeminiInput
        ? "Switch to D-Pad"
        : "Switch to Gemini Input";

    document.getElementById("controlModeLabel").innerText = usingGeminiInput
        ? "Control Mode: Gemini Input"
        : "Control Mode: D-Pad";
});

const savedPlayerId = localStorage.getItem("playerId");
const playerSelect = document.getElementById("playerSelect");

if (savedPlayerId) {
    playerSelect.value = savedPlayerId;
    playerSelect.disabled = true;
}

document.getElementById("playerSelect").addEventListener("change", fetchMazeAndPlayers);

window.onload = async () => {
    await fetchNicknames();
    await fetchMazeAndPlayers();
    stopPolling();

    // Set default visibility for control modes
    document.getElementById("geminiInputControls").style.display = "block";
    document.getElementById("dpadControls").style.display = "none";
    document.getElementById("controlModeLabel").innerText = "Control Mode: Gemini Input";
    document.getElementById("toggleModeBtn").innerText = "Switch to D-Pad";
};