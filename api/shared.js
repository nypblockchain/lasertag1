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

/* --------- 2. Collection / document helpers -------- */
const PLAYERS_DOC = db.collection("maze_state").doc("players");
const MAZE_DOC = db.collection("maze_state").doc("maze");

/* --------- 2.5. Starting Positions and Respawn Points -------- */
const STARTING_POSITIONS = {
    player1: { x: 0, y: 0 },
    player2: { x: 10, y: 0 },
    player3: { x: 20, y: 0 },
    player4: { x: 20, y: 10 },
    player5: { x: 20, y: 20 },
    player6: { x: 10, y: 20 },
    player7: { x: 0, y: 20 },
    player8: { x: 0, y: 10 },
    player9: { x: 5, y: 0 },
    player10: { x: 15, y: 0 },
    player11: { x: 20, y: 5 },
    player12: { x: 20, y: 15 },
    player13: { x: 15, y: 20 },
    player14: { x: 5, y: 20 },
    player15: { x: 0, y: 15 },
    player16: { x: 0, y: 5 },
    player17: { x: 2, y: 0 },
    player18: { x: 18, y: 0 },
    player19: { x: 2, y: 20 },
    player20: { x: 18, y: 20 }
};


/* ----------------- 3. Players helpers ----------------- */
async function getPlayers() {
    const snap = await PLAYERS_DOC.get();
    if (snap.exists) return snap.data();

    // If doc doesn’t exist, create the default positions
    const seed = {
        player1: { x: 0, y: 0 },
        player2: { x: 10, y: 0 },
        player3: { x: 20, y: 0 },
        player4: { x: 20, y: 10 },
        player5: { x: 20, y: 20 },
        player6: { x: 10, y: 20 },
        player7: { x: 0, y: 20 },
        player8: { x: 0, y: 10 },
        player9: { x: 5, y: 0 },
        player10: { x: 15, y: 0 },
        player11: { x: 20, y: 5 },
        player12: { x: 20, y: 15 },
        player13: { x: 15, y: 20 },
        player14: { x: 5, y: 20 },
        player15: { x: 0, y: 15 },
        player16: { x: 0, y: 5 },
        player17: { x: 2, y: 0 },
        player18: { x: 18, y: 0 },
        player19: { x: 2, y: 20 },
        player20: { x: 18, y: 20 }
    };
    await PLAYERS_DOC.set(seed);
    return seed;
}

async function setMaze(maze) {
    const rows = {};
    maze.forEach((row, i) => {
        rows[`r${i}`] = row;
    });
    await db.collection("maze_state").doc("maze").update({ rows });
}


async function updatePlayerPos(id, x, y) {
    await PLAYERS_DOC.update({ [`${id}.x`]: x, [`${id}.y`]: y });
}

/* ----------------- 4. Maze helpers (optional) ----------------- */
/* ---------- Maze helpers ---------- */
async function getMaze() {
    const doc = await db.collection("maze_state").doc("maze").get();
    const data = doc.data();
    const rows = data?.rows || {};
    const maze = Object.keys(rows)
        .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))) // r0, r1, ...
        .map(key => rows[key]);
    return maze;
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
        maze[0][i] = 0;              // top row
        maze[size - 1][i] = 0;       // bottom row
        maze[i][0] = 0;              // left column
        maze[i][size - 1] = 0;       // right column
    }

    maze[0][0] = 0;
    maze[0][size - 1] = 0;
    maze[size - 1][0] = 0;
    maze[size - 1][size - 1] = 0;

    // Center of maze
    const mid = Math.floor(size / 2);

    // Clear inside of center box (3x3)
    for (let y = mid - 1; y <= mid + 1; y++) {
        for (let x = mid - 1; x <= mid + 1; x++) {
            maze[y][x] = 0;
        }
    }

    // Build walls around (5x5 box)
    for (let i = -2; i <= 2; i++) {
        // Top and bottom
        maze[mid - 2][mid + i] = 1;
        maze[mid + 2][mid + i] = 1;
        // Left and right
        maze[mid + i][mid - 2] = 1;
        maze[mid + i][mid + 2] = 1;
    }

    // 🔓 Open 4 entrances (center of each side)
    maze[mid - 2][mid] = 0; // top
    maze[mid + 2][mid] = 0; // bottom
    maze[mid][mid - 2] = 0; // left
    maze[mid][mid + 2] = 0; // right


    return maze;
    console.log("MAZE GENERATED");
}

/* Writing nicknames to Firestore */
const NICKNAMES_DOC = db.collection("maze_state").doc("nicknames");

async function setNickname(playerId, nickname) {
    await NICKNAMES_DOC.set({ [playerId]: nickname }, { merge: true });
}

async function getNicknames() {
    const snap = await NICKNAMES_DOC.get();
    return snap.exists ? snap.data() : {};
}

async function resetNicknames() {
    await NICKNAMES_DOC.set({});
}

/* ----------------- 5. Exports ----------------- */
module.exports = {
    db,
    getPlayers,
    updatePlayerPos,
    getMaze,        // used by api/maze.js
    generateMaze,   // still handy for /reset
    STARTING_POSITIONS,
    setMaze,
    setNicknames,
    getNicknames,
    resetNicknames,
}
