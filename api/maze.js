// api/maze.js
const { getMaze, getPlayers, getPings, getNicknames } = require("./shared");

module.exports = async (req, res) => {
    try {
        const [maze, players, pings, nickData] = await Promise.all([
            getMaze(),
            getPlayers(),
            getPings(),
            getNicknames()
        ]);

        const nicknames = nickData.nicknames || {};

        const mergedPlayers = {};
        for (const id of Object.keys(players)) {
            mergedPlayers[id] = {
                ...players[id],
                nickname: nicknames[id] || ""
            };
        }

        res.status(200).json({ maze, players: mergedPlayers, pings });
    } catch (err) {
        console.error("🔥 /api/maze error:", err);
        res.status(500).json({
            error: "Failed to load maze and players",
            detail: err.message || String(err)
        });
    }
};


