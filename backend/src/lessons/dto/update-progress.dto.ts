import { IsInt, IsNotEmpty, IsNumber, Min } from 'class-validator';

export class UpdateProgressDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty({ message: 'watchedDuration is required (in seconds)' })
  watchedDuration: number;

  @IsNumber()
  @Min(1)
  @IsNotEmpty({ message: 'totalDuration is required (in seconds)' })
  totalDuration: number;
}
