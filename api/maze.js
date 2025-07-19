// api/maze.js
const { mazeCache, players, resetGame, generateMaze } = require('./shared');

module.exports = async (req, res) => {
    if (req.method === "GET") {
        res.json({ maze: mazeCache, players });
    }

    else if (req.method === "POST" && req.url === "/api/maze/reset") {
        resetGame();
        res.json({ success: true, message: "Maze and players reset" });
    }

    else {
        res.status(405).json({ error: "Method not allowed" });
    }
};

