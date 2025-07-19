const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { command, playerId } = req.body;
    if (!command || !playerId) {
        return res.status(400).json({ error: "Missing command or playerId" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `You are controlling a player in a grid maze. Reply using only "up", "down", "left", or "right". Instruction: "${command}"`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().toLowerCase();

        const directions = ["up", "down", "left", "right"];
        const parsed = text
            .split(/[\s,]+/)
            .map(w => w.trim())
            .filter(w => directions.includes(w));

        if (parsed.length === 0) {
            return res.status(400).json({ error: "No valid directions parsed", raw: text });
        }

        const moveEndpoint = "/api/move";

        let moveResponses = [];

        for (const dir of parsed) {
            const moveRes = await fetch(moveEndpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: dir, playerId })
            });

            // Add safety check to inspect response
            const contentType = moveRes.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                const raw = await moveRes.text();
                return res.status(500).json({ error: "Move API returned non-JSON", body: raw });
            }

            const moveData = await moveRes.json();
            moveResponses.push({ dir, ...moveData });

            if (!moveData.success) break;
        }

        res.json({ success: true, moved: parsed, results: moveResponses });
    } catch (err) {
        return res.status(500).json({ error: "Gemini error", detail: err.message || err });
    }
};
