// api/maze-reset.js
const {
    db,
    generateMaze,
    setMazeCache,
    setPlayersCache
} = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 🔁 Generate new maze (2D array)
        const newMaze = generateMaze(21);

        // 🔃 Convert to Firestore-compatible format: flat object
        const rows = {};
        newMaze.forEach((row, i) => {
            rows[`r${i}`] = row;
        });

        // ♻️ Reset player positions
        const resetPlayers = {
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

        // 🔥 Overwrite maze_state/maze
        await db.collection("maze_state").doc("maze").set({ rows });

        // 🔥 Overwrite maze_state/players
        await db.collection("maze_state").doc("players").set(resetPlayers);

        setMazeCache(newMaze);
        setPlayersCache(resetPlayers);

        return res.json({
            success: true,
            message: "Maze and players reset",
            maze: newMaze,
            players: resetPlayers,
        });
    } catch (err) {
        console.error("🔥 Reset error:", err);
        return res.status(500).json({
            error: "Failed to reset maze",
            detail: err.message || String(err),
        });
    }
};


