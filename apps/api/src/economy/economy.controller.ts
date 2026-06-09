import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EconomyService } from './economy.service';

@Controller('economy')
@UseGuards(JwtAuthGuard)
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('metrics')
  getMetrics() {
    return this.economyService.getMetrics();
  }

  @Get('events')
  getEvents() {
    return this.economyService.getActiveEvents();
  }
}
