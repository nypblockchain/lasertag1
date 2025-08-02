const { resetNicknames, db } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { passkey, mode } = req.body;
    const expectedPasskey = process.env.ADMIN_PASSWORD;

    if (!passkey || passkey !== expectedPasskey) {
        return res.status(403).json({ success: false, error: "❌ Invalid admin passkey." });
    }

    try {
        if (mode === "winners") {
            // Clear maze_winners collection
            const snapshot = await db.collection("maze_winners").get();
            const deletions = snapshot.docs.map(doc => doc.ref.delete());
            await Promise.all(deletions);

            return res.json({ success: true, message: "🏆 Leaderboard cleared." });
        }

        // Default: clear nicknames
        await resetNicknames();
        return res.json({ success: true, message: "🧠 Nicknames cleared." });

    } catch (error) {
        console.error("❌ Error clearing data:", error);
        return res.status(500).json({ success: false, error: "Internal server error." });
    }
};

