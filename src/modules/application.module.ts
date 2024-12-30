import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationController } from 'src/controllers/application.controller';
import { Application, ApplicationSchema } from 'src/schemas/application.schema';
import { UserSchema } from 'src/schemas/user.schema';
import { ApplicationService } from 'src/services/application.service';
import { UserService } from 'src/services/user.service';


@Module({
  imports: [
    MongooseModule.forFeature([{ name: Application.name, schema: ApplicationSchema }]),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [ApplicationController],
  providers: [ApplicationService, UserService],
})
export class ApplicationModule {}
