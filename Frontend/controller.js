let mazeCache = [];
let timeLeft = 120;
let countdownInterval = null;
let pollingInterval = null;
let isPolling = false;
let nicknamesMap = {};
let mazeStartTime = null;
let mazeTimerInterval = null;
let lastActivityTime = Date.now();
let inactivityCheckInterval = null;
let inactivityCountdownInterval = null;
const INACTIVITY_LIMIT_MS = 2 * 60 * 1000; // 2 minutes
const WARNING_TIME_MS = 30 * 1000

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
    if (!mazeTimerInterval) return null;

    clearInterval(mazeTimerInterval);
    mazeTimerInterval = null;

    const elapsed = Math.floor((Date.now() - mazeStartTime) / 1000);
    const nickname = nicknamesMap[playerId] || playerId;

    appendLog(`🏁 ${nickname} (${playerId}) reached the center in ${elapsed}s`, playerId);

    return { elapsed, nickname };
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

function triggerReconnectOverlay(message = "Reconnecting... Gemini seems to be taking a break.") {
    const overlay = document.getElementById("reconnectOverlay");
    const messageEl = overlay?.querySelector(".overlay-content p");

    if (!overlay) {
        console.warn("⚠️ reconnectOverlay not found in DOM");
        return;
    }

    // Update overlay message
    if (messageEl) {
        messageEl.textContent = message;
    }

    // Show overlay
    overlay.classList.remove("hidden");

    // Automatically hide it after 4 seconds
    setTimeout(() => {
        overlay.classList.add("hidden");
    }, 4000);
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

    const inCenterBox = (player.x === mid && player.y === mid);

    if (inCenterBox && window.hasStartedMaze && !window.overlayTriggered) {
        window.overlayTriggered = true;

        if (pollingInterval) clearInterval(pollingInterval);

        const elapsed = Math.floor((Date.now() - mazeStartTime) / 1000);
        const nickname = nicknamesMap[playerId] || playerId || localStorage.getItem("nickname");

        console.log("Player reached center: ", { playerId, nickname, elapsed });

        try {
            const res = await fetch("/api/log-winner", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ playerId, nickname, elapsed })
            });

            const data = await res.json();
            if (data.success) console.log("Winner logged successfully");
        } catch (err) {
            console.error("Error calling log-winner: ", err);
        }

        triggerTimeUpOverlay({ elapsed, nickname }); 

        setTimeout(async () => {
            await resetNicknames(playerId);
            localStorage.removeItem("playerId");
            localStorage.removeItem("nickname");
            window.hasStartedMaze = false;
            console.log(`Cleared nickname for ${playerId}`);
        }, 3000);

        setTimeout(async () => {
            try {
                const spawnX = player.spawnX ?? 1;
                const spawnY = player.spawnY ?? 1;

                await fetch("/api/move", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        playerId, 
                        respawn: true
                    })
                });

                console.log(`Respawned ${playerId} at spawn after 15 seconds.`);
                window.overlayTriggered = false;
            } catch (err) {
                console.error("Respawn failed: ", err);
            }
        }, 5000);
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

                // ✅ Only show the current player, ignore all others
                if (player.x === x && player.y === y) {
                    cell.classList.add(playerId); // apply your own player class
                    cell.textContent = "";        // no text overlay
                }
                else if (maze[y][x] === 1) {
                    const mid = Math.floor(maze.length / 2);
                    const inCenterZone = Math.abs(y - mid) <= 1 && Math.abs(x - mid) <= 1;
                    const inCorner = Math.abs(y - mid) === 1 && Math.abs(x - mid) === 1;
                    if (inCenterZone && inCorner) cell.classList.add("center-wall");
                    else cell.classList.add("wall");
                }
                else if (maze[y][x] === 0) {
                    cell.classList.add("path");
                }

                if (playerClass) {
                    cell.classList.add(playerClass);
                    cell.textContent = "";
                } else if (maze[y][x] === 1) {
                    const mid = Math.floor(maze.length / 2);

                    const inCenterZone = Math.abs(y - mid) <= 1 && Math.abs(x - mid) <= 1;
                    const inCorner = Math.abs(y - mid) === 1 && Math.abs(x - mid) === 1;

                    if (inCenterZone && inCorner) {
                        cell.classList.add("center-wall");
                    } else {
                        cell.classList.add("wall");
                    }
                } else if (maze[y][x] === 0) {
                    // ✅ path tiles now handled explicitly
                    cell.classList.add("path");
                } else {
                    // ✅ out-of-bounds or undefined tiles (instead of walls)
                    cell.classList.add("wall");
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
    const playerId = localStorage.getItem("playerId");
    if (playerId) {
        await clearNickname(playerId);
    }

    localStorage.clear();
    console.log("Local Storage Cleared");
    window.location.href = "/landing";
}

async function resetNicknames(playerId) {
    try {
        const res = await fetch("/api/clear-nicknames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId })
        });

        const data = await res.json();
        if (data.success) {
            console.log(`Nickname cleared for ${playerId}`);
        } else {
            console.warn(`Failed to clear nickname for ${playerId}: `, data.message);
        }
    } catch (err) {
        console.error("Error calling resetNicknames", err);
    }
}

async function submitCommand() {
    lastActivityTime = Date.now();
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
        console.error("Gemini Error: ", err);
        triggerReconnectOverlay("Gemini seems to be taking a break... attempting to reconnect.");
    }
}

function triggerTimeUpOverlay(data = {}) {

    const { elapsed = 0, nickname = "Player" } = data;

    const mins = Math.floor(elapsed / 60);
    const secs = String(elapsed % 60).padStart(2, "0");

    const nameEl = document.getElementById("ovName");
    const timeEl = document.getElementById("ovTime");

    if (nameEl) nameEl.textContent = nickname;
    if (timeEl) timeEl.textContent = `Time taken to escape the maze: ${mins}:${secs}`;

    document.getElementById("timeUpOverlay").classList.remove("hidden");
}

async function backToMainMenu() {
    window.location.href = "/landing";
    localStorage.clear();
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
    lastActivityTime = Date.now();

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
            triggerReconnectOverlay("Gemini seems to be taking a break... attempting to reconnect.")
        }

        await fetchMazeAndPlayers();

    } catch (err) {
        console.error("Gemini Error: ", err);
        triggerReconnectOverlay("Gemini seems to be taking a break... attempting to reconnect.");
    }
}

async function clearNickname(playerId) {
    if (!playerId) return;

    try {
        const res = await fetch("/api/clear-nicknames", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playerId })
        });

        const data = await res.json();
        if (data.success) {
            console.log(`Cleared nickname for ${playerId}`);
        } else {
            console.warn("Failed to clear nickname:", data.error || data);
        }
    } catch (err) {
        console.error("Error clearing nickname: ", err);
    }
}



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

document.getElementById("pingBtn").addEventListener("click", async () => {
    lastActivityTime = Date.now();
    const playerId = getCurrentPlayer();
    const statusEl = document.getElementById("status");

    statusEl.textContent = "Sending Ping...";

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command: "ping", playerId })
        });

        const data = await res.json();

        if (data.success) {
            statusEl.textContent = "Ping sent!";
        } else {
            statusEl.textContent = `Ping failed: ${data.error || "Unknown error"}`;
        }
    } catch (err) {
        console.error("Ping error:", err);
        statusEl.textContent = "Error sending ping";
    }

    setTimeout(() => {
        statusEl.textContent = "";
    }, 2000);
});

function triggerInactivityOverlay(seconds = 5) {
    const overlay = document.getElementById("inactivityOverlay");
    const countdownEl = document.getElementById("inactivityCountdown");
    const messageEl = overlay?.querySelector(".overlay-content p");

    if (!overlay) {
        console.warn("⚠️ inactivityOverlay not found in DOM");
        return;
    }

    clearInterval(inactivityCountdownInterval);
    let countdown = seconds;

    if (messageEl) {
        messageEl.innerHTML = `You've been inactive for 60 seconds.<br>Hiding overlay in <span id="inactivityCountdown">${countdown}</span> seconds.`;
    }

    overlay.classList.remove("hidden");

    inactivityCountdownInterval = setInterval(() => {
        countdown -= 1;
        const cd = document.getElementById("inactivityCountdown");
        if (cd) cd.textContent = countdown;

        if (countdown <= 0) {
            clearInterval(inactivityCountdownInterval);
            overlay.classList.add("hidden");
        }
    }, 1000);
}

let inactivityOverlayShown = false;

function startInactivityMonitor() {
    if (inactivityCheckInterval) clearInterval(inactivityCheckInterval);

    console.log("🕵️ Inactivity monitor started");
    inactivityCheckInterval = setInterval(async () => {
        const now = Date.now();
        const playerId = getCurrentPlayer();
        if (!playerId) return;

        const inactiveFor = now - lastActivityTime;

        // ⚠️ Step 1: show warning overlay once
        if (!inactivityOverlayShown && inactiveFor > WARNING_TIME_MS && inactiveFor < INACTIVITY_LIMIT_MS) {
            inactivityOverlayShown = true;
            console.log("⚠️ Showing inactivity overlay");
            triggerInactivityOverlay(10);
        }

        // ⏰ Step 2: trigger backend respawn after 2 minutes
        if (inactiveFor >= INACTIVITY_LIMIT_MS) {
            console.warn(`${playerId} inactive for 2 minutes — triggering respawn`);

            inactivityOverlayShown = false; // reset for next round
            clearInterval(inactivityCheckInterval);
            clearInterval(inactivityCountdownInterval);
            document.getElementById("inactivityOverlay")?.classList.add("hidden");

            try {
                await resetNicknames(playerId);
                await fetch("/api/move", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ playerId, respawn: true })
                });
                console.log(`✅ ${playerId} auto-respawned after inactivity`);
            } catch (err) {
                console.error("Inactivity reset failed:", err);
            }

            localStorage.removeItem("playerId");
            localStorage.removeItem("nickname");
            stopPolling();
            clearInterval(mazeTimerInterval);
            mazeTimerInterval = null;

            const statusEl = document.getElementById("status");
            if (statusEl) statusEl.textContent = "🕒 You were inactive and have been reset.";
        }
    }, 1000);
}

function registerActivityDPad() {
    lastActivityTime = Date.now();
}

window.onload = async () => {
    try {
        const nickname = localStorage.getItem("nickname");
        const playerId = localStorage.getItem("playerId");

        if (!nickname || !playerId) {
            const overlay = document.getElementById("unauthorizedOverlay")
            if (overlay) overlay.classList.remove("hidden");

            setTimeout(() => {
                window.location.href = "/nickname";
            }, 3000)

            return;
        }

        ["reconnectOverlay", "inactivityOverlay", "timeUpOverlay"].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add("hidden");
        });

        await fetchNicknames();
        await fetchMazeAndPlayers();
        startInactivityMonitor();

        document.getElementById("geminiInputControls").style.display = "block";
        document.getElementById("dpadControls").style.display = "none";
        document.getElementById("controlModeLabel").innerText = "Control Mode: Gemini Input";
        document.getElementById("toggleModeBtn").innerText = "Switch to D-Pad";

    } catch (err) {
        console.error("Initialization failed:", err);
        triggerReconnectOverlay("Gemini seems to be taking a break... attempting to reconnect.");
    }
};

