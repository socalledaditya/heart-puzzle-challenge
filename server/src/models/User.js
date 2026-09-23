import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    rollNo: { type: String, required: true, unique: true, trim: true, uppercase: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    verified: { type: Boolean, default: false },
    otpHash: { type: String, select: false },
    otpExpires: Date,
    otpAttempts: { type: Number, default: 0 },
    otpSentAt: Date,
    banned: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 }, // bump to invalidate every issued token
  },
  { timestamps: true }
);

// Database-level guarantee: there can only ever be ONE admin.
userSchema.index({ role: 1 }, { unique: true, partialFilterExpression: { role: 'admin' } });

export const User = mongoose.model('User', userSchema);
