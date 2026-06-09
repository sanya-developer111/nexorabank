import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransferDto } from './dto/transfer.dto';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('accounts')
  getAccounts(@CurrentUser() user: SafeUser) {
    return this.walletService.getAccounts(user.id);
  }

  @Get('summary')
  getSummary(@CurrentUser() user: SafeUser) {
    return this.walletService.getSummary(user.id);
  }

  @Get('transactions')
  getTransactions(@CurrentUser() user: SafeUser, @Query() query: PaginationDto) {
    return this.walletService.getTransactions(user.id, query);
  }

  @Get('transfers/incoming')
  getIncoming(@CurrentUser() user: SafeUser, @Query('since') since?: string) {
    return this.walletService.getIncomingTransfers(user.id, since);
  }

  @Post('transfer')
  transfer(@CurrentUser() user: SafeUser, @Body() dto: TransferDto) {
    return this.walletService.transfer(user.id, dto);
  }

  @Post('withdraw')
  withdraw(
    @CurrentUser() user: SafeUser,
    @Body('fromAccount') fromAccount: AccountType,
    @Body('amount') amount: number,
  ) {
    return this.walletService.withdrawToMain(user.id, fromAccount, amount);
  }

  @Post('cashback')
  claimCashback(@CurrentUser() user: SafeUser) {
    return this.walletService.claimCashback(user.id);
  }
}
