const { db } = require("./shared");

module.exports = async (req, res) => {
    try {
        const doc = await db.collection("maze_state").doc("nicknames").get();
        const data = doc.exists ? doc.data() : {};

        const available = [];
        for (let i = 1; i <= 136; i++) {
            const playerId = `player${i}`;
            if (!data[playerId]) available.push(playerId);
        }

        return res.json({ success: true, available });
    } catch (err) {
        console.error("get-available-players error:", err);
        return res.status(500).json({ success: false, error: "Failed to fetch players." });
    }
};
