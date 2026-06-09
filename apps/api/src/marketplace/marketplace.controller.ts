import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateListingDto } from './dto/create-listing.dto';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
@UseGuards(JwtAuthGuard)
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('inventory')
  getInventory(@CurrentUser() user: SafeUser) {
    return this.marketplaceService.getInventory(user.id);
  }

  @Get('shop')
  getShop() {
    return this.marketplaceService.getShopItems();
  }

  @Post('shop/buy')
  buyShopItem(@CurrentUser() user: SafeUser, @Body('itemId') itemId: string) {
    return this.marketplaceService.buyShopItem(user.id, itemId);
  }

  @Get('listings')
  getListings(@Query() query: PaginationDto) {
    return this.marketplaceService.getListings(query);
  }

  @Post('listings')
  createListing(@CurrentUser() user: SafeUser, @Body() dto: CreateListingDto) {
    return this.marketplaceService.createListing(user.id, dto);
  }

  @Post('listings/:id/buy')
  buyListing(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.marketplaceService.buyListing(user.id, id);
  }

  @Delete('listings/:id')
  cancelListing(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.marketplaceService.cancelListing(user.id, id);
  }

  @Post('buyback')
  sellToBuyback(
    @CurrentUser() user: SafeUser,
    @Body() body: { itemId: string; quantity?: number },
  ) {
    return this.marketplaceService.sellToBuyback(user.id, body.itemId, body.quantity ?? 1);
  }
}
