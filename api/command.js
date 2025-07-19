// api/command.js
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// helper: absolute URL for /api/move
function getMoveURL(req) {
    // In production Vercel adds x-forwarded-host, e.g. lasertag1.vercel.app
    const host = req.headers["x-forwarded-host"];
    if (host) return `https://${host}/api/move`;      // prod
    return "http://localhost:3000/api/move";          // local dev
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { command, playerId } = req.body || {};
    if (!command || !playerId) {
        return res.status(400).json({ error: "Missing command or playerId" });
    }

    try {
        /* ------------ 1. Ask Gemini -------------- */
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const prompt = `You control a player in a grid maze.
Reply ONLY with a space‑ or comma‑separated list of the words up, down, left, or right.
Instruction: "${command}"`;
        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim().toLowerCase();

        // strip punctuation, split on whitespace or commas
        const directions = ["up", "down", "left", "right"];
        const parsed = raw
            .replace(/[^a-z,\s]/g, " ")        // remove punctuation like “.”
            .split(/[\s,]+/)
            .filter(w => directions.includes(w));

        if (parsed.length === 0) {
            return res.status(400).json({ error: "No valid directions parsed", raw });
        }

        /* ------------ 2. Call /api/move -------------- */
        const moveURL = getMoveURL(req);
        const results = [];

        for (const dir of parsed) {
            const moveRes = await fetch(moveURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: dir, playerId })
            });

            if (!moveRes.ok) {
                const text = await moveRes.text();
                return res.status(502).json({ error: "Move API failed", body: text.slice(0, 120) });
            }

            const moveData = await moveRes.json();
            results.push({ dir, ...moveData });

            // stop if blocked
            if (!moveData.success) break;
        }

        /* ------------ 3. Return summary -------------- */
        return res.json({ success: true, moved: parsed, results });

    } catch (err) {
        console.error("❌ command.js error:", err);
        return res.status(500).json({ error: "Gemini or move error", detail: err.message });
    }
};
