// api/move.js
const { mazeCache, players } = require('./shared');

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { direction, playerId } = req.body;

    const player = players[playerId];
    if (!player) {
        return res.status(400).json({ error: "Invalid playerId" });
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
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (
        newY >= 0 && newY < mazeCache.length &&
        newX >= 0 && newX < mazeCache[0].length &&
        mazeCache[newY][newX] === 0
    ) {
        players[playerId] = { x: newX, y: newY };
        return res.json({ success: true, players });
    }

    res.json({ success: false, players });
};

