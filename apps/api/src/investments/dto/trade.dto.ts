import { IsNumber, IsUUID, Min } from 'class-validator';

export class TradeDto {
  @IsUUID()
  assetId: string;

  @IsNumber()
  @Min(0.00000001)
  quantity: number;
}
