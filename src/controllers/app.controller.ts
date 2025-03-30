import { Controller, Get, Query, Res } from '@nestjs/common';
import { AppService } from '../services/app.service';
import axios from 'axios';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  
}
