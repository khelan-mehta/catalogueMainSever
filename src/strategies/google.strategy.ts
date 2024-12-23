import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID:
        '750367123791-8p5e5vbsp8qnsp9e8fa96345q43okqpl.apps.googleusercontent.com', // Replace with your Google Client ID
      clientSecret: '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', // Replace with your Google Client Secret
      callbackURL:
        'https://server-five-topaz.vercel.app/api/auth/google/redirect',
      scope: ['email', 'profile'],
    }); 
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails } = profile;
    const user = {
      email: emails[0].value,
      name: name.givenName,
      accessToken,
    };

    done(null, user);
  }
}
