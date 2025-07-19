// api/command.js
const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { playerId, command } = req.body;
    if (!playerId || !command) {
        return res.status(400).json({ error: "Missing command or playerId" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      You are controlling a player in a grid maze.
      Convert this to directions: "up", "down", "left", "right" only.
      Instruction: "${command}"
    `;

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

        // Use full Vercel relative path
        const baseURL = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : "http://localhost:3000";

        for (const dir of parsed) {
            const moveRes = await fetch(`${baseURL}/api/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: dir, playerId })
            });

            const moveResult = await moveRes.json();
            if (!moveResult.success) {
                console.log(`Blocked at direction: ${dir}`);
                break;
            }
        }

        res.json({ success: true, moved: parsed });

    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ error: "Gemini command failed", detail: err.message || err });
    }
};
