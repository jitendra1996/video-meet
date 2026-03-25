/**
 * Room Manager
 *
 * Manages video conference rooms and their lifecycle.
 * Creates rooms on-demand and cleans up empty rooms.
 */

import type { Router } from "mediasoup/types";
import { Room } from "./Room.js";
import { WorkerPool } from "./WorkerPool.js";

export class RoomManager {
  private rooms = new Map<string, Room>();
  private workerPool: WorkerPool;

  constructor(workerPool: WorkerPool) {
    this.workerPool = workerPool;
  }

  /**
   * Get or create a room.
   */
  async getOrCreateRoom(roomId: string): Promise<Room> {
    let room = this.rooms.get(roomId);

    if (!room) {
      const router = await this.workerPool.createRouter();
      room = new Room(roomId, router);
      this.rooms.set(roomId, room);

      // Cleanup when router closes
      router.on("workerclose", () => {
        this.rooms.delete(roomId);
      });

      console.log(`[RoomManager] Created room: ${roomId}`);
    }

    return room;
  }

  /**
   * Get an existing room.
   */
  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  /**
   * Remove a room if it's empty.
   */
  async cleanupRoom(roomId: string): Promise<void> {
    const room = this.rooms.get(roomId);
    if (room?.isEmpty) {
      room.router.close();
      this.rooms.delete(roomId);
      console.log(`[RoomManager] Cleaned up empty room: ${roomId}`);
    }
  }

  /**
   * Get total room count (for monitoring).
   */
  get roomCount(): number {
    return this.rooms.size;
  }
}
