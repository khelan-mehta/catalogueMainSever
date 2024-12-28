import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Bounty } from '../schemas/bounty.schema'; // Import the Bounty schema

@Injectable()
export class BountyService {
  constructor(
    @InjectModel('Bounty') private readonly bountyModel: Model<Bounty>,
  ) {}

  async getBountyById(id: string): Promise<Bounty> {
    // Check if the ID is a valid ObjectId
    if (!Types.ObjectId.isValid(id)) {
      // Handle the case where the id is not a valid ObjectId
      throw new BadRequestException('Invalid bounty ID format');
    }

    const bounty = await this.bountyModel.findById(id).exec();

    if (!bounty) {
      throw new NotFoundException(`Bounty with ID ${id} not found`);
    }

    return bounty;
  }

  async getBountiesByCreator(userId: string): Promise<Bounty[]> {
    return this.bountyModel.find({ createdBy: userId }).exec();
  }

  // Method to fetch bounties accepted by a specific user
  async getBountiesByAcceptedId(userId: string): Promise<Bounty[]> {
    return this.bountyModel.find({ acceptedId: userId }).exec();
  }

  async getBountiesByListedId(userId: string): Promise<Bounty[]> {
    return this.bountyModel.find({ listedUsers: { $in: [userId] } }).exec();
  }

  async getAllBounties(page: number, limit: number): Promise<Bounty[]> {
    return this.bountyModel
      .find()
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'createdBy', // Populating the createdBy field with User data
        select: 'username', // Only fetch the username field from the User model
      })
      .exec();
  }

  async getTotalBounties(): Promise<number> {
    try {
      return this.bountyModel.countDocuments().exec(); // Counts total bounties in the collection
    } catch (error) {
      throw new Error('Failed to fetch total bounties');
    }
  }

  async createBounty(bountyData: Partial<Bounty>): Promise<Bounty> {
    const bounty = new this.bountyModel(bountyData);
    return await bounty.save();
  }

  // Additional methods can be added here as needed (e.g., creating, updating bounties)
}
