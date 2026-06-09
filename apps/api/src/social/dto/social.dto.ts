import { IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class SendFriendRequestDto {
  @ValidateIf((o) => !o.username)
  @IsUUID()
  userId?: string;

  @ValidateIf((o) => !o.userId)
  @IsString()
  @MinLength(2)
  username?: string;
}

export class SendMessageDto {
  @ValidateIf((o) => !o.receiverUsername)
  @IsUUID()
  receiverId?: string;

  @ValidateIf((o) => !o.receiverId)
  @IsString()
  @MinLength(2)
  receiverUsername?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;
}

export class JoinClanDto {
  @IsUUID()
  clanId: string;
}

export class CreateClanDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(5)
  tag: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class CreateCorporationDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsString()
  @MinLength(2)
  @MaxLength(6)
  ticker: string;

  @IsOptional()
  @IsString()
  description?: string;
}
