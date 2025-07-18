const express = require("express");
const router = express.Router();
const fetch = require("node-fetch"); // ? works with node-fetch@2
const { GoogleGenerativeAI } = require("@google/generative-ai");

require("dotenv").config({ path: __dirname + "/.env" }); // ? explicitly point to ./api/.env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {

    console.log(process.env.GEMINI_API_KEY);

    const { playerId, command } = req.body;

    if (!playerId || !command) {
        return res.status(400).json({ error: "Missing command or playerId" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // ? instead of "gemini-pro"

        const prompt = `
            You are controlling a player in a grid maze.
            The user might say: "go down two times" or "move left and then down".

            Your task: convert this to a list of directions using only:
            "up", "down", "left", or "right".

            If the user says "go down two times", return "down, down".
            If they say "go left then down", return "left, down".

            Only output the directions, separated by commas. No extra words.

            Instruction: "${command}"
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim().toLowerCase();

        const directions = ["up", "down", "left", "right"];
        const parsed = text
            .split(/[\s,]+/) // comma or space
            .map(word => word.trim())
            .filter(word => directions.includes(word));

        if (parsed.length === 0) {
            return res.status(400).json({ error: "No valid directions parsed", raw: text });
        }

        // Send one move request per direction
        for (const dir of parsed) {
            const moveRes = await fetch("http://localhost:3000/api/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ direction: dir, playerId })
            });

            const moveResult = await moveRes.json();

            if (!moveResult.success) {
                console.log(`Blocked at direction: ${dir}`);
                break; // ?? Stop further moves if invalid
            }
        }

        res.json({ success: true, moved: parsed });

    } catch (err) {
        console.error("Gemini error:", err);
        res.status(500).json({ error: "Gemini command failed" });
    }
});

module.exports = router;
