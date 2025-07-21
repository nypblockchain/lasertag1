let mazeCache = [];

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
                if (pos.y === i && pos.x === j) {
                    playerClass = playerId;
                    break;
                }
            }

            if (playerClass) {
                cell.classList.add(playerClass);
            } else if (maze[i][j] === 1) {
                cell.classList.add("wall");
            } else {
                cell.classList.add("path");
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

function triggerTimeUpOverlay() {
    document.getElementById("timeUpOverlay").classList.remove("hidden");
}

setInterval(fetchMazeAndPlayers, 750);
window.onload = fetchMazeAndPlayers;
