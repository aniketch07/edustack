import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty({ message: 'Course title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Course description is required' })
  description: string;

  @IsNumber({}, { message: 'Price must be a valid number' })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Thumbnail URL must be a valid HTTP/HTTPS URL' })
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Thumbnail URL must be a valid HTTP/HTTPS URL' })
  thumbnail?: string;

  @IsString()
  @IsOptional()
  teacherId?: string;
}
