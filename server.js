const express = require("express");
const path = require("path");
const app = express();

// Middleware
app.use(express.json()); // ? parse JSON bodies

// Serve static files from /Frontend
app.use(express.static(path.join(__dirname, "Frontend")));

// ? Mount /api/maze properly
const { router: mazeRouter } = require("./api/maze");
app.use("/api/maze", mazeRouter);

// ? move.js exports the router directly, no change needed
const moveRouter = require("./api/move");
app.use("/api/move", moveRouter);

const commandRouter = require("./api/command");
app.use("/api/command", commandRouter)



// Start server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`?? Server running at http://localhost:${PORT}`);
});
