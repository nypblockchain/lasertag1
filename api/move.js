// api/move.js
const { mazeCache, players } = require("./shared");

module.exports = async (req, res) => {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        if (!req.body || typeof req.body !== "object") {
            return res.status(400).json({ error: "Missing or invalid request body" });
        }

        const { direction, playerId } = req.body;

        if (!playerId || !players[playerId]) {
            return res.status(400).json({ error: "Invalid or missing playerId" });
        }

        const directions = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0]
        };

        const move = directions[direction];
        if (!move) {
            return res.status(400).json({ error: "Invalid direction" });
        }

        const [dx, dy] = move;
        const newX = players[playerId].x + dx;
        const newY = players[playerId].y + dy;

        if (
            newY >= 0 && newY < mazeCache.length &&
            newX >= 0 && newX < mazeCache[0].length &&
            mazeCache[newY][newX] === 0
        ) {
            players[playerId] = { x: newX, y: newY };
            return res.json({ success: true, players });
        }

        return res.json({ success: false, players });
    } catch (err) {
        console.error("🔥 move.js error:", err);
        return res.status(500).json({
            error: "Internal move error",
            detail: err.message || String(err)
        });
    }
};
