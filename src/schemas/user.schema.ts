import { Schema, Document, model } from 'mongoose';

export interface User extends Document {
  email: string;
  password: string;
  googleId?: string;
  googleToken?: string;
  isGoogleUser?: boolean;
  otp?: string; // OTP field
  otpExpiresAt?: number; // OTP expiration time in milliseconds
  verifiedOtp?: boolean;
  accessToken?: string;
  username?: string;
  avatar?: string;
  university?: string;
  isRegistered?: boolean;
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
  university: { type: String, required: false }, // New university field
  isRegistered: { type: Boolean, default: false },
});

export const UserModel = model<User>('User', UserSchema);
