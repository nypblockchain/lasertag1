async function fetchMazeAndPlayers() {
    try {
        const res = await fetch("/api/maze");
        const data = await res.json();
        mazeCache = data.maze; // Save maze once on load
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
                    playerClass = playerId; // e.g., "player1"
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

window.onload = fetchMazeAndPlayers;

let mazeCache = []; // stores maze from first fetch

document.addEventListener("keydown", async (e) => {
    const key = e.key;

    const action = keyMap[key];
    if (!action) return; // Ignore irrelevant keys

    try {
        const res = await fetch("/api/move", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...action, playerId: getCurrentPlayer() })  // Send both direction and playerId
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

    if (!command) return;

    await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, playerId: getCurrentPlayer() }) // ? add this
    });

    // ? Always re-fetch maze and player state after command
    await fetchMazeAndPlayers();

    input.value = ""; // Optional: clear input box
}

document.getElementById("resetMazeBtn").addEventListener("click", async () => {
    try {
        const res = await fetch("/api/maze/reset", { method: "POST" });
        const data = await res.json();
        console.log(data.message || "Maze reset");

        // Refresh the page to trigger a full reload
        window.location.reload();
    } catch (err) {
        console.error("Maze reset failed:", err);
    }
});

function getCurrentPlayer() {
    return document.getElementById("playerSelect").value || "player1";
}