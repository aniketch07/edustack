import { IsNotEmpty, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateLessonDto {
  @IsString()
  @IsNotEmpty({ message: 'Lesson title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Video URL must be a valid HTTP/HTTPS URL (YouTube or direct MP4 link)' })
  videoUrl?: string;

  @IsString()
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'PDF URL must be a valid HTTP/HTTPS URL' })
  pdfUrl?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  order?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;
}
