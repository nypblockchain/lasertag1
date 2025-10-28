const { getMaze, getPlayers, updatePlayerPos, setMaze } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { direction, playerId, respawn } = req.body || {};

    if (respawn) {
        try {
            const players = await getPlayers();
            const player = players[playerId];

            if (!player) {
                return res.status.json({ error: `${playerId} not found` });
            }

            const spawnX = player.spawnX ?? player.x ?? 0;
            const spawnY = player.spawnY ?? player.y ?? 0;

            await updatePlayerPos(playerId, spawnX, spawnY);
            console.log(`Respawned ${playerId} at (${spawnX}, ${spawnY})`);

            return res.json({
                success: true,
                respawned: true,
                newPosition: { x: spawnX, y: spawnY },
            });
        } catch (err) {
            console.error("Respawn failed: ", err);
            return res.status(500).json({ error: "Failed to respawn players." });
        }
    }

    if (!direction || playerId) {
        return res.status(400).json({ error: "Missing directions or playerId" });
    }

    try {
        const dirMap = {
            up: [0, -1],
            down: [0, 1],
            left: [-1, 0],
            right: [1, 0]
        };

        const move = dirMap[direction];
        if (!move) {
            return res.status(400).json({ error: "Invalid direction" });
        }

        // ✅ Get maze and player state from Firestore
        const maze = await getMaze();
        const players = await getPlayers();
        const player = players[playerId];
        const mid = Math.floor(maze.length / 2);

        if (!player) {
            return res.status(404).json({ error: `Player '${playerId}' not found` });
        }

        // ✅ Validate maze structure
        if (!Array.isArray(maze) || !Array.isArray(maze[0])) {
            return res.status(500).json({ error: "Maze is not properly initialized" });
        }

        const [dx, dy] = move;
        let newX = player.x + dx;
        let newY = player.y + dy;

        // ✅ Check walls and bounds
        const blocked = (
            newY < 0 || newY >= maze.length ||
            newX < 0 || newX >= maze[0].length ||
            maze[newY][newX] === 1
        );

        if (blocked) {
            return res.json({ success: false, message: "Blocked by wall or out of bounds" });
        }

        const inCenter = newX === mid && newY === mid;

        if (inCenter) {
            console.log(`${playerId} reached center.`);

            await updatePlayerPos(playerId, newX, newY);

            return res.json({
                success: true,
                reachedCenter: true,
                message: "Player has reached the center. Respawn handled by frontend."
            })
        }

        // ✅ Apply move and save to Firestore
        await updatePlayerPos(playerId, newX, newY);

        const entrances = {
            top: { x: mid, y: mid - 2 },
            bottom: { x: mid, y: mid + 2 },
            left: { x: mid - 2, y: mid },
            right: { x: mid + 2, y: mid },
        };

        return res.json({
            success: true,
            playerId,
            newPosition: { x: newX, y: newY }
        });

    } catch (err) {
        console.error("🔥 move.js error:", err);
        return res.status(500).json({
            error: "Internal move error",
            detail: err.message || String(err)
        });
    }
};
