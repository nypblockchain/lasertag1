// api/maze-reset.js
const {
    db,
    generateMaze,
    setMazeCache,
    setPlayersCache,
    generatePerimeterPlayers,
} = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // 🔁 Generate new maze (2D array)
        const newMaze = generateMaze(35);

        // 🔃 Convert to Firestore-compatible format: flat object
        const rows = {};
        newMaze.forEach((row, i) => {
            rows[`r${i}`] = row;
        });

        // ♻️ Reset player positions
        const resetPlayers = generatePerimeterPlayers(25)

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


