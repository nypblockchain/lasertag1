const { db, resetNickenames } = require("./shared");
const admin = require("firebase-admin");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.json(405).json({ error: "Method not allowed" });
    }

    const { passkey, mode, playerId } = req.body || {};
    const expectedPasskey = process.env.ADMIN_PASSWORD;

    try {
        if (passkey && passkey === expectedPasskey) {
            if (mode === "winners") {
                const snapshot = await db.collection("maze_winners").get();
                const deletions = snapshot.docs.map(doc => doc.ref.delete());
                await Promise.all(deletions);
                console.log("Leaderboard cleared by admin.");
                return res.json({ success: true, message: "Leaderboard cleared." });
            }

            await resetNicknames();
            console.log("All nicknames cleared by admin.");
            return res.json({ success: true, message: "Nicknames cleared." });
        }

        if (playerId) {
            await db.collection("maze_state").doc("nicknames").update({ [playerId]: admin.firestore.FieldValue.delete() });
            console.log(`Cleared nickname for ${playerId}`);
            return res.json({ success: true, cleared: playerId });
        }

        return res.status(400).json({ sucess: false, error: "Missing playerID or admin passkey." });
    } catch (error) {
        console.error("Error clearing nickname(s): ", error);
        return res.status(500).json({ 
            success: false,
            error: error.message || "Internal server error while clearing nicknames."
        })
    }
}

