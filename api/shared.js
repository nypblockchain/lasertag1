// api/shared.js

let players = {
    player1: { x: 0, y: 0 },
    player2: { x: 0, y: 20 },
    player3: { x: 20, y: 0 },
    player4: { x: 20, y: 20 }
};

// ? Vercel-compatible in-memory singleton
// Each function runtime gets its own memory, but stays alive during warm invocations
global._mazeCache = global._mazeCache || generateMaze(21);

function generateMaze(size = 21) {
    if (size % 2 === 0) size += 1;
    const maze = Array.from({ length: size }, () => Array(size).fill(1));

    function shuffle(array) {
        return array.sort(() => Math.random() - 0.5);
    }

    function carve(x, y) {
        const directions = shuffle([
            [0, -2], [0, 2], [-2, 0], [2, 0]
        ]);

        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (
                ny > 0 && ny < size - 1 &&
                nx > 0 && nx < size - 1 &&
                maze[ny][nx] === 1
            ) {
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
    console.log("MAZE GENERATED");
}

function resetGame() {
    global._mazeCache = generateMaze(21); // ? reset global
    players = {
        player1: { x: 0, y: 0 },
        player2: { x: 0, y: 20 },
        player3: { x: 20, y: 0 },
        player4: { x: 20, y: 20 }
    };
}

module.exports = {
    get mazeCache() {
        return global._mazeCache;
    },
    players,
    generateMaze,
    resetGame
};
