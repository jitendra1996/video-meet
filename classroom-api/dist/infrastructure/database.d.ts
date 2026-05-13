/** Import models so they register with Mongoose when connection opens. */
import "../modules/users/user.model.js";
import "../modules/live-class/live-class.model.js";
import "../modules/attendance/attendance.model.js";
import "../modules/chat/chat-message.model.js";
import "../modules/recording/recording.model.js";
import "../modules/notifications/notification.model.js";
export declare function connectDatabase(): Promise<void>;
export declare function disconnectDatabase(): Promise<void>;
//# sourceMappingURL=database.d.ts.map