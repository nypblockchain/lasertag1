// api/attack.js
const {
    db,
    getPlayers,       // lazy?loads Firestore if cache is empty
    getMaze,          // idem
    playersCache,     // direct in?memory reference
    mazeCache,        // "
} = require("./shared");

module.exports = async (req, res) => {
    /* 1. ?? Validate HTTP method ????????????????????????????? */
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    /* 2. ?? Parse body ??????????????????????????????????????? */
    const { playerId, direction } = req.body || {};
    const dirMap = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0],
    };

    if (!playerId || !dirMap[direction]) {
        return res.status(400).json({ error: "Missing or invalid fields" });
    }

    /* 3. ?? Ensure caches are populated ?????????????????????? */
    // (If cold start, these will lazy?load from Firestore)
    const players = playersCache || await getPlayers();
    const maze = mazeCache || await getMaze();

    const attacker = players[playerId];
    if (!attacker) {
        return res.status(404).json({ error: "Attacker not found" });
    }

    /* 4. ?? Ray?trace the shot ??????????????????????????????? */
    const [dx, dy] = dirMap[direction];
    let x = attacker.x + dx;
    let y = attacker.y + dy;

    let hitPlayerId = null;

    // keep stepping until we hit a wall or the maze boundary
    while (
        y >= 0 && y < maze.length &&
        x >= 0 && x < maze[0].length &&
        maze[y][x] === 0          // 0 = path, 1 = wall
    ) {
        // check each player’s position
        for (const [id, pos] of Object.entries(players)) {
            if (id !== playerId && pos.x === x && pos.y === y && players[id].lives > 0) {
                hitPlayerId = id;
                break;
            }
        }
        if (hitPlayerId) break;
        x += dx;
        y += dy;
    }

    /* 5. ?? If someone was hit, update their lives ??????????? */
    if (hitPlayerId) {
        players[hitPlayerId].lives -= 1;

        // Persist to Firestore (only the lives field changes)
        await db.collection("maze_state")
            .doc("players")
            .update({ [`${hitPlayerId}.lives`]: players[hitPlayerId].lives });

        // Optional: log the hit
        await db.collection("maze_logs").add({
            type: "hit",
            shooter: playerId,
            victim: hitPlayerId,
            livesLeft: players[hitPlayerId].lives,
            ts: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    /* 6. ?? Return result ???????????????????????????????????? */
    return res.json({
        success: true,
        hit: hitPlayerId,                 // null if nobody hit
        lives: hitPlayerId ? players[hitPlayerId].lives : null
    });
};
