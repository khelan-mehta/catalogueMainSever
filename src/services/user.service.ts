import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema'; // Assuming you have a User schema

@Injectable()
export class UserService {
  async getUserById(userId: string) {
    return this.userModel.findById(userId); // You can also customize it with specific fields or filters
  }
  jwtService: any;
  constructor(@InjectModel('User') private readonly userModel: Model<User>) {}

  // Method to find a user by their ID
  async findById(userId: string): Promise<User | null> {
    return this.userModel.findById(userId).exec();
  }

  // Method to find a user by their email
  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // Method to update the user's access token
  async updateAccessToken(userId: string, accessToken: string): Promise<User> {
    return this.userModel
      .findByIdAndUpdate(
        userId,
        { accessToken }, // Update the accessToken field with the new token
        { new: true }, // Return the updated user
      )
      .exec();
  }

  // Method to create a new user
  async create(userData: Partial<User>): Promise<User> {
    const user = new this.userModel(userData);
    return user.save();
  }

  // Method to delete a user by ID
  async deleteUser(userId: string): Promise<any> {
    return this.userModel.findByIdAndDelete(userId).exec();
  }

  // Method to verify the token and return the user if valid
  async verifyAndGetUser(token: string): Promise<User | null> {
    // If you need to verify the token or perform custom validation logic
    // You can implement it here, like decoding the token or using a JWT service
    // If the token is valid, you can return the user
    // Assuming token contains the user ID in the 'sub' field

    const decoded = this.decodeJwt(token);
    if (!decoded?.sub) {
      return null;
    }

    return this.findById(decoded.sub);
  }

  // Helper method to decode the JWT token
  private decodeJwt(token: string): any {
    try {
      return this.jwtService.decode(token); // Decode the JWT token (Ensure JwtService is injected)
    } catch (error) {
      return null;
    }
  }
}
