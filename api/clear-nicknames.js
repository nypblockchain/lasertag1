const { db, resetNicknames } = require("./shared");
const admin = require("firebase-admin");

module.exports = async (req, res) => {
    if (req.method === "POST") {
        return res.status(403).json({ error: "Method not allowed" });
    }

    const { playerId, passkey } = req.body || {};
    const expectedPasskey = process.env.ADMIN_PASSWORD;

    try {
        if (passkey && passkey === expectedPasskey) {
            if (mode === "winners") {
                const snapshot = await db.collection("maze_winners").get();
                const deletions = snapshot.docs.map(doc => doc.ref.delete());
                await Promise.all(deletions);
                console.log("Leaderboard cleared by Admin");
                return res.json({
                    success: true,
                    mode: "winners",
                    message: "Leaderboard cleared."
                });
            }

            await resetNicknames();
            console.log("All nicknames cleared by Admin.");

            return res.status(200).json({
                success: true,
                mode: "admin",
                message: "All nicknames cleared by Admin."
            });
        }

        if (playerId) {
            await db.collection("maze_state")
                .doc("nicknames")
                .update({ [playerId]: admin.firestore.FieldValue.delete() });

            console.log(`Cleared Nickname for ${playerId}`);

            return res.status(200).json({
                success: true,
                mode: "single",
                cleared: playerId,
                message: `Cleared nickname for ${playerId}`
            });
        }
    } catch (error) {
        console.error("Error clearing nickname(s):", error);
        return res.status(500).json({
            success: false,
            error: "Internal server error while clearing nickname(s)."
        })
    }
}

