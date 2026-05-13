import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
    },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    role: {
        type: String,
        enum: ["student", "teacher", "admin"],
        required: true,
        index: true,
    },
}, { timestamps: true });
userSchema.index({ email: 1 }, { unique: true });
export const User = mongoose.models.User ?? mongoose.model("User", userSchema);
//# sourceMappingURL=user.model.js.map