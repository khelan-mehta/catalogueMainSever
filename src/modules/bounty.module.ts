import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bounty, BountySchema } from '../schemas/bounty.schema';
import {
  BountyController,
  BountyUpdateService,
} from '../controllers/bounty.controller';
import { BountyService } from '../services/bounty.service';
import { UserService } from 'src/services/user.service';
import { UserSchema } from 'src/schemas/user.schema';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { AuthService } from 'src/services/auth.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Bounty', schema: BountySchema }]), // Add Bounty schema
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your_jwt_secret', // Use environment variables for production
      signOptions: { expiresIn: '30d' },
    }),
  ],
  controllers: [BountyController],
  providers: [BountyService, UserService, BountyUpdateService, JwtStrategy, AuthService],
})
export class BountyModule {}
