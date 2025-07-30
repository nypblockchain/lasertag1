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
        const resetPlayers = {
            /* TOP LEFT TO RIGHT */
            player1: { x: 0, y: 0 },
            player2: { x: 2, y: 0 },
            player3: { x: 4, y: 0 },
            player4: { x: 6, y: 0 },
            player5: { x: 8, y: 0 },
            player6: { x: 10, y: 0 },
            player7: { x: 12, y: 0 },
            player8: { x: 14, y: 0 },
            player9: { x: 16, y: 0 },
            player10: { x: 18, y: 0 },

            /* RIGHT COLUMN TOP TO BOTTOM */
            player11: { x: 34, y: 0 },
            player12: { x: 34, y: 2 },
            player13: { x: 34, y: 4 },
            player14: { x: 34, y: 6 },
            player15: { x: 34, y: 8 },
            player16: { x: 34, y: 10 },
            player17: { x: 34, y: 12 },
            player18: { x: 34, y: 14 },
            player19: { x: 34, y: 16 },
            player20: { x: 34, y: 18 },

            /* BOTTOM ROW RIGHT TO LEFT */
            player21: { x: 34, y: 34 },
            player22: { x: 32, y: 34 },
            player23: { x: 30, y: 34 },
            player24: { x: 28, y: 34 },
            player25: { x: 26, y: 34 },
            player26: { x: 24, y: 34 },
            player27: { x: 22, y: 34 },
            player28: { x: 20, y: 34 },
            player29: { x: 18, y: 34 },
            player30: { x: 16, y: 34 },

            /* LEFT COLUMN BOTTOM TO TOP */
            player31: { x: 0, y: 34 },
            player32: { x: 0, y: 32 },
            player33: { x: 0, y: 30 },
            player34: { x: 0, y: 28 },
            player35: { x: 0, y: 26 },
            player36: { x: 0, y: 24 },
            player37: { x: 0, y: 22 },
            player38: { x: 0, y: 20 },
            player39: { x: 0, y: 18 },
            player40: { x: 0, y: 16 },
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


