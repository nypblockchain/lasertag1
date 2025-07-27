const { getNicknames } = require("./shared");

module.exports = async (req, res) => {
    try {
        const data = await getNicknames();
        res.status(200).json({ success: true, nicknames: data });
    } catch (err) {
        console.error("get-nicknames error:", err);
        res.status(500).json({ success: false, error: "Failed to fetch nicknames." });
    }
};
