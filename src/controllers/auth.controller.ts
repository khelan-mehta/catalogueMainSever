import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Get,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Res,
  Param,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { GoogleAuthGuard } from '../guards/google-auth.guard';
import { SendOtpDto } from 'src/dtos/sendOtps.dto';
import { ResetPasswordDto, VerifyOtpDto } from 'src/dtos/verifyOtp.dto';
import { log } from 'node:console';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/services/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  @Post('login')
  async login(@Body() loginDto: { email: string; password: string }) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(
    @Body()
    registerDto: {
      email: string;
      password: string;
      username: string;
      avatar: string;
      university: string;
    },
  ) {
    try {
      const response = await this.authService.register(
        registerDto.email,
        registerDto.password,
        registerDto.username,
        registerDto.avatar,
        registerDto.university,
      );
      return response; // Returning accessToken and userId
    } catch (error) {
      return { message: error.message };
    }
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    return { message: 'Redirecting to Google' };
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleLoginCallback(@Req() req, @Res() res: Response) {
    const googleUser = req.user; // This will contain Google profile info

    let user = await this.authService.findUserByEmail(googleUser.email);

    if (user) {
      // Link Google login info to existing account
      await this.authService.linkGoogleAccount(user, googleUser);
    } else {
      // Check if the user is not registered before creating
      if (!googleUser.isRegistered) {
        // Redirect with a message query parameter
        return res.redirect(
          'https://bh-frontend-jbps.vercel.app/auth/register?message=kindly%20register%20first',
        );
      }

      // Create a new user with Google info if registered
      user = await this.authService.createUserWithGoogle(googleUser);
    }

    // Generate access token
    const accessToken = this.authService.generateAccessToken(user);

    // Save the access token in the database
    await this.authService.saveAccessToken(user.id, await accessToken);

    // Redirect to the appropriate page
    const redirectUrl = `https://bh-frontend-jbps.vercel.app/dashboard?access_token=${await accessToken}&userId=${user.id}`;
    return res.redirect(redirectUrl);
  }

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  getProtectedResource() {
    return { message: 'This is a protected route' };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getUserInfo(@Param('id') userId: string, @Res() res: Response) {
    // The controller logic for fetching user info
    try {
      const user = await this.userService.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If needed, you can perform additional logic here before sending the response
      // Send the user data and the new access token in the response
      return res.status(200).json({
        message: 'User info retrieved successfully.',
        user,
        newAccessToken: user.accessToken, // Retrieve from response locals
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  @Post('forgot-password')
  async forgotPassword(@Body() sendOtpDto: SendOtpDto) {
    const user = await this.authService.findUserByEmail(sendOtpDto.email);
    if (!user) {
      throw new HttpException('Email not found', HttpStatus.NOT_FOUND);
    }

    const otpSession = await this.authService.createOtpSession(user);
    // Send OTP to user's email
    await this.authService.sendOtpEmail(user.email, otpSession.otp);

    return { message: 'OTP sent to email' };
  }

  // Endpoint to verify OTP
  @Post('verify-otp')
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    const valid = await this.authService.verifyOtp(
      verifyOtpDto.email,
      verifyOtpDto.otp,
    );
    if (!valid) {
      throw new HttpException('Invalid OTP', HttpStatus.FORBIDDEN);
    }

    return { message: 'OTP verified successfully' };
  }

  // Endpoint for password reset
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const resetSuccess = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.newPassword,
    );

    if (!resetSuccess) {
      throw new HttpException('Password reset failed', HttpStatus.BAD_REQUEST);
    }

    return { message: 'Password reset successful' };
  }
}
