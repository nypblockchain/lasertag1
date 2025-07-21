const admin = require("firebase-admin");

console.log("🔥 Initializing Firebase Admin...");

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.GOOGLE_PROJECT_ID,
                clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
                privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
            }),
        });
        console.log("✅ Firebase Admin initialized");
    } catch (err) {
        console.error("❌ Firebase Admin init failed:", err);
        throw err;
    }
} else {
    console.log("⚠️ Firebase already initialized");
}

const db = admin.firestore();

// Firestore doc refs
const PLAYERS_DOC = db.collection("maze_state").doc("players");
const MAZE_DOC = db.collection("maze_state").doc("maze");

// In-memory caches
let playersCache = null;
let mazeCache = null;

/* ---------------------- Players ---------------------- */

async function getPlayers() {
    if (playersCache) return playersCache;

    const snap = await PLAYERS_DOC.get();
    if (snap.exists) {
        playersCache = snap.data();
        return playersCache;
    }

    // Default player positions
    const seed = {
        player1: { x: 0, y: 0, lives: 3 },
        player2: { x: 0, y: 20, lives: 3 },
        player3: { x: 20, y: 0, lives: 3 },
        player4: { x: 20, y: 20, lives: 3 },
    };

    await PLAYERS_DOC.set(seed);
    playersCache = seed;
    return playersCache;
}

async function updatePlayerPos(id, x, y) {
    if (playersCache?.[id]) {
        playersCache[id].x = x;
        playersCache[id].y = y;
    }
    await PLAYERS_DOC.update({ [`${id}.x`]: x, [`${id}.y`]: y });
}

/* ---------------------- Maze ---------------------- */

async function getMaze() {
    if (mazeCache) return mazeCache;

    const snap = await MAZE_DOC.get();
    if (snap.exists) {
        const data = snap.data();
        mazeCache = Object.values(data.rows);
        return mazeCache;
    }

    // Create default maze if not found
    const maze2D = generateMaze(21);
    const rows = {};
    maze2D.forEach((row, i) => (rows[`r${i}`] = row));
    await MAZE_DOC.set({ rows });

    mazeCache = maze2D;
    return mazeCache;
}

/* ---------------- Maze Generator ---------------- */

function generateMaze(size = 21) {
    if (size % 2 === 0) size += 1;
    const maze = Array.from({ length: size }, () => Array(size).fill(1));

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function carve(x, y) {
        const directions = shuffle([
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ]);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (
                ny > 0 && ny < size - 1 &&
                nx > 0 && nx < size - 1 &&
                maze[ny][nx] === 1
            ) {
                maze[y + dy / 2][x + dx / 2] = 0;
                maze[ny][nx] = 0;
                carve(nx, ny);
            }
        }
    }

    maze[1][1] = 0;
    carve(1, 1);

    for (let i = 0; i < size; i++) {
        maze[0][i] = (i % 5 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[size - 1][i] = (i % 6 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[i][0] = (i % 6 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[i][size - 1] = (i % 5 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
    }

    maze[0][0] = 0;
    maze[0][size - 1] = 0;
    maze[size - 1][0] = 0;
    maze[size - 1][size - 1] = 0;

    return maze;
}

/* ---------------- Cache Resetters ---------------- */

function setPlayersCache(newPlayers) {
    playersCache = newPlayers;
}

function setMazeCache(newMaze) {
    mazeCache = newMaze;
}

/* ---------------- Exports ---------------- */

module.exports = {
    db,
    getPlayers,
    updatePlayerPos,
    getMaze,
    generateMaze,
    playersCache,
    mazeCache,
    setPlayersCache,
    setMazeCache,
};
