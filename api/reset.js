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
        if ("password" in req.body) {
            const correctPassword = process.env.CONTROLLER_PASSWORD;
            const isValid = req.body.password === correctPassword;
            return res.status(200).json({ valid: isValid });
        }

        // ✅ Controller lock toggle shortcut
        if ("lockState" in req.body) {
            await db.collection("maze_state").doc("controller_lock").set({ locked: req.body.lockState });
            return res.json({ success: true, message: `Controller ${req.body.lockState ? "locked" : "unlocked"}` });
        }

        // 🔁 Generate new maze (2D array)
        const newMaze = generateMaze(25);

        // 🔃 Convert to Firestore-compatible format: flat object
        const rows = {};
        newMaze.forEach((row, i) => {
            rows[`r${i}`] = row;
        });

        // ♻️ Reset player positions
        const resetPlayers = generatePerimeterPlayers(25);

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
