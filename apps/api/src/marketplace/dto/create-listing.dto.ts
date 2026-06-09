import { IsNumber, IsUUID, Min } from 'class-validator';

export class CreateListingDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(1)
  price: number;

  @IsNumber()
  @Min(1)
  quantity: number;
}
