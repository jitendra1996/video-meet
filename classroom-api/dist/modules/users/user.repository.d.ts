import type { FilterQuery } from "mongoose";
import { type IUser, type UserRole } from "./user.model.js";
export declare class UserRepository {
    findById(id: string): Promise<IUser | null>;
    findByEmail(email: string, withPassword?: boolean): Promise<IUser | null>;
    create(data: {
        email: string;
        passwordHash: string;
        name: string;
        role: UserRole;
    }): Promise<IUser>;
    list(filter?: FilterQuery<IUser>, limit?: number): Promise<IUser[]>;
}
//# sourceMappingURL=user.repository.d.ts.map