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

function renderMaze(maze, players = {}) {
    const mazeDiv = document.getElementById("maze");
    mazeDiv.innerHTML = "";

    const rows = maze.length;
    const cols = maze[0].length;
    const mid = Math.floor(rows / 2); // find center

    mazeDiv.style.display = "grid";
    mazeDiv.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${rows}, 30px)`;

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            let playerClass = null;
            for (const [playerId, pos] of Object.entries(players)) {
                if (pos.lives !== undefined && pos.lives <= 0) continue;
                if (pos.y === i && pos.x === j) {
                    playerClass = playerId;
                    break;
                }
            }

            if (playerClass) {
                cell.classList.add(playerClass);
            } else if (maze[i][j] === 1) {
                // Highlight walls that are part of the 5×5 center box
                if (Math.abs(i - mid) <= 2 && Math.abs(j - mid) <= 2) {
                    cell.classList.add("center-wall"); 
                } else {
                    cell.classList.add("wall");
                }
            } else {
                cell.classList.add("path");
            }

            mazeDiv.appendChild(cell);
        }
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

// setInterval(fetchMazeAndPlayers, 750);
window.onload = fetchMazeAndPlayers;
stopPolling();
