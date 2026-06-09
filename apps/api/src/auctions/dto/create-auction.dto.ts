import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class CreateAuctionDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(1)
  startPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  buyoutPrice?: number;

  @IsDateString()
  endsAt: string;
}

export class PlaceBidDto {
  @IsNumber()
  @Min(1)
  amount: number;
}
