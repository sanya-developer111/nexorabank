import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateContractDto } from './dto/create-contract.dto';
import { ContractsService } from './contracts.service';

@Controller('contracts')
@UseGuards(JwtAuthGuard)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  getOpen(@Query() query: PaginationDto) {
    return this.contractsService.getOpen(query);
  }

  @Get('mine')
  getMyContracts(@CurrentUser() user: SafeUser) {
    return this.contractsService.getMyContracts(user.id);
  }

  @Post()
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateContractDto) {
    return this.contractsService.create(user.id, dto);
  }

  @Post(':id/take')
  take(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.contractsService.take(user.id, id);
  }

  @Post(':id/complete')
  complete(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.contractsService.complete(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.contractsService.cancel(user.id, id);
  }
}
