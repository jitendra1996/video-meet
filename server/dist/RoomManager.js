"use strict";
/**
 * Room Manager
 *
 * Manages video conference rooms and their lifecycle.
 * Creates rooms on-demand and cleans up empty rooms.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomManager = void 0;
const Room_js_1 = require("./Room.js");
class RoomManager {
    rooms = new Map();
    workerPool;
    constructor(workerPool) {
        this.workerPool = workerPool;
    }
    /**
     * Get or create a room.
     */
    async getOrCreateRoom(roomId) {
        let room = this.rooms.get(roomId);
        if (!room) {
            const router = await this.workerPool.createRouter();
            room = new Room_js_1.Room(roomId, router);
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
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }
    /**
     * Remove a room if it's empty.
     */
    async cleanupRoom(roomId) {
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
    get roomCount() {
        return this.rooms.size;
    }
}
exports.RoomManager = RoomManager;
