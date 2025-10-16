﻿const fetch = require("node-fetch");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { setPing } = require("./shared");

const KEYS = [
    process.env.KEY_1TO5,
    process.env.KEY_6TO10,
    process.env.KEY_11TO15,
    process.env.KEY_16TO20,
].filter(Boolean);

if (KEYS.length === 0) {
    throw new Error("No Gemini API Keys set. Please define Gemini API Keys.");
}

const CLIENTS = KEYS.map(k => new GoogleGenerativeAI(k));

function getClientForPlayer(playerId) {
    const n = parseInt(String(playerId).replace(/\D/g, ""), 10) || 1;
    const keyIndex = Math.floor((n - 1) / 5) % CLIENTS.length;
    return CLIENTS[keyIndex];
}

// helper: absolute URL for /api/move
function getMoveURL(req) {
    const host = req.headers["x-forwarded-host"];
    if (host) return `https://${host}/api/move`;
    return "http://localhost:3000/api/move";
}

// helper: absolute URL for /api/attack
function getAttackURL(req) {
    const host = req.headers["x-forwarded-host"];
    if (host) return `https://${host}/api/attack`;
    return "http://localhost:3000/api/attack";
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { command, playerId } = req.body || {};
    if (!command || !playerId) {
        return res.status(400).json({ error: "Missing command or playerId" });
    }

    if (command.toLowerCase() === "ping") {
        const ts = await setPing(playerId);
        return res.json({ success:true, message: "Ping stored", ts})
    }

    try {
        // 1. Ask Gemini
        const client = getClientForPlayer(playerId);
        const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

        console.log(`🧩 Player ${playerId} → key index ${CLIENTS.indexOf(client)} (${KEYS.length} total keys)`);

        const prompt = `
            You are a parser for a laser tag maze game.

            The player gives an instruction, and your job is to output only the corresponding valid game command(s).

            Valid commands:
            - Movement: "up", "down", "left", "right"
            - Firing: "fire up", "fire down", "fire left", "fire right" (or "shoot" instead of "fire")

            Rules:
            - Only output commands that match the player's input.
            - Do not list all possible commands.
            - Do not add explanations.
            - If input is unclear, output nothing.

            Player's instruction: "${command}"
        `;


        const result = await model.generateContent(prompt);
        const raw = result.response.text().trim().toLowerCase();

        // 2. Parse Gemini output into structured actions
        const directions = ["up", "down", "left", "right"];
        const attackVerbs = ["fire", "shoot"];
        const tokens = raw.replace(/[^a-z,\s]/g, " ").split(/[\s,]+/).filter(Boolean);

        const actions = [];
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            if (attackVerbs.includes(token) && i + 1 < tokens.length && directions.includes(tokens[i + 1])) {
                actions.push({ type: "fire", dir: tokens[i + 1] });
                i++; // skip direction
            } else if (directions.includes(token)) {
                actions.push({ type: "move", dir: token });
            }
        }

        if (actions.length === 0) {
            return res.status(400).json({ error: "No valid actions parsed", raw });
        }

        // 3. Call /api/move or /api/attack for each action
        const moveURL = getMoveURL(req);
        const attackURL = getAttackURL(req);
        const results = [];

        for (const action of actions) {
            const url = action.type === "move" ? moveURL : attackURL;

            const body =
                action.type === "move"
                    ? { direction: action.dir, playerId }
                    : { playerId };

            const apiRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });


            if (!apiRes.ok) {
                const text = await apiRes.text();
                return res.status(502).json({ error: `${action.type} API failed`, body: text.slice(0, 120) });
            }

            const apiData = await apiRes.json();
            results.push({ action, ...apiData });

            if (action.type === "move" && !apiData.success) break;
        }

        // 4. Return response
        return res.json({ success: true, actions, results });

    } catch (err) {
        console.error("❌ command.js error:", err);
        return res.status(500).json({ error: "Gemini or API error", detail: err.message });
    }
};
