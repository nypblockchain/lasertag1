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
        const newMaze = generateMaze(35);

        // 🔃 Convert to Firestore-compatible format: flat object
        const rows = {};
        newMaze.forEach((row, i) => {
            rows[`r${i}`] = row;
        });

        // ♻️ Reset player positions
        const players = {
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
            player20: { x: 18, y: 20 },

            // Newly added perimeter players:
            player21: { x: 7, y: 0 },
            player22: { x: 12, y: 0 },
            player23: { x: 23, y: 0 },
            player24: { x: 28, y: 0 },

            player25: { x: 34, y: 2 },
            player26: { x: 34, y: 7 },
            player27: { x: 34, y: 12 },
            player28: { x: 34, y: 17 },
            player29: { x: 34, y: 23 },
            player30: { x: 34, y: 28 },

            player31: { x: 28, y: 34 },
            player32: { x: 23, y: 34 },
            player33: { x: 17, y: 34 },
            player34: { x: 12, y: 34 },
            player35: { x: 7, y: 34 },

            player36: { x: 2, y: 34 },
            player37: { x: 0, y: 28 },
            player38: { x: 0, y: 23 },
            player39: { x: 0, y: 17 },
            player40: { x: 0, y: 12 }
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


