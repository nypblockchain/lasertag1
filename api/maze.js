// api/maze.js
const { getMaze, getPlayers, getPings } = require("./shared");

module.exports = async (req, res) => {
    try {
        const maze = await getMaze();
        const players = await getPlayers();
        const pings = getPings();

        res.status(200).json({ maze, players });
    } catch (err) {
        console.error("🔥 /api/maze error:", err);
        res.status(500).json({
            error: "Failed to load maze and players",
            detail: err.message || String(err)
        });
    }
};


