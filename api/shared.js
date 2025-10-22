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

    const players = generatePerimeterPlayers(25);
    await PLAYERS_DOC.set(players);
    return players;

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
function generateMaze(size = 19) {
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

    // carve maze
    maze[1][1] = 0;
    carve(1, 1);

    // make border all paths
    for (let i = 0; i < size; i++) {
        maze[0][i] = 0;
        maze[size - 1][i] = 0;
        maze[i][0] = 0;
        maze[i][size - 1] = 0;
    }

    // define center
    const mid = Math.floor(size / 2);

    // reset a 3x3 area for the cage
    for (let y = mid - 1; y <= mid + 1; y++) {
        for (let x = mid - 1; x <= mid + 1; x++) {
            maze[y][x] = 1; // default to path (1 = path in your definition)
        }
    }

    // now set walls (0 = wall)
    maze[mid - 1][mid - 1] = 0;
    maze[mid - 1][mid + 1] = 0;
    maze[mid + 1][mid - 1] = 0;
    maze[mid + 1][mid + 1] = 0;

    // optionally ensure connectivity to maze
    maze[mid - 2][mid] = 1;
    maze[mid + 2][mid] = 1;
    maze[mid][mid - 2] = 1;
    maze[mid][mid + 2] = 1;

    return maze;
}

/* Writing nicknames to Firestore */
const NICKNAMES_DOC = db.collection("maze_state").doc("nicknames");
const CONTROLLER_LOCK_DOC = db.collection("maze_state").doc("controller_lock");

async function setNickname(playerId, nickname) {
    await NICKNAMES_DOC.set({ [playerId]: nickname }, { merge: true });
}

async function getNicknames() {
    const [nickSnap, lockSnap] = await Promise.all([
        NICKNAMES_DOC.get(),
        CONTROLLER_LOCK_DOC.get()
    ])

    const nicknames = nickSnap.exists ? nickSnap.data() : {};
    const locked = lockSnap.exists ? lockSnap.data().locked : false;

    return { nicknames, locked };
}

async function resetNicknames() {
    await NICKNAMES_DOC.set({});
}

function generatePerimeterPlayers(size = 19, count = 20, parity = 'auto') {
    if (size < 3) throw new Error("size must be >= 3");
    if (count < 1) throw new Error("count must be >= 1");

    const perim = [];

    // Top row (y=0)
    for (let x = 0; x < size; x++) perim.push({ x, y: 0 });
    // Right column (x=size-1)
    for (let y = 1; y < size - 1; y++) perim.push({ x: size - 1, y });
    // Bottom row (y=size-1)
    for (let x = size - 1; x >= 0; x--) perim.push({ x, y: size - 1 });
    // Left column (x=0)
    for (let y = size - 2; y > 0; y--) perim.push({ x: 0, y });

    // Optional parity filter (for matching walkable parity if you ever add wall gaps)
    const byParity = (p) => perim.filter(({ x, y }) => ((x + y) & 1) === p);
    let ring = perim;
    if (parity === 'auto') {
        const even = byParity(0), odd = byParity(1);
        ring = even.length >= count ? even : (odd.length >= count ? odd : perim);
    } else if (parity === 0 || parity === 1) {
        const forced = byParity(parity);
        if (forced.length >= count) ring = forced;
    }

    // Evenly distribute players around the ring
    const players = {};
    const step = ring.length / count;
    const offset = step / 2;
    const used = new Set();

    for (let i = 0; i < count; i++) {
        let j = Math.floor(i * step + offset) % ring.length;
        while (used.has(j)) j = (j + 1) % ring.length;
        used.add(j);
        const { x, y } = ring[j];
        players[`player${i + 1}`] = { x, y };
    }

    return players;
}

async function setPing(playerId) {
    const ts = Date.now();
    await db.collection("pings").doc(playerId).set({ ts });
    return ts;
}

async function getPings() {
    const snap = await db.collection("pings").get();
    const now = Date.now();
    const fresh = {};
    snap.forEach((doc) => {
        const { ts } = doc.data();
        if (now - ts < 15000) {
            fresh[doc.id] = ts;
        }
    });
    console.log("Fresh pings:", fresh);
    return fresh;
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
    setNickname,
    getNicknames,
    resetNicknames,
    generatePerimeterPlayers,
    setPing,
    getPings
}
