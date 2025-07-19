// api/shared.js
const admin = require("firebase-admin");

/* --------- 1. Initialise Firebase Admin (runs only once per cold?start) -------- */
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.GOOGLE_PROJECT_ID,
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            // private key arrives with \n in env?var, turn them into real newlines
            privateKey: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
        }),
    });
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
async function getMaze() {
    const snap = await MAZE_DOC.get();

    if (snap.exists) {
        const data = snap.data();
        if (!data.maze || !Array.isArray(data.maze)) {
            throw new Error("? Firestore maze field is missing or not an array");
        }
        return data.maze;
    }

    const maze = generateMaze(21);
    console.log("?? Generated new maze");
    await MAZE_DOC.set({ maze });
    return maze;
}

/* (re?use your existing generateMaze function) */
function generateMaze(size = 21) {
    /* ... unchanged maze?generation code ... */
}

/* ----------------- 5. Exports ----------------- */
module.exports = {
    db,
    getPlayers,
    updatePlayerPos,
    getMaze,        // used by api/maze.js
    generateMaze,   // still handy for /reset
};
