const express = require("express");
const router = express.Router();
const mazeModule = require("./maze"); // Assumes maze.js exports { maze, players }

const players = mazeModule.players;

router.post("/", (req, res) => {
    const { direction, playerId } = req.body; // ? now reads playerId
    const maze = mazeModule.maze;

    const player = players[playerId];
    if (!player) {
        return res.status(400).json({ error: "Invalid playerId" });
    }

    const directions = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0]
    };

    const move = directions[direction];
    if (!move) {
        return res.status(400).json({ error: "Invalid direction" });
    }

    const [dx, dy] = move;
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (isValidMove(newX, newY, maze)) {
        players[playerId] = { x: newX, y: newY }; // ? update the correct player
        return res.json({ success: true, players });
    }

    res.json({ success: false, players });
});

function isValidMove(x, y, maze) {
    return (
        y >= 0 && y < maze.length &&
        x >= 0 && x < maze[0].length &&
        maze[y][x] === 0
    );
}

module.exports = router;
