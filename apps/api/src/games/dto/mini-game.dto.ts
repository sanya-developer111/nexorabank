import { IsIn, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class PlayMiniGameDto {
  @IsIn(['coinflip', 'color', 'number', 'dice', 'hilo', 'slots'])
  game!: string;

  @IsNumber()
  @Min(10)
  @Max(50000)
  bet!: number;

  /** coinflip: heads | tails */
  @IsOptional()
  @IsIn(['heads', 'tails'])
  choice?: string;

  /** coinflip: payout multiplier */
  @IsOptional()
  @IsIn([2, 3, 5])
  multiplier?: number;

  /** color: red | black | green */
  @IsOptional()
  @IsIn(['red', 'black', 'green'])
  color?: string;

  /** number: 1–10, dice: 1–6 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  guess?: number;

  /** hilo: higher | lower */
  @IsOptional()
  @IsIn(['higher', 'lower'])
  hilo?: string;
}
