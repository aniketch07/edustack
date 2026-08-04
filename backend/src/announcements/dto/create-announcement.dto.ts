import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty({ message: 'Announcement title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Announcement content is required' })
  content: string;

  @IsString()
  @IsOptional()
  courseId?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;
}
