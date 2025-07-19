const admin = require("firebase-admin");

console.log("🔥 Initializing Firebase Admin...");

if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FB_PROJECT_ID,
                clientEmail: process.env.FB_CLIENT_EMAIL,
                privateKey: process.env.FB_PRIVATE_KEY.replace(/\\n/g, "\n"),
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

/* --------- 2. Collection / document helpers -------- */
const PLAYERS_DOC = db.collection("maze_state").doc("players");
const MAZE_DOC = db.collection("maze_state").doc("maze");

/* ----------------- 3. Players helpers ----------------- */
async function getPlayers() {
    const snap = await PLAYERS_DOC.get();
    if (snap.exists) return snap.data();

    // If doc doesn’t exist, create the default positions
    const seed = {
        player1: { x: 0, y: 0 },
        player2: { x: 0, y: 20 },
        player3: { x: 20, y: 0 },
        player4: { x: 20, y: 20 },
    };
    await PLAYERS_DOC.set(seed);
    return seed;
}

async function updatePlayerPos(id, x, y) {
    await PLAYERS_DOC.update({ [`${id}.x`]: x, [`${id}.y`]: y });
}

/* ----------------- 4. Maze helpers (optional) ----------------- */
/* ---------- Maze helpers ---------- */
async function getMaze() {
    const snap = await MAZE_DOC.get();
    if (snap.exists) {
        const data = snap.data();
        if (data && data.rows) return Object.values(data.rows);
        throw new Error("Maze doc broken");
    }

    const maze2D = generateMaze(21);
    const rows = {};
    maze2D.forEach((row, i) => (rows[`r${i}`] = row));

    console.log("📦 Creating new maze document...");
    await MAZE_DOC.set({ rows });
    console.log("✅ Maze written to Firestore");

    return maze2D;
}


/* (re‑use your existing generateMaze function) */
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
    console.log("MAZE GENERATED");
}

/* ----------------- 5. Exports ----------------- */
module.exports = {
    db,
    getPlayers,
    updatePlayerPos,
    getMaze,        // used by api/maze.js
    generateMaze,   // still handy for /reset
};
