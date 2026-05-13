import { UserRepository } from "../users/user.repository.js";
import type { LoginInput, RegisterInput } from "./auth.dto.js";
import type { UserRole } from "../users/user.model.js";
export declare class AuthService {
    private readonly users;
    constructor(users?: UserRepository);
    private resolveRole;
    register(input: RegisterInput): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: UserRole;
        };
    }>;
    login(input: LoginInput): Promise<{
        token: string;
        user: {
            id: string;
            email: string;
            name: string;
            role: UserRole;
        };
    }>;
}
//# sourceMappingURL=auth.service.d.ts.map