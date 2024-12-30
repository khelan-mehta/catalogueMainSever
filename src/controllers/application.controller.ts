import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Application } from 'src/schemas/application.schema';
import { ApplicationService } from 'src/services/application.service';
import { UserService } from 'src/services/user.service';

@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly userService: UserService,
  ) {}

  @Post('create')
  async createApplication(
    @Body() data: Partial<Application>,
  ): Promise<Application> {
    return this.applicationService.createApplication(data);
  }

  @Get('bounty/:bountyId')
  async fetchApplicationsByBountyId(
    @Param('bountyId') bountyId: string,
  ): Promise<any[]> {
    console.log('hit');

    // Fetch applications based on bountyId
    const applications =
      await this.applicationService.fetchApplicationsByBountyId(bountyId);

    // Iterate through each application and fetch creator details
    const applicationsWithCreatorDetails = await Promise.all(
      applications.map(async (application) => {
        // Fetch the creator details using the creatorId from userService
        const requestor = await this.userService.getUserById(
          application.requestId,
        );

        // Return the application with an additional 'creator' object containing creator details
        return {
          ...application.toObject(), // Assuming you are using Mongoose, or you can just use application
          requestor: {
            id: requestor._id,
            email: requestor.email,
            username: requestor.username,
          },
        };
      }),
    );

    return applicationsWithCreatorDetails;
  }
}
