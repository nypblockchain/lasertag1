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
        renderMaze(data.maze, data.players, data.pings);
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

function renderMaze(maze, players = {}, pings = {}) {
    const mazeDiv = document.getElementById("maze");
    mazeDiv.innerHTML = "";

    const rows = maze.length;
    const cols = maze[0].length;
    const mid = Math.floor(rows / 2); // find center

    mazeDiv.style.display = "grid";
    mazeDiv.style.gridTemplateColumns = `repeat(${cols}, 45px)`;
    mazeDiv.style.gridTemplateRows = `repeat(${rows}, 45px)`;

    const now = Date.now();
    console.log("RenderMaze input:", { pings, players, now})

    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            const cell = document.createElement("div");
            cell.classList.add("cell");

            let playerClass = null;
            let isPinged = false;

            for (const [playerId, pos] of Object.entries(players)) {
                if (pos.lives !== undefined && pos.lives <= 0) continue;
                if (pos.y === i && pos.x === j) {
                    playerClass = playerId;

                    if (pings[playerId]) {
                        console.log("Found ping for", playerId)
                    }

                    if (pings[playerId] && now - pings[playerId] < 10000) {
                        isPinged = true;
                        console.log("Pinged cell detected:", playerId)
                    }
                    break;
                }
            }

            if (playerClass) {
                cell.classList.add(playerClass);

                if (playerClass) {
                    cell.classList.add(playerClass);
                    if (isPinged) {
                        cell.classList.add("pinged");
                        console.log("Added ping to", playerClass, { x: j, y: i });
                        void cell.offsetWidth;
                        cell.classList.remove("pinged");
                        void cell.offsetWidth;
                        cell.classList.add("pinged");
                    }
                }

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

(function () {
    const audio = document.getElementById("bgMusic");
    const toggle = document.getElementById("musicToggle");
    const label = document.getElementById("musicStatusLabel");
    const selector = document.getElementById("musicSelector");

    const LS_MUSIC_ENABLED = "bgMusicEnabled";
    const LS_SELECTED_TRACK = "selectedTrack";

    const TARGET_VOLUME = 0.4;
    const FADE_MS = 400;

    function fadeTo(target, done) {
        const steps = 15;
        const stepTime = FADE_MS / steps;
        const start = audio.volume;
        const diff = target - start;

        clearInterval(audio._fadeTimer);
        let i = 0;
        audio._fadeTimer = setInterval(() => {
            i++;
            audio.volume = Math.max(0, Math.min(1, start + diff * (i / steps)));
            if (i >= steps) {
                clearInterval(audio._fadeTimer);
                if (done) done();
            }
        }, stepTime);
    }

    let savedEnabled = localStorage.getItem(LS_MUSIC_ENABLED);
    let savedTrack = localStorage.getItem(LS_SELECTED_TRACK);

    const musicOn = savedEnabled === null ? true : savedEnabled === "true";
    const selectedTrack = savedTrack || selector.value;

    toggle.checked = musicOn;
    selector.value = selectedTrack;
    label.textContent = musicOn ? "Music: ON" : "Music: OFF";

    audio.src = selectedTrack;

    async function playMusic() {
        try {
            audio.volume = 0;
            await audio.play();
            fadeTo(TARGET_VOLUME);
        } catch {
            console.warn("Autoplay blocked; waiting for gesture");
        }
    }

    async function stopMusic() {
        fadeTo(0, () => audio.pause());
    }

    if (musicOn) {
        playMusic();
    }

    toggle.addEventListener("change", async () => {
        if (toggle.checked) {
            localStorage.setItem(LS_MUSIC_ENABLED, "true");
            label.textContent = "MUSIC: ON";
            playMusic();
        } else {
            localStorage.setItem(LS_MUSIC_ENABLED, "false");
            label.textContent = "MUSIC: OFF";
            stopMusic();
        }
    });

    selector.addEventListener("change", () => {
        const newTrack = selector.value;
        localStorage.setItem(LS_SELECTED_TRACK, newTrack);
        audio.src = newTrack;
        if (toggle.checked) playMusic();
    });
})();

document.getElementById("pollingToggle").addEventListener("change", (e) => {
    if (e.target.checked) {
        startPolling();
    }
    else {
        stopPolling();
    }
});

// setInterval(fetchMazeAndPlayers, 750);
window.addEventListener("load", fetchMazeAndPlayers);
stopPolling();
