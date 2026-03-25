"use client";

/**
 * useVideoRoom Hook
 *
 * Manages the full video room lifecycle: socket connection, MediaSoup client,
 * local/remote streams, screen sharing, chat, reactions, and event handling.
 */

import { useRef, useState, useCallback } from "react";
import { createSocket } from "@/lib/socket";
import {
  MediaSoupRoomClient,
  type RemoteParticipant,
} from "@/lib/mediasoup-client";

export interface ChatMessage {
  participantId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export interface ReactionEvent {
  participantId: string;
  displayName: string;
  reaction: string;
  timestamp: number;
}

export interface UseVideoRoomOptions {
  roomId: string;
  displayName: string;
  videoDeviceId?: string;
  audioDeviceId?: string;
  onError?: (error: Error) => void;
  onChatMessageReceived?: (msg: ChatMessage) => void;
}

export interface UseVideoRoomReturn {
  localStream: MediaStream | null;
  remoteParticipants: RemoteParticipant[];
  participantId: string | null;
  isConnected: boolean;
  isInRoom: boolean;
  error: string | null;
  joinRoom: () => Promise<void>;
  leaveRoom: () => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  toggleScreenShare: () => Promise<void>;
  isVideoMuted: boolean;
  isAudioMuted: boolean;
  isScreenSharing: boolean;
  chatMessages: ChatMessage[];
  lastReaction: { reaction: string; displayName: string } | null;
  sendChatMessage: (message: string) => void;
  sendReaction: (reaction: string) => void;
  copyMeetingLink: () => Promise<void>;
  devices: { cameras: MediaDeviceInfo[]; mics: MediaDeviceInfo[] };
  setVideoDevice: (deviceId: string) => void;
  setAudioDevice: (deviceId: string) => void;
}

export function useVideoRoom({
  roomId,
  displayName,
  videoDeviceId,
  audioDeviceId,
  onError,
  onChatMessageReceived,
}: UseVideoRoomOptions): UseVideoRoomReturn {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<
    RemoteParticipant[]
  >([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [lastReaction, setLastReaction] = useState<{
    reaction: string;
    displayName: string;
  } | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
  }>({ cameras: [], mics: [] });

  const socketRef = useRef<ReturnType<typeof createSocket> | null>(null);
  const clientRef = useRef<MediaSoupRoomClient | null>(null);
  const isJoiningRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const videoDeviceIdRef = useRef<string>("");
  const audioDeviceIdRef = useRef<string>("");
  const isScreenSharingRef = useRef(false);

  const updateRemoteParticipants = useCallback(() => {
    const client = clientRef.current;
    if (client) {
      setRemoteParticipants(client.getRemoteParticipants());
    }
  }, []);

  const joinRoom = useCallback(async () => {
    if (isJoiningRef.current || isInRoom) return;
    isJoiningRef.current = true;
    setError(null);
    try {
      const socket = createSocket();
      socketRef.current = socket;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(
            new Error(
              "Connection timeout. Is the server running on port 3001? Run: npm run dev:server"
            )
          );
        }, 15000);
        socket.on("connect", () => {
          clearTimeout(timeout);
          setIsConnected(true);
          resolve();
        });
        socket.on("connect_error", (err) => {
          clearTimeout(timeout);
          reject(
            new Error(
              err.message ||
                "Cannot connect to server. Ensure both frontend (npm run dev) and server (npm run dev:server) are running."
            )
          );
        });
        if (socket.connected) {
          clearTimeout(timeout);
          resolve();
        }
      });

      const roomIdClean = roomId.trim() || `room-${Date.now()}`;
      const client = new MediaSoupRoomClient(
        socket,
        roomIdClean,
        "",
        displayName
      );
      clientRef.current = client;

      const joinResponse = await client.join();
      setParticipantId(joinResponse.participantId);

      const deviceId = videoDeviceId || videoDeviceIdRef.current;
      videoDeviceIdRef.current = deviceId;
      audioDeviceIdRef.current = audioDeviceId || audioDeviceIdRef.current;
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        ...(deviceId && { deviceId: { exact: deviceId } }),
      };
      const micId = audioDeviceIdRef.current;
      const audioConstraints: MediaTrackConstraints | boolean = micId
        ? { deviceId: { exact: micId } }
        : true;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: audioConstraints,
      });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => {
        if (!isScreenSharingRef.current) {
          const vidId = clientRef.current?.getVideoProducerId();
          if (vidId) clientRef.current?.closeProducer(vidId);
          setIsVideoMuted(true);
        }
      });
      stream.getAudioTracks()[0]?.addEventListener("ended", () => {
        const { audio } = clientRef.current?.getProducerIds() ?? {};
        if (audio) clientRef.current?.closeProducer(audio);
        setIsAudioMuted(true);
      });
      setLocalStream(stream);
      cameraStreamRef.current = stream;

      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices({
        cameras: deviceList.filter((d) => d.kind === "videoinput"),
        mics: deviceList.filter((d) => d.kind === "audioinput"),
      });

      await client.sendMedia(stream);
      setIsInRoom(true);

      client.onNewParticipant((data: { id?: string; displayName?: string; producers?: Array<{ id: string; kind: "audio" | "video" }> }) => {
        const id = data?.id;
        if (!id) return;
        client.addRemoteParticipant(
          id,
          data.displayName ?? "Unknown",
          data.producers ?? []
        );
        updateRemoteParticipants();
      });

      client.onProducerCreated(({ participantId, producer }) => {
        client.handleNewProducer(
          participantId,
          producer.id,
          producer.kind,
          updateRemoteParticipants
        );
      });

      client.onParticipantLeft(({ participantId }) => {
        client.removeRemoteParticipant(participantId);
        updateRemoteParticipants();
      });

      client.onProducerClosed(({ participantId, producerId }) => {
        client.handleProducerClosed(
          participantId,
          producerId,
          updateRemoteParticipants
        );
      });

      client.onChatMessage((msg) => {
        setChatMessages((prev) => [...prev, msg]);
        onChatMessageReceived?.(msg);
      });

      client.onReaction((data) => {
        setLastReaction({ reaction: data.reaction, displayName: data.displayName });
        setTimeout(() => setLastReaction(null), 2000);
      });

      updateRemoteParticipants();
      setTimeout(updateRemoteParticipants, 300);
      setTimeout(updateRemoteParticipants, 1000);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj.message);
      onError?.(errorObj);
    } finally {
      isJoiningRef.current = false;
    }
  }, [roomId, displayName, isInRoom, onError, onChatMessageReceived, updateRemoteParticipants]);

  const leaveRoom = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    clientRef.current?.leave();
    localStream?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setLocalStream(null);
    setRemoteParticipants([]);
    setParticipantId(null);
    setIsInRoom(false);
    setIsScreenSharing(false);
    setChatMessages([]);
    socketRef.current?.disconnect();
    socketRef.current = null;
    clientRef.current = null;
  }, [localStream]);

  const toggleVideo = useCallback(async () => {
    const client = clientRef.current;
    let stream = cameraStreamRef.current ?? localStream;
    if (!client || !stream) return;
    if (isScreenSharingRef.current) return;

    let videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    if (isVideoMuted) {
      try {
        if (videoTrack.readyState === "ended") {
          const deviceId = videoDeviceIdRef.current;
          const videoConstraints: MediaTrackConstraints = {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            ...(deviceId && { deviceId: { exact: deviceId } }),
          };
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraints,
            audio: false,
          });
          const newVideoTrack = newStream.getVideoTracks()[0];
          const audioTrack = stream.getAudioTracks()[0];
          const mergedStream = new MediaStream([
            newVideoTrack,
            ...(audioTrack ? [audioTrack] : []),
          ]);
          stream.getVideoTracks().forEach((t) => t.stop());
          cameraStreamRef.current = mergedStream;
          setLocalStream(mergedStream);
          videoTrack = newVideoTrack;
        }
        await client.produceTrack(videoTrack);
        setIsVideoMuted(false);
      } catch (err) {
        console.error("Failed to enable video:", err);
      }
    } else {
      const videoProducerId = client.getVideoProducerId();
      if (videoProducerId) {
        await client.closeProducer(videoProducerId);
        setIsVideoMuted(true);
      }
    }
  }, [localStream, isVideoMuted]);

  const toggleAudio = useCallback(async () => {
    const client = clientRef.current;
    let stream = cameraStreamRef.current ?? localStream;
    if (!client || !stream) return;

    let audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) return;

    if (isAudioMuted) {
      try {
        if (audioTrack.readyState === "ended") {
          const micId = audioDeviceIdRef.current;
          const audioConstraints: MediaTrackConstraints | boolean = micId
            ? { deviceId: { exact: micId } }
            : true;
          const newStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: audioConstraints,
          });
          const newAudioTrack = newStream.getAudioTracks()[0];
          const videoTrack = stream.getVideoTracks()[0];
          const mergedStream = new MediaStream([
            ...(videoTrack ? [videoTrack] : []),
            newAudioTrack,
          ]);
          stream.getAudioTracks().forEach((t) => t.stop());
          cameraStreamRef.current = mergedStream;
          setLocalStream(mergedStream);
          audioTrack = newAudioTrack;
        }
        await client.produceTrack(audioTrack);
        setIsAudioMuted(false);
      } catch (err) {
        console.error("Failed to enable audio:", err);
      }
    } else {
      const { audio } = client.getProducerIds();
      if (audio) {
        await client.closeProducer(audio);
        setIsAudioMuted(true);
      }
    }
  }, [localStream, isAudioMuted]);

  const stopScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !cameraStreamRef.current) return;
    const videoProducerId = client.getVideoProducerId();
    if (videoProducerId) {
      await client.closeProducer(videoProducerId);
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    const cameraStream = cameraStreamRef.current;
    const videoTrack = cameraStream.getVideoTracks()[0];
    if (videoTrack) {
      await client.sendMedia(cameraStream);
    }
    setLocalStream(cameraStream);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;
  }, []);

  const toggleScreenShare = useCallback(async () => {
    const client = clientRef.current;
    if (!client || !cameraStreamRef.current) return;

    if (isScreenSharingRef.current) {
      await stopScreenShare();
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: "monitor" },
        audio: false,
      });
      screenStreamRef.current = screenStream;
      isScreenSharingRef.current = true;
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0].onended = () => {
        if (isScreenSharingRef.current) stopScreenShare();
      };

      const videoProducerId = client.getVideoProducerId();
      if (videoProducerId) {
        await client.closeProducer(videoProducerId);
      }

      const audioTrack = cameraStreamRef.current!.getAudioTracks()[0];
      const mixedStream = new MediaStream([
        screenStream.getVideoTracks()[0],
        ...(audioTrack ? [audioTrack] : []),
      ]);
      await client.sendMedia(mixedStream);
      setLocalStream(mixedStream);
    } catch (err) {
      console.error("Screen share failed:", err);
    }
  }, [stopScreenShare]);

  const sendChatMessage = useCallback((message: string) => {
    clientRef.current?.sendChatMessage(message);
  }, []);

  const sendReaction = useCallback((reaction: string) => {
    clientRef.current?.sendReaction(reaction);
  }, []);

  const copyMeetingLink = useCallback(async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/room?roomId=${encodeURIComponent(roomId)}&name=${encodeURIComponent(displayName)}`;
    await navigator.clipboard.writeText(url);
  }, [roomId, displayName]);

  const setVideoDevice = useCallback((deviceId: string) => {
    videoDeviceIdRef.current = deviceId;
  }, []);

  const setAudioDevice = useCallback((deviceId: string) => {
    audioDeviceIdRef.current = deviceId;
  }, []);

  return {
    localStream,
    remoteParticipants,
    participantId,
    isConnected,
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
    devices,
    setVideoDevice,
    setAudioDevice,
  };
}
