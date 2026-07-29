import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateLiveClassDto {
  @IsString()
  @IsNotEmpty({ message: 'Live class title is required' })
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty({ message: 'Meeting link is required' })
  @IsUrl({ protocols: ['http', 'https'] }, { message: 'Meeting link must be a valid Google Meet or Zoom URL' })
  meetingLink: string;

  @IsString()
  @IsNotEmpty({ message: 'Scheduled date and time is required' })
  scheduledAt: string;

  @IsInt()
  @Min(1)
  duration: number; // Duration in minutes
}
