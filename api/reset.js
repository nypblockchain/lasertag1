// api/maze-reset.js
const db = require("./firebase");
const { generateMaze } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        // Generate new maze and reset players
        const newMaze = generateMaze(21);
        const resetPlayers = {
            player1: { x: 0, y: 0 },
            player2: { x: 0, y: 20 },
            player3: { x: 20, y: 0 },
            player4: { x: 20, y: 20 }
        };

        // Save to Firestore
        await db.collection("maze_state").doc("shared").set({
            maze: newMaze,
            players: resetPlayers
        });

        res.json({
            success: true,
            message: "Maze and players reset",
            maze: newMaze,
            players: resetPlayers
        });
    } catch (err) {
        console.error("🔥 Reset error:", err);
        res.status(500).json({ error: "Failed to reset maze", detail: err.message || String(err) });
    }
};

