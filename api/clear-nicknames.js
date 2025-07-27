const { resetNicknames } = require("./shared");

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        await resetNicknames();
        res.json({ success: true });
    }
    catch (error) {
        console.error("? Failed to clear nicknames:", error);
        res.status(500).json({ success: false });
    }
};