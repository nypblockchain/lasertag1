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

    mazeDiv.style.display = "grid";
    mazeDiv.style.gridTemplateColumns = `repeat(${maze[0].length}, 16px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${maze.length}, 16px)`;

    for (let i = 0; i < maze.length; i++) {
        for (let j = 0; j < maze[0].length; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            for (const [playerId, pos] of Object.entries(players)) {
                if (pos.y === i && pos.x === j) {
                    cell.classList.add(playerId);
                }
            }

            if (maze[i][j] === 1) cell.classList.add("wall");
            else cell.classList.add("path");

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

    appendLog(`? ${playerId}: ${command}`);
    input.value = "";

    try {
        const res = await fetch("/api/command", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ command, playerId }),
        });

        const data = await res.json();

        if (data.success) {
            appendLog(`? Gemini ? ${data.moved.join(", ")}`);
        } else {
            appendLog(`? Gemini error: ${data.error || "Unknown error"}`);
        }

        await fetchMazeAndPlayers(); // Re-render after move
    } catch (err) {
        appendLog("? Network or Server Error");
        console.error(err);
    }
}

setInterval(async () => {
    try {
        const res = await fetch("/api/maze");
        const data = await res.json();
        renderMaze(data.maze, data.players);
    } catch (err) {
        console.error("poll failed", err);
    }
}, 750);

window.onload = fetchMazeAndPlayers;
