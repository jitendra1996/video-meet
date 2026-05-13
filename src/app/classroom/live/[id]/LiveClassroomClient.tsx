"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  HMSRoomProvider,
  useHMSActions,
  useHMSStore,
  useParticipants,
  usePreviewJoin,
  useVideo,
  useScreenShare,
  useAVToggle,
} from "@100mslive/react-sdk";
import { selectLocalPeer, selectVideoTrackByPeerID } from "@100mslive/hms-video-store";
import { useAppSelector } from "@/store/hooks";
import { classroomFetch } from "@/lib/classroom-api";
import { createClassroomSocket } from "@/lib/classroom-socket";
import { bumpUnread, clearUnread } from "@/store/slices/classroomSlice";
import { useAppDispatch } from "@/store/hooks";
import type { Socket } from "socket.io-client";

type ChatMsg = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
};

function PeerVideoTile({ peerId, label }: { peerId: string; label: string }) {
  const track = useHMSStore(selectVideoTrackByPeerID(peerId));
  const trackId = track
    ? (track as unknown as { trackId: string }).trackId
    : undefined;
  const { videoRef } = useVideo({
    trackId,
    attach: !!track,
  });
  return (
    <div className="relative overflow-hidden rounded-lg bg-zinc-900 aspect-video">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        playsInline
      />
      <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
        {label}
      </div>
    </div>
  );
}

function LiveRoomInner({
  hmsToken,
  displayName,
  liveClassId,
  role,
}: {
  hmsToken: string;
  displayName: string;
  liveClassId: string;
  role: string;
}) {
  const actions = useHMSActions();
  const { participants, peerCount } = useParticipants();
  const localPeer = useHMSStore(selectLocalPeer);
  const nq = localPeer
    ? (localPeer as unknown as { networkQuality?: number }).networkQuality
    : undefined;
  const { isLocalAudioEnabled, isLocalVideoEnabled, toggleAudio, toggleVideo } =
    useAVToggle();
  const { amIScreenSharing, toggleScreenShare } = useScreenShare();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const jwt = useAppSelector((s) => s.auth.token);

  const { join, preview, isConnected } = usePreviewJoin({
    token: hmsToken,
    name: displayName,
    captureNetworkQualityInPreview: true,
    autoManageVideo: true,
  });

  const [joining, setJoining] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [raised, setRaised] = useState<string[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!jwt) return;
    const s = createClassroomSocket(jwt);
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [jwt]);

  useEffect(() => {
    if (!socket || !jwt) return;
    const onConnect = () => {
      socket.emit("classroom:join", liveClassId, () => undefined);
    };
    socket.on("connect", onConnect);
    socket.on("chat:message", (m: ChatMsg) => {
      setMessages((prev) => [...prev, m]);
      dispatch(bumpUnread(liveClassId));
    });
    socket.on(
      "chat:typing",
      (p: { userId: string; typing: boolean }) => {
        setTyping((t) => ({ ...t, [p.userId]: p.typing }));
      }
    );
    socket.on("hand:raised", (p: { userId: string }) => {
      setRaised((r) => (r.includes(p.userId) ? r : [...r, p.userId]));
    });
    socket.on("mod:mute_all", () => {
      if (!isLocalAudioEnabled) return;
      void toggleAudio?.();
    });
    if (socket.connected) onConnect();
    const ping = setInterval(() => {
      socket.emit("attendance:ping", liveClassId);
    }, 60_000);
    return () => {
      clearInterval(ping);
      socket.emit("classroom:leave", liveClassId);
      socket.off("connect", onConnect);
      socket.removeAllListeners("chat:message");
      socket.removeAllListeners("chat:typing");
      socket.removeAllListeners("hand:raised");
      socket.removeAllListeners("mod:mute_all");
    };
  }, [
    socket,
    jwt,
    liveClassId,
    dispatch,
    isLocalAudioEnabled,
    toggleAudio,
  ]);

  useEffect(() => {
    dispatch(clearUnread(liveClassId));
  }, [dispatch, liveClassId]);

  const runPreviewJoin = useCallback(async () => {
    setJoining(true);
    try {
      await preview();
      await join();
    } finally {
      setJoining(false);
    }
  }, [preview, join]);

  const sendChat = () => {
    if (!socket || !chatInput.trim()) return;
    socket.emit("chat:send", { liveClassId, body: chatInput }, (err: Error | null) => {
      if (err) console.error(err);
    });
    setChatInput("");
    socket.emit("chat:typing", { liveClassId, typing: false });
  };

  const onTeacherMuteAll = () => {
    socket?.emit("mod:mute_all", liveClassId);
  };

  const onRemovePeer = async (peerId: string) => {
    if (!jwt) return;
    try {
      await classroomFetch(`/api/v1/live-classes/${liveClassId}/participants/remove`, {
        method: "POST",
        token: jwt,
        body: JSON.stringify({ peerId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const leaveClass = async () => {
    try {
      if (jwt) {
        await classroomFetch(`/api/v1/live-classes/${liveClassId}/leave`, {
          method: "POST",
          token: jwt,
        });
      }
    } catch {
      /* still leave UI */
    }
    try {
      await actions.leave();
    } catch {
      /* */
    }
    router.push(role === "teacher" || role === "admin" ? "/dashboard/teacher" : "/dashboard/student");
  };

  const tiles = useMemo(
    () =>
      participants.map((p) => (
        <PeerVideoTile key={p.id} peerId={p.id} label={p.name} />
      )),
    [participants]
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100 md:flex-row">
      <div className="flex flex-1 flex-col gap-3 p-4">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h1 className="text-lg font-semibold">Live class</h1>
            <p className="text-xs text-zinc-400">
              Participants: {peerCount}
              {nq !== undefined && nq >= 0 && (
                <span className="ml-2 rounded bg-zinc-800 px-2 py-0.5">
                  Network: {nq}/5
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {!isConnected && (
              <button
                type="button"
                onClick={() => void runPreviewJoin()}
                disabled={joining}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
              >
                {joining ? "Connecting…" : "Connect"}
              </button>
            )}
            <button
              type="button"
              onClick={() => void toggleAudio?.()}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              {isLocalAudioEnabled ? "Mute mic" : "Unmute mic"}
            </button>
            <button
              type="button"
              onClick={() => void toggleVideo?.()}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              {isLocalVideoEnabled ? "Camera off" : "Camera on"}
            </button>
            <button
              type="button"
              onClick={() => void toggleScreenShare?.()}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              {amIScreenSharing ? "Stop share" : "Share screen"}
            </button>
            {(role === "teacher" || role === "admin") && (
              <button
                type="button"
                onClick={onTeacherMuteAll}
                className="rounded-lg bg-amber-700 px-3 py-2 text-sm"
              >
                Mute all (signal)
              </button>
            )}
            <button
              type="button"
              onClick={() => void leaveClass()}
              className="rounded-lg bg-red-800 px-3 py-2 text-sm"
            >
              Leave
            </button>
          </div>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiles}
        </div>

        {(role === "teacher" || role === "admin") && (
          <section className="rounded-lg border border-zinc-800 p-3">
            <h2 className="mb-2 text-sm font-medium text-zinc-300">Participants</h2>
            <ul className="space-y-1 text-sm">
              {participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded bg-zinc-900/80 px-2 py-1"
                >
                  <span>
                    {p.name}{" "}
                    {raised.includes(p.customerUserId ?? "") && (
                      <span className="text-amber-400">✋</span>
                    )}
                  </span>
                  {!p.isLocal && (
                    <button
                      type="button"
                      className="text-xs text-red-400"
                      onClick={() => void onRemovePeer(p.id)}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside className="flex w-full flex-col border-t border-zinc-800 bg-zinc-900/40 md:w-80 md:border-l md:border-t-0">
        <div className="border-b border-zinc-800 p-3">
          <h2 className="text-sm font-medium">Chat</h2>
          {Object.entries(typing).some(([, v]) => v) && (
            <p className="text-xs text-zinc-500">Someone is typing…</p>
          )}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
          {messages.map((m) => (
            <div key={m.id} className="rounded bg-zinc-900 px-2 py-1">
              <div className="text-xs text-zinc-500">
                {new Date(m.createdAt).toLocaleTimeString()}
              </div>
              <div>{m.body}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t border-zinc-800 p-3">
          <input
            className="flex-1 rounded bg-zinc-900 px-2 py-2 text-sm outline-none ring-1 ring-zinc-700"
            value={chatInput}
            placeholder="Message…"
            onChange={(e) => {
              setChatInput(e.target.value);
              socket?.emit("chat:typing", {
                liveClassId,
                typing: e.target.value.length > 0,
              });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") sendChat();
            }}
          />
          <button
            type="button"
            onClick={sendChat}
            className="rounded bg-emerald-700 px-3 py-2 text-sm"
          >
            Send
          </button>
        </div>
        {role === "student" && (
          <div className="border-t border-zinc-800 p-3">
            <button
              type="button"
              className="w-full rounded bg-zinc-800 py-2 text-sm"
              onClick={() => socket?.emit("hand:raise", liveClassId)}
            >
              Raise hand
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function LiveClassroomClient() {
  const params = useParams();
  const id = params.id as string;
  const token = useAppSelector((s) => s.auth.token);
  const user = useAppSelector((s) => s.auth.user);
  const [hmsToken, setHmsToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await classroomFetch<{ token: string; roomId: string }>(
          `/api/v1/live-classes/${id}/join`,
          { method: "POST", token }
        );
        if (!cancelled) setHmsToken(data.token);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Join failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user, id]);

  if (!token || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <a href="/login" className="text-emerald-400 underline">
          Sign in
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-red-300">
        {error}
      </div>
    );
  }

  if (!hmsToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
        Preparing classroom…
      </div>
    );
  }

  return (
    <HMSRoomProvider leaveOnUnload>
      <LiveRoomInner
        hmsToken={hmsToken}
        displayName={user.name}
        liveClassId={id}
        role={user.role}
      />
    </HMSRoomProvider>
  );
}
