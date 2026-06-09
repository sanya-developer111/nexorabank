import { IsDateString, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreateContractDto {
  @IsString()
  @MinLength(3)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsNumber()
  @Min(1)
  reward: number;

  @IsOptional()
  @IsDateString()
  deadline?: string;
}
