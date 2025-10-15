const {
    db,
    generateMaze,
    generatePerimeterPlayers
} = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // ✅ Password check only (optional)
        if ("password" in req.body) {
            const correctPassword = process.env.CONTROLLER_PASSWORD;
            const isValid = req.body.password === correctPassword;
            return res.status(200).json({ valid: isValid });
        }

        // ✅ Lock/unlock controller
        if ("lockState" in req.body) {
            await db.collection("maze_state").doc("controller_lock").set({
                locked: req.body.lockState
            });
            return res.json({
                success: true,
                message: `Controller ${req.body.lockState ? "locked" : "unlocked"}`
            });
        }

        // 🔁 Generate new maze
        const newMaze = generateMaze(25);

        // Convert to Firestore format
        const rows = {};
        newMaze.forEach((row, i) => {
            rows[`r${i}`] = row;
        });

        // ♻️ Reset players
        const resetPlayers = generatePerimeterPlayers(9);

        // Save to Firestore
        await db.collection("maze_state").doc("maze").set({ rows });
        await db.collection("maze_state").doc("players").set(resetPlayers);

        // No in-memory cache calls here (Vercel safe)
        return res.json({
            success: true,
            message: "Maze and players reset",
            maze: newMaze,
            players: resetPlayers
        });
    } catch (err) {
        console.error("🔥 Reset error:", err);
        return res.status(500).json({
            error: "Failed to reset maze",
            detail: err.message || String(err)
        });
    }
};
