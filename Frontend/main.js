let mazeCache = [];
let isPolling = false;
let pollingInterval = null;

function startPolling() {
    if (!pollingInterval) {
        pollingInterval = setInterval(fetchMazeAndPlayers, 750);
        document.getElementById("pollingStatusLabel").textContent = "Polling: ON";
        isPolling = true;
        alert("Polling started. The maze will update every 750ms.");
        console.log("Polling started.")
    }
}

function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        document.getElementById("pollingStatusLabel").textContent = "Polling: OFF";
        isPolling = false;
        alert("Polling has been paused.")
        console.log("Polling stopped.")
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
    mazeDiv.style.gridTemplateColumns = `repeat(${cols}, 24px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${rows}, 24px)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            let playerClass = null;
            for (const [playerId, pos] of Object.entries(players)) {
                if (pos.lives !== undefined && pos.lives <= 0) continue;  // ?? new guard
                if (pos.y === i && pos.x === j) {
                    playerClass = playerId;
                    break;
                }
            }

            if (playerClass) {
                cell.classList.add(playerClass);
                cell.textContent = ""; // or e.g., "P1" if you want
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

const keyMap = {
    ArrowUp: { direction: "up" },
    ArrowDown: { direction: "down" },
    ArrowLeft: { direction: "left" },
    ArrowRight: { direction: "right" }
};

document.addEventListener("keydown", async (e) => {
    const key = e.key;
    const action = keyMap[key];
    if (!action) return;

    try {
        const res = await fetch("/api/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...action, playerId: getCurrentPlayer() })
        });

        const data = await res.json();
        renderMaze(mazeCache, data.players);
    } catch (err) {
        console.error("Failed to move player:", err);
    }
});

async function submitCommand() {
    const input = document.getElementById("commandInput");
    const command = input.value.trim();
    const playerId = getCurrentPlayer();
    if (!command || !playerId) return;

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, playerId })
        });

        const data = await res.json();
        console.log("Command result:", data);

        await fetchMazeAndPlayers(); // ? re-render updated positions
    } catch (err) {
        console.error("Command error:", err);
    }

    input.value = "";
}

document.getElementById("resetMazeBtn").addEventListener("click", async () => {
    try {
        const res = await fetch("/api/reset", { method: "POST" });
        const data = await res.json();
        console.log(data.message || "Maze reset");
        window.location.reload();
    } catch (err) {
        console.error("Maze reset failed:", err);
    }
});

document.getElementById("overlayResetBtn").addEventListener("click", async () => {
    try {
        await fetch("/api/reset", { method: "POST" });
        window.location.reload();
    } catch (err) {
        console.error("Overlay reset failed:", err);
    }
});

let countdownInterval = null;
let timeLeft = 120;
let timerStarted = false;

function startCountdownTimer() {
    const display = document.getElementById("countdownDisplay");

    countdownInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60).toString();
        const seconds = (timeLeft % 60).toString().padStart(2, "0");
        display.textContent = `? ${minutes}:${seconds}`;
        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(countdownInterval);
            triggerTimeUpOverlay();
        }
    }, 1000);
}

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

function triggerTimeUpOverlay() {
    document.getElementById("timeUpOverlay").classList.remove("hidden");
}

document.getElementById("pollingToggle").addEventListener("change", (e) => {
    if (e.target.checked) {
        startPolling();
    }
    else {
        stopPolling();
    }
});

// setInterval(fetchMazeAndPlayers, 750);
window.onload = fetchMazeAndPlayers;
injectPlayerStyles();
stopPolling();
