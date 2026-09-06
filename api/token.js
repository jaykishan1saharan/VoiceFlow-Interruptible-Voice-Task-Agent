import { AccessToken, LiveKitAPI } from "livekit-server-sdk";

const api = new LiveKitAPI();

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({
        error: "Method not allowed",
      });
    }

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

    console.log(
      `[LIVEKIT] Agent dispatched to ${roomName}`,
    );

    return res.status(200).json({
      serverUrl: process.env.LIVEKIT_URL,
      participantToken,
      roomName,
    });
  } catch (error) {
    console.error("[TOKEN ERROR]", error);

    return res.status(500).json({
      error: "Failed to create LiveKit token",
    });
  }
}