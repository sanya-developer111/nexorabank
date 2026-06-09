import { IsEnum, IsString, MinLength } from 'class-validator';
import { BusinessType } from '@prisma/client';

export class CreateBusinessDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(BusinessType)
  type: BusinessType;
}
