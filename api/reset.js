// api/maze-reset.js
const { resetGame, mazeCache, players } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }
    resetGame();
    res.json({ success: true, message: "Maze and players reset", maze: mazeCache, players });
};
