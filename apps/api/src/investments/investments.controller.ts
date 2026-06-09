import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TradeDto } from './dto/trade.dto';
import { InvestmentsService } from './investments.service';

@Controller('investments')
@UseGuards(JwtAuthGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Get('assets')
  listAssets() {
    return this.investmentsService.listAssets();
  }

  @Get('assets/:symbol')
  getAsset(@Param('symbol') symbol: string) {
    return this.investmentsService.getAsset(symbol);
  }

  @Get('assets/:assetId/history')
  getHistory(@Param('assetId') assetId: string, @Query('limit') limit?: number) {
    return this.investmentsService.getPriceHistory(assetId, limit ? Number(limit) : 100);
  }

  @Get('portfolio')
  getPortfolio(@CurrentUser() user: SafeUser) {
    return this.investmentsService.getPortfolio(user.id);
  }

  @Post('buy')
  buy(@CurrentUser() user: SafeUser, @Body() dto: TradeDto) {
    return this.investmentsService.buy(user.id, dto);
  }

  @Post('sell')
  sell(@CurrentUser() user: SafeUser, @Body() dto: TradeDto) {
    return this.investmentsService.sell(user.id, dto);
  }
}
