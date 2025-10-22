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
    const maze = Array.from({ length: size }, () => Array(size).fill(0)); // 0 = wall, 1 = path

    // --- 1. Base maze carving ---
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
                maze[ny][nx] === 0
            ) {
                maze[y + dy / 2][x + dx / 2] = 1;
                maze[ny][nx] = 1;
                carve(nx, ny);
            }
        }
    }

    maze[1][1] = 1;
    carve(1, 1);

    // --- 2. Open outer border for player movement ---
    for (let i = 0; i < size; i++) {
        maze[0][i] = 1;             // top
        maze[size - 1][i] = 1;      // bottom
        maze[i][0] = 1;             // left
        maze[i][size - 1] = 1;      // right
    }

    // --- 3. Add second-row wall ring (for player spawn buffer) ---
    for (let i = 1; i < size - 1; i++) {
        if (i % 2 === 0) {
            maze[1][i] = 0;             // top inner wall
            maze[size - 2][i] = 0;      // bottom inner wall
            maze[i][1] = 0;             // left inner wall
            maze[i][size - 2] = 0;      // right inner wall
        }
    }

    const mid = Math.floor(size / 2);

    // --- 4. Center cage (010 / 111 / 010) ---
    for (let y = mid - 1; y <= mid + 1; y++) {
        for (let x = mid - 1; x <= mid + 1; x++) {
            maze[y][x] = 0;
        }
    }

    maze[mid - 1][mid] = 1;
    maze[mid][mid - 1] = 1;
    maze[mid][mid] = 1;
    maze[mid][mid + 1] = 1;
    maze[mid + 1][mid] = 1;

    maze[mid - 2][mid] = 1;
    maze[mid + 2][mid] = 1;
    maze[mid][mid - 2] = 1;
    maze[mid][mid + 2] = 1;

    // --- 5. Fairness pass ---
    balanceMazeFairness(maze, mid);

    return maze;
}

// Ensure fair routes from all directions
function balanceMazeFairness(maze, mid) {
    const size = maze.length;

    // (A) Ensure each side has an open path toward the center
    const midLeft = mid, midRight = mid;
    for (let y = 1; y < size - 1; y++) {
        if (maze[y][1] === 1) { maze[y][2] = 1; break; } // left edge
    }
    for (let y = 1; y < size - 1; y++) {
        if (maze[y][size - 2] === 1) { maze[y][size - 3] = 1; break; } // right edge
    }
    for (let x = 1; x < size - 1; x++) {
        if (maze[1][x] === 1) { maze[2][x] = 1; break; } // top
    }
    for (let x = 1; x < size - 1; x++) {
        if (maze[size - 2][x] === 1) { maze[size - 3][x] = 1; break; } // bottom
    }

    // (B) Slightly increase open density if one side too walled
    const density = { top: 0, bottom: 0, left: 0, right: 0 };
    for (let i = 0; i < size; i++) {
        density.top += maze[2][i];
        density.bottom += maze[size - 3][i];
        density.left += maze[i][2];
        density.right += maze[i][size - 3];
    }

    const avg = (density.top + density.bottom + density.left + density.right) / 4;
    for (const side in density) {
        if (density[side] < avg * 0.6) {
            openSide(maze, side, size);
        }
    }
}

// open small extra gaps for low-density sides
function openSide(maze, side, size) {
    if (side === "top") {
        for (let x = 2; x < size - 2; x += 2) maze[2][x] = 1;
    } else if (side === "bottom") {
        for (let x = 2; x < size - 2; x += 2) maze[size - 3][x] = 1;
    } else if (side === "left") {
        for (let y = 2; y < size - 2; y += 2) maze[y][2] = 1;
    } else if (side === "right") {
        for (let y = 2; y < size - 2; y += 2) maze[y][size - 3] = 1;
    }
}


function connectFromEdgesToCenter(maze, mid) {
    const size = maze.length;

    // top to center
    for (let y = 1; y < mid; y++) maze[y][mid] = 1;
    // bottom
    for (let y = mid; y < size - 1; y++) maze[y][mid] = 1;
    // left
    for (let x = 1; x < mid; x++) maze[mid][x] = 1;
    // right
    for (let x = mid; x < size - 1; x++) maze[mid][x] = 1;
}


// ✅ Make sure all edge cells next to player spawns are walkable
function ensureBorderFairness(maze) {
    const size = maze.length;
    for (let i = 0; i < size; i++) {
        if (maze[0][i] === 1 && maze[1][i] === 0) maze[1][i] = 1;               // top
        if (maze[size - 1][i] === 1 && maze[size - 2][i] === 0) maze[size - 2][i] = 1; // bottom
        if (maze[i][0] === 1 && maze[i][1] === 0) maze[i][1] = 1;               // left
        if (maze[i][size - 1] === 1 && maze[i][size - 2] === 0) maze[i][size - 2] = 1; // right
    }
}

// ✅ Guarantee every edge region connects to the center somehow
function ensureCenterConnectivity(maze, mid) {
    const size = maze.length;

    const visited = Array.from({ length: size }, () => Array(size).fill(false));
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    function dfs(y, x) {
        if (y < 0 || y >= size || x < 0 || x >= size || maze[y][x] === 0 || visited[y][x]) return;
        visited[y][x] = true;
        for (const [dy, dx] of dirs) dfs(y + dy, x + dx);
    }

    dfs(mid, mid); // flood-fill from center

    // find disconnected path cells near edges and reconnect them
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (maze[y][x] === 1 && !visited[y][x]) {
                // open a path toward center
                const dy = Math.sign(mid - y);
                const dx = Math.sign(mid - x);
                if (maze[y + dy] && maze[y + dy][x + dx] === 0) {
                    maze[y + dy][x + dx] = 1;
                }
            }
        }
    }
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
