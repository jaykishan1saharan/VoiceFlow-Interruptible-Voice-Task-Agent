import {
  Room,
  RoomEvent,
  Track,
} from "https://cdn.jsdelivr.net/npm/livekit-client@2.22.2/+esm";


/* =================================
   DOM
================================= */

const startButton =
  document.getElementById("startButton");

const status =
  document.getElementById("status");

const activityText =
  document.getElementById("activityText");

const orb =
  document.getElementById("orb");

const title =
  document.getElementById("title");

const subtitle =
  document.getElementById("subtitle");

const messages =
  document.getElementById("messages");


/* =================================
   STATE
================================= */

let room = null;

let currentState = "ready";

let agentWasSpeaking = false;


/*
 * Stores transcript message elements
 * using LiveKit segment IDs.
 */
const transcriptMessages = new Map();


/* =================================
   UI STATE
================================= */

function setState(state) {

  currentState = state;


  orb.classList.remove(
    "listening",
    "speaking",
    "interrupted",
    "recovering",
  );


  switch (state) {

    case "ready":

      status.textContent =
        "Ready";

      title.textContent =
        "Your Voice Assistant";

      subtitle.textContent =
        "Speak naturally. Interrupt anytime.";

      activityText.textContent =
        "VoiceFlow is ready";

      break;


    case "connecting":

      status.textContent =
        "Connecting...";

      title.textContent =
        "Connecting to VoiceFlow";

      subtitle.textContent =
        "Setting up your voice session.";

      activityText.textContent =
        "Connecting to LiveKit...";

      break;


    case "listening":

      status.textContent =
        "Listening";

      title.textContent =
        "I'm listening";

      subtitle.textContent =
        "Speak naturally. You can interrupt anytime.";

      activityText.textContent =
        "Microphone is active";

      orb.classList.add(
        "listening",
      );

      break;


    case "thinking":

      status.textContent =
        "Thinking";

      title.textContent =
        "Working on it";

      subtitle.textContent =
        "VoiceFlow is processing your request.";

      activityText.textContent =
        "Processing your request...";

      break;


    case "speaking":

      status.textContent =
        "Speaking";

      title.textContent =
        "VoiceFlow is speaking";

      subtitle.textContent =
        "Interrupt anytime to change your request.";

      activityText.textContent =
        "Playing Rime voice response";

      orb.classList.add(
        "speaking",
      );

      break;


    case "interrupted":

      status.textContent =
        "Interrupted";

      title.textContent =
        "Request changed";

      subtitle.textContent =
        "Stopping the previous response.";

      activityText.textContent =
        "Previous response interrupted";

      orb.classList.add(
        "interrupted",
      );

      break;


    case "recovering":

      status.textContent =
        "Recovering";

      title.textContent =
        "Updating your request";

      subtitle.textContent =
        "Switching to your new instruction.";

      activityText.textContent =
        "Recovering from interruption...";

      orb.classList.add(
        "recovering",
      );

      break;

  }

}


/* =================================
   CLEAR EMPTY MESSAGE
================================= */

function clearEmptyMessage() {

  const empty =
    messages.querySelector(
      ".empty-message",
    );

  if (empty) {
    empty.remove();
  }

}


/* =================================
   ADD INTERRUPTION MARKER
================================= */

function addInterruptionMarker() {

  const marker =
    document.createElement("div");

  marker.className =
    "interruption-message";

  marker.textContent =
    "⚡ Interrupted";

  messages.appendChild(marker);

  scrollMessages();

}


/* =================================
   ADD / UPDATE MESSAGE
================================= */

function updateMessage({
  segmentId,
  speaker,
  text,
  final,
}) {

  if (!text || !text.trim()) {
    return;
  }


  clearEmptyMessage();


  let message =
    transcriptMessages.get(segmentId);


  if (!message) {

    message =
      document.createElement("div");


    message.className =
      `message ${speaker}`;


    const label =
      document.createElement("div");

    label.className =
      "message-label";


    label.textContent =
      speaker === "user"
        ? "You"
        : "VoiceFlow";


    const textElement =
      document.createElement("div");

    textElement.className =
      "message-text";


    message.appendChild(
      label,
    );

    message.appendChild(
      textElement,
    );


    messages.appendChild(
      message,
    );


    transcriptMessages.set(
      segmentId,
      message,
    );

  }


  const textElement =
    message.querySelector(
      ".message-text",
    );


  textElement.textContent =
    text;


  if (final) {

    message.classList.remove(
      "interim",
    );

  } else {

    message.classList.add(
      "interim",
    );

  }


  scrollMessages();

}


/* =================================
   SCROLL
================================= */

function scrollMessages() {

  messages.scrollTop =
    messages.scrollHeight;

}


/* =================================
   TRANSCRIPTION HANDLER
================================= */

/*
 * LiveKit Agents publishes voice
 * transcriptions on:
 *
 *     lk.transcription
 *
 * The stream attributes tell us:
 *
 * lk.transcribed_track_id
 * lk.transcription_final
 * lk.segment_id
 */

function registerTranscriptionHandler() {

  room.registerTextStreamHandler(
    "lk.transcription",

    async (
      reader,
      participantInfo,
    ) => {

      try {

        const attributes =
          reader.info.attributes || {};


        /*
         * Check whether this text stream
         * is actually a transcription.
         */

        const isTranscription =
          Boolean(
            attributes[
            "lk.transcribed_track_id"
            ],
          );


        if (!isTranscription) {
          return;
        }


        /*
         * LiveKit creates:
         *
         * interim_stream → live transcription
         * final_stream   → completed transcription
         *
         * Both use the same segment ID.
         */

        const isFinal =
          String(
            attributes[
            "lk.transcription_final"
            ],
          ) === "true";


        const segmentId =
          attributes[
          "lk.segment_id"
          ] ||
          reader.info.id;


        /*
         * Determine speaker.
         */

        const isUser =
          participantInfo.identity ===
          room.localParticipant.identity;


        const speaker =
          isUser
            ? "user"
            : "agent";


        /*
         * =====================================
         * REALTIME STREAM
         * =====================================
         *
         * DO NOT use readAll().
         *
         * Read every incoming chunk immediately.
         */

        let streamedText = "";


        for await (
          const chunk of reader
        ) {

          /*
           * Add the new chunk immediately.
           */

          streamedText += chunk;


          /*
           * Update the SAME message
           * instead of creating a new one.
           */

          updateMessage({
            segmentId,
            speaker,
            text: streamedText,
            final: false,
          });


          /*
           * User is speaking while the
           * agent was speaking.
           *
           * This is our visual interruption.
           */

          if (
            isUser &&
            agentWasSpeaking
          ) {

            setState(
              "interrupted",
            );

            addInterruptionMarker();


            setTimeout(
              () => {

                setState(
                  "recovering",
                );

              },
              400,
            );


            agentWasSpeaking =
              false;

          }


          /*
           * User is actively speaking.
           */

          if (isUser) {

            setState(
              "thinking",
            );

          }


          /*
           * Agent is actively generating
           * its spoken response.
           */

          if (!isUser) {

            agentWasSpeaking =
              true;

            setState(
              "speaking",
            );

          }


          /*
           * Debugging
           */

          console.log(
            "[TRANSCRIPT CHUNK]",
            {
              speaker,
              chunk,
              accumulated:
                streamedText,
              final: false,
              segmentId,
            },
          );

        }


        /*
         * =====================================
         * FINAL TRANSCRIPT
         * =====================================
         *
         * When the stream finishes,
         * replace the interim text with
         * the final complete segment.
         */

        if (isFinal) {

          updateMessage({
            segmentId,
            speaker,
            text: streamedText,
            final: true,
          });


          console.log(
            "[TRANSCRIPT FINAL]",
            {
              speaker,
              text: streamedText,
              segmentId,
            },
          );


          /*
           * User finished speaking.
           */

          if (isUser) {

            setState(
              "thinking",
            );

          }


          /*
           * Agent finished generating this
           * transcription segment.
           *
           * Audio state will be handled by
           * ActiveSpeakersChanged.
           */

        }

      } catch (error) {

        console.error(
          "[TRANSCRIPT ERROR]",
          error,
        );

      }

    },
  );

}


/* =================================
   START VOICE
================================= */

startButton.addEventListener(
  "click",

  async () => {

    try {

      startButton.disabled =
        true;


      setState(
        "connecting",
      );


      /* =============================
         GET TOKEN
      ============================= */

      const response =
        await fetch(
          "/token",
        );


      if (!response.ok) {

        throw new Error(
          "Failed to get LiveKit token",
        );

      }


      const data =
        await response.json();


      console.log(
        "LiveKit connection details received",
      );


      /* =============================
         CREATE ROOM
      ============================= */

      room =
        new Room();


      /* =============================
         TRANSCRIPT
      ============================= */

      registerTranscriptionHandler();


      /* =============================
         REMOTE AUDIO
      ============================= */

      room.on(
        RoomEvent.TrackSubscribed,

        (
          track,
          publication,
          participant,
        ) => {

          if (
            track.kind ===
            Track.Kind.Audio
          ) {

            const audioElement =
              track.attach();


            audioElement.autoplay =
              true;


            audioElement.setAttribute(
              "data-agent-audio",
              "true",
            );


            document.body.appendChild(
              audioElement,
            );


            console.log(
              "Agent audio track attached",
            );

          }

        },
      );


      /* =============================
         AGENT SPEAKING STATE
      ============================= */

      room.on(
        RoomEvent.ActiveSpeakersChanged,

        (speakers) => {

          const agentSpeaking =
            speakers.some(
              (participant) =>
                participant.identity !==
                room.localParticipant.identity,
            );


          if (agentSpeaking) {

            agentWasSpeaking =
              true;

            setState(
              "speaking",
            );

          } else if (
            currentState ===
            "speaking"
          ) {

            setState(
              "listening",
            );

          }

        },
      );


      /* =============================
         CONNECTED
      ============================= */

      room.on(
        RoomEvent.Connected,

        () => {

          console.log(
            "Connected to LiveKit room:",
            room.name,
          );


          setState(
            "listening",
          );


          startButton.textContent =
            "Listening";

        },
      );


      /* =============================
         DISCONNECTED
      ============================= */

      room.on(
        RoomEvent.Disconnected,

        () => {

          console.log(
            "Disconnected from LiveKit",
          );


          setState(
            "ready",
          );


          status.textContent =
            "Disconnected";


          activityText.textContent =
            "VoiceFlow disconnected.";


          startButton.disabled =
            false;


          startButton.textContent =
            "Start Voice";


          room =
            null;

        },
      );


      /* =============================
         CONNECT
      ============================= */

      await room.connect(
        data.serverUrl,
        data.participantToken,
      );


      /* =============================
         MICROPHONE
      ============================= */

      await room.localParticipant
        .setMicrophoneEnabled(
          true,
        );


      console.log(
        "Microphone enabled",
      );

    } catch (error) {

      console.error(
        "VoiceFlow connection error:",
        error,
      );


      status.textContent =
        "Connection failed";


      title.textContent =
        "Connection failed";


      subtitle.textContent =
        "Something went wrong.";


      activityText.textContent =
        error.message ||
        "Unable to connect to VoiceFlow.";


      startButton.disabled =
        false;


      startButton.textContent =
        "Try Again";

    }

  },
);


/* =================================
   INITIAL STATE
================================= */

setState(
  "ready",
);