import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateAuctionDto, PlaceBidDto } from './dto/create-auction.dto';
import { AuctionsService } from './auctions.service';

@Controller('auctions')
@UseGuards(JwtAuthGuard)
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  getActive(@Query() query: PaginationDto) {
    return this.auctionsService.getActive(query);
  }

  @Post()
  create(@CurrentUser() user: SafeUser, @Body() dto: CreateAuctionDto) {
    return this.auctionsService.create(user.id, dto);
  }

  @Post(':id/bid')
  placeBid(
    @CurrentUser() user: SafeUser,
    @Param('id') id: string,
    @Body() dto: PlaceBidDto,
  ) {
    return this.auctionsService.placeBid(user.id, id, dto);
  }

  @Delete(':id')
  cancel(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    const isAdmin = user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
    return this.auctionsService.cancelAuction(user.id, id, isAdmin);
  }
}
