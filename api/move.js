const db = require("./firebase");
const { mazeCache } = require("./shared");

module.exports = async (req, res) => {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        const { direction, playerId } = req.body;

        if (!direction || !playerId) {
            return res.status(400).json({ error: "Missing direction or playerId" });
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

        const playersDocRef = db.collection("maze_state").doc("players");
        const doc = await playersDocRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Players document not found" });
        }

        const players = doc.data();
        const playerData = players[playerId];

        if (!playerData) {
            return res.status(404).json({ error: `Player '${playerId}' not found` });
        }

        const [dx, dy] = move;
        const newX = playerData.x + dx;
        const newY = playerData.y + dy;

        if (
            newY >= 0 && newY < mazeCache.length &&
            newX >= 0 && newX < mazeCache[0].length &&
            mazeCache[newY][newX] === 0
        ) {
            players[playerId] = { x: newX, y: newY };
            await playersDocRef.update({ [playerId]: players[playerId] });
        }

        return res.json({ success: true, players });
    } catch (err) {
        console.error("🔥 move.js error:", err);
        return res.status(500).json({
            error: "Internal move error",
            detail: err.message || String(err)
        });
    }
};
