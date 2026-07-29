import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class QuestionDto {
  @IsString()
  @IsNotEmpty({ message: 'Question prompt is required' })
  question: string;

  @IsArray({ message: 'Options must be an array of strings' })
  @IsString({ each: true })
  options: string[];

  @IsInt()
  @Min(0)
  correctAnswer: number;

  @IsInt()
  @Min(1)
  marks: number;
}

export class CreateTestDto {
  @IsString()
  @IsNotEmpty({ message: 'Test title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number; // Duration in minutes

  @IsInt()
  @Min(1)
  totalMarks: number;

  @IsInt()
  @Min(1)
  passingMarks: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  questions: QuestionDto[];
}
