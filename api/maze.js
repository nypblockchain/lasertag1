const express = require("express");
const router = express.Router();

const players = {
    player1: { x: 0, y: 0 },
    player2: { x: 0, y: 20 },
    player3: { x: 20, y: 0 },
    player4: { x: 20, y: 20 }
};

let currentMaze = []; // shared between maze.js and move.js

router.get("/", (req, res) => {
    if (currentMaze.length === 0) {
        currentMaze = generateMaze(21);
    }
    res.json({ maze: currentMaze, players })
});

router.post("/reset", (req, res) => {
    currentMaze = generateMaze(21);

    // ? Reset players to default starting positions
    Object.assign(players, {
        player1: { x: 0, y: 0 },
        player2: { x: 0, y: 20 },
        player3: { x: 20, y: 0 },
        player4: { x: 20, y: 20 }
    });

    res.json({ success: true, message: "Maze and players reset" });
});

function generateMaze(size = 21) {
    if (size % 2 === 0) size += 1;
    const maze = Array.from({ length: size }, () => Array(size).fill(1));

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function carve(x, y) {
        const directions = shuffle([
            [0, -2],
            [0, 2],
            [-2, 0],
            [2, 0]
        ]);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (ny > 0 && ny < size - 1 && nx > 0 && nx < size - 1 && maze[ny][nx] === 1) {
                maze[y + dy / 2][x + dx / 2] = 0;
                maze[ny][nx] = 0;
                carve(nx, ny);
            }
        }
    }

    maze[1][1] = 0;
    carve(1, 1);

    for (let i = 0; i < size; i++) {
        maze[0][i] = (i % 5 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[size - 1][i] = (i % 6 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[i][0] = (i % 6 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
        maze[i][size - 1] = (i % 5 === 0 && i !== 0 && i !== size - 1) ? 1 : 0;
    }

    maze[0][0] = 0;
    maze[0][size - 1] = 0;
    maze[size - 1][0] = 0;
    maze[size - 1][size - 1] = 0;

    return maze;
}

// ? Export with a getter for move.js to always access latest maze
module.exports = {
    router,
    players,
    get maze() {
        return currentMaze;
    }
};
