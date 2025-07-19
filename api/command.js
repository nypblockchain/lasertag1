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

        // ✅ FIXED: Use the actual host header instead of broken VERCEL_URL
        const host = req.headers["x-forwarded-host"] || "localhost:3000";
        const baseURL = `http://${host}`;

        for (const dir of parsed) {
            const moveRes = await fetch(`${baseURL}/api/move`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: dir, playerId })
            });
            console.log(`Sending move ${dir} for ${playerId}`);


            // extra safety: ensure JSON response
            const contentType = moveRes.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                const html = await moveRes.text();
                throw new Error(`Non-JSON response from /api/move: ${html.slice(0, 100)}...`);
            }

            const moveResult = await moveRes.json();
            if (!moveResult.success) {
                console.log(`Blocked at direction: ${dir}`);
                break;
            }
        }

        res.json({ success: true, moved: parsed });

    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({
            error: "Gemini command failed",
            detail: err.message || err
        });
    }
};
