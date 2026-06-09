import { IsBoolean, IsEnum, IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { EconomyEventType, UserRole } from '@prisma/client';

export class BanUserDto {
  @IsString()
  reason: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateQuestDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  period: string;

  @IsNumber()
  target: number;

  @IsString()
  action: string;

  @IsNumber()
  nexReward: number;

  @IsNumber()
  xpReward: number;
}

export class CreateEconomyEventDto {
  @IsEnum(EconomyEventType)
  type: EconomyEventType;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  multiplier: number;

  @IsString()
  startsAt: string;

  @IsString()
  endsAt: string;
}

export class UpdateSettingsDto {
  @IsObject()
  data: Record<string, unknown>;
}

export class AdjustBalanceDto {
  @IsUUID()
  userId: string;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;
}

export class GrantPremiumDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsIn(['starter', 'pro', 'elite'])
  plan!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(3650)
  durationDays?: number;
}

export class AdjustUserLevelDto {
  @IsNumber()
  @Min(1)
  @Max(999)
  level: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  xp?: number;
}

export class AdjustUserAccountDto {
  @IsUUID()
  userId: string;

  @IsString()
  accountType: string;

  @IsNumber()
  amount: number;

  @IsString()
  reason: string;
}
