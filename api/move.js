const { getMaze, getPlayers, updatePlayerPos } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { direction, playerId } = req.body || {};
    if (!direction || !playerId) {
        return res.status(400).json({ error: "Missing direction or playerId" });
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

        if (!player) {
            return res.status(404).json({ error: `Player '${playerId}' not found` });
        }

        // ✅ Validate maze structure
        if (!Array.isArray(maze) || !Array.isArray(maze[0])) {
            return res.status(500).json({ error: "Maze is not properly initialized" });
        }

        const [dx, dy] = move;
        const newX = player.x + dx;
        const newY = player.y + dy;

        // ✅ Check walls and bounds
        const blocked = (
            newY < 0 || newY >= maze.length ||
            newX < 0 || newX >= maze[0].length ||
            maze[newY][newX] === 1
        );

        if (blocked) {
            return res.json({ success: false, message: "Blocked by wall or out of bounds" });
        }

        // ✅ Apply move and save to Firestore
        await updatePlayerPos(playerId, newX, newY);

        const entrances = {
            top: { x: mid, y: mid - 2 },
            bottom: { x: mid, y: mid + 2 },
            left: { x: mid - 2, y: mid },
            right: { x: mid + 2, y: mid },
        };

        for (const [label, pos] of Object.entries(entrances)) {
            if (newX === pos.x && newY === pos.y && maze[pos.y][pos.x] === 0) {
                maze[pos.y][pos.x] = 1;
                await setMaze(maze);
                console.log(`🔒 Entrance '${label}' locked by ${playerId}`);
                break;
            }
        }

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
