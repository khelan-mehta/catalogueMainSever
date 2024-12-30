// Import the required modules
import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Query,
  Put,
  Body,
  BadRequestException,
  Post,
  Sse,
  Res,
  OnModuleInit,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { BountyService } from '../services/bounty.service';
import { Bounty } from '../schemas/bounty.schema';
import { UserService } from 'src/services/user.service';
import { Subject } from 'rxjs';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Response } from 'express';

export class BountyUpdateService implements OnModuleInit {
  private updates = new Subject<Bounty>();

  onModuleInit() {
    // Initialize the SSE service
  }

  emitUpdate(bounty: Bounty) {
    this.updates.next(bounty);
  }

  getUpdates() {
    return this.updates.asObservable();
  }
}

@Controller('bounties')
export class BountyController {
  constructor(
    private readonly bountyService: BountyService,
    private readonly userService: UserService,
    private readonly bountyUpdateService: BountyUpdateService,
  ) {}

  // Get bounty by ID
  @Get(':bountyid/:id')
  @UseGuards(JwtAuthGuard)
  async getBountyById(
    @Param('bountyid') bountyid: string,
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<any> {
    try {
      // Fetch the bounty details
      const bounty = await this.bountyService.getBountyById(bountyid);
      if (!bounty) {
        return res
          .status(404)
          .json({ message: `Bounty with ID ${bountyid} not found` });
      }

      // Fetch the user who created the bounty
      const user = await this.userService.getUserById(bounty.createdBy);
      const user2 = await this.userService.getUserById(id);

      // Fetch details of listed users
      const listedUsersDetails = await Promise.all(
        bounty.listedUsers.map(async (listedUserId) => {
          const listedUser = await this.userService.getUserById(listedUserId);
          return listedUser
            ? {
                userId: listedUserId,
                username: listedUser.username,
                loot: listedUser.loot || '0',
                email: listedUser.email,
              }
            : { userId: listedUserId, username: null, loot: null };
        }),
      );
      console.log({
        ...bounty.toObject(),
        creatorDetails: user ? user.username : null,
        listedUsers: listedUsersDetails,
        newAccessToken: user2.accessToken, // Add the new access token
      });

      // Return bounty details with the new access token included in the response
      return res.status(200).json({
        ...bounty.toObject(),
        creatorDetails: user ? user.username : null,
        listedUsers: listedUsersDetails,
        newAccessToken: user2.accessToken, // Add the new access token
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  @Sse('/updates')
  streamUpdates() {
    return this.bountyUpdateService.getUpdates();
  }

  // Get all bounties
  @Get(':userId/all/fetch')
  async getAllBounties(
    @Param('userId') userId: string, // Extract userId from route parameters
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ bounties: Bounty[]; totalBounties: number }> {
    try {
      // Fetch the user to get their university
      const requestingUser = await this.userService.getUserById(userId);

      if (!requestingUser || requestingUser.isSuspended) {
        throw new NotFoundException('User not found or account is suspended');
      }

      const university = requestingUser.university;

      if (!university) {
        throw new NotFoundException('User does not belong to a university');
      }

      // Fetch bounties sorted by the latest `createdAt` date
      const bounties = await this.bountyService.getAllBounties(page, limit, {
        sort: { createdAt: -1 },
      });

      const totalBounties = await this.bountyService.getTotalBounties();

      if (!bounties || bounties.length === 0) {
        throw new NotFoundException('No bounties found');
      }

      // Add creator details and filter bounties based on the university match
      const bountiesWithCreatorDetails = await Promise.all(
        bounties.map(async (bounty) => {
          const creator = await this.userService.getUserById(bounty.createdBy);

          // Ensure the creator is not suspended and belongs to the same university
          const belongsToSameUniversity =
            creator &&
            !creator.isSuspended &&
            creator.university === university;

          return {
            ...bounty.toObject(),
            creatorDetails: creator ? creator.username : null,
            belongsToSameUniversity,
          };
        }),
      );

      // Filter out bounties where the creator does not belong to the same university
      const filteredBounties = bountiesWithCreatorDetails.filter(
        (bounty) => bounty.belongsToSameUniversity,
      );

      return { bounties: filteredBounties, totalBounties };
    } catch (error) {
      throw error;
    }
  }

  @Post(':id')
  @UseGuards(JwtAuthGuard)
  async createBounty(
    @Param('id') id: string,
    @Body()
    bountyData: {
      title: string;
      loot: string;
      details: string;
      referenceLink: string;
      days: string;
      listedUsers?: string[];
      createdBy?: string;
    },
  ): Promise<any> {
    const {
      title,
      createdBy,
      loot,
      details,
      referenceLink,
      days,
      listedUsers = [],
    } = bountyData;

    if (!id || !title || !loot || !details || !referenceLink || !days) {
      throw new BadRequestException('Missing required fields');
    }

    const creator = await this.userService.getUserById(id);

    if (!creator) {
      throw new BadRequestException(`User with ID ${id} not found`);
    }

    // Include `createdAt` with the current timestamp
    const newBounty = await this.bountyService.createBounty({
      createdBy: id,
      title,
      loot,
      details,
      referenceLink,
      days,
      listedUsers,
      creatorDetails: creator.username,
      status: 'open',
      acceptedId: null,
      isSuspended: false,
      createdAt: new Date(), // Add createdAt field
    });

    this.bountyUpdateService.emitUpdate(newBounty);

    return { ...newBounty, newAccessToken: creator.accessToken };
  }

  // Update bounty with acceptedId (to mark a user as the one who accepted the bounty)
  @Put(':id/accept')
  async acceptBounty(
    @Param('id') id: string,
    @Body('acceptedId') acceptedId: string,
  ): Promise<Bounty> {
    const bounty = await this.bountyService.getBountyById(id);

    if (!bounty) {
      throw new NotFoundException(`Bounty with ID ${id} not found`);
    }

    const userExists = bounty.listedUsers.includes(acceptedId);

    if (!userExists) {
      throw new NotFoundException(
        `User with ID ${acceptedId} is not listed for this bounty`,
      );
    }

    bounty.acceptedId = acceptedId;
    await bounty.save();

    return bounty;
  }

  // Add user to the listedUsers array
  @Put(':id/apply')
  async applyToBounty(
    @Param('id') id: string,
    @Body('listedUsers') listedUsers: string[],
  ): Promise<Bounty> {
    console.log(listedUsers);

    const bounty = await this.bountyService.getBountyById(id);

    if (!bounty) {
      throw new NotFoundException(`Bounty with ID ${id} not found`);
    }
    console.log(bounty.listedUsers);
    console.log(listedUsers[listedUsers.length - 1]);

    // Check if the user is already listed
    if (bounty.listedUsers.includes(listedUsers[listedUsers.length - 1])) {
      throw new NotFoundException(
        `User with ID ${listedUsers[listedUsers.length - 1]} is already listed for this bounty`,
      );
    }

    // Add the user to the listedUsers array
    bounty.listedUsers.push(listedUsers[listedUsers.length - 1]);
    await bounty.save();

    return bounty;
  }

  @Get('/user/:userId/seperateBounties')
  async getBountiesByUserId(
    @Param('userId') userId: string,
  ): Promise<[Bounty[], Bounty[], Bounty[]]> {
    // Return a tuple with two arrays
    try {
      // Fetch bounties where the user is the creator
      const createdBounties =
        await this.bountyService.getBountiesByCreator(userId);

      // Fetch bounties where the user is the accepted participant
      const listedBounties =
        await this.bountyService.getBountiesByListedId(userId);
      const acceptedBounties =
        await this.bountyService.getBountiesByAcceptedId(userId);

      // Return the payload in the desired format [createdBounties, acceptedBounties]
      return [createdBounties, listedBounties, acceptedBounties];
    } catch (error) {
      throw error;
    }
  }

  @Get('filters/filter/apply')
  async filterBounties(
    @Query('userId') userId: string,
    @Query('days') days?: string,
    @Query('loot') loot?: string,
    @Query('keywords') keywords?: string,
  ) {
    try {
      // Fetch the requesting user to get their university
      const requestingUser = await this.userService.getUserById(userId);

      if (!requestingUser || requestingUser.isSuspended) {
        throw new NotFoundException('User not found or account is suspended.');
      }

      const university = requestingUser.university;

      if (!university) {
        throw new NotFoundException('User does not belong to a university.');
      }

      const filterCriteria: any = {};

      // Add `days` filter if provided
      if (days) {
        const exactDays = parseInt(days, 10);
        if (isNaN(exactDays) || exactDays <= 0) {
          throw new BadRequestException('Invalid "days" filter value.');
        }
        filterCriteria.days = exactDays; // Match exactly this number of days
      }

      // Add `loot` filter if provided
      if (loot) {
        const minLoot = parseInt(loot, 10);
        if (isNaN(minLoot) || minLoot <= 0) {
          throw new BadRequestException('Invalid "loot" filter value.');
        }
        filterCriteria.loot = { $gte: minLoot };
      }

      // Add `keywords` filter if provided
      if (keywords) {
        const keywordArray = keywords.split(',');
        filterCriteria.title = {
          $regex: keywordArray.join('|'),
          $options: 'i',
        };
      }

      // Fetch bounties based on filter criteria
      const bounties = await this.bountyService.find(filterCriteria);

      if (!bounties || bounties.length === 0) {
        throw new NotFoundException(
          'No bounties found for the applied filters.',
        );
      }

      // Filter bounties based on the user's university
      const bountiesWithCreatorDetails = await Promise.all(
        bounties.map(async (bounty) => {
          const creator = await this.userService.getUserById(bounty.createdBy);

          const belongsToSameUniversity =
            creator &&
            !creator.isSuspended &&
            creator.university === university;

          return {
            ...bounty.toObject(),
            creatorDetails: creator ? creator.username : null,
            belongsToSameUniversity,
          };
        }),
      );

      // Filter out bounties that do not belong to the same university
      const filteredBounties = bountiesWithCreatorDetails.filter(
        (bounty) => bounty.belongsToSameUniversity,
      );

      return { success: true, data: filteredBounties };
    } catch (error) {
      console.error('Error filtering bounties:', error);
      throw new InternalServerErrorException(
        'Failed to fetch filtered bounties.',
      );
    }
  }
}
