import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBusinessDto } from './dto/create-business.dto';
import { BusinessService } from './business.service';

@Controller('business')
@UseGuards(JwtAuthGuard)
export class BusinessController {
  constructor(private readonly businessService: BusinessService) {}

  @Get()
  getBusinesses(@CurrentUser() user: SafeUser) {
    return this.businessService.getBusinesses(user.id);
  }

  @Post()
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(user.id, dto);
  }

  @Post(':id/collect')
  collect(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.businessService.collectRevenue(user.id, id);
  }

  @Post(':id/upgrade')
  upgrade(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.businessService.upgrade(user.id, id);
  }
}
