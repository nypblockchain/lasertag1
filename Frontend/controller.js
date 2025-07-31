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
                        playerClass = id;
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

document.getElementById("pollingToggle").addEventListener("change", (e) => {
    if (e.target.checked) {
        startPolling();
    }
    else {
        stopPolling();
    }
});

const savedPlayerId = localStorage.getItem("playerId");
const playerSelect = document.getElementById("playerSelect");

if (savedPlayerId) {
    playerSelect.value = savedPlayerId;
    playerSelect.disabled = true;
}

document.getElementById("playerSelect").addEventListener("change", fetchMazeAndPlayers);

function injectPlayerStyles() {
    const style = document.createElement("style");

    // 🎨 136 visually distinct colors
    const colors = [
        "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6",
        "#bcf60c", "#fabebe", "#008080", "#e6beff", "#9a6324", "#fffac8", "#800000", "#aaffc3",
        "#808000", "#ffd8b1", "#000075", "#808080", "#ffffff", "#000000", "#ff6666", "#66b2ff",
        "#cc66ff", "#00cc99", "#ffb366", "#b366ff", "#c2f0c2", "#ff99e6", "#4d4dff", "#85e085",
        "#e0b3ff", "#ffdb4d", "#bf80ff", "#ff4d4d", "#00b3b3", "#a6a6a6", "#ffff66", "#6600cc",
        "#ffccff", "#00e673", "#e0e0eb", "#ffd11a", "#666699", "#669999", "#ff5050", "#00bfff",
        "#ccff33", "#ff0066", "#8000ff", "#b3b3cc", "#b3ff66", "#00ffcc", "#d966ff", "#ff9933",
        "#cc0000", "#9999ff", "#66ff66", "#cc99ff", "#0099cc", "#ffcc66", "#ff80bf", "#6666ff",
        "#33cc33", "#ff9966", "#660033", "#99ffcc", "#c0c0c0", "#e6ac00", "#9933ff", "#6699ff",
        "#ff3385", "#33ccff", "#33ff66", "#9900cc", "#ffff99", "#00cccc", "#b3d9ff", "#ff6666",
        "#bfff00", "#66ffff", "#cc66cc", "#ccffcc", "#9966cc", "#ffcc99", "#66ffcc", "#999966",
        "#ffcc33", "#cc99ff", "#3399ff", "#ff9999", "#66ccff", "#ccff66", "#ff99cc", "#66ff99",
        "#339933", "#ffcc00", "#ccff00", "#ff6699", "#99ccff", "#ff66ff", "#33ffcc", "#999999",
        "#ff9966", "#cccc00", "#cc9966", "#660066", "#66cc66", "#00ffcc", "#cc0000", "#990000",
        "#003366", "#cc3333", "#009999", "#993333", "#cc0066", "#660000", "#990099", "#666666",
        "#330000", "#996600", "#666600", "#003300", "#003333", "#330033", "#333300", "#333333"
    ];

    let css = "";

    for (let i = 1; i <= 136; i++) {
        const playerId = `player${i}`;
        const color = colors[i - 1];
        css += `.${playerId} {
            background-color: ${color};
            box-sizing: border-box;
        }\n`;
    }

    style.innerHTML = css;
    document.head.appendChild(style);
}

window.onload = async () => {
    await fetchNicknames();
    await fetchMazeAndPlayers();
    injectPlayerStyles();
    stopPolling();
};