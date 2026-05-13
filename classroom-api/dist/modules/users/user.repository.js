import { User } from "./user.model.js";
export class UserRepository {
    async findById(id) {
        return User.findById(id).exec();
    }
    async findByEmail(email, withPassword = false) {
        const q = User.findOne({ email: email.toLowerCase() });
        if (withPassword)
            q.select("+passwordHash");
        return q.exec();
    }
    async create(data) {
        return User.create(data);
    }
    async list(filter = {}, limit = 100) {
        return User.find(filter).limit(limit).sort({ createdAt: -1 }).exec();
    }
}
//# sourceMappingURL=user.repository.js.map