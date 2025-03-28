// user.schema.ts
import { Schema, Document, model } from 'mongoose';

export interface Operation {
  imageUrl: string;       // Original image URL
  description: string;
  processedUrl?: string;  // Processed image URL (optional initially)
}

export interface User extends Document {
  email: string;
  password: string;
  googleId?: string;
  googleToken?: string;
  isGoogleUser?: boolean;
  otp?: string;
  otpExpiresAt?: number;
  verifiedOtp?: boolean;
  accessToken?: string;
  username?: string;
  avatar?: string;
  university?: string;
  isRegistered?: boolean;
  isSuspended?: boolean;
  status?: string;
  gender?: string;
  operations?: Operation[];
}

export const UserSchema = new Schema<User>({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  googleId: { type: String, required: false },
  googleToken: { type: String, required: false },
  isGoogleUser: { type: Boolean, default: false },
  otp: { type: String, required: false },
  otpExpiresAt: { type: Number, required: false },
  verifiedOtp: { type: Boolean, default: false },
  accessToken: { type: String, required: false },
  username: { type: String, required: false, unique: true },
  avatar: { type: String, required: false },
  university: { type: String, required: false },
  isRegistered: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false },
  status: { type: String, required: false },
  gender: { type: String, required: false },
  operations: [
    {
      imageUrl: { type: String, required: true },
      description: { type: String, required: true },
      processedUrl: { type: String, required: false }, // New field
    },
  ],
});

export const UserModel = model<User>('User', UserSchema);