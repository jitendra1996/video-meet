"use client";

/**
 * Video Room Page - Google Meet-style interface
 *
 * Features: screen share, participant list, chat, reactions,
 * layout toggle, pin/spotlight, copy link, device selection.
 */

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useVideoRoom } from "@/hooks/useVideoRoom";
import type { RemoteParticipant } from "@/lib/mediasoup-client";

type LayoutMode = "grid" | "speaker";
type PanelTab = "none" | "chat" | "participants";

/** Renders local (self) video */
function LocalVideoTile({
  stream,
  isVideoMuted,
  isAudioMuted,
  isScreenSharing,
}: {
  stream: MediaStream | null;
  isVideoMuted: boolean;
  isAudioMuted: boolean;
  isScreenSharing: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border-2 border-emerald-500/50 shadow-lg">
      {stream ? (
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${!isScreenSharing ? "[transform:scaleX(-1)]" : ""}`}
          playsInline
          autoPlay
          muted
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      )}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-sm text-white flex items-center gap-1">
        You
        {isScreenSharing && (
          <span className="px-1.5 py-0.5 bg-amber-600 rounded text-xs">
            Sharing
          </span>
        )}
        {isVideoMuted && <span className="text-slate-400">(video off)</span>}
        {isAudioMuted && <span className="text-slate-400">(muted)</span>}
      </div>
    </div>
  );
}

/** Renders a remote participant's video and audio */
function RemoteVideoTile({
  participant,
  isSpotlight,
  onPin,
}: {
  participant: RemoteParticipant;
  isSpotlight?: boolean;
  onPin?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const displayName = participant?.displayName ?? "Unknown";
  const videoStream = participant?.videoStream;
  const audioStream = participant?.audioStream;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (videoStream && videoStream.active) {
      video.srcObject = videoStream;
      video.muted = false;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.srcObject = null;
    }
    return () => {
      video.srcObject = null;
    };
  }, [videoStream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioStream && audioStream.active) {
      audio.srcObject = audioStream;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      audio.srcObject = null;
    }
    return () => {
      audio.srcObject = null;
    };
  }, [audioStream]);

  return (
    <div
      className={`relative bg-slate-900 rounded-xl overflow-hidden border transition-all ${
        isSpotlight
          ? "border-emerald-500 col-span-2 row-span-2 aspect-video"
          : "border-slate-700 aspect-video"
      }`}
      onClick={onPin}
    >
      {videoStream ? (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          autoPlay
          muted={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-800 aspect-video">
          <span className="text-4xl text-slate-500">
            {displayName.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <span className="px-2 py-1 bg-black/60 rounded text-sm text-white truncate max-w-[80%]">
          {displayName}
        </span>
        {onPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className="p-1 rounded bg-black/40 hover:bg-black/60 text-white text-xs"
            title="Pin"
          >
            📌
          </button>
        )}
      </div>
    </div>
  );
}

const REACTIONS = ["👍", "👏", "❤️", "😂", "😮", "🙌"];

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") || "default";
  const displayName = searchParams.get("name") || "Anonymous";
  const videoDeviceId = searchParams.get("videoDeviceId") || undefined;
  const audioDeviceId = searchParams.get("audioDeviceId") || undefined;

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [panelTab, setPanelTab] = useState<PanelTab>("none");
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [chatNotification, setChatNotification] = useState<{
    displayName: string;
    message: string;
  } | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const panelTabRef = useRef<PanelTab>("none");
  const participantIdRef = useRef<string | null>(null);
  panelTabRef.current = panelTab;

  useEffect(() => {
    if (!showReactionPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        reactionPickerRef.current &&
        !reactionPickerRef.current.contains(e.target as Node)
      ) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showReactionPicker]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const {
    localStream,
    remoteParticipants,
    participantId,
    isInRoom,
    error,
    joinRoom,
    leaveRoom,
    toggleVideo,
    toggleAudio,
    toggleScreenShare,
    isVideoMuted,
    isAudioMuted,
    isScreenSharing,
    chatMessages,
    lastReaction,
    sendChatMessage,
    sendReaction,
    copyMeetingLink,
  } = useVideoRoom({
    roomId,
    displayName,
    videoDeviceId,
    audioDeviceId,
    onChatMessageReceived: (msg) => {
      if (
        panelTabRef.current !== "chat" &&
        msg.participantId !== participantIdRef.current
      ) {
        setChatNotification({ displayName: msg.displayName, message: msg.message });
        setTimeout(() => setChatNotification(null), 4000);
      }
    },
  });
  participantIdRef.current = participantId ?? null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!roomId || !displayName || isInRoom || error) return;
    joinRoom();
  }, [roomId, displayName]);

  const handleCopyLink = async () => {
    await copyMeetingLink();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendReaction = (reaction: string) => {
    sendReaction(reaction);
  };

  const validParticipants = remoteParticipants.filter(
    (p): p is RemoteParticipant => p != null && p.id != null
  );
  const participantCount = validParticipants.length + 1;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Connection Error
          </h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const orderedParticipants = pinnedId
    ? [
        ...validParticipants.filter((p) => p.id === pinnedId),
        ...validParticipants.filter((p) => p.id !== pinnedId),
      ]
    : validParticipants;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-700/50 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold text-white truncate max-w-[120px]">
            {roomId}
          </h1>
          <span className="text-slate-500 text-sm">•</span>
          <span className="text-slate-400 text-sm">
            {participantCount} participant{participantCount !== 1 ? "s" : ""}
          </span>
          <button
            onClick={handleCopyLink}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 rounded text-slate-300 transition"
          >
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>
        <span className="text-slate-400 text-sm truncate max-w-[150px]">
          {displayName}
        </span>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <main className="flex-1 p-4 overflow-auto min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-2">
              <button
                onClick={() => setLayoutMode("grid")}
                className={`px-2 py-1 rounded text-xs ${
                  layoutMode === "grid"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setLayoutMode("speaker")}
                className={`px-2 py-1 rounded text-xs ${
                  layoutMode === "speaker"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                Speaker
              </button>
            </div>
          </div>

          <div
            className={`grid gap-3 max-w-7xl mx-auto ${
              layoutMode === "speaker" && pinnedId
                ? "grid-cols-1"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            }`}
          >
            <LocalVideoTile
              stream={localStream}
              isVideoMuted={isVideoMuted}
              isAudioMuted={isAudioMuted}
              isScreenSharing={isScreenSharing}
            />
            {orderedParticipants.map((participant) => (
              <RemoteVideoTile
                key={participant.id}
                participant={participant}
                isSpotlight={
                  layoutMode === "speaker" && pinnedId === participant.id
                }
                onPin={() =>
                  setPinnedId(pinnedId === participant.id ? null : participant.id)
                }
              />
            ))}
          </div>

          {/* Chat message notification */}
          {chatNotification && (
            <div
              className="fixed top-16 right-4 z-50 max-w-xs px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
              role="alert"
            >
              <p className="text-sm font-medium text-emerald-400">
                {chatNotification.displayName}
              </p>
              <p className="text-sm text-slate-300 truncate">
                {chatNotification.message}
              </p>
            </div>
          )}

          {/* Reaction overlay */}
          {lastReaction && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 text-4xl animate-bounce z-50">
              {lastReaction.reaction}{" "}
              <span className="text-sm text-white/80">
                {lastReaction.displayName}
              </span>
            </div>
          )}
        </main>

        {/* Side panel */}
        {panelTab !== "none" && (
          <aside className="w-80 bg-slate-900/95 border-l border-slate-700 flex flex-col shrink-0">
            <div className="flex border-b border-slate-700">
              <button
                onClick={() => setPanelTab("participants")}
                className={`flex-1 py-2 text-sm ${
                  panelTab === "participants"
                    ? "border-b-2 border-emerald-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                People ({participantCount})
              </button>
              <button
                onClick={() => setPanelTab("chat")}
                className={`flex-1 py-2 text-sm ${
                  panelTab === "chat"
                    ? "border-b-2 border-emerald-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setPanelTab("none")}
                className="px-3 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              {panelTab === "participants" && (
                <div className="p-3 overflow-auto">
                  <div className="flex items-center gap-2 py-2 text-slate-300">
                    <span className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm">
                      {displayName.charAt(0)}
                    </span>
                    You (me)
                  </div>
                  {validParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 py-2 text-slate-300"
                    >
                      <span className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-sm">
                        {(p.displayName ?? "?").charAt(0)}
                      </span>
                      {p.displayName ?? "Unknown"}
                    </div>
                  ))}
                </div>
              )}
              {panelTab === "chat" && (
                <>
                  <div className="flex-1 overflow-auto p-3 space-y-2">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-medium text-emerald-400">
                          {msg.displayName}:
                        </span>{" "}
                        <span className="text-slate-300">{msg.message}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    className="p-2 border-t border-slate-700"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (chatInput.trim()) {
                        sendChatMessage(chatInput.trim());
                        setChatInput("");
                      }
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full px-3 py-2 bg-slate-800 rounded text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </form>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Controls */}
      <footer className="flex items-center justify-center gap-2 py-3 bg-slate-900/90 border-t border-slate-700/50 shrink-0">
        <button
          onClick={toggleAudio}
          className={`p-3 rounded-full transition ${
            isAudioMuted
              ? "bg-red-600 hover:bg-red-500"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title={isAudioMuted ? "Unmute" : "Mute"}
        >
          <MicIcon muted={isAudioMuted} />
        </button>
        <button
          onClick={toggleVideo}
          className={`p-3 rounded-full transition ${
            isVideoMuted
              ? "bg-red-600 hover:bg-red-500"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title={isVideoMuted ? "Turn on camera" : "Turn off camera"}
        >
          <VideoIcon muted={isVideoMuted} />
        </button>
        <button
          onClick={toggleScreenShare}
          className={`p-3 rounded-full transition ${
            isScreenSharing
              ? "bg-amber-600 hover:bg-amber-500"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          <ScreenShareIcon sharing={isScreenSharing} />
        </button>
        <button
          onClick={() => {
            setPanelTab(panelTab === "chat" ? "none" : "chat");
            if (panelTab !== "chat") setChatNotification(null);
          }}
          className={`p-3 rounded-full transition ${
            panelTab === "chat"
              ? "bg-emerald-600"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title="Chat"
        >
          <ChatIcon />
        </button>
        <div className="relative" ref={reactionPickerRef}>
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className={`p-3 rounded-full transition ${
              showReactionPicker ? "bg-emerald-600" : "bg-slate-700 hover:bg-slate-600"
            } text-white`}
            title="Reactions"
          >
            <ReactionIcon />
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-wrap gap-1 p-2 bg-slate-800 rounded-lg shadow-xl z-50 border border-slate-600">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    handleSendReaction(r);
                    setShowReactionPicker(false);
                  }}
                  className="text-2xl hover:scale-125 transition p-1"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() =>
            setPanelTab(panelTab === "participants" ? "none" : "participants")
          }
          className={`p-3 rounded-full transition ${
            panelTab === "participants"
              ? "bg-emerald-600"
              : "bg-slate-700 hover:bg-slate-600"
          } text-white`}
          title="Participants"
        >
          <PeopleIcon />
        </button>
        <Link
          href="/"
          onClick={leaveRoom}
          className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white transition"
          title="Leave call"
        >
          <PhoneOffIcon />
        </Link>
      </footer>
    </div>
  );
}

function MicIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5 5V11.17zM4.27 3L3 4.27 10.73 12H5c0 2.76 2.24 5 5 5h.18l2.81 2.81C11.87 19.54 11 19 10 19c-2.76 0-5 2.24-5 5h2c0-2.09 1.45-3.84 3.4-4.36L19.73 21 21 19.73 4.27 3z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  );
}

function VideoIcon({ muted }: { muted: boolean }) {
  return muted ? (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}

function ScreenShareIcon({ sharing }: { sharing: boolean }) {
  return (
    <svg
      className="w-6 h-6"
      fill="currentColor"
      viewBox="0 0 24 24"
      style={sharing ? { color: "white" } : {}}
    >
      <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
    </svg>
  );
}

function ReactionIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function PhoneOffIcon() {
  return (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.86-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.37-2.66-1.86-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
    </svg>
  );
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}
