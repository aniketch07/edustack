import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsIn } from 'class-validator';

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'mix'] as const;

export class GenerateMcqDto {
  @IsString()
  @IsNotEmpty({ message: 'Topics are required (e.g. Newton Laws of Motion, Kinematics)' })
  topics: string;

  @IsInt()
  @Min(1)
  @Max(100, { message: 'Maximum 100 questions per generation' })
  count: number;

  @IsOptional()
  @IsIn(DIFFICULTIES, { message: 'difficulty must be easy, medium, hard, or mix' })
  difficulty?: string;
}
