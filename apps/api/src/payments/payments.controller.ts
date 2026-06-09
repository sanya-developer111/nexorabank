import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('qr')
  createQr(
    @CurrentUser() user: SafeUser,
    @Body() body: { amount: number; description?: string },
  ) {
    return this.paymentsService.createQr(user.id, body.amount, body.description);
  }

  @Get('qr/mine')
  getMyQrs(@CurrentUser() user: SafeUser) {
    return this.paymentsService.getMyQrs(user.id);
  }

  @Get('qr/:code')
  lookup(@Param('code') code: string) {
    return this.paymentsService.lookupCode(code);
  }

  @Get('qr/:code/image')
  qrImage(@Param('code') code: string) {
    return this.paymentsService.getQrImage(code);
  }

  @Post('qr/pay')
  pay(@CurrentUser() user: SafeUser, @Body() body: { code: string }) {
    return this.paymentsService.payByCode(user.id, body.code);
  }
}
