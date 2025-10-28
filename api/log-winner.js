const { db } = require("./shared");

module.exports = async (req, res) => {
    if (req.method === "GET") {
        try {
            const snapshot = await db.collection("maze_winners").get();
            const entries = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    nickname: data.nickname,
                    elapsed: data.elapsed
                };
            });

            return res.json({ success: true, entries });
        } catch (err) {
            console.error("Failed to fetch leaderboard:", err);
            return res.status(500).json({ error: "Failed to fetch leaderboard" });
        }
    }

    if (req.method === "POST") {
        const { playerId, nickname, elapsed } = req.body || {};
        if (!playerId || !nickname || elapsed == null) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const recentSnapshot = await db.collection("maze_winners")
            .where("playerId", "==", playerId)
            .orderBy("timestamp", "desc")
            .limit(1)
            .get();

        if (!recentSnapshot.empty) {
            const recentDoc = recentSnapshot.docs[0].data();
            const timeSinceLast = Date.now() - recentDoc.timestamp;

            if (timeSinceLast < 10000 || recentDoc.elapsed === elapsed) {
                console.log(`Duplicate log ignored for ${playerId}`);
                return res.json({ success: false, duplicate: true, message: "Duplicate win ignored." })
            }
        }

        const docId = `${playerId}_${Date.now()}`;

        try {
            await db.collection("maze_winners").doc(docId).set({
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
    }

    return res.status(405).json({ error: "Method not allowed" });
};
