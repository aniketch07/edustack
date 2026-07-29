import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class EnrollStudentsDto {
  @IsArray({ message: 'studentIds must be an array of student IDs' })
  @IsNotEmpty({ message: 'studentIds cannot be empty' })
  @IsString({ each: true, message: 'Each student ID must be a string' })
  studentIds: string[];
}
