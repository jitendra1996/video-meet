"use client";

/**
 * Landing Page - Join a Video Conference
 *
 * Allows users to enter their name, room ID, and select devices before joining.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [roomId, setRoomId] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    mics: MediaDeviceInfo[];
  }>({ cameras: [], mics: [] });
  const [videoDeviceId, setVideoDeviceId] = useState("");
  const [audioDeviceId, setAudioDeviceId] = useState("");

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((list) => {
      const cameras = list.filter((d) => d.kind === "videoinput");
      const mics = list.filter((d) => d.kind === "audioinput");
      setDevices({ cameras, mics });
      setVideoDeviceId((prev) => prev || cameras[0]?.deviceId || "");
      setAudioDeviceId((prev) => prev || mics[0]?.deviceId || "");
    });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const name = displayName.trim();
    if (!name) {
      setError("Please enter your name");
      return;
    }

    const room = roomId.trim() || `room-${Date.now()}`;
    const params = new URLSearchParams({
      roomId: room,
      name,
    });
    if (videoDeviceId) params.set("videoDeviceId", videoDeviceId);
    if (audioDeviceId) params.set("audioDeviceId", audioDeviceId);
    router.push(`/room?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Video Meet
          </h1>
          <p className="text-slate-400 text-lg">
            Join or create a video conference room
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-2xl p-8 shadow-2xl"
        >
          <div className="space-y-6">
            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Your Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor="roomId"
                className="block text-sm font-medium text-slate-300 mb-2"
              >
                Room ID <span className="text-slate-500">(optional)</span>
              </label>
              <input
                id="roomId"
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Leave empty to create new room"
                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="text-sm text-emerald-400 hover:text-emerald-300"
              >
                {showSettings ? "▼" : "▶"} Camera & microphone settings
              </button>
              {showSettings && (
                <div className="mt-3 space-y-3 p-3 bg-slate-900/50 rounded-xl">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Camera
                    </label>
                    <select
                      value={videoDeviceId}
                      onChange={(e) => setVideoDeviceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 rounded text-white text-sm"
                    >
                      {devices.cameras.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Camera ${devices.cameras.indexOf(d) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Microphone
                    </label>
                    <select
                      value={audioDeviceId}
                      onChange={(e) => setAudioDeviceId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 rounded text-white text-sm"
                    >
                      {devices.mics.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `Mic ${devices.mics.indexOf(d) + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Join Meeting
            </button>
          </div>
        </form>

        <p className="text-center text-slate-500 text-sm mt-6">
          <a href="/login" className="text-emerald-400 hover:underline">
            Live classes (100ms)
          </a>
          <span className="mx-2">·</span>
          Powered by WebRTC • MediaSoup SFU
        </p>
      </div>
    </div>
  );
}
