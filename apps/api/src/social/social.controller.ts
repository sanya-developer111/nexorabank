import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateClanDto,
  CreateCorporationDto,
  JoinClanDto,
  SendFriendRequestDto,
  SendMessageDto,
} from './dto/social.dto';
import { SocialService } from './social.service';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('friends')
  getFriends(@CurrentUser() user: SafeUser) {
    return this.socialService.getFriends(user.id);
  }

  @Post('friends/request')
  sendFriendRequest(@CurrentUser() user: SafeUser, @Body() dto: SendFriendRequestDto) {
    return this.socialService.sendFriendRequest(user.id, dto);
  }

  @Post('friends/:id/accept')
  acceptFriendRequest(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.socialService.acceptFriendRequest(user.id, id);
  }

  @Get('friends/pending')
  getPendingRequests(@CurrentUser() user: SafeUser) {
    return this.socialService.getPendingRequests(user.id);
  }

  @Get('messages')
  getInbox(@CurrentUser() user: SafeUser) {
    return this.socialService.getInbox(user.id);
  }

  @Post('messages')
  sendMessage(@CurrentUser() user: SafeUser, @Body() dto: SendMessageDto) {
    return this.socialService.sendMessage(user.id, dto);
  }

  @Get('chat/:room')
  getChatHistory(@Param('room') room: string) {
    return this.socialService.getChatHistory(room);
  }

  @Get('messages/:userId')
  getMessages(
    @CurrentUser() user: SafeUser,
    @Param('userId') otherUserId: string,
    @Query() query: PaginationDto,
  ) {
    return this.socialService.getMessages(user.id, otherUserId, query);
  }

  @Post('clans')
  createClan(@CurrentUser() user: SafeUser, @Body() dto: CreateClanDto) {
    return this.socialService.createClan(user.id, dto);
  }

  @Post('clans/join')
  joinClanByBody(@CurrentUser() user: SafeUser, @Body() dto: JoinClanDto) {
    return this.socialService.joinClan(user.id, dto.clanId);
  }

  @Post('clans/:id/join')
  joinClan(@CurrentUser() user: SafeUser, @Param('id') id: string) {
    return this.socialService.joinClan(user.id, id);
  }

  @Get('clans')
  getClans(@Query() query: PaginationDto) {
    return this.socialService.getClans(query);
  }

  @Post('corporations')
  createCorporation(@CurrentUser() user: SafeUser, @Body() dto: CreateCorporationDto) {
    return this.socialService.createCorporation(user.id, dto);
  }

  @Get('corporations')
  getCorporations(@Query() query: PaginationDto) {
    return this.socialService.getCorporations(query);
  }
}
