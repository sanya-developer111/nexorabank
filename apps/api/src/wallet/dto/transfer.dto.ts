import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, ValidateIf } from 'class-validator';
import { AccountType } from '@prisma/client';

export class TransferDto {
  @ValidateIf((o) => !o.toUsername)
  @IsUUID()
  toUserId?: string;

  @ValidateIf((o) => !o.toUserId)
  @IsString()
  toUsername?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(AccountType)
  fromAccount?: AccountType;

  @IsOptional()
  @IsEnum(AccountType)
  toAccount?: AccountType;

  @IsOptional()
  @IsString()
  description?: string;
}
