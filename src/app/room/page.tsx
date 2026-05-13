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
type ChatChannel = "room" | "direct";

type TileLayout = "tile" | "hero" | "thumb";

/** Receiver tracks may exist before `stream.active` flips true in some browsers. */
function hasLiveVideoTrack(stream: MediaStream | null | undefined): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.readyState !== "ended");
}

/** Balanced columns for a Meet-like gallery (everyone visible, similar tile sizes). */
function galleryColsForCount(n: number): number {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n <= 4) return 2;
  if (n <= 9) return 3;
  if (n <= 16) return 4;
  return Math.min(5, Math.ceil(Math.sqrt(n)));
}

/** Meet-style initials avatar when camera is off. */
function AvatarFallback({
  name,
  size = "tile",
}: {
  name: string;
  size?: "tile" | "thumb" | "hero";
}) {
  const ch = (name?.trim()?.charAt(0) || "?").toUpperCase();
  const box =
    size === "hero"
      ? "w-28 h-28 sm:w-36 sm:h-36 text-4xl sm:text-5xl border-4"
      : size === "thumb"
        ? "w-14 h-14 text-lg border-2"
        : "w-20 h-20 sm:w-28 sm:h-28 text-3xl sm:text-4xl border-2";
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 bg-gradient-to-br from-[#5f6368] to-[#3c4043] border-[#80868b] shadow-inner ${box}`}
      aria-hidden
    >
      {ch}
    </div>
  );
}

/** Renders local (self) video */
function LocalVideoTile({
  stream,
  isVideoMuted,
  isAudioMuted,
  isScreenSharing,
  layout = "tile",
  displayName = "You",
  fillCell,
}: {
  stream: MediaStream | null;
  isVideoMuted: boolean;
  isAudioMuted: boolean;
  isScreenSharing: boolean;
  layout?: TileLayout;
  /** Shown on avatar when camera off (Meet-style). */
  displayName?: string;
  /** Gallery cell: stretch to fill grid row/column like Google Meet tiles. */
  fillCell?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const showVideo =
    !!stream &&
    (isScreenSharing
      ? hasLiveVideoTrack(stream)
      : !isVideoMuted && hasLiveVideoTrack(stream));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (stream && showVideo) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream, showVideo]);

  const mirror = !isScreenSharing && layout !== "hero";
  const videoFit = layout === "hero" ? "object-contain max-h-full max-w-full" : "w-full h-full object-cover";
  const tileSizing = fillCell
    ? "relative h-full min-h-[104px] w-full min-w-0"
    : "relative aspect-video w-full min-w-0";
  const shell =
    layout === "hero"
      ? "relative h-full w-full min-h-0 rounded-2xl overflow-hidden ring-2 ring-amber-400/80 bg-black shadow-2xl flex flex-col"
      : layout === "thumb"
        ? "relative w-36 sm:w-44 shrink-0 aspect-video bg-[#1f1f1f] rounded-xl overflow-hidden ring-1 ring-white/15 shadow-lg"
        : `${tileSizing} bg-[#1f1f1f] rounded-2xl overflow-hidden ring-1 ring-white/[0.12] shadow-lg`;

  return (
    <div className={shell}>
      {layout === "hero" && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-amber-600/95 text-white text-sm font-medium shadow-lg">
          {isScreenSharing ? "Your screen share" : "You"}
        </div>
      )}
      <div
        className={
          layout === "hero"
            ? "flex-1 min-h-0 flex items-center justify-center p-2"
            : "absolute inset-0"
        }
      >
        {!stream ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
            <div className="w-12 h-12 border-4 border-emerald-500/25 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        ) : showVideo ? (
          <video
            ref={videoRef}
            className={`${videoFit} ${mirror ? "[transform:scaleX(-1)]" : ""}`}
            playsInline
            autoPlay
            muted
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
            <AvatarFallback name={displayName} size={layout === "thumb" ? "thumb" : "tile"} />
          </div>
        )}
      </div>
      {layout !== "hero" && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/75 to-transparent">
          <div className="flex items-center gap-1.5 text-xs text-white font-medium drop-shadow">
            <span>You</span>
            {isScreenSharing && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/90 text-[10px] font-semibold">
                Presenting
              </span>
            )}
            {isVideoMuted && (
              <span className="opacity-70 text-[10px]">Camera off</span>
            )}
            {isAudioMuted && (
              <span className="opacity-70 text-[10px]">Muted</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Renders a remote participant's video and audio */
function RemoteVideoTile({
  participant,
  isSpotlight,
  onPin,
  layout = "tile",
  fillCell,
}: {
  participant: RemoteParticipant;
  isSpotlight?: boolean;
  onPin?: () => void;
  layout?: TileLayout;
  fillCell?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const displayName = participant?.displayName ?? "Unknown";
  const videoStream = participant?.videoStream;
  const audioStream = participant?.audioStream;
  const isScreenShare = participant?.isScreenSharing ?? false;
  const showVideo = hasLiveVideoTrack(videoStream);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Must keep remote <video> muted so autoplay is allowed; play audio via <audio>.
    if (showVideo && videoStream) {
      video.srcObject = videoStream;
      video.muted = true;
      video.play().catch(() => {});
    } else {
      video.srcObject = null;
    }
    return () => {
      video.srcObject = null;
    };
  }, [videoStream, showVideo]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioStream?.getAudioTracks().length) {
      audio.srcObject = audioStream;
      audio.play().catch(() => {});
    } else {
      audio.srcObject = null;
    }
    return () => {
      audio.srcObject = null;
    };
  }, [audioStream]);

  const videoFit =
    layout === "hero" ? "object-contain max-h-full max-w-full" : "w-full h-full object-cover";

  const tileSizing = fillCell
    ? "relative h-full min-h-[104px] w-full min-w-0"
    : "relative aspect-video w-full min-w-0";
  const shell =
    layout === "hero"
      ? "relative h-full w-full min-h-0 rounded-2xl overflow-hidden ring-2 ring-amber-400/80 bg-black shadow-2xl flex flex-col"
      : layout === "thumb"
        ? "relative w-36 sm:w-44 shrink-0 aspect-video bg-[#1f1f1f] rounded-xl overflow-hidden ring-1 ring-white/15 shadow-lg snap-start"
        : `${tileSizing} bg-[#1f1f1f] rounded-2xl overflow-hidden ring-1 transition-all ${
            isSpotlight
              ? "ring-2 ring-[#1a73e8] shadow-lg shadow-blue-900/30"
              : "ring-white/[0.12]"
          }`;

  return (
    <div className={shell} onClick={layout === "hero" ? undefined : onPin}>
      {layout === "hero" && (
        <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-amber-600/95 text-white text-sm font-medium shadow-lg max-w-[90%] truncate">
          {isScreenShare ? `Presenting · ${displayName}` : displayName}
        </div>
      )}
      <div
        className={
          layout === "hero"
            ? "flex-1 min-h-0 flex items-center justify-center p-2"
            : "absolute inset-0"
        }
      >
        {showVideo ? (
          <video
            ref={videoRef}
            className={videoFit}
            playsInline
            autoPlay
            muted
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[#202124]">
            <AvatarFallback
              name={displayName}
              size={layout === "thumb" ? "thumb" : layout === "hero" ? "hero" : "tile"}
            />
          </div>
        )}
      </div>
      <audio ref={audioRef} autoPlay playsInline className="hidden" />
      {layout !== "hero" && (
        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/75 to-transparent flex items-end justify-between gap-1">
          <span className="text-xs text-white font-medium truncate flex items-center gap-1 drop-shadow max-w-[70%]">
            {displayName}
            {isScreenShare && (
              <span className="px-1 py-0.5 rounded bg-amber-500/90 text-[10px] font-semibold shrink-0">
                Presenting
              </span>
            )}
          </span>
          {onPin && (
            <button
              type="button"
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
      )}
    </div>
  );
}

const REACTIONS = [
  "👍",
  "👎",
  "❤️",
  "😂",
  "😮",
  "🎉",
  "👏",
  "🤔",
  "🙌",
  "💯",
  "🔥",
  "✋",
];

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") || "default";
  const displayName = searchParams.get("name") || "Anonymous";
  const videoDeviceId = searchParams.get("videoDeviceId") || undefined;
  const audioDeviceId = searchParams.get("audioDeviceId") || undefined;

  const [layoutMode, setLayoutMode] = useState<LayoutMode>("grid");
  const [panelTab, setPanelTab] = useState<PanelTab>("none");
  const [chatChannel, setChatChannel] = useState<ChatChannel>("room");
  const [dmPeerId, setDmPeerId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [chatNotification, setChatNotification] = useState<{
    displayName: string;
    message: string;
    direct?: boolean;
  } | null>(null);
  const reactionPickerRef = useRef<HTMLDivElement>(null);
  const panelTabRef = useRef<PanelTab>("none");
  const chatChannelRef = useRef<ChatChannel>("room");
  const dmPeerIdRef = useRef<string | null>(null);
  const participantIdRef = useRef<string | null>(null);
  panelTabRef.current = panelTab;
  chatChannelRef.current = chatChannel;
  dmPeerIdRef.current = dmPeerId;

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
    privateChatMessages,
    lastReaction,
    sendChatMessage,
    sendPrivateChatMessage,
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
        setChatNotification({
          displayName: msg.displayName,
          message: msg.message,
          direct: false,
        });
        setTimeout(() => setChatNotification(null), 4000);
      }
    },
    onPrivateChatReceived: (msg) => {
      const me = participantIdRef.current;
      if (!me || msg.fromParticipantId === me) return;
      const viewingThisDm =
        panelTabRef.current === "chat" &&
        chatChannelRef.current === "direct" &&
        dmPeerIdRef.current === msg.fromParticipantId;
      if (viewingThisDm) return;
      setChatNotification({
        displayName: msg.displayName,
        message: msg.message,
        direct: true,
      });
      setTimeout(() => setChatNotification(null), 4500);
    },
  });
  participantIdRef.current = participantId ?? null;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, privateChatMessages, chatChannel, dmPeerId]);

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

  /**
   * Presenter layout (large shared screen + filmstrip): only while someone is
   * actively sharing. Otherwise use the grid so every participant’s camera is visible.
   */
  const remotePresenter = validParticipants.find(
    (p) => p.isScreenSharing && hasLiveVideoTrack(p.videoStream)
  );
  const screenShareHeroId: "local" | string | null = isScreenSharing
    ? "local"
    : remotePresenter
      ? remotePresenter.id
      : null;

  const screenShareHeroRemote =
    screenShareHeroId && screenShareHeroId !== "local"
      ? validParticipants.find((x) => x.id === screenShareHeroId)
      : undefined;

  const galleryCols = galleryColsForCount(participantCount);
  /** Who fills the large stage in Spotlight (pin wins, else first guest, else you). */
  const effectiveSpotlightId =
    pinnedId ?? validParticipants[0]?.id ?? participantId ?? null;
  const spotlightIsMe =
    !!participantId && effectiveSpotlightId === participantId;
  const spotlightRemote =
    effectiveSpotlightId && !spotlightIsMe
      ? validParticipants.find((p) => p.id === effectiveSpotlightId)
      : undefined;

  const directThread =
    participantId && dmPeerId
      ? privateChatMessages.filter(
          (m) =>
            (m.fromParticipantId === participantId &&
              m.toParticipantId === dmPeerId) ||
            (m.fromParticipantId === dmPeerId &&
              m.toParticipantId === participantId)
        )
      : [];

  return (
    <div className="min-h-screen bg-[#202124] flex flex-col text-white">
      {/* Meet-style top bar */}
      <header className="flex items-center justify-between px-3 sm:px-5 h-12 sm:h-14 shrink-0 bg-[#202124] border-b border-white/[0.08]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-medium text-white/95 truncate max-w-[140px] sm:max-w-[240px]">
              {roomId}
            </h1>
            <p className="text-[11px] text-white/50 truncate">
              {participantCount} in call · {displayName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition text-white/90"
          >
            {copied ? "Link copied" : "Copy joining link"}
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Video area */}
        <main className="flex-1 p-3 sm:p-4 pb-28 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {/* Presenting banner (Meet-style) */}
          {(isScreenSharing || remotePresenter) && (
            <div className="shrink-0 mb-3 flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#0f4c26] text-white text-xs sm:text-sm font-medium border border-[#1f8e3e]/40">
              <span className="w-2 h-2 rounded-full bg-[#5cff6a] animate-pulse shrink-0" />
              {isScreenSharing
                ? "You are presenting your screen to everyone"
                : `${remotePresenter?.displayName ?? "Someone"} is presenting`}
            </div>
          )}

          <div
            className={`flex items-center justify-between mb-2 shrink-0 ${screenShareHeroId ? "opacity-70" : ""}`}
          >
            <div className="flex gap-1 rounded-full bg-[#3c4043] p-0.5 border border-white/10">
              <button
                type="button"
                onClick={() => setLayoutMode("grid")}
                disabled={!!screenShareHeroId}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  layoutMode === "grid"
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:text-white/80"
                } ${screenShareHeroId ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Gallery
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode("speaker")}
                disabled={!!screenShareHeroId}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  layoutMode === "speaker"
                    ? "bg-white/15 text-white"
                    : "text-white/50 hover:text-white/80"
                } ${screenShareHeroId ? "cursor-not-allowed opacity-50" : ""}`}
              >
                Spotlight
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
            {screenShareHeroId ? (
              <div className="flex flex-col gap-2 flex-1 min-h-0 w-full max-w-[1600px] mx-auto">
                <div className="h-[min(72vh,calc(100dvh-14rem))] min-h-[200px] shrink-0 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black">
                  {screenShareHeroId === "local" ? (
                    <LocalVideoTile
                      stream={localStream}
                      isVideoMuted={isVideoMuted}
                      isAudioMuted={isAudioMuted}
                      isScreenSharing={isScreenSharing}
                      layout="hero"
                      displayName={displayName}
                    />
                  ) : screenShareHeroRemote ? (
                    <RemoteVideoTile
                      layout="hero"
                      participant={screenShareHeroRemote}
                    />
                  ) : null}
                </div>
                <div className="shrink-0 border-t border-white/[0.08] pt-2">
                  <p className="text-[10px] text-white/45 uppercase tracking-wide mb-2 px-0.5">
                    People ({participantCount})
                  </p>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 overscroll-x-contain">
                    {screenShareHeroId !== "local" && (
                      <LocalVideoTile
                        stream={localStream}
                        isVideoMuted={isVideoMuted}
                        isAudioMuted={isAudioMuted}
                        isScreenSharing={false}
                        layout="thumb"
                        displayName={displayName}
                      />
                    )}
                    {validParticipants
                      .filter((p) => p.id !== screenShareHeroId)
                      .map((participant) => (
                        <RemoteVideoTile
                          key={participant.id}
                          participant={participant}
                          layout="thumb"
                          onPin={() =>
                            setPinnedId(
                              pinnedId === participant.id ? null : participant.id
                            )
                          }
                        />
                      ))}
                  </div>
                </div>
              </div>
            ) : layoutMode === "speaker" ? (
              <div className="flex flex-col flex-1 min-h-0 gap-3 w-full max-w-[1600px] mx-auto">
                <div className="flex-1 min-h-[200px] sm:min-h-[300px] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-black min-w-0 shadow-xl">
                  {spotlightIsMe ? (
                    <LocalVideoTile
                      stream={localStream}
                      isVideoMuted={isVideoMuted}
                      isAudioMuted={isAudioMuted}
                      isScreenSharing={isScreenSharing}
                      layout="hero"
                      displayName={displayName}
                    />
                  ) : spotlightRemote ? (
                    <RemoteVideoTile
                      layout="hero"
                      participant={spotlightRemote}
                    />
                  ) : (
                    <LocalVideoTile
                      stream={localStream}
                      isVideoMuted={isVideoMuted}
                      isAudioMuted={isAudioMuted}
                      isScreenSharing={isScreenSharing}
                      layout="hero"
                      displayName={displayName}
                    />
                  )}
                </div>
                <div className="shrink-0">
                  <p className="text-[10px] text-white/45 uppercase tracking-wide mb-2 px-0.5">
                    Everyone ({participantCount})
                  </p>
                  <div className="flex flex-nowrap gap-2 overflow-x-auto pb-2 overscroll-x-contain">
                    {!spotlightIsMe && (
                      <LocalVideoTile
                        stream={localStream}
                        isVideoMuted={isVideoMuted}
                        isAudioMuted={isAudioMuted}
                        isScreenSharing={isScreenSharing}
                        layout="thumb"
                        displayName={displayName}
                      />
                    )}
                    {validParticipants
                      .filter((p) => p.id !== effectiveSpotlightId)
                      .map((participant) => (
                        <RemoteVideoTile
                          key={participant.id}
                          participant={participant}
                          layout="thumb"
                          onPin={() =>
                            setPinnedId(
                              pinnedId === participant.id ? null : participant.id
                            )
                          }
                        />
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="grid gap-2 sm:gap-3 w-full max-w-[1800px] mx-auto flex-1 min-h-[220px] min-w-0"
                style={{
                  gridTemplateColumns: `repeat(${galleryCols}, minmax(0, 1fr))`,
                  gridAutoRows: "minmax(0, 1fr)",
                }}
              >
                <LocalVideoTile
                  stream={localStream}
                  isVideoMuted={isVideoMuted}
                  isAudioMuted={isAudioMuted}
                  isScreenSharing={isScreenSharing}
                  fillCell
                  displayName={displayName}
                />
                {orderedParticipants.map((participant) => (
                  <RemoteVideoTile
                    key={participant.id}
                    participant={participant}
                    isSpotlight={pinnedId === participant.id}
                    fillCell
                    onPin={() =>
                      setPinnedId(
                        pinnedId === participant.id ? null : participant.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>

          {/* Chat message notification */}
          {chatNotification && (
            <div
              className="fixed top-16 right-4 z-50 max-w-xs px-4 py-3 bg-[#3c4043] border border-white/15 rounded-xl shadow-2xl"
              role="alert"
            >
              <p className="text-[10px] uppercase tracking-wide text-white/50 mb-0.5">
                {chatNotification.direct ? "Direct message" : "New message"}
              </p>
              <p className="text-sm font-medium text-[#8ab4f8]">
                {chatNotification.displayName}
              </p>
              <p className="text-sm text-white/80 truncate">
                {chatNotification.message}
              </p>
            </div>
          )}

          {/* Reaction overlay */}
          {lastReaction && (
            <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-[#3c4043]/95 border border-white/15 shadow-2xl animate-[bounce_0.6s_ease-in-out_1]">
              <span className="text-4xl leading-none">{lastReaction.reaction}</span>
              <span className="text-xs text-white/70">{lastReaction.displayName}</span>
            </div>
          )}
        </main>

        {/* Side panel */}
        {panelTab !== "none" && (
          <aside className="w-full max-w-[380px] sm:w-96 bg-[#2d2d2d] border-l border-white/[0.08] flex flex-col shrink-0 shadow-2xl">
            <div className="flex border-b border-white/[0.08]">
              <button
                type="button"
                onClick={() => setPanelTab("participants")}
                className={`flex-1 py-3 text-sm font-medium ${
                  panelTab === "participants"
                    ? "text-white border-b-2 border-[#1a73e8] bg-white/[0.04]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                People
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("chat")}
                className={`flex-1 py-3 text-sm font-medium ${
                  panelTab === "chat"
                    ? "text-white border-b-2 border-[#1a73e8] bg-white/[0.04]"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Messages
              </button>
              <button
                type="button"
                onClick={() => setPanelTab("none")}
                className="px-4 text-white/50 hover:text-white"
                aria-label="Close panel"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {panelTab === "participants" && (
                <div className="p-3 overflow-auto">
                  <p className="text-xs text-white/45 mb-2 px-1">In this meeting ({participantCount})</p>
                  <div className="flex items-center gap-3 py-2.5 px-2 rounded-xl bg-white/[0.06]">
                    <span className="w-9 h-9 rounded-full bg-[#1a73e8] flex items-center justify-center text-sm font-medium">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-[11px] text-white/45">You</p>
                    </div>
                  </div>
                  {validParticipants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 py-2 px-2 rounded-xl hover:bg-white/[0.06] mt-1"
                    >
                      <span className="w-9 h-9 rounded-full bg-[#5f6368] flex items-center justify-center text-sm font-medium shrink-0">
                        {(p.displayName ?? "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{p.displayName ?? "Unknown"}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setDmPeerId(p.id);
                          setChatChannel("direct");
                          setPanelTab("chat");
                        }}
                        className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[#8ab4f8] shrink-0"
                      >
                        Message
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {panelTab === "chat" && (
                <>
                  <div className="flex border-b border-white/[0.08] shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setChatChannel("room");
                        setDmPeerId(null);
                      }}
                      className={`flex-1 py-2.5 text-xs font-medium ${
                        chatChannel === "room"
                          ? "text-white bg-white/[0.06]"
                          : "text-white/45 hover:text-white/70"
                      }`}
                    >
                      Everyone
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatChannel("direct")}
                      className={`flex-1 py-2.5 text-xs font-medium ${
                        chatChannel === "direct"
                          ? "text-white bg-white/[0.06]"
                          : "text-white/45 hover:text-white/70"
                      }`}
                    >
                      Direct
                    </button>
                  </div>
                  {chatChannel === "direct" && (
                    <div className="p-2 border-b border-white/[0.08] shrink-0">
                      <label className="text-[10px] uppercase tracking-wide text-white/40 block mb-1 px-1">
                        Message to
                      </label>
                      <select
                        value={dmPeerId ?? ""}
                        onChange={(e) =>
                          setDmPeerId(e.target.value || null)
                        }
                        className="w-full px-3 py-2 rounded-lg bg-[#3c4043] text-sm text-white border border-white/10 focus:outline-none focus:ring-1 focus:ring-[#1a73e8]"
                      >
                        <option value="">Select a person…</option>
                        {validParticipants.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName ?? "Unknown"}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex-1 overflow-auto p-3 space-y-3 min-h-0">
                    {chatChannel === "room" &&
                      chatMessages.map((msg, i) => {
                        const mine = msg.participantId === participantId;
                        return (
                          <div
                            key={`${msg.timestamp}-${i}`}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[88%] rounded-2xl px-3 py-2 ${
                                mine
                                  ? "bg-[#1a73e8] text-white rounded-br-md"
                                  : "bg-[#3c4043] text-white rounded-bl-md"
                              }`}
                            >
                              {!mine && (
                                <p className="text-[11px] text-[#8ab4f8] font-medium mb-0.5">
                                  {msg.displayName}
                                </p>
                              )}
                              <p className="text-sm break-words">{msg.message}</p>
                            </div>
                          </div>
                        );
                      })}
                    {chatChannel === "direct" &&
                      (dmPeerId ? (
                        directThread.map((msg, i) => {
                          const mine = msg.fromParticipantId === participantId;
                          return (
                            <div
                              key={`${msg.timestamp}-${i}`}
                              className={`flex ${mine ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[88%] rounded-2xl px-3 py-2 ${
                                  mine
                                    ? "bg-[#1a73e8] text-white rounded-br-md"
                                    : "bg-[#3c4043] text-white rounded-bl-md"
                                }`}
                              >
                                {!mine && (
                                  <p className="text-[11px] text-[#8ab4f8] font-medium mb-0.5">
                                    {msg.displayName}
                                  </p>
                                )}
                                <p className="text-xs text-white/55 mb-1">Direct message</p>
                                <p className="text-sm break-words">{msg.message}</p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-white/45 text-center py-6">
                          Choose someone to message privately. Only you two will see these messages.
                        </p>
                      ))}
                    <div ref={chatEndRef} />
                  </div>
                  <form
                    className="p-3 border-t border-white/[0.08] shrink-0"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const text = chatInput.trim();
                      if (!text) return;
                      if (chatChannel === "direct") {
                        if (!dmPeerId) return;
                        sendPrivateChatMessage(dmPeerId, text);
                      } else {
                        sendChatMessage(text);
                      }
                      setChatInput("");
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={
                        chatChannel === "direct" && !dmPeerId
                          ? "Select a person first…"
                          : chatChannel === "direct"
                            ? `Message ${validParticipants.find((p) => p.id === dmPeerId)?.displayName ?? ""}…`
                            : "Send a message to everyone…"
                      }
                      disabled={
                        chatChannel === "direct" && !dmPeerId
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-[#3c4043] text-white text-sm placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]/50 disabled:opacity-50"
                    />
                  </form>
                </>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* Meet/Zoom-style floating control bar */}
      <footer className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center justify-center gap-0.5 px-2 sm:px-4 py-2 rounded-full bg-[#3c4043]/98 backdrop-blur-md border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.45)] max-w-[calc(100vw-1rem)] [&_svg]:w-5 [&_svg]:h-5">
        <button
          type="button"
          onClick={toggleAudio}
          className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
            isAudioMuted
              ? "bg-[#ea4335] hover:bg-[#f55]"
              : "hover:bg-white/10"
          } text-white`}
          title={isAudioMuted ? "Unmute" : "Mute"}
        >
          <MicIcon muted={isAudioMuted} />
          <span className="text-[9px] sm:text-[10px] text-white/90 leading-none">
            {isAudioMuted ? "Unmute" : "Mute"}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleVideo}
          className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
            isVideoMuted
              ? "bg-[#ea4335] hover:bg-[#f55]"
              : "hover:bg-white/10"
          } text-white`}
          title={isVideoMuted ? "Start video" : "Stop video"}
        >
          <VideoIcon muted={isVideoMuted} />
          <span className="text-[9px] sm:text-[10px] text-white/90 leading-none">
            {isVideoMuted ? "Video" : "Video"}
          </span>
        </button>
        <button
          type="button"
          onClick={toggleScreenShare}
          className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
            isScreenSharing ? "bg-[#f9ab00] text-[#202124]" : "hover:bg-white/10 text-white"
          }`}
          title={isScreenSharing ? "Stop presenting" : "Present screen"}
        >
          <ScreenShareIcon sharing={isScreenSharing} />
          <span className="text-[9px] sm:text-[10px] leading-none opacity-95">
            Share
          </span>
        </button>
        <div className="w-px h-8 bg-white/15 mx-0.5 hidden sm:block" aria-hidden />
        <button
          type="button"
          onClick={() => {
            setPanelTab(panelTab === "chat" ? "none" : "chat");
            if (panelTab !== "chat") setChatNotification(null);
          }}
          className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
            panelTab === "chat" ? "bg-[#1a73e8]/90" : "hover:bg-white/10"
          } text-white`}
          title="Chat & direct messages"
        >
          <ChatIcon />
          <span className="text-[9px] sm:text-[10px] leading-none">Chat</span>
        </button>
        <div className="relative" ref={reactionPickerRef}>
          <button
            type="button"
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
              showReactionPicker ? "bg-white/15" : "hover:bg-white/10"
            } text-white`}
            title="Send emoji to everyone"
          >
            <ReactionIcon />
            <span className="text-[9px] sm:text-[10px] leading-none">React</span>
          </button>
          {showReactionPicker && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-wrap gap-1 justify-center max-w-[240px] p-3 bg-[#2d2d2d] rounded-2xl shadow-2xl z-[60] border border-white/10">
              {REACTIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    handleSendReaction(r);
                    setShowReactionPicker(false);
                  }}
                  className="text-2xl hover:scale-110 transition p-1.5 rounded-lg hover:bg-white/10"
                >
                  {r}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() =>
            setPanelTab(panelTab === "participants" ? "none" : "participants")
          }
          className={`flex flex-col items-center gap-0.5 px-2.5 sm:px-4 py-1.5 rounded-full transition min-w-[52px] ${
            panelTab === "participants" ? "bg-[#1a73e8]/90" : "hover:bg-white/10"
          } text-white`}
          title="People in call"
        >
          <PeopleIcon />
          <span className="text-[9px] sm:text-[10px] leading-none">People</span>
        </button>
        <div className="w-px h-8 bg-white/15 mx-0.5 hidden sm:block" aria-hidden />
        <Link
          href="/"
          onClick={leaveRoom}
          className="flex flex-col items-center gap-0.5 px-3 sm:px-5 py-1.5 rounded-full bg-[#ea4335] hover:bg-[#f55] text-white transition min-w-[56px]"
          title="Leave call"
        >
          <PhoneOffIcon />
          <span className="text-[9px] sm:text-[10px] leading-none">Leave</span>
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
