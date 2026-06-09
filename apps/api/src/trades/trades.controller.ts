import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TradesService } from './trades.service';

@Controller('trades')
@UseGuards(JwtAuthGuard)
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post()
  create(
    @CurrentUser() user: SafeUser,
    @Body()
    body: {
      type: 'gift' | 'exchange';
      toUsername: string;
      fromItemId?: string;
      fromQty?: number;
      toItemId?: string;
      toQty?: number;
      fromNexAmount?: number;
      toNexAmount?: number;
      nexAmount?: number;
      message?: string;
    },
  ) {
    return this.tradesService.createTrade(user.id, body);
  }

  @Get('lookup/:username')
  lookupPartner(@Param('username') username: string) {
    return this.tradesService.lookupPartner(username);
  }

  @Get('incoming')
  incoming(@CurrentUser() user: SafeUser) {
    return this.tradesService.getIncoming(user.id);
  }

  @Get('outgoing')
  outgoing(@CurrentUser() user: SafeUser) {
    return this.tradesService.getOutgoing(user.id);
  }

  @Post(':id/accept')
  accept(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.tradesService.acceptTrade(user.id, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.tradesService.cancelTrade(user.id, id);
  }
}
