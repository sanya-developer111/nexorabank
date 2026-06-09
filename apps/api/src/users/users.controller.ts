import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: SafeUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  updateMe(@CurrentUser() user: SafeUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('leaderboard')
  getLeaderboard(@Query() query: PaginationDto) {
    return this.usersService.getLeaderboard(query);
  }

  @Get('friends')
  getFriends(@CurrentUser() user: SafeUser) {
    return this.usersService.getFriends(user.id);
  }

  @Public()
  @Get(':username')
  getByUsername(@Param('username') username: string) {
    return this.usersService.getProfileByUsername(username);
  }
}
