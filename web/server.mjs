import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import {
    AccessToken,
    LiveKitAPI,
} from "livekit-server-sdk";

dotenv.config({ path: "../.env.local" });

const api = new LiveKitAPI();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

const server = http.createServer(async (req, res) => {
    try {
        // Token endpoint
        if (req.url === "/token") {
            const roomName = `voiceflow-${Date.now()}`;
            const identity = `user-${Date.now()}`;

            const token = new AccessToken(
                process.env.LIVEKIT_API_KEY,
                process.env.LIVEKIT_API_SECRET,
                {
                    identity,
                    ttl: "1h",
                },
            );

            token.addGrant({
                roomJoin: true,
                room: roomName,
                canPublish: true,
                canSubscribe: true,
            });

            const participantToken = await token.toJwt();

            await api.agentDispatch.createDispatch(
                roomName,
                "my-agent",
            );

            res.writeHead(200, {
                "Content-Type": "application/json",
            });

            res.end(
                JSON.stringify({
                    serverUrl: process.env.LIVEKIT_URL,
                    participantToken,
                    roomName,
                }),
            );

            return;
        }

        // Serve frontend files
        let filePath = req.url === "/"
            ? path.join(__dirname, "index.html")
            : path.join(__dirname, req.url);

        const ext = path.extname(filePath);

        const contentTypes = {
            ".html": "text/html",
            ".css": "text/css",
            ".js": "text/javascript",
        };

        const contentType =
            contentTypes[ext] || "application/octet-stream";

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end("Not Found");
                return;
            }

            res.writeHead(200, {
                "Content-Type": contentType,
            });

            res.end(data);
        });
    } catch (error) {
        console.error(error);

        res.writeHead(500, {
            "Content-Type": "application/json",
        });

        res.end(
            JSON.stringify({
                error: "Failed to create LiveKit token",
            }),
        );
    }
});

server.listen(PORT, () => {
    console.log(`VoiceFlow website running at http://localhost:${PORT}`);
});