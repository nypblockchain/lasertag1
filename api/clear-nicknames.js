const { resetNicknames } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { passkey } = req.body;
    const expectedPasskey = process.env.ADMIN_PASSKEY;

    // ?? Check passkey from frontend against the secure environment variable
    if (!passkey || passkey !== expectedPasskey) {
        return res.status(403).json({ success: false, error: "? Invalid admin passkey." });
    }

    try {
        await resetNicknames();
        res.json({ success: true });
    } catch (error) {
        console.error("? Failed to clear nicknames:", error);
        res.status(500).json({ success: false, error: "Internal server error." });
    }
};
