// api/attack.js
const { db, getPlayers, getMaze } = require("./shared");

/** helper: true if every cell between (ax,ay) and (bx,by) is 0 (path) */
function clearPath(maze, ax, ay, bx, by) {
    if (ax === bx) {
        const [y0, y1] = ay < by ? [ay + 1, by] : [by + 1, ay];
        for (let y = y0; y < y1; y++) if (maze[y][ax] === 1) return false;
        return true;
    }
    if (ay === by) {
        const [x0, x1] = ax < bx ? [ax + 1, bx] : [bx + 1, ax];
        for (let x = x0; x < x1; x++) if (maze[ay][x] === 1) return false;
        return true;
    }
    return false; // not same row/col
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { playerId } = req.body || {};
    if (!playerId) {
        return res.status(400).json({ error: "Missing playerId" });
    }

    try {
        /* 1⃣  Load live state */
        const [players, maze] = await Promise.all([getPlayers(), getMaze()]);
        const attacker = players[playerId];
        if (!attacker) {
            return res.status(404).json({ error: `Player '${playerId}' not found` });
        }

        const { x: ax, y: ay } = attacker;
        const hits = [];

        /* 2⃣  Scan every other player */
        for (const [otherId, p] of Object.entries(players)) {
            if (otherId === playerId) continue;
            if (p.lives !== undefined && p.lives <= 0) continue; // already out

            // same row or column AND nothing but 0‑cells between them
            if (clearPath(maze, ax, ay, p.x, p.y)) {
                const lives = Math.max(0, (p.lives ?? 3) - 1);

                // write back only the lives field
                await db
                    .collection("maze_state")
                    .doc("players")
                    .update({ [`${otherId}.lives`]: lives });

                hits.push({ player: otherId, livesLeft: lives });
            }
        }

        return res.json({
            success: true,
            attacker: playerId,
            hits,
            message:
                hits.length > 0
                    ? `Hit ${hits.map(h => h.player).join(", ")}`
                    : "No players in line‑of‑sight",
        });
    } catch (err) {
        console.error("🔥 attack.js error:", err);
        return res
            .status(500)
            .json({ error: "Attack failed", detail: err.message || String(err) });
    }
};
