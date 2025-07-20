let mazeCache = [];
let timeLeft = 120;
let countdownInterval = null;

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

        if (data.success) {
            appendLog(`🤖 Gemini ? ${data.moved.join(", ")}`);
        } else {
            appendLog(`⚠️ Gemini error: ${data.error || "Unknown error"}`);
        }

        await fetchMazeAndPlayers();
    } catch (err) {
        appendLog("❌ Network or Server Error");
        console.error(err);
    }
}

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

function triggerTimeUpOverlay() {
    document.getElementById("timeUpOverlay").classList.remove("hidden");
}

document.getElementById("startTimerButton").addEventListener("click", () => {
    startCountdownTimer()
});

document.getElementById("resetMazeBtn").addEventListener("click", async () => {
    try {
        const res = await fetch("/api/reset", { method: "POST" });
        const data = await res.json();
        console.log(data.message || "Maze reset");

        document.getElementbyId("timeUpOverlay").classlist.add("hidden");

        window.location.reload();
    } catch (err) {
        console.error("Maze reset failed:", err);
    }
});

document.getElementById("playerSelect").addEventListener("change", fetchMazeAndPlayers);
window.onload = fetchMazeAndPlayers;

setInterval(fetchMazeAndPlayers, 750);
