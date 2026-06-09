import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PlayMiniGameDto } from './dto/mini-game.dto';
import { GamesService } from './games.service';

@Controller('games')
@UseGuards(JwtAuthGuard)
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post('wheel/spin')
  spinWheel(@CurrentUser() user: SafeUser) {
    return this.gamesService.spinWheel(user.id);
  }

  @Get('wheel/history')
  getWheelHistory(@CurrentUser() user: SafeUser) {
    return this.gamesService.getWheelHistory(user.id);
  }

  @Post('cases/open')
  openCase(@CurrentUser() user: SafeUser, @Body('caseType') caseType?: string) {
    return this.gamesService.openCase(user.id, caseType);
  }

  @Post('chests/open')
  openChest(@CurrentUser() user: SafeUser, @Body('chestType') chestType?: string) {
    return this.gamesService.openChest(user.id, chestType);
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
