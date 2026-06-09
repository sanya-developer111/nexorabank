import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SafeUser } from '../common/utils/user.util';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ActivitiesService } from '../activities/activities.service';
import { AdminService } from './admin.service';
import {
  AdjustBalanceDto,
  AdjustUserAccountDto,
  AdjustUserLevelDto,
  BanUserDto,
  CreateEconomyEventDto,
  CreateQuestDto,
  GrantPremiumDto,
  UpdateSettingsDto,
  UpdateUserRoleDto,
} from './dto/admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('economy')
  getEconomy() {
    return this.adminService.getEconomy();
  }

  @Get('users')
  getUsers(@Query() query: PaginationDto, @Query('search') search?: string) {
    return this.adminService.getUsers(query, search);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Post('users/:id/ban')
  banUser(@Param('id') id: string, @Body() dto: BanUserDto) {
    return this.adminService.banUser(id, dto);
  }

  @Post('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.adminService.unbanUser(id);
  }

  @Delete('users/:id')
  deleteUser(@CurrentUser() admin: SafeUser, @Param('id') id: string) {
    return this.adminService.deleteUser(id, admin.id);
  }

  @Patch('users/:id/role')
  updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, dto);
  }

  @Patch('users/:id/level')
  updateLevel(@Param('id') id: string, @Body() dto: AdjustUserLevelDto) {
    return this.adminService.adjustUserLevel(id, dto);
  }

  @Post('users/adjust-balance')
  adjustBalance(@Body() dto: AdjustBalanceDto) {
    return this.adminService.adjustBalance(dto);
  }

  @Post('users/adjust-account')
  adjustAccount(@Body() dto: AdjustUserAccountDto) {
    return this.adminService.adjustUserAccount(dto);
  }

  @Post('users/premium/grant')
  grantPremium(@CurrentUser() admin: SafeUser, @Body() dto: GrantPremiumDto) {
    return this.adminService.grantPremium(dto, admin.id);
  }

  @Post('users/:id/premium/revoke')
  revokePremium(@CurrentUser() admin: SafeUser, @Param('id') id: string) {
    return this.adminService.revokePremium(id, admin.id);
  }

  @Get('quests')
  getQuests() {
    return this.adminService.getQuests();
  }

  @Post('quests')
  createQuest(@Body() dto: CreateQuestDto) {
    return this.adminService.createQuest(dto);
  }

  @Patch('quests/:id/toggle')
  toggleQuest(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.adminService.toggleQuest(id, isActive);
  }

  @Get('events')
  getEvents() {
    return this.adminService.getEconomyEvents();
  }

  @Get('economy/events')
  getEconomyEvents() {
    return this.adminService.getEconomyEvents();
  }

  @Post('events')
  createEvent(@Body() dto: CreateEconomyEventDto) {
    return this.adminService.createEconomyEvent(dto);
  }

  @Post('economy/events')
  createEconomyEvent(@Body() dto: CreateEconomyEventDto) {
    return this.adminService.createEconomyEvent(dto);
  }

  @Delete('events/:id')
  deleteEvent(@Param('id') id: string) {
    return this.adminService.deleteEconomyEvent(id);
  }

  @Delete('economy/events/:id')
  deleteEconomyEvent(@Param('id') id: string) {
    return this.adminService.deleteEconomyEvent(id);
  }

  @Post('economy/burn')
  burnCurrency(@Body('amount') amount: number, @Body('reason') reason?: string) {
    return this.adminService.burnCurrency(amount, reason);
  }

  @Get('videos')
  listVideos() {
    return this.activitiesService.adminListVideos();
  }

  @Post('videos')
  createVideo(@Body() body: Record<string, unknown>) {
    return this.activitiesService.adminCreateVideo(body as Parameters<ActivitiesService['adminCreateVideo']>[0]);
  }

  @Patch('videos/:id')
  updateVideo(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.activitiesService.adminUpdateVideo(id, body);
  }

  @Delete('videos/:id')
  deleteVideo(@Param('id') id: string) {
    return this.activitiesService.adminDeleteVideo(id);
  }

  @Get('market/listings')
  getMarketListings(@Query() query: PaginationDto) {
    return this.adminService.getMarketListings(query);
  }

  @Get('clans')
  getClans(@Query() query: PaginationDto) {
    return this.adminService.getClans(query);
  }

  @Get('logs')
  getLogs(@Query() query: PaginationDto, @Query('userId') userId?: string) {
    return this.adminService.getLogs(query, userId);
  }

  @Get('security/alerts')
  getFraudAlerts() {
    return this.adminService.getFraudAlerts();
  }

  @Post('security/alerts/:id/resolve')
  resolveAlert(@Param('id') id: string) {
    return this.adminService.resolveFraudAlert(id);
  }

  @Get('settings')
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings')
  updateSettings(@Body() dto: UpdateSettingsDto) {
    return this.adminService.updateSettings(dto);
  }
}
