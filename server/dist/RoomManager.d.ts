/**
 * Room Manager
 *
 * Manages video conference rooms and their lifecycle.
 * Creates rooms on-demand and cleans up empty rooms.
 */
import { Room } from "./Room.js";
import { WorkerPool } from "./WorkerPool.js";
export declare class RoomManager {
    private rooms;
    private workerPool;
    constructor(workerPool: WorkerPool);
    /**
     * Get or create a room.
     */
    getOrCreateRoom(roomId: string): Promise<Room>;
    /**
     * Get an existing room.
     */
    getRoom(roomId: string): Room | undefined;
    /**
     * Remove a room if it's empty.
     */
    cleanupRoom(roomId: string): Promise<void>;
    /**
     * Get total room count (for monitoring).
     */
    get roomCount(): number;
}
//# sourceMappingURL=RoomManager.d.ts.map