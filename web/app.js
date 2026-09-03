import {
  Room,
  RoomEvent,
  Track,
} from "https://cdn.jsdelivr.net/npm/livekit-client@2.22.2/+esm";

const startButton = document.getElementById("startButton");
const status = document.getElementById("status");
const transcript = document.getElementById("transcript");

let room = null;

startButton.addEventListener("click", async () => {
  try {
    startButton.disabled = true;
    status.textContent = "Connecting...";
    transcript.textContent = "Connecting to VoiceFlow...";

    // Get LiveKit credentials from our backend
    const response = await fetch("/token");

    if (!response.ok) {
      throw new Error("Failed to get LiveKit token");
    }

    const data = await response.json();

    console.log("LiveKit connection details received");

    // Create LiveKit room
    room = new Room();

    // Listen for remote audio tracks
    room.on(
      RoomEvent.TrackSubscribed,
      (track) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();

          audioElement.autoplay = true;

          document.body.appendChild(audioElement);

          console.log("Agent audio track attached");
        }
      },
    );

    room.on(RoomEvent.Connected, () => {
      console.log("Connected to LiveKit room:", room.name);

      status.textContent = "Connected";
      transcript.textContent =
        "VoiceFlow is connected. Start speaking.";

      startButton.textContent = "Listening";
    });

    room.on(RoomEvent.Disconnected, () => {
      status.textContent = "Disconnected";
      transcript.textContent = "VoiceFlow disconnected.";

      startButton.disabled = false;
      startButton.textContent = "Start Voice";
    });

    // Connect to LiveKit
    await room.connect(
      data.serverUrl,
      data.participantToken,
    );

    // Turn on microphone
    await room.localParticipant.setMicrophoneEnabled(true);

    console.log("Microphone enabled");

  } catch (error) {
    console.error("VoiceFlow connection error:", error);

    status.textContent = "Connection failed";

    transcript.textContent =
      error.message || "Unable to connect to VoiceFlow.";

    startButton.disabled = false;
    startButton.textContent = "Try Again";
  }
});