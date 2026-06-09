import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BusinessService } from '../business/business.service';
import { CreateBusinessDto } from '../business/dto/create-business.dto';
import { ContractsService } from '../contracts/contracts.service';
import { PlayMiniGameDto } from '../games/dto/mini-game.dto';
import { GamesService } from '../games/games.service';
import { EarnService } from './earn.service';

@Controller('earn')
@UseGuards(JwtAuthGuard)
export class EarnController {
  constructor(
    private readonly earnService: EarnService,
    private readonly gamesService: GamesService,
    private readonly contractsService: ContractsService,
    private readonly businessService: BusinessService,
  ) {}

  @Get('streak')
  getStreak(@CurrentUser() user: SafeUser) {
    return this.earnService.getStreak(user.id);
  }

  @Post('streak/claim')
  claimStreak(@CurrentUser() user: SafeUser) {
    return this.earnService.claimStreak(user.id);
  }

  @Get('wheel/status')
  wheelStatus(@CurrentUser() user: SafeUser) {
    return this.earnService.getWheelStatus(user.id);
  }

  @Post('wheel/spin')
  spinWheel(@CurrentUser() user: SafeUser) {
    return this.gamesService.spinWheel(user.id);
  }

  @Post('cases/open')
  openCase(@CurrentUser() user: SafeUser, @Body('caseType') caseType?: string) {
    return this.earnService.openCase(user.id, caseType ?? 'standard');
  }

  @Post('chests/open')
  openChest(@CurrentUser() user: SafeUser, @Body('chestType') chestType?: string) {
    return this.gamesService.openChest(user.id, chestType ?? 'gold');
  }

  @Get('contracts')
  getContracts() {
    return this.earnService.getContracts();
  }

  @Post('contracts/:id/take')
  takeContract(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.contractsService.take(user.id, id);
  }

  @Get('businesses')
  getBusinesses(@CurrentUser() user: SafeUser) {
    return this.earnService.getBusinesses(user.id);
  }

  @Post('businesses')
  createBusiness(@CurrentUser() user: SafeUser, @Body() dto: CreateBusinessDto) {
    return this.businessService.create(user.id, dto);
  }

  @Post('businesses/:id/collect')
  collectBusiness(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.earnService.collectBusiness(user.id, id);
  }

  @Post('businesses/:id/upgrade')
  upgradeBusiness(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.businessService.upgrade(user.id, id);
  }

  @Get('mini/info')
  miniGameInfo() {
    return this.gamesService.getMiniGameInfo();
  }

  @Post('mini/play')
  playMiniGame(@CurrentUser() user: SafeUser, @Body() dto: PlayMiniGameDto) {
    return this.gamesService.playMiniGame(user.id, dto);
  }
}
