import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt'; // Import JwtService
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema'; // Import User interface
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'; // For generating OTP
import * as nodemailer from 'nodemailer'; // For sending OTP emails
import { MailerService } from '@nestjs-modules/mailer';
import * as CryptoJS from 'crypto-js';
@Injectable()
export class AuthService {
  // Inject JwtService and UserModel into the constructor
  constructor(
    private readonly jwtService: JwtService, // Inject JwtService
    private readonly mailerService: MailerService,
    @InjectModel('User') private readonly userModel: Model<User>, // Inject UserModel here
  ) {}

  async generateAccessToken(user: User): Promise<any> {
    const payload = { email: user.email, sub: user._id };
    const token = await this.jwtService.signAsync(payload);

    return token; // Ensure `JwtService` is correctly configured.
  }

  async saveAccessToken(userId: string, accessToken: string): Promise<void> {
    console.log('SAVING: ', accessToken);

    // Ensure you update the user's accessToken in the database
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { accessToken } }, // Use $set to update the accessToken field
    );
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async validateUser(email: string, encryptedPassword: string): Promise<any> {
    const user = await this.findUserByEmail(email);

    if (!user) return null;

    // Decrypt the password
    const secretKey = 'your_private_key';
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
    const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

    if (!decryptedPassword) {
      throw new UnauthorizedException('Failed to decrypt password');
    }

    // Compare the decrypted password with the hashed password in DB
    const isPasswordValid = await bcrypt.compare(
      decryptedPassword,
      user.password,
    );

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user._id };

    // Generate the access token
    const accessToken = this.jwtService.sign(payload);

    // Save the access token in the user model
    await this.userModel.findByIdAndUpdate(
      user._id,
      { accessToken },
      { new: true },
    );

    // Return the token and user ID
    return {
      access_token: accessToken,
      userId: user._id,
    };
  }

  async register(
    email: string,
    encryptedPassword: string,
    username: string,
    avatar: string,
    university: string,
  ) {
    try {
      const secretKey = 'your_private_key';
      const bytes = CryptoJS.AES.decrypt(encryptedPassword, secretKey);
      const decryptedPassword = bytes.toString(CryptoJS.enc.Utf8);

      if (!decryptedPassword) {
        throw new Error('Failed to decrypt password');
      }

      const hashedPassword = await bcrypt.hash(decryptedPassword, 10);

      // Check if a user with the same email or username already exists
      const existingUser = await this.userModel.findOne({
        $or: [{ email }, { username }],
      });
      if (existingUser) {
        if (existingUser.email === email) {
          throw new Error('Email is already in use');
        }
        if (existingUser.username === username) {
          throw new Error('Username is already in use');
        }
      }

      const newUser = new this.userModel({
        email,
        password: hashedPassword,
        username,
        avatar,
        university,
      });
      await newUser.save();

      // Generate JWT access token
      const payload = { userId: newUser._id, username: newUser.username };
      const accessToken = this.jwtService.sign(payload);

      // Save the accessToken in the database if required
      newUser.accessToken = accessToken;
      await newUser.save();

      return {
        message: 'User registered successfully',
        accessToken,
        userId: newUser._id,
      };
    } catch (error) {
      throw new Error(error.message || 'Registration failed');
    }
  }

  // Create OTP session
  async createOtpSession(user: any) {
    const otp = crypto.randomInt(100000, 999999).toString(); // Generate a 6-digit OTP
    user.otp = otp; // Store OTP in the user schema
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000; // OTP expires in 10 minutes
    await user.save();
    return { otp }; // Return OTP for testing purposes (use in real-world app)
  }

  // Send OTP to email
  async sendOtpEmail(email: string, otp: string): Promise<void> {
    await this.mailerService.sendMail({
      to: email, // Recipient's email
      from: 'khelan05@gmail.com', // Sender's email
      subject: 'Password Reset OTP', // Email subject
      text: `Your OTP for password reset is: ${otp}`, // Plain text body
      html: `<p>Your OTP for password reset is: <strong>${otp}</strong></p>`, // HTML body
    });
  }

  // Verify OTP
  async verifyOtp(email: string, otp: string) {
    const user = await this.findUserByEmail(email);

    // Validate OTP and expiration
    if (!user || user.otp !== otp || user.otpExpiresAt < Date.now()) {
      return false;
    }

    // Set `verifiedOtp` flag to true after successful OTP verification
    user.verifiedOtp = true;
    await user.save();

    return true;
  }

  // Reset Password
  async resetPassword(email: string, newPassword: string) {
    const user = await this.findUserByEmail(email);

    // Check if the user exists and if `verifiedOtp` flag is true
    if (!user || !user.verifiedOtp) return false;

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear OTP-related fields
    user.password = hashedPassword;
    user.verifiedOtp = false; // Reset the flag
    user.otp = undefined;
    user.otpExpiresAt = undefined;

    await user.save();
    return true;
  }

  // Link Google account
  async linkGoogleAccount(user: any, googleUser: any) {
    user.googleId = googleUser.id;
    user.googleToken = googleUser.token;
    user.isGoogleUser = true;
    await user.save();
  }

  // Create a new user with Google login info
  async createUserWithGoogle(googleUser: any): Promise<User> {
    const newUser = new this.userModel({
      email: googleUser.email,
      googleId: googleUser.id,
      googleToken: googleUser.token,
      isGoogleUser: true,
    });
    return await newUser.save();
  }
}
