import type { Types, UpdateQuery } from "mongoose";
import { type ILiveClass, type LiveClassStatus } from "./live-class.model.js";
export declare class LiveClassRepository {
    findById(id: string): Promise<ILiveClass | null>;
    create(data: Partial<ILiveClass>): Promise<ILiveClass>;
    updateById(id: string, patch: UpdateQuery<ILiveClass>): Promise<ILiveClass | null>;
    listForUser(userId: Types.ObjectId, role: string): Promise<ILiveClass[]>;
    setStatus(id: string, status: LiveClassStatus, extra?: Partial<ILiveClass>): Promise<ILiveClass | null>;
}
//# sourceMappingURL=live-class.repository.d.ts.map