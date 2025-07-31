const { db } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { playerId, nickname } = req.body;

    if (!/^player([1-9][0-9]{0,2})$/.test(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
    }

    if (!/^[a-zA-Z0-9_-]{3,15}$/.test(nickname)) {
        return res.status(400).json({ error: "Invalid nickname format" });
    }

    try {
        const ref = db.collection("maze_state").doc("nicknames");
        const doc = await ref.get();
        const existing = doc.exists ? doc.data() : {};

        if (existing[playerId]) {
            return res.status(400).json({ error: `Player ${playerId} is already taken.` });
        }

        await ref.set({ [playerId]: nickname }, { merge: true });

        return res.json({ success: true });
    } catch (err) {
        console.error("set-nickname error:", err);
        return res.status(500).json({ error: "Failed to save nickname" });
    }
};
