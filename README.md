# VoiceFlow

> A voice-native assistant built for the DataForge × Rime Hackathon, focused on interruption and recovery in real-time voice conversations.

VoiceFlow is a real-time voice assistant that allows users to speak naturally, interrupt the assistant while it is responding or performing a task, and immediately change their request.

The system is designed around one hard voice interaction problem:

## Interruption and Recovery

In normal voice assistants, interrupting an ongoing response can lead to:

- Old responses continuing to play
- Stale tool results being presented
- Previous tasks continuing in the background
- The assistant responding to an outdated request

VoiceFlow is designed to prevent these failures.

---

## Demo

The core interaction looks like this:

**User:**

> Find me laptops under seventy thousand rupees.

The assistant begins processing the request.

**User interrupts:**

> Wait, make it sixty thousand, HP only.

VoiceFlow immediately:

1. Detects the interruption
2. Stops the previous conversational flow
3. Cancels the active task
4. Starts a new task for the updated request
5. Prevents stale results from the cancelled task from becoming the current answer
6. Responds using the updated request

This makes interruption a first-class part of the conversation instead of treating it as an error.

---

## Key Features

### Real-Time Voice Conversation

VoiceFlow provides a full-duplex voice interaction where the user can speak naturally with the assistant.

### Interruption Detection

The assistant supports adaptive interruption handling so users can change or correct their request while the assistant is speaking.

### Task Cancellation

Each user request is tracked as a task.

When the user changes their request, the previous active task is cancelled.

### Stale Result Protection

A delayed result from an older task cannot become the answer to the newer request.

Every task is associated with an ID and the system verifies that a result still belongs to the active task before accepting it.

### Realtime Transcript

The web interface displays user and assistant speech as the conversation happens.

### Voice State Feedback

The interface provides visual feedback for states such as:

- Ready
- Connecting
- Listening
- Thinking
- Speaking
- Interrupted
- Recovering

### Rime Voice

Rime provides the spoken output of the assistant through LiveKit's realtime inference integration.

---

## Architecture

```text
                   ┌─────────────────────┐
                   │       Browser       │
                   │                     │
                   │   VoiceFlow Web UI  │
                   └──────────┬──────────┘
                              │
                              │ WebRTC
                              ▼
                   ┌─────────────────────┐
                   │      LiveKit       │
                   │       Cloud        │
                   └──────────┬──────────┘
                              │
                              ▼
                   ┌─────────────────────┐
                   │   VoiceFlow Agent  │
                   │                     │
                   │ STT → LLM → TTS    │
                   └──────┬──────┬───────┘
                          │      │
                          │      └──────────────┐
                          ▼                     ▼
                  Task Manager              Rime TTS
                          │
                          ▼
                  Tool / Task Execution