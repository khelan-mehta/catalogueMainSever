import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.use(passport.initialize());

  // Enable CORS for a specific frontend URL
  app.enableCors(/**{
    origin: 'https://bh-frontend-jbps.vercel.app', // Specific frontend URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Common HTTP methods
    allowedHeaders: 'Content-Type,Authorization', // Specific headers
    credentials: true, // Allow credentials (e.g., cookies)
  } */);

  app.use(
    session({
      secret: 'asiodasjoddjdoasddasoidjasiodasdjaiodd',
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: 60000, // Session cookie expiry (1 minute)
      },
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
