import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export enum UploadFolder {
  LESSONS = 'lessons',
  COURSES = 'courses',
  INSTITUTES = 'institutes',
  TESTS = 'tests',
}

export class GetPresignedUrlDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsEnum(UploadFolder)
  @IsOptional()
  folder?: UploadFolder = UploadFolder.LESSONS;
}
