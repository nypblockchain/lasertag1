const { db } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { playerId, nickname, elapsed } = req.body || {};
    if (!playerId || !nickname || elapsed == null) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        await db.collection("maze_winners").add({
            playerId,
            nickname,
            elapsed,
            timestamp: Date.now()
        });
        return res.json({ success: true });
    } catch (err) {
        console.error("Failed to log winner:", err);
        return res.status(500).json({ error: "Failed to log winner" });
    }
};
